const logger = require('./logger');

// ブラウザインスタンスのプール管理
let browserInstance = null;
let browserLastUsed = Date.now();
const BROWSER_TIMEOUT = 5 * 60 * 1000; // 5分間未使用で自動クローズ

// 定期的なブラウザクリーンアップ
setInterval(async () => {
  if (browserInstance && Date.now() - browserLastUsed > BROWSER_TIMEOUT) {
    logger.info('Closing idle browser instance');
    try {
      await browserInstance.close();
      browserInstance = null;
    } catch (error) {
      logger.error('Error closing browser:', error);
      browserInstance = null;
    }
  }
}, 60 * 1000); // 1分毎にチェック

/**
 * ブラウザインスタンスを取得（プール化）
 */
async function getBrowser() {
  const playwright = await import('playwright-core');
  const chromium = playwright.chromium;

  // 既存のブラウザが利用可能かチェック
  if (browserInstance) {
    try {
      // ブラウザが生きているか確認
      const contexts = browserInstance.contexts();
      if (contexts) {
        browserLastUsed = Date.now();
        logger.info('Reusing existing browser instance');
        return browserInstance;
      }
    } catch (error) {
      logger.warn('Existing browser is dead, creating new one');
      browserInstance = null;
    }
  }

  // 新しいブラウザを起動
  logger.info('Launching new Playwright browser instance');
  browserInstance = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security'  // CORS回避（スクレイピング用）
    ]
  });

  browserLastUsed = Date.now();
  return browserInstance;
}

/**
 * Playwrightを使用してページのスナップショットを取得
 * Note: Vercel環境で動作する実装
 * @param {string} url - スナップショットを取得するURL
 * @returns {Promise<{success: boolean, title?: string, url?: string, description?: string, bodyText?: string, snapshot?: any, method?: string, error?: string}>}
 */
async function getPageSnapshot(url) {
  try {
    const browser = await getBrowser();

    logger.info('Creating browser context for:', url);

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // ページに移動（タイムアウト30秒）
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // アクセシビリティスナップショット取得
    const snapshot = await page.accessibility.snapshot();

    // ページタイトルとURL取得
    const title = await page.title();
    const currentUrl = page.url();

    // テキストコンテンツ抽出
    const bodyText = await page.evaluate(() => {
      // スクリプトやスタイルを除外
      const scripts = document.querySelectorAll('script, style, nav, footer');
      scripts.forEach(el => el.remove());
      return document.body.innerText;
    });

    // メタ情報取得
    const metaDescription = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="description"]') ||
                   document.querySelector('meta[property="og:description"]');
      return meta ? meta.getAttribute('content') : '';
    });

    // コンテキストのみクローズ（ブラウザは再利用）
    await context.close();

    logger.info('Playwright snapshot captured successfully');

    return {
      success: true,
      title,
      url: currentUrl,
      description: metaDescription,
      bodyText: bodyText.substring(0, 5000),
      snapshot,
      method: 'playwright-snapshot'
    };

  } catch (error) {
    logger.error('Playwright snapshot error:', error);
    return {
      success: false,
      error: error.message,
      method: 'playwright-snapshot'
    };
  }
}

/**
 * Playwrightを使用してスクリーンショットを取得
 * @param {string} url - スクリーンショットを取得するURL
 * @returns {Promise<{success: boolean, screenshot?: string, method?: string, error?: string}>}
 */
async function getPageScreenshot(url) {
  try {
    const browser = await getBrowser();

    logger.info('Taking screenshot with Playwright for:', url);

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // スクリーンショットをBase64で取得
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false, // ビューポートのみ
      encoding: 'base64'
    });

    // コンテキストのみクローズ（ブラウザは再利用）
    await context.close();

    logger.info('Playwright screenshot captured successfully');

    return {
      success: true,
      screenshot: `data:image/png;base64,${screenshot}`,
      method: 'playwright-screenshot'
    };

  } catch (error) {
    logger.error('Playwright screenshot error:', error);
    return {
      success: false,
      error: error.message,
      method: 'playwright-screenshot'
    };
  }
}

/**
 * Playwrightが利用可能かチェック
 * @returns {Promise<boolean>}
 */
async function isPlaywrightAvailable() {
  try {
    await import('playwright-core');
    return true;
  } catch (error) {
    logger.warn('Playwright not available:', error.message);
    return false;
  }
}

module.exports = {
  getPageSnapshot,
  getPageScreenshot,
  isPlaywrightAvailable
};
