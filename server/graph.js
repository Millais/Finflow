var categoryAmounts;

// Get nodes and links for the data set supplied
// This is a non-trivial task due to the category's dynamic tree structure
exports.build = function (transactions, categories){

	clearState();

	// 1: Get the amounts for each leaf node (Note: this assigns 0 to non-leaf nodes)
	for (var i = 0; i < categories.length; i++) {
		categories[i].amount = getCategoryAmount(categories[i].id, transactions);
		categoryAmounts.push(categories[i]);
	}

	// 2: Get parent category amounts
	getParentAmounts(transactions, categories);

	// 3: Update savings amount
	updateSavings(transactions)

	// 4: Remove empty categories
	categoryAmounts = categoryAmounts.filter(function (category) { return category.amount != 0; });
	categories = categories.filter(function (category) { return category.amount != 0; });

	// 5: Build list of named nodes for the graph based on filtered categories
	var filteredNodes = [];
	for (var i = 0; i < categories.length; i++) {
		filteredNodes.push({name: categories[i].id})
	}

	// 6: Get links between parent and category and convert to what the d3 library expects. 
	// Return data which can be passed directly into the d3 API client-side
	return {nodes: filteredNodes, links: postProcessToIndices(transformToLinks(), categories)};
}

// d3 expects indices for sources & targets instead of strings (e.g category names)
// Hash the data link objects and switch strings for ids
function postProcessToIndices(links, categories){
	// Hash the categories
	var nodeHash = {};
	categories.forEach(function(d){
		nodeHash[d.id] = d;
	});

	// Switch category names to indices using the hash
	links.forEach(function(d){
		d.source = categories.indexOf(nodeHash[d.source]);
		d.target = categories.indexOf(nodeHash[d.target]);
	});
	return links;
}

// Takes the category amounts and transforms to a d3 expected format
function transformToLinks(){
	var links = [];
	for (var i=0; i<categoryAmounts.length; i++){
		if (categoryAmounts[i].parent != null){
			var link = {};
			link.source = categoryAmounts[i].parent;
			link.target = categoryAmounts[i].id;
			link.value = categoryAmounts[i].amount;
			links.push(link)
		}
	}
	return links;
}

// Update amounts for all parent categories using the values from child categories
function getParentAmounts(transactions, categories){

	// General algorithm
	// Find the first name at the bottom of the tree
	// Collect all amounts with the same parent
	// Add to the parent, who then adds to its parent etc
	// Then find the next unused leaf and repeat

	var completed = [];
	var amount = 0;

	for (var i = 0; i < categories.length; i++) {
		// If it's a leaf, and its parent hasn't already been added up
		if (!isParent(categories[i].id, categories) && !completed.includes(categories[i].parent)){
			// Sum up totals for all categories that have this parent category
			for (var j = 0; j < categories.length; j++) {
				if (categories[j].parent == categories[i].parent){
				amount += getCategoryAmount(categories[j].id, transactions);
				}
			}

			// We have total amount for all leaves with this parent
			// Now add back up the tree structure until we reach the root node
			var position = i;

			while (true){
				// Update current level's parent
				updateCategoryAmount(categories[position].parent, amount);
				// Check if parent can be updated
				if (categories[position].parent != null){
					position = getPosition(categories[position].parent, categories);
				}else{
					// Break out and iterate with next node
					break;
				}
			}

			completed.push(categories[i].parent);
			amount = 0;
		}
	}
}

function updateCategoryAmount(categoryName, amount){
	for (var i = 0; i < categoryAmounts.length; i++) {
		if (categoryAmounts[i].id == categoryName){
			categoryAmounts[i].amount += amount;
		}
	}
}

function getPosition(categoryName, categories){
	for (var i = 0; i < categories.length; i++) {
		if (categoryName == categories[i].id){
			return i;
		}
	}
	return null;
}

function isParent(categoryName, categories){
	for (var i = 0; i < categories.length; i++) {
		if (categories[i].parent == categoryName){
			return true;
		}
	}
	return false;
}

// Internal function for retrieving the amount for leaf nodes only
function getCategoryAmount(categoryName, transactions){
	var amount = 0;
	for (var i = 0; i < transactions.length; i++) {
		if (transactions[i].category == categoryName){
		  amount += (-1* transactions[i].value);
		}
	}
	return amount;
}

function clearState(){
	categoryAmounts = [];
}

// In this prototype the savings value is calculated using transactions categorised as income, minus everything else
function updateSavings(transactions){
	var income = 0;
	var spending = 0;

	for (var i = 0; i < transactions.length; i++) {
		if (transactions[i].category == "Income"){
		  income += transactions[i].value;
		}else{
		  spending += transactions[i].value;
		}
	}
	updateCategoryAmount("Savings", (Math.abs(income)-Math.abs(spending)));
}