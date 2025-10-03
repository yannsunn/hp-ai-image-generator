// 環境変数チェックスクリプト
const envVars = [
  'GEMINI_API_KEY',
  'GEMINI_TEXT_MODEL',
  'GEMINI_IMAGE_MODEL',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN'
];

console.log('=== 環境変数チェック ===\n');

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName.includes('KEY')) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...（設定済み）`);
    } else {
      console.log(`✅ ${varName}: ${value}（設定済み）`);
    }
  } else {
    console.log(`❌ ${varName}: 未設定`);
  }
});

console.log('\n=== API可用性 ===');
if (process.env.GEMINI_API_KEY) {
  console.log('✅ Gemini API: 利用可能');
  console.log(`   テキストモデル: ${process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash'}`);
  console.log(`   画像モデル: ${process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'}`);
} else {
  console.log('❌ Gemini APIキーが設定されていません！');
}