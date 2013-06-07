var conversations = require('./routes/conversations.js');
var pushNotifications = require('./routes/pushNotifications.js');
var express = require('express');
var colors = require('colors');

var app = express();
app.use(express.bodyParser());

var PORT = 3000;

// GET PETITIONS
app.get('/arkmail/conversations', conversations.retrieveConversations);

// POST PETITIONS
app.post('/arkmail/register', pushNotifications.registerDevice);

app.listen(PORT);
console.log('ArkMail listening on '.green + PORT);
// conversations.retrieveConversations(yahooCredentials, configYahoo);