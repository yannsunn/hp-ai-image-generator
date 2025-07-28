// ローカルストレージ版（KVを使わない簡易版）
module.exports = async function handler(req, res) {
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
    // KVなしでも動作するように、成功レスポンスを返す
    return res.status(200).json({
      success: true,
      imageId: 'local-' + Date.now(),
      message: '画像が保存されました（ローカルモード）',
      warning: 'Vercel KVが設定されていないため、ブラウザのローカルストレージに保存されます'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};