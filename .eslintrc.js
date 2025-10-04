module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  plugins: [
    'jest',
    '@typescript-eslint'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    },
    project: ['./tsconfig.json', './frontend/tsconfig.json', './api/tsconfig.json'],
    tsconfigRootDir: __dirname
  },
  rules: {
    // エラーレベルの設定
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    
    // TypeScript固有のルール
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    
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
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    {
      files: ['api/**/*.js'],
      rules: {
        'no-console': 'off', // APIファイルではデバッグログを許可
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        'curly': 'off'
      }
    },
    {
      files: ['tests/**/*.js', '**/*.test.js', 'tests/**/*.ts', '**/*.test.ts'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off', // テストファイルではconsole.logを許可
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off'
      }
    },
    {
      files: ['frontend/**/*.jsx', 'frontend/**/*.tsx', '**/*.jsx', '**/*.tsx'],
      rules: {
        'no-undef': 'off', // JSXファイルではReactやimport.metaを許可
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off'
      }
    },
    {
      files: ['frontend/dist/**/*', 'frontend/node_modules/**/*', 'dist/**/*'],
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
    'coverage/',
    'dist/',
    '*.d.ts'
  ]
};