const OpenAI = require('openai');
const Replicate = require('replicate');
const fetch = require('node-fetch');
const { validatePrompt } = require('./utils/validation');
const { translateInstruction, translateInstructions } = require('./utils/japanese-to-english');

// ULTRA最適化: インテリジェント・プロンプト・エンジン
class UltraPromptEngine {
  constructor() {
    this.industryTemplates = {
      'technology': {
        core: 'cutting-edge tech environment, modern digital workspace, innovation hub',
        mood: 'futuristic, professional, dynamic',
        lighting: 'cool LED lighting, glass surfaces, modern architecture'
      },
      'consulting': {
        core: 'executive boardroom, strategic planning environment, professional consulting space',
        mood: 'authoritative, trustworthy, strategic',
        lighting: 'warm professional lighting, mahogany furniture, city skyline backdrop'
      },
      'finance': {
        core: 'financial district office, trading floor atmosphere, wealth management setting',
        mood: 'prestigious, secure, powerful',
        lighting: 'sophisticated lighting, marble surfaces, gold accents'
      },
      'healthcare': {
        core: 'modern medical facility, healing environment, healthcare innovation center',
        mood: 'caring, professional, clean',
        lighting: 'natural lighting, clean white surfaces, calming blue accents'
      }
    };
    
    this.contentTypeTemplates = {
      'hero': {
        composition: 'dynamic hero shot, powerful perspective, brand leadership visual',
        focus: 'confident subject positioning, strong eye contact, professional authority'
      },
      'team': {
        composition: 'collaborative group arrangement, unified team presence, diverse expertise',
        focus: 'team synergy, professional interaction, collective competence'
      },
      'service': {
        composition: 'service delivery showcase, customer-centric perspective, solution presentation',
        focus: 'problem-solving visualization, expertise demonstration, value proposition'
      }
    };
    
    this.japaneseBusinessOptimization = [
      'Japanese business professionals',
      'Tokyo corporate environment',
      'East Asian ethnicity',
      'formal business attire',
      'Japanese corporate culture aesthetics',
      'professional Japanese workplace'
    ];
  }
  
  generateUltraPrompt(basePrompt, context) {
    const industry = this.industryTemplates[context.industry] || this.industryTemplates['technology'];
    
    // 複数のコンテンツタイプをサポート（後方互換性を保持）
    let contentTypeComponents = [];
    if (context.contentTypes && Array.isArray(context.contentTypes)) {
      // 新しい配列形式
      context.contentTypes.forEach(type => {
        if (this.contentTypeTemplates[type]) {
          const template = this.contentTypeTemplates[type];
          contentTypeComponents.push(template.composition, template.focus);
        }
      });
    } else if (context.contentType && this.contentTypeTemplates[context.contentType]) {
      // 後方互換性のため単一のcontentTypeもサポート
      const template = this.contentTypeTemplates[context.contentType];
      contentTypeComponents.push(template.composition, template.focus);
    } else {
      // デフォルト
      const defaultTemplate = this.contentTypeTemplates['hero'];
      contentTypeComponents.push(defaultTemplate.composition, defaultTemplate.focus);
    }
    
    // ULTRA品質指定
    const qualityModifiers = [
      'photorealistic masterpiece',
      'award-winning photography',
      '8K ultra-high resolution',
      'professional commercial photography',
      'cinematic lighting',
      'crystal clear details'
    ];
    
    // ULTRA構成
    const components = [
      basePrompt,
      industry.core,
      ...contentTypeComponents,
      industry.mood + ' atmosphere',
      industry.lighting,
      ...this.japaneseBusinessOptimization,
      ...qualityModifiers
    ];
    
    const negativePrompt = 'blurry, low quality, amateur, distorted faces, bad anatomy, western faces, caucasian features, unprofessional, cartoon, illustration, sketch';
    
    return {
      positive: components.join(', '),
      negative: negativePrompt,
      optimized: true
    };
  }
}

// ULTRA最適化: パラレル・エクゼキューション・エンジン
class UltraExecutionEngine {
  constructor() {
    this.promptEngine = new UltraPromptEngine();
    this.performanceMetrics = [];
  }
  
