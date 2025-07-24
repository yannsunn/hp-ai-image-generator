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
    const { api_keys = {} } = req.body || {};
    const available = [];
    
    if (api_keys.openai) available.push('openai');
    if (api_keys.stability) available.push('stability');
    if (api_keys.replicate) available.push('replicate');
    
    return res.status(200).json({
      available,
      count: available.length
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}