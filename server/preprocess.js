exports.filterTransactions = function (transactions, activeCategories){
 	return transactions.filter(function(transaction){
 		return activeCategories.includes(transaction.category);
 	});
}

// Get all child categories associated with active ones
exports.getAllActiveCategories = function (categories, activeCategories){

	var fullCategoryList = [];

	// Get all child categories under a single category
	function getChildCategories(category){
		var children = [];
		for (var i = 0; i < categories.length; i++) {
			if (category == categories[i].parent){
				children.push(categories[i].id)
			}
		}
		return children;
	}

	// Recursively get all child categories depth first and add to the working list (fullCategoryList)
	function getAllChildren(category){
		fullCategoryList.push(category);
		var children = getChildCategories(category);
		for (var i = 0; i < children.length; i++) {
			getAllChildren(children[i]);
		}
	}

	// If no categories are selected, default to show all categories
	if (activeCategories.length === 0){
		for (var i = 0; i < categories.length; i++) {
			fullCategoryList.push(categories[i].id);
		}
	}else{
		// If some are selected, ensure that all child categories associated with each active one are included
		for (var i = 0; i < activeCategories.length; i++) {
			getAllChildren(activeCategories[i]);
		}
		// De-dupe the list
		fullCategoryList = Array.from(new Set(fullCategoryList));
	}

	return fullCategoryList;
}