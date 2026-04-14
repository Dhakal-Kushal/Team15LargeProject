const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
var token = require('./createJWT.js');

const SALT_ROUNDS = 10;

exports.setApp = (app, client) => {
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

        // Use a UUID to avoid race conditions from sequential ID generation
        const newId = crypto.randomUUID();

        const newNote = {
            id: newId,
            text: text,
            createdAt: new Date(),
            UserId: userId
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

    app.post('/api/login', async (req, res, next) => {
        // incoming: login, password
        // outgoing: accessToken, error
        const { login, password } = req.body;

        const db = client.db('COP4331Cards');

        // Find by login only, then compare password with bcrypt
        const results = await db.collection('Users').find({ Login: login }).toArray();

        var ret;
        if (results.length > 0) {
            const user = results[0];
            const passwordMatch = await bcrypt.compare(password, user.Password);

            if (passwordMatch) {
                const id = user.UserID;
                const fn = user.FirstName;
                const ln = user.LastName;
                try {
                    ret = token.createToken(fn, ln, id);
                } catch(e) {
                    ret = { error: e.message };
                }
            } else {
                ret = { error: "Login/Password incorrect" };
            }
        } else {
            ret = { error: "Login/Password incorrect" };
        }

        res.status(200).json(ret);
    });

    app.post('/api/register', async (req, res, next) => {
        // incoming: firstName, lastName, login, password
        // outgoing: id, error
        var error = '';
        var id = -1;

        const { firstName, lastName, login, password } = req.body;

        try {
            const db = client.db('COP4331Cards');
            const usersCollection = db.collection('Users');

            const existingUser = await usersCollection.findOne({ Login: login });
            if (existingUser) {
                return res.status(200).json({ id: id, error: 'Login already exists' });
            }

            const lastUser = await usersCollection.find().sort({ UserID: -1 }).limit(1).toArray();
            id = (lastUser.length > 0) ? lastUser[0].UserID + 1 : 1;

            // Hash the password before storing
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            const newUser = {
                UserID: id,
                FirstName: firstName,
                LastName: lastName,
                Login: login,
                Password: hashedPassword
            };

            await usersCollection.insertOne(newUser);
        } catch(e) {
            error = e.toString();
            id = -1;
        }

        res.status(200).json({ id: id, error: error });
    });

    app.post('/api/searchcards', async (req, res, next) => {
        // incoming: search, jwtToken
        // outgoing: results[], error, jwtToken
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
            "text": { $regex: _search + '.*', $options: 'i' }
        }).toArray();

        var _ret = [];
        for (var i = 0; i < results.length; i++) {
            _ret.push({
                id: results[i].id,
                text: results[i].text,
                createdAt: results[i].createdAt
            });
        }

        var refreshedToken = null;
        try {
            refreshedToken = token.refresh(jwtToken);
        } catch(e) {
            console.log(e.message);
        }

        res.status(200).json({ results: _ret, error: error, jwtToken: refreshedToken });
    });

    app.post('/api/deletecard', async (req, res, next) => {
        // incoming: id, jwtToken
        // outgoing: error, jwtToken
        const { id, jwtToken } = req.body;
        var error = '';

        try {
            if (token.isExpired(jwtToken)) {
                return res.status(200).json({ error: 'The JWT is no longer valid', jwtToken: '' });
            }
        } catch(e) {
            console.log(e.message);
        }

        // Extract userId from JWT and verify the card belongs to this user
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
}