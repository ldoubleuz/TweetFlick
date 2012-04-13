// Get user via HTML5 geolocation api
function performSearch(e) {
    e.preventDefault();
    var rawTerm = $("#search-input").val();
    $("#messages").empty();
    $("#messages").append(
        $("<p/>").text("searching for: '"+rawTerm+"'")
    );
    
    console.log(navigator.geolocation);
	navigator.geolocation.getCurrentPosition(
        function(position){
            fetchTweets(rawTerm, position);
        }, 
        function(){
            //console.log("error in getting location");
            $("#messages").append(
                $("<p/>").text("error in getting location, searching all tweets...")
            );
            fetchTweets(rawTerm, null);
        }
    );
    fetchFlickrPhotos(rawTerm);
}

// Fetch tweets from twitter
function fetchTweets(rawTerm, position) {
    console.log("getting tweets");
	console.log(position);
    var geocode;
    if(position){
        var lat = position.coords.latitude;
        var long = position.coords.longitude;
        var mile_range = 50;
        geocode = lat+","+long+","+mile_range+"mi";
    }
    else{
        geocode = "";
    }
    
	var searchTerm = encodeURIComponent(rawTerm.toLowerCase());

	// Print coords in header
	//$(".coords").text(lat+", "+long);

    var wordCounts = new Object();
    var readyPages = 0;
    var maxPages = 1;
    
    var url
    for(var page = 1; page <= maxPages; page++){
        url = "http://search.twitter.com/search.json"+
                  "?q="+searchTerm+"+exclude:retweets"+
                  "&geocode="+geocode+
                  "&rpp=100"+
                  "&lang=en"+
                  "&page="+page;
        //console.log(url);
        $.ajax({
            url: url,
            dataType: "jsonp",
            success: function(data) {
                console.log("tweet success");
                if(readyPages == 0){
                    $("#tweets-col").empty();
                }
                readyPages += 1;
                
                wordCounts = processTweets(data, wordCounts);
                
                //commenting out conditional 
                //if(readyPages >= maxPages){
                    var commonWords = getMostCommonWords(wordCounts);
                    //console.log(commonWords);
                    $("#words-col").empty();
                    $("#words-col").append(commonWords.join(" "));
                //}    
            }
        });
    }
}


function processTweets(data, wordCounts) {
	//console.log(data);
    if(data.error){
        $("#messages").append(
            $("<p/>").text("Twitter search error: "+data.error)
        );
        return;
    }
    
	for (var i = 0; i < data.results.length; i++) {
		var tweet = data.results[i];
		var place = "";
		
		/*if(tweet.geo != null) {
			place = tweet.geo.coordinates[0]+", "+tweet.geo.coordinates[1]
		}*/
		var item = "<li><img class='pic' src='"+tweet.profile_image_url+"' /><a class='user' href='http://twitter.com/"+tweet.from_user+"'>"+tweet.from_user+"</a> <span class='text'>"+tweet.text+"<br /><time datetime='"+tweet.created_at+"'>"+tweet.created_at+"</time></li>";
		//var item = "<li>"+tweet.text+"</li>"
        //var item = tweet.text;
		$("#tweets-col").append(item);
        wordCounts = updateWordCounts(tweet, wordCounts);
	}
    //console.log(data.results.length);
    return wordCounts;
}

