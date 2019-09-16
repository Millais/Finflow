var Promise = require('promise');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser')
var analysis = require('./analysis');
var graph = require('./graph');
var preprocess = require('./preprocess');
var app = express();
var transactions, categories;

// Setup middleware immediately
app.use(bodyParser.json());

// Setup server with the user's transactions
exports.initialise = function (initTransactions, initCategories) {
	transactions = initTransactions;
	categories = initCategories;

	// Define directory to serve content from and start listening
	app.use('/', express.static(__dirname + '/../public'));
	app.listen(3000, () => console.log('Finflow running on port 3000!'))
};

// Return transactions within the requested time period
var getTransactions = function(from, to) {
	if (from === undefined){
		from = 0;
	}

	if (to === undefined){
		to = Date.now();
	}

	return new Promise(function(resolve, reject){
		var filteredTransactions = [];
		for (var i = 0; i < transactions.length; i++) {
			if (Date.parse(transactions[i].date)/1000 >= from && Date.parse(transactions[i].date)/1000 <= to){
				filteredTransactions.push(transactions[i]);
			}
		}
		resolve(filteredTransactions);
	});
};

// Create D3 nodes & links representing the filtered transactional data
var constructGraph = function(transactions, hiddenCategories) {
	return new Promise(function(resolve, reject){
		// If there are no transactions, we can't make a graph
		if (transactions === undefined || transactions.length == 0){
			resolve({})
		}

		// We will be modifying the categories, so copy as a value and not a reference
		var filteredCategories = JSON.parse(JSON.stringify(categories));

		// Record savings as an additional node for the moment – wider analysis needed on how to record savings beyond prototype
		filteredCategories.push({ "id": "Savings", "parent": "Income" });

		// Remove any hidden categories from being displayed
		if (hiddenCategories.length > 0){
			filteredCategories = filteredCategories.filter(function (category) {
				return !(hiddenCategories.includes(category.id) || hiddenCategories.includes(category.parent));
			});
		}

		// Build graph data based on filtered categories
		var data = graph.build(transactions, filteredCategories);
		resolve(data);
	});
};

// Generic failure message
var failureCallback = function() {
	console.log('Failure');
};

// Default view
app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname, '../public/', 'main.html'));
})

// Return all transactions in the selected date range with (user-selected) active categories
app.post('/transactions/:from-:to', function (req, res) {
	var from = req.params.from;
	var to = req.params.to;
	// Get all child categories associated with active ones
	var activeCategories = preprocess.getAllActiveCategories(categories, req.body.activeCategories);

	getTransactions(from, to).then(function(result) {
		// If there's no transactions
		if (Object.keys(result).length === 0){
			return res.status(204).send("No data available for the selected range");
		}
		// Only return transactions with active categories
		return preprocess.filterTransactions(result, activeCategories);
	}) 
	.then(function(result) {
		res.send(result);
	})
	.catch(failureCallback);
})

// Return all transactional statistics for the requested date range
app.post('/analysis/:from-:to', function (req, res) {
	var from = req.params.from;
	var to = req.params.to;
	res.send(analysis.getStatistics(transactions, categories, from, to));
})

// Return data to create the D3 graph client-side for the requested date range
app.post('/graph/:from-:to', function (req, res) {
	var from = req.params.from;
	var to = req.params.to;
	var hiddenCategories = req.body.hiddenCategories;

	getTransactions(from, to).then(function(result) {
		return constructGraph(result, hiddenCategories);
	})
	.then(function(result) {
		res.send({graphJson : result, fromDate : from, toDate : to });
	})
	.catch(failureCallback);
})