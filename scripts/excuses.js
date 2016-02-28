var readline = require('readline');
var fs = require('fs');
var path = require('path');
var entities = require('entities');

var isDryRun = process.argv.indexOf('--dry-run') !== -1;
var shouldOutputToFile = process.argv.indexOf('--to-file') !== -1;
var logFile = path.join(__dirname, '..', (isDryRun ? 'matches.dry-run' : 'matches') + '.json');

var lineReader = readline.createInterface({
    input: fs.createReadStream(logFile)
});

// tweets that have a 'but' in them but don't contain an excuse or are otherwise inapplicable
var excludedTweets = [
    663755737336713200, 664093285615599600, 664108900036304900, 664122940397490200, 664371809714769900, 666679170735411200, 666439239962234900, 667039440662040600,
    666145417470582800, 667174969680367600, 668490471308550100, 669573102901284900, 665373898817429500, 667079027233026000, 669955828087033900, 670272314341269500,
    670289634442813400, 670690515541692400, 672459449408204800, 672923084849066000, 671225815372140500, 671419982832640000, 672793015971352600, 673161721255628800,
    676483716793806800, 674987705902760000, 673661956528541700, 673738509006540800, 673739657226690600, 673601547352170500, 677206167647424500, 677307254882832400,
    673901597014024200, 674110199746154500, 674301432607203300, 676361757775020000, 676539994517844000, 677669994499547100, 678949965796909000, 693697150929113100,
    692944546213265400, 692115441452458000, 682807563629416400, 683204208078630900, 691358148549017600, 689932864406839300, 689959421955461100, 690101207831072800,
    689035358726561800, 689702767884013600, 688186656894009300, 688448318431703000, 687827817153744900, 684624123331477500, 680855214778257400, 683850492426887200,
    687423355096592400, 688561699452932100, 689839023993520100, 681341818986840000, 679818630650048500, 687748493553737700, 688890373201129500, 688314142453678100,
    690269082621452300, 689211152933371900, 692752895142465500, 666901366250467300, 676926358094798800, 677967878847533000, 685472643726884900
]
var dataFilter = function(data, afterBut) {
    if (!/[\w]/i.test(afterBut))
        return false;
    if (excludedTweets.indexOf(data.tweet.id) !== -1)
        return false;
    // exclude all tweets with urls, they make things messy as we don't have the full context
    if (data.tweet.entities.urls.length > 0)
        return false;
    // exclude tweets that are meant to be retweets but are improperly formatted
    if (/\bRT\b/.test(data.tweet.text))
        return false;
    // if the original match is after the but, then it's unlikely to be applicable
    var isMatchAfterBut = false
    data.matches.forEach(function(match) {
        var matchingText = Array.isArray(match) ? match[0] : match.match;
        if (afterBut.indexOf(matchingText) !== -1)
            isMatchAfterBut = true
    })
    if (isMatchAfterBut)
        return false;

    return true;
}
var excuses = {
    "Chicken": /\b(chicken|chic?k[ -']?fil[ -']?a|(hot[ -]?)?wings|mc[ -]?nuggets?)\b/i,
    "Seafood": /\b(fish|seafood|shrimp|salmon|sashimi)\b/i,
    "Chocolate": /\bchocolates?\b/i,
    "Difficult": /\b(hard+|difficult|not easy|(so|too) much work|hassle|commitment|commit|(huge|big) step|tough|challenge|struggle|prison sentence|that'?s doing the most+|so much effort|the biggest switch up|harder than i thought)\b/i,
    "Expensive": /\b(expensive|afford|money+|bank account|broke|budget|costly|costs|spending|price?y)\b/i,
    "Impossible": /\b(not possible|impossible)\b/i,
    "I Love Meat": /\b((likes?|lo+ve[ds]?) meats?|meat tastes|meat is|meat makes me|excited for meat|love( me)? some meats?|such a meat person|favorite foods have meat in them|really enjoy meat|all my fav foods consist of meat)\b/i,
    "Cheese": /\b(chee+s+e+|queso)\b/i,
    "Pizza": /\bpizza\b/i,
    "Parents": /\b(parents?)\b/i,
    "Mom": /\b(mom|mother|mum|mama)('?s)?\b/i,
    "Dad": /\b(dad|father|papa)('?s)?\b/i,
    "Family": /\b(family|fami?|house ?hold will not let me|gramma|grandma)\b/i,
    "Friends": /\b(friends?)\b/i,
    "Significant Other": /\b(((boy|girl)friend)|husband|wife|\b[bg]f\b)\b/i,
    "Specific Person": /^ Jacob\b/i,
    "Milk": /\b(milk)\b/i,
    "Tacos": /\b(tacos?)\b/i,
    "Eggs": /\b(eggs?)\b/i,
    "Sour Cream": /\b(sour cream)\b/i,
    "Carne Asada": /\b(carne asada)\b/i,
    "PETA": /\b(peta)\b/i,
    "Leather": /\b(leather)\b/i,
    "Willpower": /\b(will[ -]?power|self[ -]?control|lazy|selfish|disciplined|patience|don'?t think i (could|can)|wouldn'?t last|don'?t think i'?d be able to|have it in me|motivation|couldn'?t do it|the will|self ?respect|the stamina|i'?m( too| so)? #?wea+k|capable|the courage|the energy)\b/i,
    "I Don't Know": /^ (idk|[i ]+ ?(just|really)? don'?t (know|no)|i'?m not sure|something is holding me back)\b/i,
    "I Can't": /^ (i?( just)? ?can'?t|(i know )?i can'?t do it|i can not do it)\b/i,
    "Bread": /\bbread\b/i,
    "College": /\bcollege\b/i,
    "School": /\bschool\b/i,
    "Eating Disorder": /\b(mental health|recover|disorder|\bED\b|anorexia|anorexic|phobia|apparently it's STILL too risky)\b/i,
    "Gross": /\b(gross|disgusting|nasty|feel like throwing up)\b/i,
    "Dairy": /\b(dairy)\b/i,
    "Butter": /\b(butter)\b/i,
    "Yogurt": /\b(yogh?urt)\b/i,
    "Sushi": /\bsushi\b/i,
    "Hate Vegetables": /\b(hate( all|most)? (vegetables|veggies)|vegetables make me gag|hate all fruits and vegetables|hate \d+% of vegetables|don'?t like vegetables|i don'?t like beans)\b/i,
    "Taste": /\b(taste[ -]?buds|good food|picky eater|taste?y|i love all the food so much|love non-vegan foods|food though|bushes and tree'?s|so many unvegan meals that makes my soul happy|don'?t like enough healthy foods to do that|i like shit that ain't vegan too much|I wanna keep eating shit that taste just like animals|i'?m addicted)\b/i,
    "Protein": /\bprotein\b/i,
    "I'd Die": /\b(die|survive|starve|wouldn'?t be able to live|end up dead)\b/i,
    "Bacon": /\bbacon\b/i,
    "Last Time Was Unsuccessful": /\b(last time|time i try|time i tried|i tried|always fail|keep failing)\b/i,
    "Burgers": /\b((cheese[ -]?)?(ham)?burgers?|in[ -]?n'?[ -]?out)\b/i,
    "Not Ready": /\b(not ready|not there yet|not sure if i('| a)?m ready|that stage|baby steps|not something that happens overnight|take a while|just not rn|this time in my life|gonna educate myself)\b/i,
    "Ribs": /\bribs\b/i,
    "Unhealthy": /\b(unhealthy|not healthy|health problems?|(going to|gonna) make me sick|malnourished|be miserable|immune system|pass out)\b/i,
    "Annoying": /\bannoying|obnoxious\b/i,
    "Hate Vegans": /\b(hate vegans|piss me off|elitist|self-righteous|prestigious prude|don't want to end up being a #VEGAN|what the fuck is wrong with some of them|it will sap me of all personality)\b/i,
    "Shut Up": /\b(shut up|shut the fuck up|have to tell people)\b/i,
    "Hungry": /\b(hungry)\b/i,
    "Ice Cream": /\b(ice[ -]?cream)\b/i,
    "Blood Type": /\b(blood[ -]?type)\b/i,
    "Scared": /\b(scary|scared)\b/i,
    "McDonalds": /\b(ma?c[ -]donalds?)\b/i,
    "Not Allowed": /\b(won'?t let me|not allowed|never be able to|isn'?t letting me|won'?t be allowed)\b/i,
    "Won't Happen": /\b(not (going to|gonna) happen|won'?t happen|not happening|I don'?t think I'?ll ever)\b/i,
    "Steak": /\b(steak|filet mignion|brisket)\b/i,
    "Time": /\b(rush|have time|no time|got time|time i don'?t have|so much meal planning|never home enough)\b/i,
    "Don't Know How": /(^ (HOW\?|wtf how)|(\b(where to start|how to start|don'?t know how|how to go about it|where to begin|where I should( even)? start|don'?t know anything about it|wouldn't know what to eat)\b))/i,
    "Need Help": /\b(need (help|guidance)|need advice|help me|not enough info|need to learn|I need the best way to transition|I need a dedicated partner|I want someone to do it with me)\b/i,
    "Ridiculed": /\b(laugh at me|everyone would hate me)\b/i,
    "Alone": /\b(alone|lonely)\b/i,
    "Lack of Support": /\b(no one supports that|don'?t have( a lot of)? support|not going to react well|no support|people don't seem very happy with the idea|no one takes me seriously)\b/i,
    "No Way": /\b(no way|would never happen)\b/i,
    "I'd Fail": /\b(i'?d fail|won'?t last|going to fail|would fail|setting myself up to fail|never going to sucee?d+|quit within a few days)\b/i,
    "My Doctor": /\b(doctor)\b/i,
    "Weight": /\b(weight|underweight)\b/i,
    "Desserts": /\b(cookies|cake)\b/i,
    "Confused": /\b(confused|confusing)\b/i,
    "Too Fat": /\b(too fat|a fatass|fat fuck)\b/i,
    "Anemic": /\b(anemi[ac]|anaemia)\b/i,
    "Pork": /\b(pork|swine)\b/i,
    "Miss Out": /\b(miss out|miss so many foods)\b/i,
    "Ethnicity": /\b(mexican|italian)\b/i,
    "Specific Event": /\b(Thanksgiving|Christmas|Easter|only be able to cater to vegetarians)\b/i,
    "Other Specific Foods/Products": /\b(Ruth'?s|chobani|chipotle|junk food|halloumi|going to cream on sunday|pernil|TAQUITOS|too many non[ -]?vegan products|macarons|tea|Cinnabon|cheez|my meds|Churasco|mint patties|95% of what I eat comes from chickens and cows)\b/i,
    "Social Pressure": /\b(can'?t just refuse|burden on everyone else)\b/i,
    "Lamb": /\b(lamb)\b/i,
    "Prawns": /\b(prawns)\b/i,
    "Location": /\b(i live in (shively|the midwest)|my town|here in msia)\b/i,
    "Chips": /\b(chips)\b/i,
    "Living Situation": /\b(live on my own|provide for myself)\b/i,
    "One Word Exclamation": /^ (damn?|ugh|fu+ck+|like ugh+)\b/i,
    "Vegetarian": /\b(vegetarian|veggie)\b/i,
    "Fitness": /\b(I need a high intake|doubt i can train properly)\b/i,
    "Sausage": /\b(sausages?)\b/i,
    "Personality": /\b(selfish)\b/i,
    "Allergies": /\b((soy|nut|gluten) allerg(y|ies))\b/i,
}
var excuseGroups = {
    "Like Meat Too Much": ["I Love Meat"],
    "Specific Foods/Products": ["Chocolate", "Chips", "Lamb", "Sausage", "Prawns", "Leather", "Pork", "Chicken", "Ice Cream", "McDonalds", "Steak", "Ribs", "Burgers", "Bacon", "Sushi", "Yogurt", "Dairy", "Butter", "Milk", "Bread", "Carne Asada", "Sour Cream", "Eggs", "Tacos", "Pizza", "Cheese", "Seafood", "Desserts", "Other Specific Foods/Products"],
    "Family/Friends": ["Family", "Significant Other", "Parents", "Mom", "Dad", "Friends", "Social Pressure", "Specific Person", "Ethnicity"],
    "Taste": ["Miss Out", "Hate Vegetables", "Taste", "Gross"],
    "Too Hard": ["Difficult", "Impossible", "Willpower", "Time", "Allergies"],
    "Too Expensive": ["Expensive"],
    "Non-specific": ["I Can't", "I Don't Know", "Won't Happen", "I'd Fail", "No Way", "One Word Exclamation"],
    "Dislike Vegans": ["PETA", "Hate Vegans", "Annoying", "Shut Up"],
    "Unhealthy": ["I'd Die", "Protein", "Unhealthy", "Hungry", "Blood Type", "My Doctor", "Weight", "Anemic", "Too Fat", "Fitness"],
    "Circumstantial": ["College", "School", "Eating Disorder", "Not Ready", "Not Allowed", "Specific Event", "Location", "Living Situation"],
    "Failed In The Past": ["Last Time Was Unsuccessful"],
    "Need Support": ["Don't Know How", "Need Help", "Alone", "Confused", "Ridiculed", "Scared", "Lack of Support"],
    "Vegetarianism Instead": ["Vegetarian"],
}
var falsePositives = {
    "Eggs": [665320143057084400],
}
var isFalsePositive = function(excuse, tweet) {
    if (falsePositives[excuse] == null)
        return false;
    return falsePositives[excuse].indexOf(tweet.id) !== -1; 
}

var excuseCounts = {}
var excuseMatches = {}
var excuseGroupCounts = {}
var excusesWithGroups = {}
var excusesWithoutGroups = []
Object.keys(excuses).forEach(function(excuse) {
    excuseCounts[excuse] = 0;
    excuseMatches[excuse] = [];
})
Object.keys(excuseGroups).forEach(function(excuseGroup) { 
    excuseGroupCounts[excuseGroup] = 0
    excuseGroups[excuseGroup].forEach(function(excuse) {
        excusesWithGroups[excuse] = true
    })
})
Object.keys(excuses).forEach(function(excuse) {
    if (!excusesWithGroups[excuse])
        excusesWithoutGroups.push(excuse)
})
if (excusesWithoutGroups.length > 0) {
    console.log("Excuses without groups: " + excusesWithoutGroups + "\n")
}
var unmatchedExcuses = []
var sampleSize = 0
var totalTweets = 0

lineReader.on('line', function (line) {
    var data = JSON.parse(line);
    var matches = data.tweet.text.replace(/[\r\n]+/g, ' ').match(/\bbut\b(.*)/i);
    if (matches !== null && dataFilter(data, matches[1]))
    {
        var afterBut = matches[1];
        var foundExcuse = false;
        for (var excuse in excuses) {
            if (excuses[excuse].test(afterBut) && !isFalsePositive(excuse, data.tweet)) {
                excuseCounts[excuse]++;
                excuseMatches[excuse].push(data.tweet.id + " " + data.tweet.text);
                foundExcuse = true;
            }
        }
        if (!foundExcuse)
            unmatchedExcuses.push({'tweet': data.tweet, 'afterBut': afterBut});
        sampleSize++;
    }
    totalTweets++
});

lineReader.on('close', function() {
    var outputFileStream = shouldOutputToFile ? fs.createWriteStream(path.join(__dirname, "excuses.md")) : null;
    var outputToFile = function(msg) {
        if (!shouldOutputToFile) return;
        outputFileStream.write(msg + "\n");
    }
    var output = function(msg) {
        console.log(msg)
        outputToFile(msg)
    }
    output(sampleSize + " matching tweets found out of " + totalTweets + " total (" + (sampleSize / totalTweets * 100).toFixed(2) + "%)\n")
    // calc group totals
    Object.keys(excuseGroups).forEach(function(excuseGroup) {
        excuseGroups[excuseGroup].forEach(function(excuse) {
            excuseGroupCounts[excuseGroup] += excuseCounts[excuse]
        })
    })

    Object.keys(excuseGroupCounts).sort(function(a,b){return excuseGroupCounts[b]-excuseGroupCounts[a]}).forEach(function(excuseGroup) {
        var groupCount = excuseGroupCounts[excuseGroup];
        output(excuseGroup + ": " + groupCount + " (" + (groupCount / sampleSize * 100).toFixed(2) + "%)");
        excuseGroups[excuseGroup].sort(function(a,b){return excuseCounts[b]-excuseCounts[a]}).forEach(function(excuse) {
            var count = excuseCounts[excuse];
            output(" - " + excuse + ": " + count + " (" + (count / groupCount * 100).toFixed(2) + "% of group, " + (count / sampleSize * 100).toFixed(2) + "% of total)");
            var matches = excuseMatches[excuse];
            matches.forEach(function(match) {
                outputToFile("  * " + entities.decodeHTML(match.replace(/[\r\n]+/g, ' ')));
            })
        });
    });
    output("");

    output(unmatchedExcuses.length + " unmatched excuse(s):")
    unmatchedExcuses.forEach(function(data) {
        output(data.tweet.id + " " + data.tweet.text.replace(/[\r\n]+/g, ' '));
    })
})