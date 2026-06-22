// Netlify serverless function — Whisper proxy
// Keeps OPENAI_KEY on server, never exposed to browser
// Deploy: set OPENAI_KEY in Netlify Environment Variables

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const OPENAI_KEY = process.env.OPENAI_KEY;
  if (!OPENAI_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'OPENAI_KEY not configured in Netlify environment variables' }) };
  }

  try {
    // Forward the multipart form data directly to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        // Forward content-type from original request (includes boundary for multipart)
        'Content-Type': event.headers['content-type'],
      },
      body: Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'),
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};