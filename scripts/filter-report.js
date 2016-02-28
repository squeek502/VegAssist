var readline = require('readline');
var fs = require('fs');
var path = require('path');

var isDryRun = process.argv[2] === '--dry-run';
var logFile = path.join(__dirname, '..', (isDryRun ? 'matches.dry-run' : 'matches') + '.json');

var lineReader = readline.createInterface({
    input: fs.createReadStream(logFile)
});

var filterCounts = {}
var matchCounts = {}

lineReader.on('line', function (line) {
    var data = JSON.parse(line);
    data.matches.forEach(function(match) {
        if (Array.isArray(match))
            return;

        var filterList = match.filterList;
        var filter = match.filter;
        var matchingText = match.match.toLowerCase();
        filterCounts[filterList] = filterCounts[filterList] || {};
        filterCounts[filterList][filter] = filterCounts[filterList][filter] || 0;
        filterCounts[filterList][filter]++;
        matchCounts[matchingText] = matchCounts[matchingText] || 0;
        matchCounts[matchingText]++;
    });
});

lineReader.on('close', function() {
    for (var filterList in filterCounts) {
        var totalMatches = 0;
        var filters = filterCounts[filterList];
        for (var filter in filters) {
            totalMatches += filters[filter];
        }

        console.log(filterList + ": " + totalMatches + " matches");
        Object.keys(filters).sort(function(a,b){return filters[b]-filters[a]}).forEach(function(filter) {
            var count = filters[filter];
            console.log(" -> " + count + " matches: " + filter)
        });
        console.log("");
    }

    var textWithMultipleMatchesSorted = Object.keys(matchCounts)
        .filter(function(match){ return matchCounts[match] >= 5; })
        .sort(function(a,b){return matchCounts[b]-matchCounts[a]})
        .forEach(function(match) {
        var count = matchCounts[match];
        console.log("\"" + match + "\"" + ": " + count + " matches");
    });
})