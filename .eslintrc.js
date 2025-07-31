module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  plugins: [
    'jest'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    // エラーレベルの設定
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    
    // セキュリティ関連
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-script-url': 'error',
    
    // コード品質
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    
    // Jest関連
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error'
  },
  overrides: [
    {
      files: ['tests/**/*.js', '**/*.test.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off' // テストファイルではconsole.logを許可
      }
    },
    {
      files: ['frontend/**/*.jsx', '**/*.jsx'],
      rules: {
        'no-undef': 'off' // JSXファイルではReactやimport.metaを許可
      }
    },
    {
      files: ['frontend/dist/**/*', 'frontend/node_modules/**/*'],
      rules: {
        // ビルド生成物とnode_modulesは除外
      }
    }
  ],
  ignorePatterns: [
    'frontend/dist/',
    'frontend/node_modules/',
    'node_modules/',
    '*.min.js',
    'build/',
    'coverage/'
  ]
};