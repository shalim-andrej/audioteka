// jest.config.ts
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Путь к твоему Next.js приложению для загрузки next.config.js и .env файлов
  dir: './',
});

const config: Config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Исключаем из тестов папки, где тестов быть не должно:
  // node_modules, .next, deploy-out (копия сборки), coverage.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/deploy-out/',
    '/coverage/',
  ],

  // Явный маппинг алиасов из tsconfig.json.
  // Без него Jest иногда не подхватывает "@/..." автоматически.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default createJestConfig(config);