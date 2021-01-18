var express = require('express'),
	bodyParser = require('body-parser'),
	multiparty = require('connect-multiparty'),
	mongodb = require('mongodb'),
	objectId = require('mongodb').ObjectId
	fs = require('fs');

var app = express();

app.use(bodyParser.urlencoded({ extended:true}));
app.use(bodyParser.json());
app.use(multiparty());

app.use(function(req, res, next){
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
	res.setHeader("Access-Control-Allow-Headers", "content-type");
	res.setHeader("Access-Control-Allow-Credentials", true);

	next();
});

var port = 8080;
app.listen(port);

//Database
var db = new mongodb.Db(
	'website_image_storage',
	new mongodb.Server('localhost', 27017, {}),
	{}
);

console.log('Servidor HTTP na porta ' + port);

app.get('/', function(req, res){
	res.send({msg:'test'});
});

//POST (inserir imagem)
app.post('/api', function(req, res){

	var date = new Date();
	time_stamp = date.getTime();

	var url_image = time_stamp + '_' + req.files.archive.originalFilename;

	var path_source = req.files.archive.path;
	var path_destiny = './uploads/' + url_image;

	fs.rename(path_source, path_destiny, function(err){
		if(err){
			res.status(500).json({error: err});
			return;
		}

		var info = {
			url_image: url_image,
			title: req.body.title
		}

		db.open( function(err, mongoclient){
			mongoclient.collection('posts', function(err, collection){
				collection.insert(info, function(err, records){
					if(err){
						res.json({'status' : 'Erro'});
					} else {
						res.json({'status' : 'Inclusao realizada com sucesso'});
					}
					mongoclient.close();
				});
			});
		});
	});
});


//GET (visualizar imagem na home)
app.get('/api', function(req, res){
	db.open( function(err, mongoclient){
		mongoclient.collection('posts', function(err, collection){
			collection.find().toArray(function(err, results){
				if(err){
					res.json(err);
				} else {
					res.json(results);
				}
				mongoclient.close();
			});
		});
	});
});


//GET by ID (ready)
app.get('/api/:id', function(req, res){
	db.open( function(err, mongoclient){
		mongoclient.collection('posts', function(err, collection){
			collection.find(objectId(req.params.id)).toArray(function(err, results){
				if(err){
					res.json(err);
				} else {
					res.status(200).json(results);
				}
				mongoclient.close();
			});
		});
	});

});

app.get('/imagens/:imagem', function(req, res){
	var img = req.params.imagem;
	fs.readFile('./uploads/'+img, function(err, content){
		if(err){
			res.status(400).json(err);
			return;
		}
		res.writeHead(200, { 'content-type' : 'image/jpg'});
		res.end(content);
	})
});


//PUT by ID (update)
app.put('/api/:id', function(req, res){
	db.open( function(err, mongoclient){
		mongoclient.collection('posts', function(err, collection){
			collection.update(
				{ _id : objectId(req.params.id) },
				{ $push : 	{
								comments : {
									id_comment : new objectId(),
									comment : req.body.comment
								}
							}
				},
				{},
				function(err, records){
					if(err){
						res.json(err);
					} else {
						res.json(records);
					}

					mongoclient.close();
				}
			);
		});
	});

});


//DELETE by ID (remover)
app.delete('/api/:id', function(req, res){

	db.open( function(err, mongoclient){
		mongoclient.collection('posts', function(err, collection){
			collection.update(
				{ }, 
				{ $pull : 	{
								comments: { id_comment : objectId(req.params.id)}
							}
				},
				{multi: true},
				function(err, records){
					if(err){
						res.json(err);
					} else {
						res.json(records);
					}

					mongoclient.close();
				}
			);
		});
	});

});
