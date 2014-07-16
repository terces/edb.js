// io
var fs = require( 'fs');
// express
var express = require( 'express');
var bodyParser = require( 'body-parser');
var app = express();
// logger
var logger = require( 'morgan');

// config
var CONFIG = require( './config.json');
//logfile
var logfile = fs.createWriteStream( CONFIG.database.prefix + ".log", { flags: 'a'});

app.use( bodyParser.urlencoded());
app.use( logger( {
	stream: logfile
}));
app.set( 'title', CONFIG.hosting.title);

app.get( '/', function( req, res) {
	res.send( "Hello, i am an event database.");
});

function chk_tbl( tbl) {

	var filepath = CONFIG.database.prefix + "/" +  tbl;
	if( fs.existsSync( filepath)) {
		return 1;
	}
	else {
		return 0;
	}

}

function mk_tbl( tbl, filepath, callback) {
	var out = {};
	fs.exists( filepath, function( exists) {
		if( exists) {
			out = { 
				'st_code' : 500, 
				'content' : { 
					'table' : tbl,
					'error' : "Table exists"
				}
			}
		} 
		else {
			fs.mkdir( filepath, 0755, function ( err) {
				if( !err) {
					var filename = filepath + '/.init_edb';
					var init_tbl = {
						'table' : tbl,
						'createTime' : new Date().getTime()
					};
					fs.writeFile( filename, JSON.stringify( init_tbl), function( err) {
						if( err) {
							console.log( err);
							out = { 
								'st_code' : 500,
								'content' : {
									'table' : tbl,
									'error' : "Failed to write init file by " + err
								}
							};
						}
						else {
							out = { 
								'st_code' : 200, 
								'content' : init_tbl
							};
						}
					})
				}
				else {
					out = { 
						'st_code' : 500,
						'content' : {
							'table' : tbl,
							'error' : "Failed to create table by " + err
						}
					};
				}
			});
		}
		if( callback && typeof( callback) === "function") 
			callback( out);
	});

}

function put_tbl( tbl, dbname, rec, cmd, callback) {
	var int_now = new Date().getTime();
	var out = {};
	fs.exists( dbname, function( exists) {
		if( !exists) {
			//first open file
			var outfile = {};
			outfile['createTime'] = int_now;
			outfile['lastUpdate'] = int_now;
			outfile['cmd'] = new Object();
			outfile['cmd'][int_now] = [rec, cmd];
			fs.writeFileSync( dbname, JSON.stringify( outfile));

			out = { 
				'st_code' : 200,
				'content' : outfile
			};
		}
		else {
			//file exists 
			var infile = JSON.parse(fs.readFileSync( dbname, 'utf8'));
			infile['lastUpdate'] = int_now;
			infile['cmd'][int_now] = [rec, cmd];
			fs.writeFileSync( dbname, JSON.stringify( infile));

			out = { 
				'st_code' : 200,
				'content' : infile
			};
		}
		if( callback && typeof( callback) === "function")
			callback( out);
	});

}

app.post( '/make', function( req, res) {
	if( req.param( 'table')) {
		var tbl = req.param( 'table');
		// create a talbe named $table
		var filepath = CONFIG.database.prefix + "/" + tbl;
		out = mk_tbl( tbl, filepath, function( out) { 
			res.json( out.st_code, out.content);
		}); 
	}
	else {
		res.json( 500, { 
			'error' : "Make a new table plz"
		});
	}
});

app.post( '/cmp', function( req, res) {
	if( req.param( 'table')) {
		if( req.param( 'user')) {
			if( req.param( 'start')) {
				var dbname = CONFIG.database.prefix + "/" + req.param( 'table') + '/' + CONFIG.database.tbl_prefix + req.param( 'user') + '.json';
				fs.exists( dbname, function( exists) {
					if( exists) {
						// table exists
						var infile = JSON.parse(fs.readFileSync( dbname, 'utf8'));
						var query = new Date( parseInt( req.param( 'start')));
						var last = new Date( infile.lastUpdate);
						if( last.getTime() > query.getTime()) {
							// could recovery
							res.json( 200, {
								'synced' : 1
							});
						}
						else if( last.getTime() == query.getTime()) {
							// need diff
							res.json( 200, {
								'synced' : 0
							});
						}
						else {
							// edb may out of date
							res.json( 200, {
								'synced' : -1
							});
						}
					}
					else {
						res.json( 500, { 
							'error' : 'Entry not found'
						});
					}
				});
			}
			else {
				// no assign time, use now 
				var dbname = CONFIG.database.prefix + "/" + req.param( 'table') + '/' + CONFIG.database.tbl_prefix + req.param( 'user') + '.json';
				fs.exists( dbname, function( exists) {
					if( exists) {
						// table exists
						var infile = JSON.parse(fs.readFileSync( dbname, 'utf8'));
						var cur = new Date();
						var last = new Date( infile.lastUpdate);
						if( last.getTime() > cur.getTime()) {
							// could recovery
							res.json( 200, {
								'synced' : 1
							});
						}
						else if( last.getTime() == cur.getTime()) {
							// need diff
							res.json( 200, {
								'synced' : 0
							});
						}
						else {
							// edb out of date
							res.json( 200, {
								'synced' : -1
							});
						}
					}
					else {
						res.json( 500, { 
							'error' : 'Entry not found'
						});
					}
				});
			}
		}
		else {
			res.json( 500, {
				'error' : 'Need an user'
			});
		}
	}
	else {
		res.json( 500, {
			'error' : 'Need a table'
		});
	}
});

