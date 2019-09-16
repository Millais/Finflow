function getAllCategories(dirtyArray, rules){
	return dirtyArray.map(
		function(x) { return getCategory(x.toString(), rules); }
	);
}

function getCategory(dirtyString, rules) {
	// Check if the transaction can be matched to a rule
	for (i=0; i < rules.length; i++){
  		if (dirtyString.toUpperCase().indexOf((rules[0, i][0]).toUpperCase()) > -1){
    		// Good match. Check if a custom rule override is required
    		return checkSpecialCategory(dirtyString, rules[0, i][1]);
  		}else{
			// No direct rule match – either we cannot directly categorise based on the rules
			// OR the statement's transaction-level detail is badly formatted e.g additional spaces, truncated words

			// Check against the transaction for bad formatting
			var ruleWords = rules[0, i][0].split(" ");
			var likelihood = 0;

		    // If 2 or more words are found in the dirty string, then return the category
		    for (j=0; j < ruleWords.length; j++){
		        // Add length check to avoid matching very small substrings (e.g M & S with Virgin Media Pymts)
		        if (ruleWords[j].length >= 3 && dirtyString.toUpperCase().indexOf(ruleWords[j].toUpperCase()) > -1){
		        	likelihood++;
		        }
		    }

		  	// If 2 or more words from the rule value are found, return the category associated with the rule
		  	if (likelihood >= 2){
		  		return checkSpecialCategory(dirtyString, rules[0, i][1]);
		  	}
		}
	}
	// If no rule exists for this transaction and/or we could not understand the transaction value, leave it as uncategorised for manual attention
	return "UNCATEGORISED";
}

// Override the rules to capture greater category accuracy with special, user-specific logic
// Defaults to the preliminary rule-based category assignments
function checkSpecialCategory(dirtyString, preliminaryCategory){

	// *Example 1 – More specific food categorisation*
	// I know that I typically go to M&S in Richmond for Lunch – so its classification should change from 'Food' to 'Lunch'.
	// I know that if I'm shopping at Tesco in Richmond, it will typically be for 'Grocery' items.

	if (["Food", "Ed Barber"].indexOf(preliminaryCategory) > -1){
		if (preliminaryCategory == "Food" && inLocation(dirtyString, "Richmond")){
			if (inRichmondGroceryLocations(dirtyString)){
				return "Groceries";
			}else{
				return "Lunch";  
			}
		}else if (preliminaryCategory == "Food"){
			// The rules should have assigned popular restaurants previously, so it will most likely be groceries
			return "Groceries";
		}
		// Requires manual user correction for the other cases (for now!)
		return "UNCATEGORISED"; 
	}
	return preliminaryCategory;
}

function inRichmondGroceryLocations(dirtyString){
	if (dirtyString.toUpperCase().indexOf("TESCO") > -1 || dirtyString.toUpperCase().indexOf("WAITROSE") > -1){
		return true;
	}
	return false;
}

function inLocation(dirtyString, location){
	return (dirtyString.toUpperCase().indexOf(location.toUpperCase()) > -1);
}