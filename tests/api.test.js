// Integration tests for api.js — hits the real Express app via supertest.
// Resend is mocked so no real emails go out. MongoDB is real (against the
// Atlas cluster's Users/Cards collections), using unique random logins per
// test and cleaning up at the end.

const express = require('express');
const cors = require('cors');
const request = require('supertest');
const { MongoClient } = require('mongodb');

// Stub Resend so sendMail() succeeds without calling out.
jest.mock('../sendMail', () => ({
    sendMail: jest.fn().mockResolvedValue({ sent: true, error: '' }),
}));

// Make sure the JWT secret is loaded the same way as in production.
require('dotenv').config({ path: '/var/cardsServer/.env' });
require('dotenv').config(); // local override

let app;
let client;
const createdLogins = [];
const createdEmails = [];

function randomSuffix() {
    return Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI, { tlsAllowInvalidCertificates: true });
    await client.connect();

    app = express();
    app.use(cors());
    app.use(express.json());
    const api = require('../api.js');
    api.setApp(app, client);
});

afterAll(async () => {
    // Clean up test users + their notes so we don't pollute the real DB.
    const db = client.db('COP4331Cards');
    if (createdLogins.length > 0) {
        const loginFilter = { Login: { $in: createdLogins } };
        const users = await db.collection('Users').find(loginFilter).project({ UserID: 1 }).toArray();
        const userIds = users.map((u) => u.UserID);
        if (userIds.length > 0) {
            await db.collection('Cards').deleteMany({ UserId: { $in: userIds } });
        }
        await db.collection('Users').deleteMany(loginFilter);
    }
    await client.close();
});

describe('POST /api/register', () => {
    test('creates a user and returns a positive id', async () => {
        const login = 'jesttest-' + randomSuffix();
        const email = login + '@example.test';
        createdLogins.push(login);
        createdEmails.push(email);

        const res = await request(app)
            .post('/api/register')
            .send({ firstName: 'Jest', lastName: 'Runner', login, password: 'demo1234', email });

        expect(res.status).toBe(200);
        expect(res.body.error).toBe('');
        expect(res.body.id).toBeGreaterThan(0);
    });

    test('rejects when email is missing', async () => {
        const login = 'jesttest-noemail-' + randomSuffix();
        createdLogins.push(login);

        const res = await request(app)
            .post('/api/register')
            .send({ firstName: 'No', lastName: 'Email', login, password: 'demo1234' });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(-1);
        expect(res.body.error).toMatch(/email/i);
    });

    test('rejects duplicate logins', async () => {
        const login = 'jesttest-dup-' + randomSuffix();
        const email1 = login + '-a@example.test';
        const email2 = login + '-b@example.test';
        createdLogins.push(login);
        createdEmails.push(email1, email2);

        const first = await request(app)
            .post('/api/register')
            .send({ firstName: 'Dup', lastName: 'One', login, password: 'demo1234', email: email1 });
        expect(first.body.id).toBeGreaterThan(0);

        const second = await request(app)
            .post('/api/register')
            .send({ firstName: 'Dup', lastName: 'Two', login, password: 'demo1234', email: email2 });
        expect(second.body.id).toBe(-1);
        expect(second.body.error).toMatch(/login/i);
    });
});

describe('POST /api/login', () => {
    test('rejects unverified users with a helpful message', async () => {
        const login = 'jesttest-unverified-' + randomSuffix();
        const email = login + '@example.test';
        createdLogins.push(login);
        createdEmails.push(email);

        await request(app)
            .post('/api/register')
            .send({ firstName: 'Un', lastName: 'Verified', login, password: 'demo1234', email });

        const res = await request(app).post('/api/login').send({ login, password: 'demo1234' });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeUndefined();
        expect(res.body.error).toMatch(/verify/i);
    });

    test('rejects wrong password', async () => {
        const login = 'jesttest-badpw-' + randomSuffix();
        const email = login + '@example.test';
        createdLogins.push(login);
        createdEmails.push(email);

        await request(app)
            .post('/api/register')
            .send({ firstName: 'Bad', lastName: 'Pw', login, password: 'demo1234', email });

        const res = await request(app).post('/api/login').send({ login, password: 'wrong-password' });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeUndefined();
        expect(res.body.error).toMatch(/incorrect/i);
    });
});

