var db = require('../db');

exports.create = function(modelName, data, done){
	switch(modelName){
		case 'public': {
			var values = [data.id, data.updated];
			db.get().query('INSERT INTO publics (id, updated) VALUES(?, ?)', values, function(err, result){
				if(err) return done(err);
				done(null, result.insertId);
			});
		}
	}
};