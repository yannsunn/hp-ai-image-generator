const { validatePrompt } = require('../utils/validation');
const { translateInstruction, translateInstructions } = require('../utils/japanese-to-english');
const {
  enhancePromptForJapan,
  generateWithOpenAI,
  generateWithStability,
  generateWithReplicate,
  getResolution
} = require('../utils/image-generators');


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

  // apiToUseをtryの外で定義
  let apiToUse = 'unknown';

  // 全体のエラーハンドリング
  try {

  if (req.method === 'POST') {
    
    const { prompt, count = 1, context = {}, api: selectedApi = 'auto', additionalInstructions = [] } = req.body || {};
    
    // プロンプトの検証
    const promptValidation = validatePrompt(prompt);
    if (!promptValidation.valid) {
      return res.status(400).json({ error: promptValidation.error });
    }
    
    // 日本語の追加指示を英語に変換
    const translatedInstructions = translateInstructions(additionalInstructions);
    
    // メインプロンプトと追加指示を結合
    let combinedPrompt = prompt;
    if (translatedInstructions.length > 0) {
      combinedPrompt = `${prompt}, ${translatedInstructions.join(', ')}`;
    }

    if (count > 8) {
      return res.status(400).json({ error: '生成枚数は8枚までです' });
    }

    // API選択ロジック（環境変数ベース）
    apiToUse = selectedApi.toLowerCase(); // 大文字小文字を正規化
    
    // 利用可能APIのリストを作成
    const availableApis = [];
    if (process.env.OPENAI_API_KEY) availableApis.push('openai');
    if (process.env.STABILITY_API_KEY) availableApis.push('stability');
    if (process.env.REPLICATE_API_TOKEN) availableApis.push('replicate');
    
    if (apiToUse === 'auto') {
      if (availableApis.length === 0) {
        return res.status(500).json({
          success: false,
          error: 'APIキーが設定されていません',
          message: 'Vercelの環境変数にAPIキーを設定してください'
        });
      }
      // 優先順位: OpenAI > Stability > Replicate
      apiToUse = availableApis[0];
    }
    

    const images = [];
    const errors = [];
    let totalCost = 0;
    
    // 大量生成時のタイムアウトを防ぐため、バッチ処理
    // Replicate APIは遅いので2枚ずつ処理
    const batchSize = apiToUse === 'replicate' ? 2 : 4;
    const results = [];
    
    
    for (let i = 0; i < count; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, count); j++) {
        batch.push(generateSingleImage(combinedPrompt, apiToUse, context, j, availableApis));
      }
      
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);
      
      // バッチ間に少し待機（Replicateのレートリミット対策）
      if (i + batchSize < count) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // 結果を処理
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        images.push({
          index,
          image: result.value.image,
          metadata: result.value.metadata
        });
        totalCost += result.value.metadata.cost;
      } else {
        console.error(`Image ${index} generation failed:`, {
          reason: result.reason,
          message: result.reason?.message,
          stack: result.reason?.stack,
          apiUsed: apiToUse
        });
        errors.push({
          index,
          error: result.reason.message || 'Generation failed',
          details: result.reason.toString()
        });
        
        // エラー時は何も追加しない - エラーをそのまま伝える
      }
    });

    
    // エラーがある場合は失敗として処理
    if (errors.length > 0 && images.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'すべての画像生成に失敗しました',
        errors: errors,
        details: errors.map(e => e.details).join(', ')
      });
    }
    
    // Content-Type を明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json({
      success: images.length > 0,
      images,
      errors,
      total_cost: totalCost,
      summary: {
        requested: count,
        generated: images.length,
        failed: errors.length,
        api_used: apiToUse,
        additional_instructions_applied: translatedInstructions.length > 0
      }
    });
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(405).json({ error: 'Method not allowed' });
  
  } catch (error) {
    console.error('Batch generate API error:', error);
    console.error('Error stack:', error.stack);
    
    // 確実にJSONレスポンスを返す
    res.setHeader('Content-Type', 'application/json');
    
    // タイムアウトエラーの場合
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        error: 'タイムアウトエラー',
        details: '処理時間が長すぎます。生成枚数を減らすか、単一生成をお試しください。',
        suggestion: '生成枚数を1-2枚に減らしてください',
        apiUsed: apiToUse || 'unknown'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'サーバーエラー',
      details: error.message || 'バッチ画像生成中にエラーが発生しました。',
      message: error.message || 'Unknown error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      apiUsed: apiToUse || 'unknown'
    });
  }
}

// 単一画像を生成
async function generateSingleImage(prompt, apiToUse, context, index, availableApis = []) {
  const startTime = Date.now();
  
  // 試したAPIの記録
  const triedApis = [];
  let lastError = null;
  
  // 指定されたAPIを優先して試し、失敗したら他のAPIを試す
  const apisToTry = [apiToUse, ...availableApis.filter(api => api !== apiToUse)];
  
  for (const currentApi of apisToTry) {
    if (triedApis.includes(currentApi)) continue;
    
    try {
      let result;
      triedApis.push(currentApi);
      
      switch (currentApi) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key is not configured');
        }
        const japanesePromptOpenAI = enhancePromptForJapan(prompt, context);
        result = await generateWithOpenAI(japanesePromptOpenAI, process.env.OPENAI_API_KEY, context);
        break;

      case 'stability':
        if (!process.env.STABILITY_API_KEY) {
          throw new Error('Stability AI API key is not configured');
        }
        const japanesePromptStability = enhancePromptForJapan(prompt, context);
        result = await generateWithStability(japanesePromptStability, process.env.STABILITY_API_KEY, context);
        break;

      case 'replicate':
        if (!process.env.REPLICATE_API_TOKEN) {
          throw new Error('Replicate API token is not configured');
        }
        // 日本向けのプロンプトを強化
        const japanesePrompt = enhancePromptForJapan(prompt, context);
        result = await generateWithReplicate(japanesePrompt, process.env.REPLICATE_API_TOKEN, context);
        break;

        default:
          // 無効なAPIが選択された場合
          throw new Error(`無効なAPIが選択されました: ${currentApi}`);
      }
      
      // 成功したら結果を返す
      return {
        image: result.image,
        metadata: {
          original_prompt: prompt,
          enhanced_prompt: prompt + ' - Professional Japanese style',
          api_used: currentApi,
          cost: result.cost,
          generation_time: Date.now() - startTime,
          resolution: getResolution(currentApi),
          format: 'PNG/JPEG',
          tried_apis: triedApis
        }
      };
    } catch (error) {
      console.error(`Generation error for image ${index} with ${currentApi}:`, error);
      lastError = error;
      
      // クレジット不足エラーの場合は、他のAPIを試す
      if (error.message && (error.message.includes('クレジット') || error.message.includes('402'))) {
        continue;
      }
      
      // その他のエラーの場合も次のAPIを試す
      continue;
    }
  }
  
  // すべてのAPIが失敗した場合
  console.error(`All APIs failed for image ${index}:`, triedApis);
  throw new Error(`すべてのAPIで生成に失敗しました (${triedApis.join(', ')}): ${lastError?.message || 'Unknown error'}`);
}

