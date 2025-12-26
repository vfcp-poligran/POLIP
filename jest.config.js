module.exports = {
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
    testEnvironment: 'jsdom',
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/dist/',
        '<rootDir>/www/'
    ],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/main.ts',
        '!src/polyfills.ts',
        '!src/test.ts',
        '!src/environments/**'
    ],
    moduleNameMapper: {
        '^@app/(.*)$': '<rootDir>/src/app/$1',
        '^@environments/(.*)$': '<rootDir>/src/environments/$1'
    },
    transformIgnorePatterns: ['node_modules/(?!@angular|@ionic)']
};
