// io
var fs = require( 'fs');
// express
var express = require( 'express');
var bodyParser = require( 'body-parser');
var app = express();


app.use( bodyParser.urlencoded());
app.set( 'title', 'edb');

app.get( '/', function( req, res) {
	res.send( "Hello, i am an event database.");
});

app.get( '/make', function( req, res) {
	if( req.param( 'table')) {
		var tbl = req.param( 'table');
		// create a talbe named $table
		var filepath = './' + tbl;
		fs.exists( filepath, function( exists) {
			if( exists) {
				res.json( 500, {
					'table' : tbl, 
					'error' : "Table exists."
				});
			} 
			else {
				fs.mkdir( filepath, 0755, function ( err) {
					if( !err) {
						var filename = filepath + '/.init_edb';
						var init_tbl = {
							'table' : tbl,
							'createTime' : new Date()
						};
						fs.writeFile( filename, JSON.stringify( init_tbl), function( err) {
							if( err) {
								console.log( err);
								res.json( 500, {
									'table' : tbl,
									'error' : err
								});
							}
							else {
								res.json( 200, init_tbl);
							}
						})
					}
					else {
						res.json( 500, {
							'table' : tbl, 
							'error' : "Failed to create table by " + err
						});
					}
				});
			}
		});
	}
	else {
		res.json( 500, { 
			'error' : "Make a new table plz"
		});
	}
});

app.post( '/cmp', function( req, res) {

});

app.post( '/set', function( req, res) {
	if( req.param( 'table')) {
		// from which server 
		if( req.param( 'user')) {
			if( req.param( 'cmd')) {
				var tbl = req.param( 'table');
				var usr = req.param( 'user');
				var op = req.param( 'cmd');
				var now = new Date();
				var int_now = now.getTime();
				var dbname = "./" + tbl + "/_" + usr + ".json";
				fs.exists( dbname, function( exists) {
					if( !exists) {
						//first open file
						var outfile = {
							'createTime': now,
							'lastUpdate': now,
						};
						outfile[int_now] = op;
						fs.writeFileSync( dbname, JSON.stringify( outfile));
						res.send( 200, JSON.stringify(outfile));
					}
					else {
						//file exists 
						var infile = JSON.parse(fs.readFileSync( dbname, 'utf8'));
						infile[int_now] = op;
						infile.lastUpdate = now;
						fs.writeFileSync( dbname, JSON.stringify( infile));
						res.send( 200, JSON.stringify(infile));
					}
				});
			}
			else {
				res.json( 500, {
					'error' : 'Need a behavior record'
				});
			}
		}
		else {
			res.json( 500, {
				'error' : 'Need a user'
			});
		}
	}
	else {
		res.json( 500, {
			'error' : 'Need a table'
		});
	}
});

app.get( '/get', function( req, res) {


});

app.get( '/connect', function( req, res) {

});


app.listen( 3399, function() {
	console.log( "Server bind at port 3399");
});
