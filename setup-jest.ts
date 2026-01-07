// Setup file for Jest
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// Initialize test environment
// This is safe to call - it will only initialize once
try {
    setupZoneTestEnv();
} catch (error) {
    // Ignore if already initialized by @angular-builders/jest
    if (!(error instanceof Error && error.message.includes('Cannot set base providers'))) {
        throw error;
    }
}

// Mock for matchMedia (needed for Ionic components)
if (typeof window !== 'undefined' && !window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
}

// Mock ResizeObserver if not defined
if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
    }));
}

// Mock IntersectionObserver if not defined
if (typeof global.IntersectionObserver === 'undefined') {
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
    }));
}

// Mock requestAnimationFrame if not defined
if (typeof global.requestAnimationFrame === 'undefined') {
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
}
if (typeof global.cancelAnimationFrame === 'undefined') {
    global.cancelAnimationFrame = jest.fn();
}

// Suppress console warnings for Ionic deprecation messages
const originalWarn = console.warn;
console.warn = (...args) => {
    if (
        typeof args[0] === 'string' &&
        (args[0].includes('Ionic') || args[0].includes('deprecated'))
    ) {
        return;
    }
    originalWarn.apply(console, args);
};
