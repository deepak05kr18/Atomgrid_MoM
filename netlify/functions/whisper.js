// Netlify serverless function — Whisper proxy
// Forwards audio chunks to OpenAI Whisper API
// OPENAI_KEY set in Netlify → Site configuration → Environment variables

const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Handle CORS preflight
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };
  }

  const OPENAI_KEY = process.env.OPENAI_KEY;
  if (!OPENAI_KEY) {
    console.error('[Whisper] OPENAI_KEY not set in environment variables');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'OPENAI_KEY not configured. Set it in Netlify → Environment variables.' })
    };
  }

  try {
    // Forward the raw body and content-type to OpenAI
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    const bodyBuffer  = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'binary');

    console.log('[Whisper] Forwarding', bodyBuffer.length, 'bytes to OpenAI');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': contentType,
      },
      body: bodyBuffer,
    });

    const data = await response.json();
    console.log('[Whisper] OpenAI response status:', response.status);

    return {
      statusCode: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('[Whisper] Error:', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};