describe('GET /api/verify', () => {
    test('returns error for an invalid token', async () => {
        const res = await request(app).get('/api/verify').query({ token: 'not-a-real-token' });
        expect(res.status).toBe(200);
        expect(res.body.verified).toBe(false);
        expect(res.body.error).toMatch(/invalid/i);
    });

    test('returns 400 when token query param is missing', async () => {
        const res = await request(app).get('/api/verify');
        expect(res.status).toBe(400);
        expect(res.body.verified).toBe(false);
    });
});

describe('POST /api/addcard (JWT-gated)', () => {
    test('rejects a missing/invalid JWT', async () => {
        const res = await request(app)
            .post('/api/addcard')
            .send({ text: 'attempt without auth', jwtToken: 'definitely-not-a-jwt' });
        expect(res.status).toBe(200);
        expect(res.body.error).toMatch(/jwt/i);
    });
});

// Helper: register a user, flip Verified=true directly in Mongo, log in, return
// { login, email, userId, accessToken } so downstream tests can skip the
// register -> email-verify -> login dance.
async function createVerifiedUser() {
    const login = 'jesttest-ver-' + randomSuffix();
    const email = login + '@example.test';
    createdLogins.push(login);
    createdEmails.push(email);

    await request(app)
        .post('/api/register')
        .send({ firstName: 'Ver', lastName: 'User', login, password: 'demo1234', email });

    const db = client.db('COP4331Cards');
    await db.collection('Users').updateOne(
        { Login: login },
        { $set: { Verified: true }, $unset: { VerificationToken: '', VerificationTokenExpires: '' } }
    );

    const loginRes = await request(app).post('/api/login').send({ login, password: 'demo1234' });
    const user = await db.collection('Users').findOne({ Login: login });
    return { login, email, userId: user.UserID, accessToken: loginRes.body.accessToken };
}

describe('POST /api/login success', () => {
    test('returns a JWT accessToken for a verified user with correct password', async () => {
        const login = 'jesttest-loginok-' + randomSuffix();
        const email = login + '@example.test';
        createdLogins.push(login);
        createdEmails.push(email);

        await request(app)
            .post('/api/register')
            .send({ firstName: 'Log', lastName: 'In', login, password: 'demo1234', email });

        const db = client.db('COP4331Cards');
        await db.collection('Users').updateOne(
            { Login: login },
            { $set: { Verified: true } }
        );

        const res = await request(app).post('/api/login').send({ login, password: 'demo1234' });
        expect(res.status).toBe(200);
        expect(typeof res.body.accessToken).toBe('string');
        expect(res.body.accessToken.split('.').length).toBe(3); // JWTs have 3 parts
    });
});

describe('GET /api/verify success', () => {
    test('flips a user to Verified when a valid token is used', async () => {
        const login = 'jesttest-verifyok-' + randomSuffix();
        const email = login + '@example.test';
        createdLogins.push(login);
        createdEmails.push(email);

        await request(app)
            .post('/api/register')
            .send({ firstName: 'Vfy', lastName: 'Ok', login, password: 'demo1234', email });

        const db = client.db('COP4331Cards');
        const user = await db.collection('Users').findOne({ Login: login });
        const token = user.VerificationToken;

        const res = await request(app).get('/api/verify').query({ token });
        expect(res.status).toBe(200);
        expect(res.body.verified).toBe(true);
        expect(res.body.error).toBe('');

        const updated = await db.collection('Users').findOne({ Login: login });
        expect(updated.Verified).toBe(true);
    });
});

describe('POST /api/addcard success', () => {
    test('creates a note for a verified logged-in user', async () => {
        const { accessToken } = await createVerifiedUser();
        const res = await request(app)
            .post('/api/addcard')
            .send({ text: 'Integration test note', jwtToken: accessToken });
        expect(res.status).toBe(200);
        expect(res.body.error).toBe('');
        expect(typeof res.body.id).toBe('string');
        expect(res.body.jwtToken).toBeDefined();
        expect(typeof res.body.jwtToken.accessToken).toBe('string');
    });
});

describe('POST /api/deletecard ownership', () => {
    test('rejects a delete attempt from a user who does not own the card', async () => {
        const userA = await createVerifiedUser();
        const userB = await createVerifiedUser();

        const addRes = await request(app)
            .post('/api/addcard')
            .send({ text: 'A-owned note', jwtToken: userA.accessToken });
        expect(addRes.body.error).toBe('');
        const cardId = addRes.body.id;

        const delRes = await request(app)
            .post('/api/deletecard')
            .send({ id: cardId, jwtToken: userB.accessToken });
        expect(delRes.status).toBe(200);
        expect(delRes.body.error).toMatch(/unauthorized/i);
    });
});
