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
    
    if (process.env.OPENAI_API_KEY) available.push('openai');
    if (process.env.STABILITY_API_KEY) available.push('stability');
    if (process.env.REPLICATE_API_TOKEN) available.push('replicate');
    
    return res.status(200).json({
      available,
      count: available.length
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}