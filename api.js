const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
var token = require('./createJWT.js');
var { sendMail } = require('./sendMail.js');

const SALT_ROUNDS = 10;
const APP_URL = process.env.APP_URL || 'http://174.138.45.229';

function generateEmailToken() {
    return crypto.randomBytes(32).toString('hex');
}

exports.setApp = (app, client) => {

    app.post('/api/register', async (req, res, next) => {
        // incoming: firstName, lastName, login, password, email
        // outgoing: id, error
        var error = '';
        var id = -1;

        const { firstName, lastName, login, password, email } = req.body;

        if (!email) {
            return res.status(200).json({ id: -1, error: 'Email is required' });
        }

        try {
            const db = client.db('COP4331Cards');
            const usersCollection = db.collection('Users');

            const existingUser = await usersCollection.findOne({ Login: login });
            if (existingUser) {
                return res.status(200).json({ id: -1, error: 'Login already exists' });
            }

            const existingEmail = await usersCollection.findOne({ Email: email });
            if (existingEmail) {
                return res.status(200).json({ id: -1, error: 'Email already registered' });
            }

            const lastUser = await usersCollection.find().sort({ UserID: -1 }).limit(1).toArray();
            id = (lastUser.length > 0) ? lastUser[0].UserID + 1 : 1;

            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            const verificationToken = generateEmailToken();
            const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

            const newUser = {
                UserID: id,
                FirstName: firstName,
                LastName: lastName,
                Login: login,
                Password: hashedPassword,
                Email: email,
                Verified: false,
                VerificationToken: verificationToken,
                VerificationTokenExpires: verificationExpires,
            };

            await usersCollection.insertOne(newUser);

            const verifyLink = `${APP_URL}/verify?token=${verificationToken}`;
            const html = `
              <h2>Welcome to the Team 15 Study App, ${firstName}!</h2>
              <p>Click the link below to verify your email address and activate your account:</p>
              <p><a href="${verifyLink}">${verifyLink}</a></p>
              <p>This link expires in 24 hours.</p>
              <p>If you didn't create an account, you can ignore this email.</p>
            `;
            await sendMail(email, 'Verify your Study App account', html);
        } catch(e) {
            error = e.toString();
            id = -1;
        }

        res.status(200).json({ id: id, error: error });
    });

    app.post('/api/login', async (req, res, next) => {
        // incoming: login, password
        // outgoing: accessToken, error
        const { login, password } = req.body;

        const db = client.db('COP4331Cards');
        const results = await db.collection('Users').find({ Login: login }).toArray();

        var ret;
        if (results.length > 0) {
            const user = results[0];
            const passwordMatch = await bcrypt.compare(password, user.Password);

            if (passwordMatch) {
                // !== true also rejects legacy users with no Verified field.
                if (user.Verified !== true) {
                    ret = { error: 'Please verify your email before logging in' };
                } else {
                    const id = user.UserID;
                    const fn = user.FirstName;
                    const ln = user.LastName;
                    try {
                        ret = token.createToken(fn, ln, id);
                    } catch(e) {
                        ret = { error: e.message };
                    }
                }
            } else {
                ret = { error: "Login/Password incorrect" };
            }
        } else {
            ret = { error: "Login/Password incorrect" };
        }

        res.status(200).json(ret);
    });

    app.get('/api/verify', async (req, res, next) => {
        const { token: tokenParam } = req.query;

        if (!tokenParam) {
            return res.status(400).json({ verified: false, error: 'Missing token' });
        }

        try {
            const db = client.db('COP4331Cards');
            const usersCollection = db.collection('Users');

            const user = await usersCollection.findOne({ VerificationToken: tokenParam });
            if (!user) {
                return res.status(200).json({ verified: false, error: 'Invalid token' });
            }

            if (user.VerificationTokenExpires && new Date(user.VerificationTokenExpires) < new Date()) {
                return res.status(200).json({ verified: false, error: 'Token expired' });
            }

            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: { Verified: true },
                    $unset: { VerificationToken: '', VerificationTokenExpires: '' },
                }
            );

            res.status(200).json({ verified: true, error: '' });
        } catch(e) {
            res.status(200).json({ verified: false, error: e.toString() });
        }
    });

    app.post('/api/forgot-password', async (req, res, next) => {
        // incoming: email
        // outgoing: sent (bool), error
        const { email } = req.body;

        try {
            const db = client.db('COP4331Cards');
            const usersCollection = db.collection('Users');

            const user = await usersCollection.findOne({ Email: email });

            // Same response either way to prevent email enumeration.
            if (!user) {
                return res.status(200).json({ sent: true, error: '' });
            }

            const resetToken = generateEmailToken();
            const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        ResetToken: resetToken,
                        ResetTokenExpires: resetExpires,
                    },
                }
            );

            const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
            const html = `
              <h2>Password Reset Request</h2>
              <p>Hi ${user.FirstName},</p>
              <p>We received a request to reset your password. Click the link below to choose a new one:</p>
              <p><a href="${resetLink}">${resetLink}</a></p>
              <p>This link expires in 1 hour.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
            `;
            await sendMail(email, 'Reset your Study App password', html);

            res.status(200).json({ sent: true, error: '' });
        } catch(e) {
            res.status(200).json({ sent: false, error: e.toString() });
        }
    });

    app.post('/api/reset-password', async (req, res, next) => {
        // incoming: token, newPassword
        // outgoing: success (bool), error
        const { token: tokenParam, newPassword } = req.body;

        if (!tokenParam || !newPassword) {
            return res.status(200).json({ success: false, error: 'Missing token or password' });
        }

        try {
            const db = client.db('COP4331Cards');
            const usersCollection = db.collection('Users');

            const user = await usersCollection.findOne({ ResetToken: tokenParam });
            if (!user) {
                return res.status(200).json({ success: false, error: 'Invalid reset token' });
            }

            if (user.ResetTokenExpires && new Date(user.ResetTokenExpires) < new Date()) {
                return res.status(200).json({ success: false, error: 'Reset token expired' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: { Password: hashedPassword },
                    $unset: { ResetToken: '', ResetTokenExpires: '' },
                }
            );

            res.status(200).json({ success: true, error: '' });
        } catch(e) {
            res.status(200).json({ success: false, error: e.toString() });
        }
    });

    app.post('/api/addcard', async (req, res, next) => {
        // incoming: text, jwtToken
        // outgoing: error, jwtToken, id
        const { text, jwtToken } = req.body;

        try {
            if (token.isExpired(jwtToken)) {
                return res.status(200).json({ error: 'The JWT is no longer valid', jwtToken: '' });
            }
        } catch(e) {
            console.log(e.message);
        }

        const decoded = jwt.decode(jwtToken, { complete: true });
        const userId = decoded?.payload?.userId;

        const db = client.db('COP4331Cards');

        const newId = crypto.randomUUID();

        const newNote = {
            id: newId,
            text: text,
            createdAt: new Date(),
            UserId: userId,
        };

        var error = '';
        try {
            await db.collection('Cards').insertOne(newNote);
        } catch(e) {
            error = e.toString();
        }

        var refreshedToken = null;
        try {
            refreshedToken = token.refresh(jwtToken);
        } catch(e) {
            console.log(e.message);
        }

        res.status(200).json({ error: error, jwtToken: refreshedToken, id: newId });
    });

    app.post('/api/searchcards', async (req, res, next) => {
        const { search, jwtToken } = req.body;
        var error = '';

        try {
            if (token.isExpired(jwtToken)) {
                return res.status(200).json({ error: 'The JWT is no longer valid', jwtToken: '' });
            }
        } catch(e) {
            console.log(e.message);
        }

        const decoded = jwt.decode(jwtToken, { complete: true });
        const userId = decoded?.payload?.userId;

        var _search = search.toLowerCase().trim();

        const db = client.db('COP4331Cards');
        const results = await db.collection('Cards').find({
            UserId: userId,
            "text": { $regex: _search + '.*', $options: 'i' },
        }).toArray();

        const _ret = results.map((r) => ({ id: r.id, text: r.text, createdAt: r.createdAt }));

        var refreshedToken = null;
        try {
            refreshedToken = token.refresh(jwtToken);
        } catch(e) {
            console.log(e.message);
        }

        res.status(200).json({ results: _ret, error: error, jwtToken: refreshedToken });
    });

    app.post('/api/deletecard', async (req, res, next) => {
        const { id, jwtToken } = req.body;
        var error = '';

        try {
            if (token.isExpired(jwtToken)) {
                return res.status(200).json({ error: 'The JWT is no longer valid', jwtToken: '' });
            }
        } catch(e) {
            console.log(e.message);
        }

        const decoded = jwt.decode(jwtToken, { complete: true });
        const userId = decoded?.payload?.userId;

        try {
            const db = client.db('COP4331Cards');
            const card = await db.collection('Cards').findOne({ id: id });

            if (!card) {
                return res.status(200).json({ error: 'Card not found', jwtToken: '' });
            }

            if (card.UserId !== userId) {
                return res.status(200).json({ error: 'Unauthorized', jwtToken: '' });
            }

            await db.collection('Cards').deleteOne({ id: id });
        } catch(e) {
            error = e.toString();
        }

        var refreshedToken = null;
        try {
            refreshedToken = token.refresh(jwtToken);
        } catch(e) {
            console.log(e.message);
        }

        res.status(200).json({ error: error, jwtToken: refreshedToken });
    });
};
