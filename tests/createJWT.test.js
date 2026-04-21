// Unit tests for createJWT.js the JWT helper used by /api/login and all
// protected endpoints. These tests don't touch MongoDB, the HTTP layer, or
// Resend, which keeps them fast and deterministic.

const jwt = require('jsonwebtoken');

// The module under test reads process.env.ACCESS_TOKEN_SECRET at import time.
// Set a known secret before requiring it so signature verification is reproducible.
process.env.ACCESS_TOKEN_SECRET = 'test-secret-not-for-production';
const token = require('../createJWT.js');

describe('createJWT', () => {
    describe('createToken', () => {
        test('returns an object with an accessToken string', () => {
            const result = token.createToken('Ada', 'Lovelace', 42);
            expect(result).toHaveProperty('accessToken');
            expect(typeof result.accessToken).toBe('string');
        });

        test('the signed token decodes to the payload we passed in', () => {
            const { accessToken } = token.createToken('Ada', 'Lovelace', 42);
            const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
            expect(decoded.firstName).toBe('Ada');
            expect(decoded.lastName).toBe('Lovelace');
            expect(decoded.userId).toBe(42);
        });
    });

    describe('isExpired', () => {
        test('returns false for a freshly-signed valid token', () => {
            const { accessToken } = token.createToken('Alan', 'Turing', 1);
            expect(token.isExpired(accessToken)).toBe(false);
        });

        test('returns true for garbage input', () => {
            expect(token.isExpired('not-a-real-jwt')).toBe(true);
        });

        test('returns true for a token signed with a different secret', () => {
            const forged = jwt.sign({ userId: 1 }, 'different-secret', { expiresIn: '1h' });
            expect(token.isExpired(forged)).toBe(true);
        });
    });

    describe('refresh', () => {
        test('returns a token carrying the same payload', () => {
            const first = token.createToken('Grace', 'Hopper', 99);
            const refreshed = token.refresh(first.accessToken);
            const decoded = jwt.verify(refreshed.accessToken, process.env.ACCESS_TOKEN_SECRET);
            expect(decoded.firstName).toBe('Grace');
            expect(decoded.lastName).toBe('Hopper');
            expect(decoded.userId).toBe(99);
        });
    });
});