function updateWordCounts(tweet, wordCounts){
    console.log("tweet data:");
    console.log(tweet);
    var text = tweet.text.toLowerCase();
    //use regex to remove punctuation characters 
    // (excluding @ and # hashtags)
    // removes from beginning or ends of words
    // also remove links starting with http
    // also remove unicode
    text = text.replace(/&\w+;|\b[^\w\s@#]+\B|\B[^\w\s@#]+\b|\bhttp.*\B/g, "");
    //split on whitespace
    text = text.split(/\s/);
    var word;
    for (var i in text){
        word = text[i];
        //don't add empty strings
        // and ignore tiny words (likely to be boring)
        // also ignore stop words and non words
        if(!word || word.length <= 2 || STOP_WORDS_SET[word] || !/[a-zA-Z0-9]/g.test(word)){
            continue;
        }
        
        //console.log(wordCounts);
        //initialize new word counts
        if (!wordCounts[word]){
            wordCounts[word] = 0;
        }
        // actually increment count
        wordCounts[word] += 1;
    }
    return wordCounts;
}

//return an array of the most common words
function getMostCommonWords(wordCounts){
    //console.log("started sorting");
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
    
    //console.log("putting into array");
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

function updateStopWords(stopWordsSet, stopWordsList){
    var stopWord;
    for(var i in stopWordsList){
        stopWord = stopWordsList[i];
        stopWordsSet[stopWord] = true;
    }
    return stopWordsSet;
}

function makeStopWordsSet(){
    var stopWords = ['a', "a's", 'able', 'about', 'above',
            'according', 'accordingly', 'across', 'actually', 'after',
            'afterwards', 'again', 'against', "ain't", 'all',
            'allow', 'allows', 'almost', 'alone', 'along',
            'already', 'also', 'although', 'always', 'am',
            'among', 'amongst', 'an', 'and', 'another',
            'any', 'anybody', 'anyhow', 'anyone', 'anything',
            'anyway', 'anyways', 'anywhere', 'apart', 'appear',
            'appreciate', 'appropriate', 'are', "aren't", 'around',
            'as', 'aside', 'ask', 'asking', 'associated',
            'at', 'available', 'away', 'awfully', 'be',
            'became', 'because', 'become', 'becomes', 'becoming',
            'been', 'before', 'beforehand', 'behind', 'being',
            'believe', 'below', 'beside', 'besides', 'best',
            'better', 'between', 'beyond', 'both', 'brief',
            'but', 'by', "c'mon", "c's", 'came',
            'can', "can't", 'cannot', 'cant', 'cause',
            'causes', 'certain', 'certainly', 'changes', 'clearly',
            'co', 'com', 'come', 'comes', 'concerning',
            'consequently', 'consider', 'considering', 'contain', 'containing',
            'contains', 'corresponding', 'could', "couldn't", 'course',
            'currently', 'definitely', 'described', 'despite', 'did',
            "didn't", 'different', 'do', 'does', "doesn't", "doesnt", "don't", "dont",
            'doing', "don't", 'done', 'down', 'downwards',
            'during', 'each', 'edu', 'eg', 'eight',
            'either', 'else', 'elsewhere', 'enough', 'entirely',
            'especially', 'et', 'etc', 'even', 'ever',
            'every', 'everybody', 'everyone', 'everything', 'everywhere',
            'ex', 'exactly', 'example', 'except', 'far',
            'few', 'fifth', 'first', 'five', 'followed',
            'following', 'follows', 'for', 'former', 'formerly',
            'forth', 'four', 'from', 'further', 'furthermore',
            'get', 'gets', 'getting', 'given', 'gives',
            'go', 'goes', 'going', 'gone', 'got',
            'gotten', 'had', "hadn't", 'happens',
            'hardly', 'has', "hasn't", 'have', "haven't",
            'having', 'he', "he'd", "he'll", "he's",
            'hence', 'her', 'here',
            "here's", 'hereafter', 'hereby', 'herein', 'hereupon',
            'hers', 'herself', 'hi', 'him', 'himself',
            'his', 'hither', 'hopefully', 'how', "how's",
            'howbeit', 'however', 'i', "i'd", "i'll",
            "i'm", "i've", 'ie', 'if', 'ignored',
            'immediate', 'in', 'inasmuch', 'inc', 'indeed',
            'indicate', 'indicated', 'indicates', 'inner', 'insofar',
            'instead', 'into', 'inward', 'is', "isn't",
            'it', "it'd", "it'll", "it's", 'its',
            'itself', 'just', 'keep', 'keeps', 'kept',
            'know', 'known', 'knows', 'last', 'lately',
            'later', 'latter', 'latterly', 'least', 'less',
            'lest', 'let', "let's", 'like', 'liked',
            'likely', 'little', 'look', 'looking', 'looks',
            'ltd', 'mainly', 'many', 'may', 'maybe',
            'me', 'mean', 'meanwhile', 'merely', 'might',
            'more', 'moreover', 'most', 'mostly', 'much',
            'must', "mustn't", 'my', 'myself', 'name',
            'namely', 'nd', 'near', 'nearly', 'necessary',
            'need', 'needs', 'neither', 'never', 'nevertheless',
            'new', 'next', 'nine', 'no', 'nobody',
            'non', 'none', 'noone', 'nor', 'normally',
            'not', 'nothing', 'novel', 'now', 'nowhere',
            'obviously', 'of', 'off', 'often', 'oh',
            'ok', 'okay', 'old', 'on', 'once',
            'one', 'ones', 'only', 'onto', 'or',
            'other', 'others', 'otherwise', 'ought', 'our',
            'ours', 'ourselves', 'out', 'outside', 'over',
            'overall', 'own', 'particular', 'particularly', 'per',
            'perhaps', 'placed', 'please', 'plus', 'possible',
            'presumably', 'probably', 'provides', 'que', 'quite',
            'qv', 'rather', 'rd', 're', 'really',
            'reasonably', 'regarding', 'regardless', 'regards', 'relatively',
            'respectively', 'right', 'said', 'same', 'saw',
            'say', 'saying', 'says', 'second', 'secondly',
            'see', 'seeing', 'seem', 'seemed', 'seeming',
            'seems', 'seen', 'self', 'selves', 'sensible',
            'sent', 'serious', 'seriously', 'seven', 'several',
            'shall', "shan't", 'she', "she'd", "she'll",
            "she's", 'should', "shouldn't", 'since', 'six',
            'so', 'some', 'somebody', 'somehow', 'someone',
            'something', 'sometime', 'sometimes', 'somewhat', 'somewhere',
            'soon', 'sorry', 'specified', 'specify', 'specifying',
            'still', 'sub', 'such', 'sup', 'sure',
            "t's", 'take', 'taken', 'tell', 'tends',
            'th', 'than', 'thank', 'thanks', 'thanx',
            'that', "that's", 'thats', 'the', 'their',
            'theirs', 'them', 'themselves', 'then', 'thence',
            'there', "there's", 'thereafter', 'thereby', 'therefore',
            'therein', 'theres', 'thereupon', 'these', 'they',
            "they'd", "they'll", "they're", "they've", 'think',
            'third', 'this', 'thorough', 'thoroughly', 'those',
            'though', 'three', 'through', 'throughout', 'thru',
            'thus', 'to', 'together', 'too', 'took',
            'toward', 'towards', 'tried', 'tries', 'truly',
            'try', 'trying', 'twice', 'two', 'un',
            'under', 'unfortunately', 'unless', 'unlikely', 'until',
            'unto', 'up', 'upon', 'us', 'use',
            'used', 'useful', 'uses', 'using', 'usually',
            'value', 'various', 'very', 'via', 'viz',
            'vs', 'want', 'wants', 'was', "wasn't",
            'way', 'we', "we'd", "we'll", "we're",
            "we've", 'welcome', 'well', 'went', 'were',
            "weren't", 'what', "what's", 'whatever', 'when',
            "when's", 'whence', 'whenever', 'where', "where's",
            'whereafter', 'whereas', 'whereby', 'wherein', 'whereupon',
            'wherever', 'whether', 'which', 'while', 'whither',
            'who', "who's", 'whoever', 'whole', 'whom',
            'whose', 'why', "why's", 'will', 'willing',
            'wish', 'with', 'within', 'without', "won't",
            'wonder', 'would', "wouldn't", 'yes', 'yet',
            'you', "you'd", "you'll", "you're", "youre", "you've",
            'your', 'yours', 'yourself', 'yourselves', 'zero'];
    var swears = ["fuck", "fucking", "fucked", "shit", "damn", "bitch", "nigga", "nigger"];
    var boring = ["lol", "lmao", "smh"];
    
    var stopWordsSet = Object();
    stopWordsSet = updateStopWords(stopWordsSet, stopWords);
    stopWordsSet = updateStopWords(stopWordsSet, swears);
    stopWordsSet = updateStopWords(stopWordsSet, boring);
    return stopWordsSet;
}

function fetchFlickrPhotos(rawTerm){
    var searchTerm = encodeURIComponent(rawTerm.toLowerCase());
    var url = "http://api.flickr.com/services/rest/?" +
                "method=flickr.photos.search" +
                "&api_key=9d75266f03a55de4ee6e51e48cd49b9d" +
                "&text="+searchTerm +
                "&safe_search=1" +  // 1 is "safe"
                "&content_type=1" +  // 1 is "photos only"
                "&sort=relevance" +  // another good one is "interestingness-desc"
                "&per_page=26"+
                "&format=json&jsoncallback=?"; // used to do JSON request
    //console.log(url);
                
    $.ajax({
        url: url,
        dataType: "jsonp",
        success: function(data) {
            //console.log("Flickr data returned!");
            //console.log(data);
            if(data.stat == "fail"){
                $("#messages").append(
                    $("<p />").text("error while fetching Flickr: "+data.message)
                );
            }
            else{
                processFlickrPhotos(data);
            }
        }    
    });    
}

function processFlickrPhotos(data){
    $("#photos").empty();
    if(!(data.photos && data.photos.photo)){
        console.log("no photos to process!");
        return;
    }
    
    var photoDataArray = data.photos.photo;
    if(photoDataArray.length == 0){
        $("#photos").append(
            $("<p />").text("No Flickr photos available. :(")
        );    
        return;
    }
    
    var photoData;
    for(var i in photoDataArray){
        var sizes = ["small", "medium", "large"]; 
        var size = sizes[Math.floor(Math.random()*sizes.length)];
        photoData = photoDataArray[i];
        
        var $image = $("<img />");
        $image.load(function(){
            $("#photos").append(cropPhotoSquare($(this)));
        });
        $image.attr("src", constructFlickrImageURL(photoData, size));
    }
}

//returns the jquery object to append as the photo
//leaves square photos untouched, wraps nonsquare in a clipper div container
function cropPhotoSquare($image){
    var imgWidth = $image[0].width;
    var imgHeight = $image[0].height;
    
    console.log(imgWidth, imgHeight);
    if(imgWidth == imgHeight){
        return $image;
    }    
    
    var targetSize = Math.min(imgWidth, imgHeight);
    var $imageClipper = $("<div />").addClass("photo-clipper");
    
    $imageClipper.css({
        "width": targetSize + "px",
        "height":targetSize + "px"
    });
    $image.addClass("photo-clipped");
    $image.css({
        "top": -Math.round((imgHeight-targetSize)/2),
        "left": -Math.round((imgWidth-targetSize)/2)
    });
    
    $imageClipper.append($image);
    return $imageClipper;
}

// see: http://www.flickr.com/services/api/misc.urls.html
// format: http://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}_[mstzb].jpg
function constructFlickrImageURL(photo, size){
    var url = "http://farm"+photo.farm+
           ".staticflickr.com/"+photo.server+
           "/"+photo.id+
           "_"+photo.secret;
           
    //default to small
    if(!size || size == "small"){
        url = url+"_s.jpg"; // adding _s.jpg makes it a small thumbnail square
    }
    else if(size == "medium"){
        url = url+"_q.jpg"; // adding _q.jpg makes it a bigger thumbnail square
    }
    else if(size == "large"){
        url = url+"_m.jpg"; // adding _m.jpg makes it a medium size with 240 on the longest side
    }
    else{
        console.log("invalid size for photo:");
        console.log(photo);
        console.log("defaulting to smallest size");
        url = url+"_s.jpg";
    }
    return url;                 
}

function init(){
    STOP_WORDS_SET = makeStopWordsSet();
    $("#search-form").submit(performSearch);
}

$(document).ready(init);