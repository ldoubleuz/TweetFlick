// Get user via HTML5 geolocation api
function getLocation() {
    console.log(navigator.geolocation);
	navigator.geolocation.getCurrentPosition(getTweets, 
        function(){
            console.log("error in getting location");
            $("#main-wrapper").append("error in getting location");
        });
    console.log("derp");
}

// Fetch tweets from twitter
function getTweets(position) {
    console.log("getting tweets");
	console.log(position);
	var lat = position.coords.latitude;
	var long = position.coords.longitude;
	var term = "exam";
    var mile_range = 50;

	// Print coords in header
	//$(".coords").text(lat+", "+long);

    var wordCounts = Object();
    var readyPages = 0;
    var maxPages = 9;
    
    term = term.toLowerCase();
    for(var page = 1; page <= maxPages; page++){
        var url = "http://search.twitter.com/search.json?q="+term+"+exclude:retweets&geocode="+lat+","+long+","+mile_range+"mi"+"&rpp=100"+"&lang=en"+"&page="+page;
        console.log(url);
        $.ajax({
            url: url,
            dataType: "jsonp",
            success: function(data) {
                console.log("success");
                wordCounts = printTweets(data, wordCounts);
                readyPages += 1;
                if(readyPages >= maxPages){
                    var commonWords = getMostCommonWords(wordCounts);
                    console.log(commonWords);
                    $("#main-wrapper").append(commonWords.join(" "));
                }    
            }
        });
    }
}


function printTweets(data, wordCounts) {
	//console.log(data);
	var i;
	for (i = 0; i < data.results.length; i++) {
		var tweet = data.results[i];
		var place = "";
		
		if(tweet.geo != null) {
			place = tweet.geo.coordinates[0]+", "+tweet.geo.coordinates[1]
		}
		//var item = "<li><img class='pic' src='"+tweet.profile_image_url+"' /><a class='user' href='http://twitter.com/"+tweet.from_user+"'>"+tweet.from_user+"</a> <span class='text'>"+tweet.text+"<br /><time datetime='"+tweet.created_at+"'>"+tweet.created_at+"</time> <span class='place'>"+place+"</span></li>";
		//var item = "<li>"+tweet.text+"</li>"
        //var item = tweet.text;
		//$("#main-wrapper").append(item);
        wordCounts = updateWordCounts(tweet.text, wordCounts);
	}
    //console.log(data.results.length);
    return wordCounts;
}

function updateWordCounts(text, wordCounts){
    text = text.toLowerCase();
    //use regex to remove punctuation characters 
    // (excluding @ and # hashtags)
    // removes from beginning or ends of words
    // also remove links starting with http
    text = text.replace(/\b[^\w\s@#]+\B|\B[^\w\s@#]+\b|\bhttp.*\B/g, "");
    //split on whitespace
    text = text.split(/\s/);
    var word;
    for (var i in text){
        word = text[i];
        //don't add empty strings
        // and ignore tiny words (likely to be boring)
        if(!word || word.length <= 2){
            continue;
        }
        
        //initialize new word counts
        if (wordCounts[word] == null){
            wordCounts[word] = 0;
        }
        // actually increment count
        wordCounts[word] += 1;
    }
    return wordCounts;
}

//return an array of the most common words
function getMostCommonWords(wordCounts){
    console.log("started sorting");
    // sort by highest count
    var keyVals = [];
    var value;
    //first convert the wordCount object to an array
    for(var key in wordCounts){
        value = wordCounts[key];
        keyVals[keyVals.length] = {"word":key, "count":value};                        
    }
    //console.log(keyVals);
    //console.log(wordCounts);
    keyVals.sort(compareWordCountDesc);
    
    console.log("putting into array");
    // return words sorted by commonness
    var commonWords = [];
    for(var i in keyVals){
        //pull from object and put back in array
        commonWords[i] = keyVals[i].word;
    }
    //console.log("common words:");
    //console.log(commonWords);
    return commonWords
}

function compareWordCountDesc(wordCount1, wordCount2){
    var count1 = wordCount1.count;
    var count2 = wordCount2.count;
    if(count1 == null || count2 == null){
        console.log("Warning: null word counts compared");
        return 0;
    }
    else{
        return count2 - count1;
    }
}

function init(){
    getLocation();
}

$(document).ready(init);