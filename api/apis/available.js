export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const available = [];

    if (process.env.GEMINI_API_KEY) available.push('gemini');

    return res.status(200).json({
      available,
      count: available.length,
      model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}