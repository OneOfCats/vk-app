var express  = require('express');
var app      = express();                               // create our app w/ express
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var db = require('./node/db'); //mysql database pool

// configuration =================
app.use(express.static(__dirname + '/client'));                 // set the static files location
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());

app.get('/', function(req, res){ //for index file
	file = './client/index.html';
    res.sendfile(file);
});

app.get('/client/*', function(req, res){ //for front-end files
	var file = __dirname + req.url;
    res.sendfile(file);
});

db.connect(function(err){
	if(err){
		console.log('Unable to connect to mysql db:');
		console.log(err);
		process.exit(1);
	}else{
		console.log('Connected to DB');
		app.listen(3000, succesfullConnect);
	}
});

function succesfullConnect(){
	console.log('Created server');

	app.get('/publics/:publicId/updated', function(req, res){
		var pool = db.get().createPool();
		console.log('Getting update time 1');
		pool.query('SELECT update_time FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = \'' + db.get().db_name + '\' AND table_name = \'subscribers_' + req.params.publicId + '\'', function(err, result){
			if(err){
				pool.end();
				return res.end(err.toString());
			}
			console.log('Getting update time 2');
			if(result.length == 0){ //If public not found
				res.writeHead(204, {'Content-Type' : 'x-text/plain'});
				pool.end();
				return res.end();
			}
			if(result[0].update_time == null){ //If public hasn't been updated yet
				pool.query('SELECT create_time FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = \'' + db.get().db_name + '\' AND table_name = \'subscribers_' + req.params.publicId + '\'', function(err, result){
					if(err) res.end(err.toString());
					pool.end();
					if(result.length == 0){ //If public not found
						res.writeHead(204, {'Content-Type' : 'x-text/plain'});
						return res.end();
					}
					if(result[0].create_time == null){ //If public hasn't been created yet (literaly it's imposible because it would fire the very first 'if')
						console.log('Public ' + req.params.publicId + ' not found');
						res.writeHead(204, {'Content-Type' : 'x-text/plain'});
						res.end();
					}else{ //If public has creation date (and has no update date)
						res.writeHead(200, {'Content-Type' : 'x-text/plain'});
						res.write(result[0].create_time.toString());
						res.end();
					}
				});
			}else{ //If public has update date
				pool.end();
				res.writeHead(200, {'Content-Type' : 'x-text/plain'});
				res.write(result[0].update_time.toString());
				return res.end();
			}
		});
	});

	app.get('/publics/:publicId/exists', function(req, res){
		var pool = db.get().createPool();
		pool.query('SELECT 1 FROM subscribers_' + req.params.publicId + ' LIMIT 1', function(err, result){
			pool.end();
			if(err){
				console.log('Public ' + req.params.publicId + ' not found');
				res.writeHead(204, {'Content-Type' : 'x-text/plain'});
				return res.end(err.toString());
			}
			console.log('Public ' + req.params.publicId + ' found');
			res.writeHead(200, {'Content-Type' : 'x-text/plain'});
			return res.end();
		});
	});

	app.get('/publics/:publicId/subscribers', function(req, res){
		var pool = db.get().createPool();
		pool.query('SELECT * FROM subscribers_' + req.params.publicId + ' ORDER BY id', function(err, result){
			pool.end();
			if(err) return res.end(err.toString());
			if(result.length == 0){ //If public not found
				console.log('Public ' + req.params.publicId + ' not found');
				res.writeHead(204, {'Content-Type' : 'x-text/plain'});
				return res.end();
			}
			console.log('Public ' + req.params.publicId + ' found');
			res.writeHead(200, {
		      'Content-Type' : 'x-application/json'
		    });
			return res.end(JSON.stringify(result));
		});
	});

	app.post('/publics/:publicId/subscribers', function(req, res){
		var pool = db.get().createPool();

		pool.query('SHOW TABLES LIKE \'new_subscribers_' + req.params.publicId + '\'', function(err, result){
			if(err){
				pool.end();
				return res.end(err.toString());
			}
			if(result.length > 0){
				pool.end();
				return res.end();
			}
			res.end();

			pool.query('CREATE TABLE new_subscribers_' + req.params.publicId + ' (id INT PRIMARY KEY, first_name TEXT, last_name TEXT, sex INT, city TEXT, country TEXT, photo_100 TEXT)', function(err){
				if(err){
					pool.end();
					console.log(err);
					return err;
				}
				console.log('Table for the new ' + req.params.publicId + ' created');
				db.insertSubscribers(req.body.subscribers.items, 'subscribers_' + req.params.publicId, pool, function(err){
					pool.end();
					if(err){
						console.log(err);
						return err;
					}
				});
			});
		});
	});
}