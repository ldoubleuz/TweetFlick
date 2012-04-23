function Word(word){
    this.word = word;
    this.tweet_ids_set = {};
    this.count = 0;
}

// taken from http://stackoverflow.com/questions/7627000/javascript-convert-string-to-safe-class-name-for-css/7627603#7627603
function makeSafeForCSS(name) {
    return name.replace(/[^a-z0-9]/g, function(s) {
        var c = s.charCodeAt(0);
        if (c == 32) return '-';
        if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
        return '__' + ('000' + c.toString(16)).slice(-4);
    });
}

jQuery.fn.appendSlide = function($appendMe, duration){
    $(this).each(function(){
        var $appendTo = $(this);
        $appendMe.hide();
        $appendTo.append($appendMe);
        $appendMe.slideDown(duration);
    });
    return $(this);
};

// simply creates a loader gif <img> object for the caller to utilize
function makeLoaderGif(){
    return $("<img />").attr("src", "images/snake_loader.gif");
}

// Get user via HTML5 geolocation api
function performSearch(e) {
    e.preventDefault();
    var rawTerm = $("#search-input").val();
    $("#messages").empty();
    $("#messages").appendSlide(
        $("<p/>").text("searching Twitter for '"+rawTerm+"'... ")
                .attr("id", "searching-tweets-message")
                .append(makeLoaderGif())
    );
    
    $container.isotope("remove", $container.find(".photo-frame"), function(){
        $container.isotope("reLayout");
    });
    
    $(".flickr-img").each(function(){
        $(this).unbind("load");
    });
    
    console.log(navigator.geolocation);
	navigator.geolocation.getCurrentPosition(
        function(position){
            fetchTweets(rawTerm, position);
        }, 
        function(){
            //console.log("error in getting location");
            $("#messages").appendSlide(
                $("<p/>").text("Note: there was an error in getting your location, so we are using global tweets instead.").attr("id", "location-error")
            );
            setTimeout(function(){
                $("#location-error").slideUp(function(){
                    $(this).remove();
                });
            }, 3000);
            fetchTweets(rawTerm, null);
        }
    );
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

    /*
           __keys__     __values__
           <word>           corresponding Word object
    */
    var wordData = {};
    
     /*
           __keys__     __values__
            <id_str>       the tweet data object associated with this id_str
    */
    var tweetIdData = {};
    
    /*
        an array of string words in order from most to least common
    */
    var commonWords = [];
    var readyPages = 0;
    var maxPages = 5;
    var tweetsPerPage = 100;
    var url
    for(var page = 1; page <= maxPages; page++){
        url = "http://search.twitter.com/search.json"+
                  "?q="+searchTerm+"+exclude:retweets"+
                  "&geocode="+geocode+
                  "&rpp="+tweetsPerPage+
                  "&lang=en"+
                  "&page="+page;
        //console.log(url);
        $.ajax({
            url: url,
            dataType: "jsonp",
            success: function(data) {
                console.log("tweet success", data);
                if(readyPages == 0){
                    //$("#tweets-col").empty();
                }
                readyPages += 1;
                
                processTweets(data, wordData, tweetIdData);

                //commenting out conditional 
                //if(readyPages >= maxPages){
                    commonWords.length = 0;
                    commonWords = getMostCommonWords(wordData);
                    /*console.log("commonWords");
                    console.log(commonWords);
                    console.log("wordData");
                    console.log(wordData);
                    console.log("tweets");
                    console.log(tweetIdData);*/
                    //$("#words-col").empty();
                    //$("#words-col").append(commonWords.join(" "));
                //}    
                
                if(readyPages == maxPages){
                    console.log(commonWords);
                    
                    $("#searching-tweets-message").slideUp(function(){
                        $(this).remove();
                    });
                    if(commonWords.length == 0){
                        $("#messages").appendSlide($("<p/>").text("no tweets found for \""+rawTerm+"\", try another search"));
                        return;
                    }
                    var maxWords = Math.min(commonWords.length, 10);
                    for(var wordIndex = 0; wordIndex < maxWords; wordIndex ++){
                        var word = commonWords[wordIndex];
                        fetchFlickrPhotos(word);
                    }
                }
            }
        });
    }
}


function processTweets(data, wordData, tweetIdData) {
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
		//var item = "<li><img class='pic' src='"+tweet.profile_image_url+"' /><a class='user' href='http://twitter.com/"+tweet.from_user+"'>"+tweet.from_user+"</a> <span class='text'>"+tweet.text+"<br /><time datetime='"+tweet.created_at+"'>"+tweet.created_at+"</time></li>";
		//var item = "<li>"+tweet.text+"</li>"
        //var item = tweet.text;
		//$("#tweets-col").append(item);
        wordData = updateWordCounts(tweet, wordData, tweetIdData);
	}
    //console.log(data.results.length);
    return wordData;
}

