const express = require('express');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();
const url = process.env.MONGODB_URI;
const client = new MongoClient(url, {tlsAllowInvalidCertificates: true});
client.connect();
var api = require('./api.js');

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
api.setApp( app, client );
app.listen(5000);