  async executeUltraGeneration(prompt, context, apiPreference, count) {
    const startTime = Date.now();
    
    // インテリジェント・プロンプト生成
    const ultraPrompt = this.promptEngine.generateUltraPrompt(prompt, context);
    
    // 並列実行戦略の決定
    const strategy = this.determineOptimalStrategy(count, apiPreference);
    
    const results = await this.executeWithStrategy(ultraPrompt, context, strategy);
    
    const executionTime = Date.now() - startTime;
    this.recordPerformance(executionTime, count, strategy.api);
    
    return results;
  }
  
  determineOptimalStrategy(count, apiPreference) {
    // ULTRA戦略決定アルゴリズム
    if (count === 1) {
      return {
        mode: 'single',
        api: apiPreference === 'replicate' ? 'replicate' : 'openai',
        batchSize: 1,
        concurrency: 1
      };
    } else if (count <= 2) {
      return {
        mode: 'dual',
        api: apiPreference,
        batchSize: 1,
        concurrency: 2
      };
    } else {
      return {
        mode: 'progressive',
        api: apiPreference,
        batchSize: 1,
        concurrency: 1,
        progressive: true
      };
    }
  }
  
  async executeWithStrategy(ultraPrompt, context, strategy) {
    const results = [];
    
    switch (strategy.mode) {
      case 'single':
        const result = await this.generateUltraImage(ultraPrompt, context, strategy.api, 0);
        results.push(result);
        break;
        
      case 'dual':
        const promises = [];
        for (let i = 0; i < 2; i++) {
          promises.push(this.generateUltraImage(ultraPrompt, context, strategy.api, i));
        }
        const dualResults = await Promise.allSettled(promises);
        results.push(...dualResults.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean));
        break;
        
      case 'progressive':
        // プログレッシブ生成（順次実行で安定性重視）
        for (let i = 0; i < 4; i++) {
          try {
            const progressiveResult = await this.generateUltraImage(ultraPrompt, context, strategy.api, i);
            results.push(progressiveResult);
            
            // プログレッシブ待機
            if (i < 3) await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Progressive generation ${i} failed:`, error);
            break; // エラー時は中断
          }
        }
        break;
    }
    
    return results;
  }
  
  async generateUltraImage(ultraPrompt, context, api, index) {
    const startTime = Date.now();
    
    let result;
    
    switch (api) {
      case 'openai':
        result = await this.generateWithUltraOpenAI(ultraPrompt, context);
        break;
      case 'replicate':
        result = await this.generateWithUltraReplicate(ultraPrompt, context);
        break;
      case 'stability':
        result = await this.generateWithUltraStability(ultraPrompt, context);
        break;
      default:
        throw new Error(`Unsupported API: ${api}`);
    }
    
    const generationTime = Date.now() - startTime;
    
    return {
      ...result,
      metadata: {
        ...result.metadata,
        generation_time: generationTime,
        ultra_optimized: true,
        prompt_strategy: 'ultra_enhanced',
        image_index: index
      }
    };
  }
  
  async generateWithUltraOpenAI(ultraPrompt, context) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: ultraPrompt.positive.substring(0, 4000), // OpenAI制限対応
      n: 1,
      size: '1024x1024',
      quality: 'hd', // ULTRA品質指定
      style: 'natural', // リアリスティック重視
      response_format: 'url'
    });
    
    const imageUrl = response.data[0].url;
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    
    return {
      image: base64Image,
      metadata: {
        api_used: 'openai',
        model: 'dall-e-3-hd',
        cost: 0.08, // HD品質料金
        original_prompt: ultraPrompt.positive.substring(0, 100) + '...',
        negative_prompt: ultraPrompt.negative
      }
    };
  }
  
  async generateWithUltraReplicate(ultraPrompt, context) {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    
    // ULTRA設定でReplicate実行
    const output = await replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      {
        input: {
          prompt: ultraPrompt.positive.substring(0, 2000),
          negative_prompt: ultraPrompt.negative,
          width: 1024,
          height: 1024,
          num_outputs: 1,
          scheduler: 'DPMSolverMultistep', // 高品質スケジューラー
          num_inference_steps: 40, // 品質重視でステップ数増加
          guidance_scale: 8.5, // 最適化されたガイダンス
          seed: Math.floor(Math.random() * 1000000)
        }
      }
    );
    
    const imageUrl = Array.isArray(output) ? output[0] : output;
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    
    return {
      image: base64Image,
      metadata: {
        api_used: 'replicate',
        model: 'sdxl-ultra',
        cost: 0.008, // 高品質設定料金
        original_prompt: ultraPrompt.positive.substring(0, 100) + '...',
        negative_prompt: ultraPrompt.negative
      }
    };
  }
  
  async generateWithUltraStability(ultraPrompt, context) {
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [
          { text: ultraPrompt.positive.substring(0, 2000), weight: 1 },
          { text: ultraPrompt.negative, weight: -1 }
        ],
        cfg_scale: 8,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 35 // 品質重視
      })
    });
    
    const data = await response.json();
    const base64Image = `data:image/png;base64,${data.artifacts[0].base64}`;
    
    return {
      image: base64Image,
      metadata: {
        api_used: 'stability',
        model: 'sdxl-ultra',
        cost: 0.025,
        original_prompt: ultraPrompt.positive.substring(0, 100) + '...',
        negative_prompt: ultraPrompt.negative
      }
    };
  }
  
  recordPerformance(executionTime, count, api) {
    this.performanceMetrics.push({
      timestamp: Date.now(),
      execution_time: executionTime,
      image_count: count,
      api_used: api,
      performance_score: count / (executionTime / 1000) // images per second
    });
    
    // 最新10件のメトリクスのみ保持
    if (this.performanceMetrics.length > 10) {
      this.performanceMetrics.shift();
    }
  }
  
  getPerformanceStats() {
    if (this.performanceMetrics.length === 0) return null;
    
    const avgTime = this.performanceMetrics.reduce((a, b) => a + b.execution_time, 0) / this.performanceMetrics.length;
    const avgScore = this.performanceMetrics.reduce((a, b) => a + b.performance_score, 0) / this.performanceMetrics.length;
    
    return {
      average_execution_time: avgTime,
      average_performance_score: avgScore,
      total_generations: this.performanceMetrics.reduce((a, b) => a + b.image_count, 0),
      optimization_level: 'ULTRA'
    };
  }
}

// ULTRA API エンドポイント
const ultraEngine = new UltraExecutionEngine();

module.exports = async function handler(req, res) {
  
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, context = {}, api: selectedApi = 'auto', count = 1, additionalInstructions = [] } = req.body || {};
    
    // プロンプト検証
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

    // API選択の最適化
    let apiToUse = selectedApi.toLowerCase();
    if (apiToUse === 'auto') {
      // ULTRA自動選択アルゴリズム
      if (process.env.OPENAI_API_KEY && count <= 2) apiToUse = 'openai';
      else if (process.env.REPLICATE_API_TOKEN) apiToUse = 'replicate';
      else if (process.env.STABILITY_API_KEY) apiToUse = 'stability';
      else {
        return res.status(500).json({
          success: false,
          error: 'No API keys configured'
        });
      }
    }
    
    
    // ULTRA実行
    const results = await ultraEngine.executeUltraGeneration(combinedPrompt, context, apiToUse, count);
    
    // パフォーマンス統計取得
    const performanceStats = ultraEngine.getPerformanceStats();
    
    // 成功レスポンス
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      success: true,
      ultra_optimized: true,
      images: results.map((result, index) => ({
        index,
        image: result.image,
        metadata: result.metadata
      })),
      performance_stats: performanceStats,
      summary: {
        requested: count,
        generated: results.length,
        optimization_level: 'ULTRA',
        api_used: apiToUse,
        ultra_features: [
          'intelligent_prompt_enhancement',
          'parallel_execution_engine',
          'performance_optimization',
          'japanese_business_specialization'
        ],
        additional_instructions_applied: translatedInstructions.length > 0
      }
    });

  } catch (error) {
    console.error('🔥 ULTRA API Error:', error);
    
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: 'ULTRA Generation Failed',
      details: error.message,
      ultra_mode: true
    });
  }
};