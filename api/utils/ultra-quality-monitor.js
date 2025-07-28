// ULTRA品質監視システム
class UltraQualityMonitor {
  constructor() {
    this.qualityMetrics = [];
    this.qualityThresholds = {
      excellent: 0.9,
      good: 0.7,
      acceptable: 0.5,
      poor: 0.3
    };
  }
  
  // 画像品質の予測的評価
  predictImageQuality(prompt, context, api) {
    let qualityScore = 0.5; // ベーススコア
    
    // プロンプト品質評価
    const promptQuality = this.evaluatePromptQuality(prompt);
    qualityScore += promptQuality * 0.3;
    
    // コンテキスト適合性評価
    const contextQuality = this.evaluateContextRelevance(context);
    qualityScore += contextQuality * 0.2;
    
    // API特性評価
    const apiQuality = this.evaluateApiSuitability(api, context);
    qualityScore += apiQuality * 0.3;
    
    // 日本向け最適化評価
    const japaneseOptimization = this.evaluateJapaneseOptimization(prompt, context);
    qualityScore += japaneseOptimization * 0.2;
    
    return Math.min(1.0, Math.max(0.0, qualityScore));
  }
  
  evaluatePromptQuality(prompt) {
    let score = 0.5;
    
    // 長さ評価
    if (prompt.length >= 50 && prompt.length <= 300) score += 0.2;
    
    // 専門用語の存在
    const professionalTerms = ['professional', 'business', 'corporate', 'executive', 'modern', 'high-quality'];
    const foundTerms = professionalTerms.filter(term => 
      prompt.toLowerCase().includes(term.toLowerCase())
    ).length;
    score += (foundTerms / professionalTerms.length) * 0.2;
    
    // 具体性評価
    const specificityIndicators = ['office', 'meeting', 'team', 'workspace', 'environment'];
    const specificityScore = specificityIndicators.filter(indicator => 
      prompt.toLowerCase().includes(indicator.toLowerCase())
    ).length;
    score += (specificityScore / specificityIndicators.length) * 0.1;
    
    return Math.min(1.0, score);
  }
  
  evaluateContextRelevance(context) {
    let score = 0.5;
    
    // 業界指定の有無
    if (context.industry && context.industry !== '') score += 0.3;
    
    // コンテンツタイプ指定の有無
    if (context.contentType && context.contentType !== '') score += 0.3;
    
    // 日本向け設定の有無
    if (context.locale === 'ja-JP') score += 0.2;
    
    return Math.min(1.0, score);
  }
  
  evaluateApiSuitability(api, context) {
    const apiScores = {
      'openai': {
        'hero': 0.9,
        'about': 0.8,
        'team': 0.9,
        'service': 0.7,
        'product': 0.8,
        'testimonial': 0.6
      },
      'replicate': {
        'hero': 0.8,
        'about': 0.7,
        'team': 0.8,
        'service': 0.9,
        'product': 0.9,
        'testimonial': 0.7
      },
      'stability': {
        'hero': 0.7,
        'about': 0.8,
        'team': 0.7,
        'service': 0.8,
        'product': 0.8,
        'testimonial': 0.9
      }
    };
    
    return apiScores[api]?.[context.contentType] || 0.6;
  }
  
