/** @type {import('jest').Config} */
module.exports = {
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
    testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/www/'],
    moduleNameMapper: {
        '^@app/(.*)$': '<rootDir>/src/app/$1',
        '^@environments/(.*)$': '<rootDir>/src/environments/$1',
        // Mock de ionicons para evitar problemas ESM
        '^ionicons/icons$': '<rootDir>/src/test-mocks/ionicons.mock.ts',
        '^ionicons/components/ion-icon.js$': '<rootDir>/src/test-mocks/ion-icon.mock.ts',
        '^ionicons/components/(.*)$': '<rootDir>/src/test-mocks/ionicons.mock.ts',
    },
    transform: {
        '^.+\\.(ts|mjs|js|html)$': [
            'jest-preset-angular',
            {
                tsconfig: '<rootDir>/tsconfig.spec.json',
                stringifyContentPathRegex: '\\.(html|svg)$',
            },
        ],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@angular|@ionic|ionicons|@stencil|@capacitor|jeep-sqlite|rxjs|flat)/)',
    ],
    moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
    testEnvironment: 'jsdom',
    testEnvironmentOptions: {
        customExportConditions: ['node', 'node-addons'],
    },
    // Increased timeout for Angular compilation
    testTimeout: 30000,
    // Cache for faster subsequent runs
    cache: true,
    cacheDirectory: '<rootDir>/.jest-cache',
};
