var Promise = require('promise');
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';
const SPREADSHEET_ID = "<*Redacted for public release*>";
const CATEGORIES_RANGE = "Categories!A2:B";
const TRANSACTIONS_RANGE = "Transactions!A2:D";

// Returns a promise which resolves with the list of categorised transactions
exports.getTransactions = function() {
	return new Promise(function(resolve, reject) {
		console.log("Downloading transactions...");
		getAuthClient().then(function(auth) {
			return downloadTransactions(auth);
		}).then(function(transactions){
			console.log("Transactions downloaded")
			resolve(transactions);
		});
	});
};

// Returns a promise which resolves with the list of categories
exports.getCategories = function(){
	return new Promise(function(resolve, reject) {
		console.log("Downloading categories...");
		getAuthClient().then(function(auth) {
			return downloadCategories(auth);
		}).then(function(categories){
			console.log("Categories downloaded")
			resolve(categories);
		});
	});
}

// Adapted from the Google OAuth2.0 Sample
// Returns a promise which resolves with an auth client for API requests
function getAuthClient(){
  return new Promise(function(resolve, reject) {
	fs.readFile('credentials.json', (err, content) => {
	  if (err) return console.log('Error loading client secret file:', err);
	  const {client_secret, client_id, redirect_uris} = JSON.parse(content).installed;
	  const oAuth2Client = new google.auth.OAuth2(
		  client_id, client_secret, redirect_uris[0]);
	  // Check if a token exists already 
	  fs.readFile(TOKEN_PATH, (err, token) => {
		if (err) return getNewToken(oAuth2Client);
		oAuth2Client.setCredentials(JSON.parse(token));
		resolve(oAuth2Client);
	  });
	});
  });
}

// From the Google OAuth2.0 sample
// First time & new token setup flow via command line
function getNewToken(oAuth2Client) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});
	console.log('Authorize this app by visiting this url:', authUrl);
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.question('Enter the code from that page here: ', (code) => {
		rl.close();
		oAuth2Client.getToken(code, (err, token) => {
			if (err) reject('Error while trying to retrieve access token' + err);
			oAuth2Client.setCredentials(token);
			// Store the token to disk for later program executions
			fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
				if (err) reject(err);
				console.log('Token stored to', TOKEN_PATH);
			});
			resolve(oAuth2Client);
		});
	});
}

// Generic function to retrieve content from our main spreadsheet
var getSpreadsheetData = function(auth, range){
	return new Promise(function(resolve, reject) {
		const sheets = google.sheets({version: 'v4', auth});
		sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: range,
		}, (err, res) => {
			if (err){
				reject(Error('The API returned an error: ' + err));
			}else{
				resolve(res.data.values);
			}
		});
	});
}

// Retrieve category data and transform into the expected data format
function downloadCategories(auth){
	return new Promise(function(resolve, reject) {
		getSpreadsheetData(auth, CATEGORIES_RANGE).then(function(response) {
			var categories = [];
			for (var i = 0; i < response.length; i++) {
				categories.push({"id" : response[i][0], "parent" : response[i][1]});
			}
			resolve(categories);
		});
	});
}

// Retrieve transactional data and transform into the expected data format
function downloadTransactions(auth){
	return new Promise(function(resolve, reject) {
		getSpreadsheetData(auth, TRANSACTIONS_RANGE).then(function(response) {
			var transactions = [];
			for (var i = 0; i < response.length; i++) {
				transactions.push({"date" : response[i][0], "name" : response[i][1], "value" : parseFloat(response[i][2]), "category" : response[i][3]});
			}
			resolve(transactions);
		});
	});
}