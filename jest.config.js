// Jest configuration without preset
module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.spec.ts'],
    moduleFileExtensions: ['ts', 'js', 'html'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/main.ts',
        '!src/polyfills.ts',
        '!src/test.ts',
        '!src/environments/**'
    ],
    coverageDirectory: 'coverage',
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: '<rootDir>/tsconfig.spec.json',
            stringifyContentPathRegex: '\\.html$',
            isolatedModules: true
        }]
    },
    moduleNameMapper: {
        '^@app/(.*)$': '<rootDir>/src/app/$1',
        '^@environments/(.*)$': '<rootDir>/src/environments/$1'
    },
    setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/dist/',
        '<rootDir>/www/'
    ],
    transformIgnorePatterns: [
        'node_modules/(?!(@angular|@ionic|@ngrx|rxjs)/)'
    ]
};
