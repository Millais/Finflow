// Get high-level and detailed statistics for the requested date range
exports.getStatistics = function (transactions, categories, from, to) {
	var overallSpending = getOverallSpending(transactions, from, to);
	var categorySpending = getCategorySpending(transactions,categories, from, to);
	return {'overallSpending' : overallSpending, 'breakdown' : categorySpending};
};

// Gets the high-level transaction statistics for the month period between from and to parameters
function getOverallSpending(transactions, from, to){

	var totalSpend = 0;
	var monthSpend = 0;
	var monthIncome = 0;

	for (var i = 0; i < transactions.length; i++) {
		if (transactions[i].value < 0){
			totalSpend += transactions[i].value;
		}

        if (Date.parse(transactions[i].date)/1000 >= from && Date.parse(transactions[i].date)/1000 <= to){
        	if (transactions[i].value < 0){
        		monthSpend += transactions[i].value;
        	}else{
        		monthIncome += transactions[i].value;
        	}
        }
	}

	// Absolute values rounded to 0 decimal places
	var overallSpending = {};
	overallSpending.averageSpend = Math.abs(totalSpend/getNOfMonths(transactions)).toFixed(0);
	overallSpending.monthSpend = Math.abs(monthSpend).toFixed(0);
	overallSpending.monthIncome = Math.abs(monthIncome).toFixed(0);

	return overallSpending;
}

// Note: This function assumes the transactions are in order, otherwise a search is required.
function getNOfMonths(transactions){
	var firstDate = new Date(transactions[0].date);
	var lastDate = new Date(transactions[transactions.length-1].date);
	var nOfMonths = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth()) + 1;
	return nOfMonths;
}

// Find an applicable label based on the delta between average and month
function getState(average, month){
	var tolerance = 0.1;

	if (average == 0 && month == 0){
		return "No Change";
	}else if (month >= average * (1 + tolerance)){
		return "Up";
	}else if (month <= average * (1 - tolerance)){
		return "Down";
	}
	return "No Change"; //More like insignificant change, but no change for UX purposes
}

// Gets a detailed breakdown of spending for each category
function getCategorySpending(transactions, categories, from, to){

	var categorySpending = [];
	var nOfMonths = getNOfMonths(transactions);

	// 1) Get spending for all child categories
	for (var i = 0; i < categories.length; i++) {
		var monthSpend = 0;
		var averageSpend = 0;

		for (var j = 0; j < transactions.length; j++) {
			if (transactions[j].category == categories[i].id){
				averageSpend += transactions[j].value;

				if (Date.parse(transactions[j].date)/1000 >= from && Date.parse(transactions[j].date)/1000 <= to){
		          monthSpend += transactions[j].value;
		        }
			}
		}

		averageSpend = Math.abs(averageSpend / nOfMonths).toFixed(2);
		monthSpend = Math.abs(monthSpend).toFixed(2);

		categorySpending.push(
			{'categoryName': categories[i].id,
			 'averageSpend': averageSpend,
			 'monthSpend': monthSpend});
	}

	// 2) Consolidate all child categories into their parents
	fillParentValues(categories, categorySpending);

	// 3) With all values filled, now find the state change between them
	for (var i = 0; i < categorySpending.length; i++) {
		categorySpending[i].state = getState(categorySpending[i].averageSpend, categorySpending[i].monthSpend)
	}

	//console.log(categorySpending)
	return categorySpending;
}

// This function serves two purposes
// 1) Fill parent values with the sum of all their children's values AND 2) identify leaf categories for client-side processing
function fillParentValues(categories, categorySpending){

	function getParent(category, categories){
		for (var i = 0; i < categories.length; i++) {
			if (categories[i].id == category){
				return categories[i].parent;
			}
		}
	}

	function getChildValues(categoryName){
		// Find categories where the parent matches the categoryName argument
		var matches = false;

		for (var i = 0; i < categories.length; i++) {
			// We're not at the bottom of the tree yet – recurse.
			if (categories[i].parent == categoryName){
				matches = true;
				getChildValues(categories[i].id)
			}
		}

		// We're at the bottom of the tree - mark the node as a leaf, and then add the child value to its parent's value
		if (!matches){
			for (var i = 0; i < categorySpending.length; i++) {
				if (categorySpending[i].categoryName == categoryName){
					categorySpending[i].isLeaf = true;
					break; // We have the value of i
				}
			}

			var parent = getParent(categoryName, categories);

			// After finding the parent, add the child value to using i
			for (var j = 0; j < categorySpending.length; j++){
				if (categorySpending[j].categoryName == parent){
					categorySpending[j].isLeaf = false;
					categorySpending[j].monthSpend = (parseFloat(categorySpending[j].monthSpend) + parseFloat(categorySpending[i].monthSpend)).toFixed(2);
					categorySpending[j].averageSpend = (parseFloat(categorySpending[j].averageSpend) + parseFloat(categorySpending[i].averageSpend)).toFixed(2);
				}
			}
		}
	}

	// Traverse through the tree structure and consolidate the child nodes from the bottom upwards
	for (var i = 0; i < categories.length; i++) {
		if (categories[i].parent == null){
			getChildValues(categories[i].id);
		}
	}
}