function updateWordCounts(tweet, wordData, tweetIdData){
    //console.log("tweet data:");
    //console.log(tweet);
    var text = tweet.text.toLowerCase();
    var tweet_id = tweet.id_str;
    //use regex to remove punctuation characters 
    // (excluding @ and # hashtags)
    // removes from beginning or ends of words
    // also remove links starting with http
    // also remove unicode
    text = text.replace(/&\w+;|\b[^\w\s]+\B|\B[^\w\s]+\b|\bhttp.*\B/g, "");
    //split on whitespace
    text = text.split(/\s/);
    var word;
    for (var i in text){
        word = text[i];
        //don't add empty strings
        // and ignore tiny words (likely to be boring)
        // also ignore stop words and non words
        if(!word || word.length <= 2 || myData.stopWordsSet[word] || !/[a-zA-Z0-9]/g.test(word)){
            continue;
        }
        
        //console.log(wordData);
        //initialize new word counts
        if (!wordData[word]){
            wordData[word] = new Word(word);
        }
        
        // actually increment count
        wordData[word].count += 1;
        wordData[word].tweet_ids_set[tweet_id] = true;
        tweetIdData[tweet_id] = tweet;
    }
    return wordData;
}

//return an array of the most common words
function getMostCommonWords(wordData){
    //console.log("started sorting");
    // sort by highest count
    var keyVals = [];
    var value;
    //first convert the word counts in the object to an array
    for(var key in wordData){
        var count_value = wordData[key].count;
        keyVals[keyVals.length] = {"word":key, "count":count_value};                        
    }
    //console.log(keyVals);
    //console.log(wordData);
    keyVals.sort(compareWordCountDesc);
    
    //console.log("putting into array");
    // return words sorted by commonness
    var commonWords = [];
    for(var i in keyVals){
        // put word back in array
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

function fetchFlickrPhotos(rawTerm, size){
    var searchTerm = encodeURIComponent(rawTerm.toLowerCase());
    var perpage = 50;
    size=Math.floor((Math.random()*200)+75);
    var url = "http://api.flickr.com/services/rest/?" +
                "method=flickr.photos.search" +
                "&api_key=9d75266f03a55de4ee6e51e48cd49b9d" +
                "&text="+searchTerm +
                "&safe_search=1" +  // 1 is "safe"
                "&content_type=1" +  // 1 is "photos only"
                "&sort=relevance" +  // another good one is "interestingness-desc"
                "&per_page="+perpage.toString()+
                "&extras=description,owner_name"+
                "&format=json&jsoncallback=?"; // used to do JSON request
    console.log(url);            
               
    var $loadingmessage = $("<p/>").attr("id", "loading-photos"+makeSafeForCSS(rawTerm))
                                .text("loading Flickr photos for "+rawTerm+"... ").hide();
    $loadingmessage.append(makeLoaderGif());
    $("#messages").appendSlide($loadingmessage);
               
    $.ajax({
        url: url,
        dataType: "jsonp",
        success: function(data) {
            console.log("Flickr data returned!" + searchTerm);
            console.log(data);
            if(data.stat == "fail"){
                $("#messages").append(
                    $("<p />").text("error while fetching Flickr: "+data.message)
                );
            }
            else{
                processFlickrPhotos(data, rawTerm, size, perpage);
            }
        },
        error: function(data, error) {
            console.log("Flickr error data returned!");
            console.log(data);
            $("#messages").append(
                $("<p />").text("error while fetching Flickr: "+error)
            );
            $("#loading-photos"+makeSafeForCSS(rawTerm)).slideUp("fast", function(){
                $(this).remove();
            });
        }
    });    
}

function processFlickrPhotos(data, rawTerm, size, perpage){
    if(!(data.photos && data.photos.photo)){
        console.log("no photos to process!");
        return;
    }
    console.log(data);
    var photoDataArray = data.photos.photo;
    if(photoDataArray.length == 0){
        var $error = $("<p />").text("No Flickr photos available for "+rawTerm+". :(")
        $("#messages").appendSlide($error);    
        $("#loading-photos"+makeSafeForCSS(rawTerm)).slideUp("fast", function(){
            $(this).remove();
        });
        setTimeout(function(){
            $error.slideUp(function(){
                $(this).remove();
            });
            
        }, 500);
        return;
    }
    
    var photoData;
    
    // images already loaded
    var loadedImages = 0;
    // total number of images to load
    var totalImages = 5;
    for(var i =0; i < totalImages; i++){
        // randomize pictures by picking random index
        var randomIndex = Math.floor(Math.random()*(perpage-i))+i;

        photoData = photoDataArray[randomIndex];

        // swapping
        var tempPhotoData = photoDataArray[i];
        photoDataArray[i] = photoDataArray[randomIndex];
        photoDataArray[randomIndex] = tempPhotoData;
        
        var $image = $("<img />").addClass("flickr-img");
        var $link = $("<a />").addClass("photo-link");
        $link.attr({
            href: constructFlickrLinkURL(photoData),
            target: "_blank"
        });
        $link.append($image);
        
        var $photoWrapper = $("<div/>").addClass("photo-frame").addClass(makeSafeForCSS(rawTerm));
        $photoWrapper.append($link);
        
        var $wordLabel = $("<div/>").addClass("word-label").text(rawTerm);
        $link.append($wordLabel);
        
        //temporarily hide and append to document so that .closest() call works
        $photoWrapper.addClass("hidden");
        $("body").append($photoWrapper);
        
        $image.load(function(){
            //console.log($(this).parents());
            var $wrapper = $(this).closest(".photo-frame");
            // remove from document so that we may place it in the correct container
            $wrapper.detach();
            // remember to make the thing visible again!
            $wrapper.removeClass("hidden");
            
            resizeOversizedPhoto($(this), size);
            cropPhotoSquare($(this));
            $container.append($wrapper).isotope('appended', $wrapper);
            //$("#words-col-wrap").prepend($wrapper);
            loadedImages += 1
            if(loadedImages >= totalImages){
                $("#loading-photos"+makeSafeForCSS(rawTerm)).slideUp("fast", function(){
                    $(this).remove();
                });
            }
        });
        
        //sizes = ["small", "medium", "large"]; 
        $image.attr("src", constructFlickrImageURL(photoData, size));
    }
}

function resizeOversizedPhoto($image, targetSize){
    var img = $image[0];
    // if smallest dimension is width, which is too big
    if (img.width <= img.height && img.width > targetSize){
        var targetWidth = targetSize;
        img.height = img.height / img.width * targetWidth
        img.width = targetWidth;
    }
    // if smallest dimension is height, which is too big
    else if (img.height < img.width && img.height > targetSize){
        var targetHeight = targetSize;
        img.width = img.width / img.height * targetHeight
        img.height = targetHeight;
    }
    return $image;
}

//leaves square photos untouched, wraps nonsquare in a clipper div container
function cropPhotoSquare($image, targetSize){
    
    var imgWidth = $image[0].width;
    var imgHeight = $image[0].height;
    
    //console.log(imgWidth, imgHeight);
    if(imgWidth == imgHeight){
        return;
    }    
    
    var maxSize = Math.min(imgWidth, imgHeight);
    if(targetSize == null || targetSize <= 0 || targetSize > maxSize){
        console.log("targetsize: ", targetSize);
        targetSize = maxSize;
    }
    
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
    
    $image.wrap($imageClipper);
}

// see: http://www.flickr.com/services/api/misc.urls.html
// format: http://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}_[mstzb].jpg
function constructFlickrImageURL(photo, size){
    var url = "http://farm"+photo.farm+
           ".staticflickr.com/"+photo.server+
           "/"+photo.id+
           "_"+photo.secret;
           
    //default to small
    if(!size || size == "small" || size <= 75){
        url = url+"_s.jpg"; // adding _s.jpg makes it a small thumbnail square (75x75)
    }
    else if(size == "medium" || (size > 75 && size <= 150)){
        url = url+"_q.jpg"; // adding _q.jpg makes it a bigger thumbnail square (150x150)
    }
    else if(size == "large" || size > 150){
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

//http://www.flickr.com/photos/{user-id}/{photo-id} - individual photo
function constructFlickrLinkURL(photo){
    return "http://www.flickr.com/photos/" + photo.owner + "/"+photo.id+"/";
}

function init(){
    myData = {};

    myData.stopWordsSet = makeStopWordsSet();
    $("#search-form").submit(performSearch);
    
    $container = $("#photos");
    $container.isotope({
        itemSelector : '.photo-frame',
        layoutMode : 'masonry',
        masonry: {
            columnWidth:1
        }
    });
}

$(document).ready(init);