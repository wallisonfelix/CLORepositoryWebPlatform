var db = require('./config/database/db.js');
var cloRepository = require('./cloRepository.js');
var cloUtils = require('./cloUtils.js');
var administration = require('./administration.js');
var path = require('path');
var fs = require('fs');
var zip = require('adm-zip');
var express = require('express');
var app = express();
var http = require('http');
var server = http.Server(app);
var multer = require('multer');
var EJS = require('ejs');

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
};

app.use(multer({dest:"./sent"}))

app.set('views', './views')
app.set('view engine', 'ejs');

app.get('/', function(req, res) {  
  res.render('pages/index', {'messages': null});
});

app.get('/incluir_oac', function (req, res) {
	res.render('pages/incluir_oac');
});

app.get('/pesquisar_oac', function (req, res) {
	res.render('pages/pesquisar_oac', {'result' : null, 'title' : ''});
});

app.get('/incluir_versao_customizada', function (req, res) {
	res.render('pages/incluir_versao_customizada');
});

app.get('/pesquisar_usuario', function (req, res) {
	res.render('pages/pesquisar_usuario');
});

app.get('/incluir_usuario', function (req, res) {
	res.render('pages/manter_usuario', {'user' : {}});
});

app.get('/pesquisar_papel', function (req, res) {
	res.render('pages/pesquisar_papel');
});

app.get('/incluir_papel', function (req, res) {
	administration.buscarOperacoes(function (err, operations) {
		
		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Operações: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Operações: " + err], 'messagesTypes': ["danger"]});			
		}

		res.render('pages/manter_papel', {'role' : {}, 'operations': operations});
	});
});

app.get('/pesquisar_operacao', function (req, res) {
	res.render('pages/pesquisar_operacao');
});

app.get('/incluir_operacao', function (req, res) {
	res.render('pages/manter_operacao', {'operation' : {}});
});

