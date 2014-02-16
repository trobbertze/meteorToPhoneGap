var program 	= require('commander')
	,ncp		= require('ncp').ncp
	,fs			= require("fs-extra")
	,request	= require('request')
	,async		= require('async')
	,_			= require('underscore');



program
    .option('-M, --meteor <meteor>', 'URL to the running Meteor instance')
    .option('-S, --meteorSource <meteorSource>', 'Meteor source directory')
    .option('-D, --destination <destination>', 'Destination directory')
    .parse(process.argv)


// Clear the destination directory
clearDestinationDir = function(done) {
	fs.remove(program.destination, function(err){
	  if (err) {
	  	return console.error(err);
	  }
	  else {
	  	fs.mkdir(program.destination, function(err) {
			if(err) return console.error(err);
			else done()
		})	
	  }
	});	
}

// Modify the index file
createIndexFile = function(done) {
	request(program.meteor, function(err, res, body) {
	  fs.writeFile(
	  	program.destination + "index.html",
	  	modifyIndex(body),
	  	function(err) {
	  		if (err) {
	  			console.log(err);
	  		}
	  		else {
	  			console.log("Result written to: " + program.destination);
	  			done();
	  		}
	  	}
	  )
	});	
}

// Copy required folders
copyFolders = function(done) {
	async.series([
		function(cb) {
			ncp(
				program.meteorSource + "/.meteor/local/build/programs/client/packages", 
				program.destination + "/packages", 
				function (err) {
					if (err) {
						return console.error(err);
					}
					else {
						cb()
					}
				}
			);		
		},
		function(cb) {
			ncp(
				program.meteorSource + "/.meteor/local/build/programs/client/app", 
				program.destination + "/", 
				function (err) {
					if (err) {
						return console.error(err);
					}
					else {
						cb()
					}
				}
			);			
		}
	],
	function(err){
		done();
	})
}

modifyIndex = function(text) {
	var newText = ""
	
	// Make all paths relative
	newText = text.replace(/href="\//g, "href=\"")
		    .replace(/src="\//g, "src=\"");

    // Remove unwanted packages
    var unwantedPackageList = [
    	"packages/autoupdate.js"
    ];

    var lines = newText.split('\n');

    _.each(unwantedPackageList, function(removeMe){
    	_.each(lines, function(line, index){
    		if (line.indexOf(removeMe) > -1) {
    			lines.splice(index,1);
    		}
    	}) 	
    })
    
	// Set DDP_DEFAULT_CONNECTION_URL

	var startText = "<script type='text/javascript'>__meteor_runtime_config__ =";
	var endText = ";</script>";

	_.each(lines, function(line, index) {
		if(line.indexOf("__meteor_runtime_config__") > -1) {
			line = line.substring(startText.length);
			line = line.substring(0, line.length - endText.length);
			var __meteor_runtime_config__ = JSON.parse(line);
			__meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL = program.meteor;
			lines[index] = startText + JSON.stringify(__meteor_runtime_config__) + endText;
		}
	})

	newText = lines.join('\n');

	return newText;
}


async.series([
    function(done){clearDestinationDir(done)},
    function(done){createIndexFile(done)},
    function(done){copyFolders(done)},
]);