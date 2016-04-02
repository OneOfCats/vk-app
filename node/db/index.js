var mysql = require('mysql');
var async = require('async');

var db_name = 'publics_db';

var state = {
	pool: null,
	db_name: db_name
}

exports.connect = function(done){
	state.pool = mysql.createPool({
		host: 'localhost',
		user: 'root',
		password: 'root',
		database: db_name
	});

	var pool = state.pool;
	pool.query('SET NAMES UTF8', function(err){if(err) return err});
	pool.query('SHOW TABLES LIKE \'publics\'', function(err, result){
		if(err) return done(err);
		if(result.length == 0){
			console.log('No table "publics". Creating table');
			pool.query('CREATE TABLE publics (id INT PRIMARY KEY, updated TIMESTAMP)', function(err, result){
				if(err) return done(err);
				return done();
			});
		}else{
			console.log('Table "publics" exists');
			console.log(result);
			return done();
		}
	});
};

exports.get = function(){
	return state;
};

exports.fixtures = function(data, done){
	var pool = state.pool;
	if(!pool) return done(new Error('No database connection'));

	var names = Object.keys(data.tables);
	async.each(names, function(name, done){
		async.each(data.tables[name], function(row, done){
			var keys = Object.keys(row);
			var values = keys.map(function(key){
				if(row[key].constructor === Array || row[key].constructor === Object ){
					return "'" + JSON.stringify(row[key]) + "'";
				}
				return "'" + row[key] + "'";
			});
			pool.query('INSERT INTO ' + name + ' (' + keys.join(',') + ') VALUES (' + values.join(',') + ')', done);
		}, done);
	}, done);
};

exports.insertSubscribers = function(data, db_name, done){
	state.pool.query('START TRANSACTION');
	console.log('Data length: ' + data.length);
	async.each(data, function(row, cb){
		state.pool.query('INSERT INTO new_' + db_name + ' (id, first_name, last_name, sex, city, country, photo_200) VALUES (' + "'" + row.id + "', " + "'" + row.first_name + "', " + "'" + row.last_name + "', " + "'" + row.sex + "', " + "'" + JSON.stringify(row.city) + "', " + "'" + JSON.stringify(row.country) + "', " + "'" + row.photo_200 + "'" + ')', cb);
	}, end_transaction);

	function end_transaction(){
		state.pool.query('COMMIT', function(err){
			if(err) return done(err);
			state.pool.query('SHOW TABLES LIKE \'' + db_name + '\'', function(err, result){
				if(result.length != 0){
					state.pool.query('DROP TABLE ' + db_name, function(err){
						if(err) return done(err);
						state.pool.query('RENAME TABLE new_' + db_name + ' TO ' + db_name, function(err){
							if(err) return done(err);
						});
					});
				}else{
					state.pool.query('RENAME TABLE new_' + db_name + ' TO ' + db_name, function(err){
						if(err) return done(err);
					});
				}
			});
		});
	}
};

exports.drop = function(tables, done){
	var pool = state.pool;
	if(!pool) return done(new Error('No database connection'));

	async.each(tables, function(name, cb){
		pool.query('DELETE * FROM ' + name, cb);
	}, done);
};