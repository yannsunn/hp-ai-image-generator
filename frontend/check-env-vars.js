// 環境変数チェックスクリプト
const envVars = [
  'OPENAI_API_KEY',
  'STABILITY_API_KEY', 
  'REPLICATE_API_TOKEN',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN'
];

console.log('=== 環境変数チェック ===\n');

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...（設定済み）`);
  } else {
    console.log(`❌ ${varName}: 未設定`);
  }
});

console.log('\n=== API可用性 ===');
if (process.env.OPENAI_API_KEY) console.log('✅ OpenAI API: 利用可能');
if (process.env.STABILITY_API_KEY) console.log('✅ Stability AI: 利用可能');
if (process.env.REPLICATE_API_TOKEN) console.log('✅ Replicate: 利用可能');

if (!process.env.OPENAI_API_KEY && !process.env.STABILITY_API_KEY && !process.env.REPLICATE_API_TOKEN) {
  console.log('❌ 画像生成APIが一つも設定されていません！');
}