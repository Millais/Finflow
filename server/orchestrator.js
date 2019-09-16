var server = require('./server');
var sheets = require('./sheets')
var transactions, categories;

// Gather categorised transactions & categories using any method (e.g file read, API) and initialise server
function go(){
	// Connect with the Google Sheets API to retrieve categorised transactions & categories
	sheets.getTransactions().then(function(result) {
		transactions = result;
		return sheets.getCategories()
	}).then(function(result) {
		categories = result;
		// Start the server
		server.initialise(transactions, categories);
	});
}

go();