app.post( '/set', function( req, res) {
	if( req.param( 'table')) {
		// from which server 
		if( req.param( 'user')) {
			if( req.param( 'cmd')) {
				var tbl = req.param( 'table');
				var usr = req.param( 'user');
				var rec_file = req.param( 'rec_file'); // file in odb, need to store the hash key 
				var op = req.param( 'cmd');
				var dbname = CONFIG.database.prefix + "/" + tbl + "/" + CONFIG.database.tbl_prefix + usr + ".json";
				if( !chk_tbl( tbl) ) {
					if( CONFIG.strict == true) {
						// must need make table then put data
						res.json( 500, {
							'error' : 'Table not found'
						});
					}
					else {
						// make table 
						var filepath = CONFIG.database.prefix + "/" + tbl;
						mk_tbl( tbl, filepath);
						put_tbl( tbl, dbname,rec_file, op, function( out) {
							res.json( out.st_code, out.content);
						});
					}
				} 
				else {
					put_tbl( tbl, dbname, rec_file, op, function( out) {
						res.json( out.st_code, out.content);
					});
				}
			}
			else {
				res.json( 500, {
					'error' : 'Need a behavior record'
				});
			}
		}
		else {
			res.json( 500, {
				'error' : 'Need an user'
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
	if( req.param( 'table')) {
		var tbl = req.param( 'table');
		if( req.param( 'user')) {
			var usr = req.param( 'user');
			if( req.param( 'start')) {
				// with time assigned, output record after $start
				var dbname = CONFIG.database.prefix + "/" + tbl + "/" + CONFIG.database.tbl_prefix + usr + ".json";
				fs.exists( dbname, function( exists) {
					if( exists) {
						// table exists
						var infile = JSON.parse(fs.readFileSync( dbname, 'utf8'));
						var cur = new Date( parseInt( req.param( 'start')));
						var keys = Object.keys( infile.cmd).sort( function( a,b) {
							var ia = parseInt( a);
							var ib = parseInt( b);
							return ia > ib ? 1 : ia < ib ? -1 : 0;
						});
						var keys_cnt = keys.length;
						var out = {};
						var cnt = 0;

						var start = 0, end = keys_cnt - 1, mid = (start + end) / 2;
						// binary search, search an approach time 
						while( start < mid) { 
							var rec = new Date( parseInt( keys[ mid]));
							if( cur.getTime() > rec.getTime()) 
								start = mid;
							else if( rec.getTime() == cur.getTime()) 
								break;
							else 
								end = mid;
							mid = parseInt( ( start + end) / 2);
						}
						mid = parseInt( keys[mid]) != cur.getTime() ? mid + 1 : mid;
						while( mid < keys_cnt) {
							out[ keys[ mid]] = infile.cmd[ keys[ mid]];
							++mid;
						}
						res.json( 200, out);
					}
					else {
						res.json( 500, { 
							'error' : 'Entry not found'
						});
					}
				});
			}
			else {
				// no time assigned, output the last 10
				var dbname = CONFIG.database.prefix + "/" + tbl + "/" + CONFIG.database.tbl_prefix + usr + ".json";
				fs.exists( dbname, function( exists) {
					if( exists) {
						// table exists
						var infile = JSON.parse(fs.readFileSync( dbname, 'utf8'));
						var out = {};
						var keys = Object.keys( infile.cmd).sort( function( a, b) {
							var ia = parseInt( a);
							var ib = parseInt( b);
							return ia > ib ? 1 : ia < ib ? -1 : 0;
						});;
						var keys_cnt = keys.length;
						var ccnt = parseInt( req.param( 'cnt')) || 10;
						var cnt = parseInt( req.param( 'cnt')) || 10;
						while( cnt-- && keys_cnt) {
							out[ keys[ --keys_cnt]] = infile.cmd[ keys[ keys_cnt]];
							out['cnt'] = ccnt - cnt;
						}
						res.json( 200, out);
					}
					else {
						res.json( 500, { 
							'error' : 'Entry not found'
						});
					}
				});
			}
		}
		else {
			res.json( 500, {
				'error' : 'Need an user'
			});
		}
	}
	else {
		res.json( 500, {
			'error' : 'Need a table'
		});
	}
});

app.get( '/connect', function( req, res) {
	// scaling 
		res.json( 501, {
			'error' : 'Not Implemented'
		});
});

app.get( '/valid', function( req, res) {
	// check ip valid 
		res.json( 501, {
			'error' : 'Not Implemented'
		});
});

app.listen( CONFIG.hosting.port, CONFIG.hosting.host, function() {
	console.log( "Server bind at port 3399");
	if( !chk_tbl( "")) {
		fs.mkdir( CONFIG.database.prefix, 0755);
	}
});
