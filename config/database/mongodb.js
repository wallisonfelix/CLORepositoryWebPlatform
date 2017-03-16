var mongodb = require('mongodb');

//Estabelece a Conexão com o MongoDB
var mongoServer = new mongodb.Server('127.0.0.1', 27017, { poolSize: 5 });
var mongo = new mongodb.Db("clover", mongoServer, { w: 0 });

//Criar as collections e os índices, caso não existam
mongo.open(function(err, mongoConnection) {

	var qtdColecoesCriadas = 0;

	mongoConnection.createCollection("DescritoresRaizes", function(err, collection) {
		if (err) {
			console.error(new Date() + " Erro ao Criar a Coleção DescritoresRaizes: " + err);
			throw err;
		} else {			
			console.log(new Date() + " Criada a Coleção DescritoresRaizes");	
		}
		
		collection.ensureIndex("_id", function(err, indexName) {
			if (err) {
				console.error(new Date() + " Erro ao Criar Índice para o campo '_id' da Coleção DescritoresRaizes: " + err);
				throw err;
			} else {
				console.log(new Date() + " Criado Índice '" + indexName + "' para o campo '_id' da Coleção DescritoresRaizes");			
			}				

			collection.ensureIndex("qualified_name", function(err, indexName) {
				if (err) {
					console.error(new Date() + " Erro ao Criar Índice para o campo 'qualified_name' da Coleção DescritoresRaizes: " + err);
					throw err;
				} else {
					console.log(new Date() + " Criado Índice '" + indexName + "' para o campo 'qualified_name' da Coleção DescritoresRaizes");			
				}				

				qtdColecoesCriadas++;
				if (qtdColecoesCriadas == 4) {
					mongoConnection.close();
				}
			});
		});			
	});

	mongoConnection.createCollection("DescritoresDeArquivosExecutaveis", function(err, collection) {
		if (err) {
			console.error(new Date() + " Erro ao Criar a Coleção DescritoresDeArquivosExecutaveis: " + err);
			throw err;
		} else {			
			console.log(new Date() + " Criada a Coleção DescritoresDeArquivosExecutaveis");	
		}
		
		collection.ensureIndex("_id", function(err, indexName) {
			if (err) {
				console.error(new Date() + " Erro ao Criar Índice para o campo '_id' da Coleção DescritoresDeArquivosExecutaveis: " + err);
				throw err;
			} else {
				console.log(new Date() + " Criado Índice '" + indexName + "' para o campo '_id' da Coleção DescritoresDeArquivosExecutaveis");			
			}

			collection.ensureIndex("id_components", function(err, indexName) {
				if (err) {
					console.error(new Date() + " Erro ao Criar Índice para o campo 'id_components' da Coleção DescritoresDeArquivosExecutaveis: " + err);
					throw err;
				} else {
					console.log(new Date() + " Criado Índice '" + indexName + "' para o campo 'id_components' da Coleção DescritoresDeArquivosExecutaveis");			
				}				

				collection.ensureIndex("id_clo", function(err, indexName) {
					if (err) {
						console.error(new Date() + " Erro ao Criar Índice para o campo 'id_clo' da Coleção DescritoresDeArquivosExecutaveis: " + err);
						throw err;
					} else {
						console.log(new Date() + " Criado Índice '" + indexName + "' para o campo 'id_clo' da Coleção DescritoresDeArquivosExecutaveis");			
					}				

					qtdColecoesCriadas++;
					if (qtdColecoesCriadas == 4) {
						mongoConnection.close();
					}
				});			
			});			
		});
	});
	
	mongoConnection.createCollection("DescritoresDeComponentes", function(err, collection) {
		if (err) {
			console.error(new Date() + " Erro ao Criar a Coleção DescritoresDeComponentes: " + err);
			throw err;
		} else {			
			console.log(new Date() + " Criada a Coleção DescritoresDeComponentes");	
		}
		
		collection.ensureIndex("_id", function(err, indexName) {
			if (err) {
				console.error(new Date() + " Erro ao Criar Índice para o campo '_id' da Coleção DescritoresDeComponentes: " + err);
				throw err;
			} else {
				console.log(new Date() + " Criado Índice '" + indexName + "' para o campo '_id' da Coleção DescritoresDeComponentes");			
			}					

			qtdColecoesCriadas++;
			if (qtdColecoesCriadas == 4) {
				mongoConnection.close();
			}
		});			
	});

	mongoConnection.createCollection("DescritoresDeVersoes", function(err, collection) {
		if (err) {
			console.error(new Date() + " Erro ao Criar a Coleção DescritoresDeVersoes: " + err);
			throw err;
		} else {			
			console.log(new Date() + " Criada a Coleção DescritoresDeVersoes");	
		}
		
		collection.ensureIndex("_id", function(err, indexName) {
			if (err) {
				console.error(new Date() + " Erro ao Criar Índice para o campo '_id' da Coleção DescritoresDeVersoes: " + err);
				throw err;
			} else {
				console.log(new Date() + " Criado Índice '" + indexName + "' para o campo '_id' da Coleção DescritoresDeVersoes");			
			}

			collection.ensureIndex("id_source_version", function(err, indexName) {
				if (err) {
					console.error(new Date() + " Erro ao Criar Índice para o campo 'id_source_version' da Coleção DescritoresDeVersoes: " + err);
					throw err;
				} else {
					console.log(new Date() + " Criado Índice '" + indexName + "' para o campo 'id_source_version' da Coleção DescritoresDeVersoes");			
				}				

				collection.ensureIndex("id_root_version", function(err, indexName) {
					if (err) {
						console.error(new Date() + " Erro ao Criar Índice para o campo 'id_root_version' da Coleção DescritoresDeVersoes: " + err);
						throw err;
					} else {
						console.log(new Date() + " Criado Índice '" + indexName + "' para o campo 'id_root_version' da Coleção DescritoresDeVersoes");			
					}				

					qtdColecoesCriadas++;
					if (qtdColecoesCriadas == 4) {
						mongoConnection.close();
					}
				});			
			});			
		});
	});	
});

module.exports = mongo;