  evaluateJapaneseOptimization(prompt, context) {
    let score = 0.5;
    
    // 日本関連キーワードの存在
    const japaneseKeywords = ['japanese', 'japan', 'tokyo', 'asian', 'east asian'];
    const foundJapaneseTerms = japaneseKeywords.filter(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    score += (foundJapaneseTerms / japaneseKeywords.length) * 0.3;
    
    // ビジネス文脈の適切性
    const businessKeywords = ['business', 'professional', 'corporate', 'office'];
    const foundBusinessTerms = businessKeywords.filter(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    score += (foundBusinessTerms / businessKeywords.length) * 0.2;
    
    return Math.min(1.0, score);
  }
  
  // 生成後の品質評価
  evaluateGeneratedImage(imageData, generationTime, context) {
    const qualityScore = {
      technical_quality: this.evaluateTechnicalQuality(imageData),
      generation_speed: this.evaluateGenerationSpeed(generationTime),
      context_adherence: this.evaluateContextAdherence(imageData, context),
      overall_score: 0
    };
    
    qualityScore.overall_score = (
      qualityScore.technical_quality * 0.4 +
      qualityScore.generation_speed * 0.3 +
      qualityScore.context_adherence * 0.3
    );
    
    // 品質記録
    this.recordQuality(qualityScore, context);
    
    return qualityScore;
  }
  
  evaluateTechnicalQuality(imageData) {
    // 基本的な技術品質評価（実際の実装では画像解析ライブラリを使用）
    let score = 0.7; // ベーススコア
    
    // ファイルサイズベースの品質推定
    if (imageData.length > 100000) score += 0.2; // 大きなファイルサイズ = 高品質の可能性
    if (imageData.includes('base64')) score += 0.1; // 適切なエンコード
    
    return Math.min(1.0, score);
  }
  
  evaluateGenerationSpeed(generationTime) {
    // 生成速度評価（高速ほど高評価）
    if (generationTime < 10000) return 1.0;      // 10秒未満: 優秀
    if (generationTime < 20000) return 0.8;      // 20秒未満: 良好
    if (generationTime < 30000) return 0.6;      // 30秒未満: 普通
    if (generationTime < 45000) return 0.4;      // 45秒未満: やや遅い
    return 0.2;                                  // 45秒以上: 遅い
  }
  
  evaluateContextAdherence(imageData, context) {
    // コンテキスト適合性評価（簡易版）
    let score = 0.7; // ベーススコア
    
    // 業界とコンテンツタイプが指定されている場合はボーナス
    if (context.industry) score += 0.15;
    if (context.contentType) score += 0.15;
    
    return Math.min(1.0, score);
  }
  
  recordQuality(qualityScore, context) {
    this.qualityMetrics.push({
      timestamp: Date.now(),
      quality_score: qualityScore.overall_score,
      technical_quality: qualityScore.technical_quality,
      generation_speed: qualityScore.generation_speed,
      context_adherence: qualityScore.context_adherence,
      industry: context.industry,
      content_type: context.contentType,
      api_used: context.api_used
    });
    
    // 最新50件のメトリクスのみ保持
    if (this.qualityMetrics.length > 50) {
      this.qualityMetrics.shift();
    }
  }
  
  getQualityReport() {
    if (this.qualityMetrics.length === 0) {
      return {
        status: 'no_data',
        message: 'No quality data available'
      };
    }
    
    const recentMetrics = this.qualityMetrics.slice(-10); // 最新10件
    const avgQuality = recentMetrics.reduce((a, b) => a + b.quality_score, 0) / recentMetrics.length;
    const avgSpeed = recentMetrics.reduce((a, b) => a + b.generation_speed, 0) / recentMetrics.length;
    const avgTechnical = recentMetrics.reduce((a, b) => a + b.technical_quality, 0) / recentMetrics.length;
    
    return {
      status: 'active',
      overall_quality: avgQuality,
      technical_quality: avgTechnical,
      generation_speed: avgSpeed,
      quality_level: this.getQualityLevel(avgQuality),
      total_generations: this.qualityMetrics.length,
      recent_trend: this.getQualityTrend(),
      recommendations: this.generateRecommendations(avgQuality, avgSpeed, avgTechnical)
    };
  }
  
  getQualityLevel(score) {
    if (score >= this.qualityThresholds.excellent) return 'EXCELLENT';
    if (score >= this.qualityThresholds.good) return 'GOOD';
    if (score >= this.qualityThresholds.acceptable) return 'ACCEPTABLE';
    return 'NEEDS_IMPROVEMENT';
  }
  
  getQualityTrend() {
    if (this.qualityMetrics.length < 5) return 'INSUFFICIENT_DATA';
    
    const recent = this.qualityMetrics.slice(-5).map(m => m.quality_score);
    const older = this.qualityMetrics.slice(-10, -5).map(m => m.quality_score);
    
    if (older.length === 0) return 'STABLE';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.05) return 'IMPROVING';
    if (recentAvg < olderAvg - 0.05) return 'DECLINING';
    return 'STABLE';
  }
  
  generateRecommendations(quality, speed, technical) {
    const recommendations = [];
    
    if (quality < this.qualityThresholds.good) {
      recommendations.push('プロンプトの詳細化を推奨します');
    }
    
    if (speed < 0.6) {
      recommendations.push('より高速なAPIの使用を検討してください');
    }
    
    if (technical < 0.7) {
      recommendations.push('高品質設定の使用を推奨します');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('現在の設定は最適です');
    }
    
    return recommendations;
  }
}

module.exports = UltraQualityMonitor;