// コンテンツ分析ユーティリティ
const { keywords } = require('./keywords');

function analyzeContent(text, url) {
  // 業界の検出
  const industries = Object.keys(keywords.industries);
  let detectedIndustry = null;
  let maxScore = 0;
  
  for (const industry of industries) {
    const industryKeywords = keywords.industries[industry];
    let score = 0;
    
    for (const keyword of industryKeywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        score++;
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      detectedIndustry = industry;
    }
  }
  
  // コンテンツタイプの検出
  const contentTypes = [];
  for (const [type, typeKeywords] of Object.entries(keywords.contentTypes)) {
    for (const keyword of typeKeywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        contentTypes.push({ type, confidence: 'medium' });
        break;
      }
    }
  }
  
  return {
    industry: detectedIndustry ? { industry: detectedIndustry, confidence: 'medium' } : null,
    contentTypes: contentTypes.length > 0 ? contentTypes : [{ type: 'hero', confidence: 'low' }]
  };
}

module.exports = { analyzeContent };