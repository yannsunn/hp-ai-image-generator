const { validatePrompt } = require('./utils/validation');
const { translateInstruction, translateInstructions } = require('./utils/japanese-to-english');
const {
  enhancePromptForJapan,
  generateWithOpenAI,
  generateWithStability,
  generateWithReplicate,
  getResolution
} = require('./utils/image-generators');


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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, context = {}, api: selectedApi = 'auto', additionalInstructions = [] } = req.body || {};
    
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

    // API選択ロジック（環境変数ベース）
    let apiToUse = selectedApi.toLowerCase(); // 大文字小文字を正規化
    
    if (apiToUse === 'auto') {
      if (process.env.OPENAI_API_KEY) apiToUse = 'openai';
      else if (process.env.STABILITY_API_KEY) apiToUse = 'stability';
      else if (process.env.REPLICATE_API_TOKEN) apiToUse = 'replicate';
      else {
        return res.status(500).json({
          success: false,
          error: 'APIキーが設定されていません',
          message: 'Vercelの環境変数にAPIキーを設定してください'
        });
      }
    }
    

    let generatedImage, cost = 0, apiUsed = '';
    const startTime = Date.now();

    try {
      switch (apiToUse) {
        case 'openai':
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
          }
          const result = await generateWithOpenAI(enhancePromptForJapan(combinedPrompt, context), process.env.OPENAI_API_KEY, context);
          generatedImage = result.image;
          cost = result.cost;
          apiUsed = 'openai';
          break;

        case 'stability':
          if (!process.env.STABILITY_API_KEY) {
            throw new Error('Stability AI API key is not configured');
          }
          const stabilityResult = await generateWithStability(enhancePromptForJapan(combinedPrompt, context), process.env.STABILITY_API_KEY, context);
          generatedImage = stabilityResult.image;
          cost = stabilityResult.cost;
          apiUsed = 'stability';
          break;

        case 'replicate':
          if (!process.env.REPLICATE_API_TOKEN) {
            throw new Error('Replicate API token is not configured');
          }
          const replicateResult = await generateWithReplicate(enhancePromptForJapan(combinedPrompt, context), process.env.REPLICATE_API_TOKEN, context);
          generatedImage = replicateResult.image;
          cost = replicateResult.cost;
          apiUsed = 'replicate';
          break;

        default:
          // 無効なAPIが選択された場合
          return res.status(400).json({
            success: false,
            error: '無効なAPIが選択されました',
            available_apis: ['openai', 'stability', 'replicate']
          });
      }
    } catch (apiError) {
      console.error(`API Error (${apiToUse}):`, apiError);
      // エラーをそのまま投げる - デモ画像は使わない
      return res.status(500).json({
        success: false,
        error: '画像生成に失敗しました',
        details: apiError.message,
        api_attempted: apiToUse
      });
    }

    const generationTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      image: generatedImage,
      metadata: {
        original_prompt: prompt,
        enhanced_prompt: prompt + ' - Professional Japanese style',
        api_used: apiUsed,
        cost: cost,
        generation_time: generationTime,
        resolution: getResolution(apiUsed),
        format: 'PNG/JPEG',
        context: context,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Generate API Error:', error);
    return res.status(500).json({
      error: 'サーバーエラー',
      message: error.message
    });
  }
}

