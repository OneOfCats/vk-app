var mysql = require('mysql');
var async = require('async');
var Q =     require('q');

var db_name = 'publics_db';

var state = {
	pool: null,
	db_name: db_name,
	createPool: null
}

exports.connect = function(done){
	state.createPool = function(){
		return mysql.createPool({
			host: 'localhost',
			user: 'root',
			password: 'root',
			database: db_name
		});
	};
	return done();
};

exports.get = function(){
	return state;
};

exports.insertSubscribers = function(data, db_name, pool, done){
	pool.query('START TRANSACTION', function(err){
		if(err){
			return done(err);
		}
		console.log('Data length: ' + data.length);
		async.each(data, function(row, cb){
			pool.query('INSERT INTO new_' + db_name + ' (id, first_name, last_name, sex, city, country, photo_100) VALUES (' + row.id + ", '" + row.first_name + "', '" + row.last_name + "', " + row.sex + ", '" + JSON.stringify(row.city) + "', '" + JSON.stringify(row.country) + "', '" + row.photo_100 + "')", cb);
		}, endTransaction);
	});
	
	function endTransaction(err){
		if(err){
			console.log(err);
			return done(err);
		}
		pool.query('COMMIT', function(err){
			if(err) return done(err);
			pool.query('SHOW TABLES LIKE \'' + db_name + '\'', function(err, result){
				if(result.length != 0){
					pool.query('DROP TABLE ' + db_name, function(err){
						if(err) return done(err);
						pool.query('RENAME TABLE new_' + db_name + ' TO ' + db_name, function(err){
							if(err) return done(err);
						});
					});
				}else{
					pool.query('RENAME TABLE new_' + db_name + ' TO ' + db_name, function(err){
						if(err) return done(err);
					});
				}
			});
		});
	}
};