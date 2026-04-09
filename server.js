// temp comment to test github workflow

const express = require('express');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();
const url = process.env.MONGODB_URI;
const client = new MongoClient(url, {tlsAllowInvalidCertificates: true});
client.connect();

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) =>
{
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, Authorization'
	);
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, PATCH, DELETE, OPTIONS'
	);
	next();
});

app.post('/api/addcard', async (req, res, next) =>
{
  // incoming: userId, text
  // outgoing: error
  const { userId, text } = req.body;

  const db = client.db('COP4331Cards');

  // Get last note to auto-increment id
  const lastNote = await db.collection('Cards').find().sort({ id: -1 }).limit(1).toArray();
  const newId = (lastNote.length > 0) ? lastNote[0].id + 1 : 1;

  const newNote = {
    id: newId,
    text: text,
    createdAt: new Date(),
    UserId: userId        // keep userId for ownership tracking
  };

  var error = '';
  try
  {
    const result = await db.collection('Cards').insertOne(newNote);
  }
  catch(e)
  {
    error = e.toString();
  }

  var ret = { error: error };
  res.status(200).json(ret);
});

app.post('/api/login', async (req, res, next) =>
{
	// incoming: login, password
	// outgoing: id, firstName, lastName, error
	var error = '';

	const { login, password } = req.body;

	const db = client.db('COP4331Cards');
	const results = await
	db.collection('Users').find({Login:login,Password:password}).toArray();
	var id = -1;
	var fn = '';
	var ln = '';

	if(results.length > 0)
	{
		id = results[0].UserID;
		fn = results[0].FirstName;
		ln = results[0].LastName;
	}

	var ret = { id:id, firstName:fn, lastName:ln, error:error};
	res.status(200).json(ret);
});

app.post('/api/register', async (req, res, next) =>
{
	// incoming: firstName, lastName, login, password
	// outgoing: id, error
	var error = '';
	var id = -1;

	const { firstName, lastName, login, password } = req.body;

	try
	{
		const db = client.db('COP4331Cards');
		const usersCollection = db.collection('Users');

		const existingUser = await usersCollection.findOne({ Login: login });
		if(existingUser)
		{
			return res.status(200).json({ id: id, error: 'Login already exists' });
		}

		const lastUser = await usersCollection.find().sort({ UserID: -1 }).limit(1).toArray();
		id = (lastUser.length > 0) ? lastUser[0].UserID + 1 : 1;

		const newUser = {
			UserID: id,
			FirstName: firstName,
			LastName: lastName,
			Login: login,
			Password: password
		};

		await usersCollection.insertOne(newUser);
	}
	catch(e)
	{
		error = e.toString();
		id = -1;
	}

	var ret = { id:id, error:error };
	res.status(200).json(ret);
});

app.post('/api/searchcards', async (req, res, next) =>
{
  // incoming: userId, search
  // outgoing: results[], error
  const { userId, search } = req.body;
  var error = '';
  var _search = search.toLowerCase().trim();

  const db = client.db('COP4331Cards');
  const results = await db.collection('Cards').find({
    UserId: userId,
    "text": { $regex: _search + '.*', $options: 'i' }
  }).toArray();

  var _ret = [];
  for (var i = 0; i < results.length; i++)
  {
    _ret.push({
      id: results[i].id,
      text: results[i].text,
      createdAt: results[i].createdAt
    });
  }

  var ret = { results: _ret, error: error };
  res.status(200).json(ret);
});

app.post('/api/deletecard', async (req, res, next) =>
{
  // incoming: id
  // outgoing: error
  const { id } = req.body;
  var error = '';
  try
  {
    const db = client.db('COP4331Cards');
    await db.collection('Cards').deleteOne({ id: id });
  }
  catch(e)
  {
    error = e.toString();
  }
  var ret = { error: error };
  res.status(200).json(ret);
});

app.listen(5000); // start Node + Express server on port 5000
