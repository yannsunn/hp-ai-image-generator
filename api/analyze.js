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
    return res.status(200).json({
      success: true,
      analysis: {
        content_type: 'general',
        industry: 'general',
        style_suggestions: ['professional', 'clean', 'modern'],
        color_palette: ['blue', 'white', 'gray'],
        recommended_apis: ['openai'],
        enhanced_prompt: 'Professional Japanese business image, clean modern style',
        composition: {
          layout: 'balanced composition',
          focus: 'clear subject matter',
          aspect: '16:9 or 4:3'
        }
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}