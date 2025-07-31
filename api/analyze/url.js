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
    const { url: targetUrl } = req.body || {};
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'URLが指定されていません' });
    }

    // This endpoint is deprecated - use /api/analyze-url instead
    return res.status(410).json({ 
      error: 'このエンドポイントは廃止されました。/api/analyze-url を使用してください。' 
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}