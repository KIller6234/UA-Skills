import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\.spec\.ts$',
  transform: { '^.+\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  globals: { 'ts-jest': { diagnostics: false, isolatedModules: true } },
  moduleNameMapper: {
    '^@nih/config$': '<rootDir>/../../../libs/config/src/index.ts',
    '^@nih/database$': '<rootDir>/../../../libs/database/src/index.ts',
    '^@nih/queues$': '<rootDir>/../../../libs/queues/src/index.ts',
    '^@nih/llm$': '<rootDir>/../../../libs/llm/src/index.ts',
    '^@nih/feed$': '<rootDir>/../../../libs/feed/src/index.ts',
    '^@nih/ner$': '<rootDir>/../../../libs/ner/src/index.ts',
    '^@nih/auth$': '<rootDir>/../../../libs/auth/src/index.ts',
    '^@nih/common$': '<rootDir>/../../../libs/common/src/index.ts',
    '^@prisma/client$': '<rootDir>/../../../libs/database/node_modules/@prisma/client',
  },
};

export default config;