app.get('/pesquisarOAC', function (req, res)
{
	var title = req.query.title;
	db.mongo.open(function(err, mongoConnection)
	{
		if(err)
		{
			console.error(new Date() + " Erro ao Pesquisar OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar OAC: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.buscarOAC(mongoConnection, title, function(err, result) {
			
			if(err) {
				console.error(new Date() + " Erro ao Pesquisar OAC: " + err);
				res.render('pages/index', {'messages': ["Erro ao Pesquisar OAC: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			mongoConnection.close();
			res.render('pages/pesquisar_oac', {'result' : result, 'title' : title});
		});
	});
});

app.get('/visualizarMetadadosOAC', function (req, res) {
	
	var idOAC = req.query.id;
	db.mongo.open(function(err, mongoConnection) {
		if(err) { 
			console.error(new Date() + " Erro ao Visualizar Metadados de OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Visualizar Metadados de OAC: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.buscarMetadadosOAC(mongoConnection, idOAC, function(err, metadados) {
			
			if(err) {
				console.error(new Date() + " Erro ao Visualizar Metadados de OAC: " + err);
				res.render('pages/index', {'messages': ["Erro ao Visualizar Metadados de OAC: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			mongoConnection.close();
			res.render('pages/visualizar_metadados_oac', {'metadados' : metadados});
		});
	});
});

app.get("/baixarOAC", function(res, req)
{
	//Lê a identificação do DescritorDeArquivoExecutável e o diretório em que 
	//o arquivo executável está localizado no servidor
	var id = req.req.query.id
	var filePath = req.req.query.filePath

	db.mongo.open(function(err, mongoConnection)
	{
		if(err)
		{
			console.error(new Date() + " Erro ao Baixar OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Baixar OAC: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}
		
		//Chama a função que gera e retorna o arquivo representando o OAC
		cloRepository.gerarPacoteOAC(mongoConnection, id, filePath, function(err, oac)
		{			
			if(err) {
				console.error(new Date() + " Erro ao Baixar OAC: " + err);
				res.render('pages/index', {'messages': ["Erro ao Baixar OAC: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			//Informa ao navegador o tipo de arquivo a ser enviado. Neste caso, zip.
			res.res.set('Content-Type', 'application/zip');
			//Informa o nome do arquivo ao navegador.
			res.res.set('Content-Disposition', 'attachment; filename=' + path.basename(filePath, path.extname(filePath)) + '.zip');
			//Informa o tamanho do arquivo ao navegador.
			res.res.set('Content-Length', oac.toBuffer().length);
			//Envia o arquivo em forma de bytes.
			res.res.send(oac.toBuffer());

			mongoConnection.close();
		});
	});
});

app.get('/listarVersoesCustomizadas', function (req, res) {
	
	var idSourceVersion = req.query.id;
	var filePath = req.query.filePath;

	db.mongo.open(function(err, mongoConnection) {
		if(err) { 
			console.error(new Date() + " Erro ao Listar Versões Customizadas: " + err);
			res.render('pages/index', {'messages': ["Erro ao Listar Versões Customizadas: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.buscarVersoesCustomizadas(mongoConnection, idSourceVersion, filePath, function(err, versoesCustomizadas) {
			
			if(err) {
				console.error(new Date() + " Erro ao Listar Versões Customizadas: " + err);
				res.render('pages/index', {'messages': ["Erro ao Listar Versões Customizadas: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			mongoConnection.close();
			res.render('pages/listar_versoes_customizadas', {'versoesCustomizadas' : versoesCustomizadas});
		});
	});
});

app.get('/listarVersoesCustomizadasDeVersao', function (req, res) {
	
	var idSourceVersion = req.query.id;
	var filePath = req.query.filePath;

	db.mongo.open(function(err, mongoConnection) {
		if(err) { 
			console.error(new Date() + " Erro ao Listar Versões Customizadas: " + err);
			res.render('pages/index', {'messages': ["Erro ao Listar Versões Customizadas: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.buscarVersoesCustomizadas(mongoConnection, idSourceVersion, filePath, function(err, versoesCustomizadas) {
			
			if(err) {
				console.error(new Date() + " Erro ao Listar Versões Customizadas: " + err);
				res.render('pages/index', {'messages': ["Erro ao Listar Versões Customizadas: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}
			
			res.setHeader('Content-Type', 'application/json');
    		res.send(JSON.stringify(versoesCustomizadas));

    		mongoConnection.close();
		});
	});
});

app.get("/baixarVersaoCustomizada", function(res, req) {
	//Lê a identificação do DescritorDeVersao, do DescritorDeArquivoExecutável e o diretório em que 
	//o arquivo executável está localizado no servidor
	var id = req.req.query.id;
	var idRootVersion = req.req.query.idRootVersion;
	var filePath = req.req.query.filePath;

	db.mongo.open(function(err, mongoConnection)
	{
		if(err)
		{
			console.error(new Date() + " Erro ao Baixar Versão Customizada: " + err);
			res.render('pages/index', {'messages': ["Erro ao Versão Customizada OAC: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}
		
		//Chama a função que gera e retorna o arquivo representando a Versão Customizada
		cloRepository.gerarPacoteVersao(mongoConnection, id, idRootVersion, filePath, function(err, versaoCustomizada)
		{			
			if(err) {
				console.error(new Date() + " Erro ao Baixar Versão Customizada: " + err);
				res.render('pages/index', {'messages': ["Erro ao Baixar Versão Customizada: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			//Informa ao navegador o tipo de arquivo a ser enviado. Neste caso, zip.
			res.res.set('Content-Type', 'application/zip');
			//Informa o nome do arquivo ao navegador.
			res.res.set('Content-Disposition', 'attachment; filename=' + path.basename(filePath, path.extname(filePath)) + '.zip');
			//Informa o tamanho do arquivo ao navegador.
			res.res.set('Content-Length', versaoCustomizada.toBuffer().length);
			//Envia o arquivo em forma de bytes.
			res.res.send(versaoCustomizada.toBuffer());

			mongoConnection.close();
		});
	});
});

app.post("/incluirOAC", function(req, res)
{
	var oac = new zip(req.files.fileInput.path);
	var manifestData = cloUtils.lerManifest(oac);
	console.log(new Date() + " Versao do MANIFEST.MF: " + manifestData.version);

	db.mongo.open(function(err, mongoConnection) {
		
		if(err) {
			console.error(new Date() + " Erro ao Incluir OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Incluir OAC: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.criarOAC(mongoConnection, oac, manifestData.fileNames, function(err) {

			if(err) {
				console.error(new Date() + " Erro ao Incluir OAC: " + err);
				res.render('pages/index', {'messages': ["Erro ao Incluir OAC: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			fs.unlink(req.files.fileInput.path, function(err) {
				if(err) {
					console.error(new Date() + " Erro ao Incluir OAC: " + err);
					res.render('pages/index', {'messages': ["Erro ao Incluir OAC: " + err], 'messagesTypes': ["danger"]});
				}
				console.log(new Date() + " Arquivo temporário \"" + path.basename(req.files.fileInput.path) + "\" removido com sucesso.");
			});

			mongoConnection.close();
			res.render('pages/index', {'messages': ["OAC incluído com sucesso"], 'messagesTypes': ["success"]});
		});
	});
});

app.post("/incluirVersaoCustomizada", function(req, res)
{
	var title = req.body.title;
	var description = req.body.description;
	var languages = req.body.languages.split(";");
	var oac = new zip(req.files.fileInput.path);

	db.mongo.open(function(err, mongoConnection)
	{
		if(err) {
			console.error(new Date() + " Erro ao Incluir Versão Customizada: " + err);
			res.render('pages/index', {'messages': ["Erro ao Incluir Versão Customizada: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.criarVersaoCustomizada(mongoConnection, oac, title, description, languages, function(err, result) {				
			
			if(err) {
				console.error(new Date() + " Erro ao Incluir Versão Customizada: " + err);
				res.render('pages/index', {'messages': ["Erro ao Incluir Versão Customizada: " + err], 'messagesTypes': ["danger"]});
			}

			fs.unlink(req.files.fileInput.path, function(err) {
				if(err) {
					console.error(new Date() + " Erro ao Incluir Versão Customizada: " + err);
					res.render('pages/index', {'messages': ["Erro ao Incluir Versão Customizada: " + err], 'messagesTypes': ["danger"]});
				}
				console.log(new Date() + " Arquivo temporário \"" + path.basename(req.files.fileInput.path) + "\" removido com sucesso.");
			});
			
			mongoConnection.close();
			res.render('pages/index', {'messages': ["Versão Customizada incluída com sucesso"], 'messagesTypes': ["success"]});
		});
	});
});

app.use(express.static(__dirname + '/views/images'));
//Servidor fica ouvindo a porta 80.
server.listen(80);