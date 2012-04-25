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

function makeLoadPercent(){
    return $("<span/>").addClass("load-percent").text("0%");
}

function getPercentStr(numerator, denominator){
    var fraction = numerator/denominator;
    var percent = Math.round(fraction * 100);
    var percentString = percent.toString() + "%";
    return percentString;
}

// Get user via HTML5 geolocation api
function performSearch(e) {
    e.preventDefault();
    var rawTerm = $("#search-input").val();
    
    // unfocus from search bar to allow scrolling with keys
    $("#search-input").blur();
    
    // scroll to top of page
    $('body,html').animate({
        scrollTop: 0
	}, 800);
            
    $("#messages").empty();
    
    var $searchMessage = $("<p/>").attr("id", "searching-tweets-message");
    
    if(rawTerm.length == 0){
        $searchMessage.text("searching Twitter for tweets talking about anything... ")
    }
    else{
        $searchMessage.text("searching Twitter for tweets talking about \'"+rawTerm+"\'... ")
    }
     
    $searchMessage.append(makeLoadPercent)
                .append(makeLoaderGif()); 
                
    $("#messages").appendSlide($searchMessage);
    
    if(rawTerm.length == 0){
        $("#common-word-search-term").text("anything"); 
    }
    else{
        $("#common-word-search-term").text("\'"+rawTerm+"\'");
    }    

    $("#common-word-tab").fadeIn(100);
    $("#no-common-word-error").fadeOut(100);
    
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
                console.log("tweet success", page, data);
                if(readyPages == 0){
                    //$("#tweets-col").empty();
                }
                readyPages += 1;
                
                $("#searching-tweets-message").find(".load-percent")
                    .text(getPercentStr(readyPages, maxPages));
               
                processTweets(data, wordData, tweetIdData);

                
                commonWords.length = 0;
                commonWords = getMostCommonWords(wordData);
                      
                
                var maxWords = Math.min(commonWords.length, 10);
                
                $("#common-word-list").slideUp(function(){
                    $(this).empty();
                
                    if(commonWords.length == 0){
                        $(this).append(
                            $("<p/>").text("Nothing, apparently!")
                        );
                    }
                    else{
                        // update words list visual
                        for(var wordIndex = 0; wordIndex < maxWords; wordIndex ++){
                            var word = commonWords[wordIndex];
                            var $wordListItem = $("<li/>").text(word);
                            $(this).append($wordListItem);
                        }
                    }
                });
                
                // perform photos search
                if(readyPages == maxPages){
                    console.log(commonWords);
                    $("#common-word-list").slideDown();
                    $("#searching-tweets-message").slideUp(function(){
                        $(this).remove();
                    });
                    if(commonWords.length == 0){
                        $("#messages").appendSlide($("<p/>").text("no tweets found for \""+rawTerm+"\", try another search"));
                        return;
                    }
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
    var stopWords = ['a', 'about', 'above', 'after', 'again',
        'against', 'all', 'am', 'an', 'and',
        'any', 'are', "aren't", 'as', 'at',
        'be', 'because', 'been', 'before', 'being',
        'below', 'between', 'both', 'but', 'by', 'can',
        "can't", 'cant', 'cannot', 'could', "couldn't", 'did',
        "didn't", 'didnt', 'do', 'does', "doesn't", 'doesnt',
        'doing', 'dont',
        "don't", 'down', 'during', 'each', 'few',
        'for', 'from', 'further', 
        'get', 'gets', 'got', 'gots',
        'had', "hadn't",
        'has', "hasn't", 'have', "haven't", 'having',
        'he', "he'd", 'hed', "he'll", "he's", 'hes', 'her',
        'here', "here's", 'heres', 'hers', 'herself', 'him',
        'himself', 'his', 'how', "how's", 'i',
        "i'd", 'id', "i'll", 'ill', "i'm", 'im', 
        "i've", 'ive', 'if',
        'in', 'into', 'is', "isn't", 'isnt', 'it',
        "it's", 'its', 'itself', 'just', "let's", 
        'lets', 'like', 'me',
        'more', 'most', "mustn't", 'my', 'myself',
        'no', 'nor', 'not', 'of', 'off',
        'on', 'once', 'only', 'or', 'other',
        'ought', 'our', 'ours', 'ourselves', 'out',
        'over', 'own', 'same', "shan't", 'she',
        "she'd", "she'll", "she's", 'shes', 'should', "shouldn't",
        'shouldnt',
        'so', 'some', 'such', 'than', 'that',
        "that's", 'the', 'their', 'theirs', 'them',
        'themselves', 'then', 'there', "there's", 'theres', 'these',
        'they', "they'd", 'theyd', "they'll", 'theyll',
        "they're", 'theyre', "they've", 'theyve',
        'this', 'those', 'through', 'to', 'too',
        'under', 'until', 'up', 'very', 'was',
        "wasn't", 'we', "we'd", "we'll", "we're",
        "we've", 'were', "weren't", 'what', "what's",
        'when', "when's", 'where', "where's", 'which',
        'while', 'who', "who's", 'whom', 'why',
        "why's", 'with', "won't", 'wont', 
        'would', "wouldn't", 'wouldnt',
        'you', "you'd", 'youd', "you'll", 'youll', "you're", 'youre', "you've",
        'your', 'yours', 'yourself', 'yourselves'];
    var swears = ["fuck", "fucking", "fucked", "shit", "damn", "bitch", "nigga", "nigger"];
    var boring = ["lol", "lmao", "smh"];
    
    var stopWordsSet = Object();
    stopWordsSet = updateStopWords(stopWordsSet, stopWords);
    stopWordsSet = updateStopWords(stopWordsSet, swears);
    stopWordsSet = updateStopWords(stopWordsSet, boring);
    return stopWordsSet;
}

// TODO: size parameter currently unused, will be used once scaling/weighting is implemented
function fetchFlickrPhotos(rawTerm, size){
    var searchTerm = encodeURIComponent(rawTerm.toLowerCase());
    var perpage = 50;
    // temporarily just randomizing size of a given photo
    // TODO: actually use size parameter for weighting
    size=Math.floor((Math.random()*200)+75);
    console.log("size:", size);
    
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
                                .text("loading Flickr photos for \'"+rawTerm+"\'... ").hide();
    $loadingmessage.append(makeLoadPercent()).append(makeLoaderGif());
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
                processFlickrPhotos(data, rawTerm, size);
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

function processFlickrPhotos(data, rawTerm, size){
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
            
        }, 1500);
        return;
    }
    
    var photoData;
    
    // images already loaded
    var loadedImages = 0;
    // total number of images to load
    var totalImages = Math.min(5, photoDataArray.length);
    for(var i = 0; i < totalImages; i++){    
        // randomize pictures by picking random index (using partial Knuth shuffle)
        var randomIndex = Math.floor(Math.random()*(photoDataArray.length-i))+i;
        if(!(0 <= randomIndex && randomIndex < photoDataArray.length)){
            console.log("error: randomly picked index "+randomIndex.toString()+
                        " is out of bounds of array: ", photoDataArray); 
            continue;
        }
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
            loadedImages += 1;
            $("#loading-photos"+makeSafeForCSS(rawTerm)).find(".load-percent")
                    .text(getPercentStr(loadedImages, totalImages));
                    
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
        //console.log("targetsize: ", targetSize);
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
    $("#common-word-tab").hide();
    $("#common-word-list").hide();
    
    $("#search-form").submit(performSearch);
    
    $container = $("#photos");
    $container.isotope({
        itemSelector : '.photo-frame',
        layoutMode : 'masonry',
        masonry: {
            columnWidth:1
        }
    });
    
    $("#disclaimer").click(function(){
        $(this).animate({
            "bottom":-100
        }, "fast", function(){
            $(this).remove();
        });
    });
    
    $("#common-word-tab").click(function(){
        $("#common-word-list").slideUp(100);
        $(this).fadeOut(100);
    });
}

$(document).ready(init);