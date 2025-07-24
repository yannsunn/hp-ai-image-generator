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

    // Simplified response for demo
    return res.status(200).json({
      success: true,
      content: {
        title: 'ウェブサイトのタイトル',
        description: 'ウェブサイトの説明',
        text_preview: 'コンテンツのプレビュー...'
      },
      industry: 'general',
      content_type: 'hero',
      suggested_prompt: 'Professional Japanese business website hero image, modern clean design'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}