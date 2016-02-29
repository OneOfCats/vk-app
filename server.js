var express  = require('express');
var app      = express();                               // create our app w/ express
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var mongoose = require('mongoose');                     // mongoose for mongodb

// configuration =================
app.use(express.static(__dirname + '/client'));                 // set the static files location
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());

app.get('/', function(req, res){
	file = './client/index.html';
    res.sendfile(file);
});

app.get('/client/*', function(req, res){
	var file = __dirname + req.url;
    res.sendfile(file);
});

mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', function() {
	console.log('Connected to DB');
	var publicSchema = new mongoose.Schema({
		id: Number,
		subscribers: {
			items: [{
				id: Number,
				first_name: String,
				last_name: String,
				sex: Number,
				city: {
					id: Number,
					title: String
				},
				country: {
					id: Number,
					title: String
				},
				photo_200: String
			}]
		},
		updated: Date
	});
	var Public = mongoose.model('Public', publicSchema);

	app.get('/publics/:publicId/subscribers', function(req, res){
		Public.findOne({id: req.params.publicId}, function(err, public){
			if(err) res.send(err);
			if(public == undefined){
				console.log('Public not found');
				res.end();
			}
			res.json(public.subscribers.items);
		});
	});

	app.get('/publics/:publicId/updated', function(req, res){
		Public.findOne({id: req.params.publicId}, 'updated', function(err, public){
			if(err) res.send(err);
			if(public == undefined){
				console.log('Public ' + req.params.publicId + ' not found');
				res.end();
				return;
			}
			res.end(public.updated.toString());
		});
	});

	app.post('/publics/:publicId/subscribers', function(req, res){
		var createdPublic = new Public(req.body);
		Public.findOneAndUpdate({id: req.body.id}, req.body, {upsert: true}, function(err, data){
			if(err){
				res.send(err);
				console.log('Updating public ' + req.body.id + ' error: ' + err);
			}
			res.end(req.params.publicId);
			console.log('Public saved successfuly into a database');
		});
	});
});

// listen (start app with node server.js) ======================================
app.listen(3000);
console.log("App listening on port 3000");