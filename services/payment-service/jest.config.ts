import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    clearMocks: true,
};

export default config;
