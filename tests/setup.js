// テストセットアップファイル
// 全体的なテスト設定とモック設定

// 環境変数のモック設定
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.STABILITY_API_KEY = 'test-stability-key';
process.env.REPLICATE_API_TOKEN = 'test-replicate-key';

// Console.logを抑制（テスト実行時のノイズ削減）
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// グローバルなテストヘルパー
global.createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  end: jest.fn().mockReturnThis(),
  setHeader: jest.fn().mockReturnThis(),
});

global.createMockRequest = (method = 'POST', body = {}, query = {}, headers = {}) => ({
  method,
  body,
  query,
  headers: {
    'content-type': 'application/json',
    ...headers
  }
});

// デフォルトのタイムアウト設定
jest.setTimeout(30000);