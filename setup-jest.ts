import 'jest-preset-angular/setup-jest';

// Reset TestBed after each test to avoid "Cannot set base providers" error
afterEach(() => {
    jest.clearAllMocks();
});
