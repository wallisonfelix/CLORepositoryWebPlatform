var oacRead = require('./oacRead.js');
var bd = require('./bd.js');
var path = require('path');
var fs = require('fs');
var admzip = require('adm-zip');
var express = require('express');
var app = express();
var http = require('http');
var server = http.Server(app);
var mongodb = require('mongodb');
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

//Servidor do mongodb
var mongo = new mongodb.Server('127.0.0.1', 27017);
//Conector do banco de dados.
var connector = new mongodb.Db("clorepository", mongo, {w:0})

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
	res.render('pages/pesquisar_oac', {'result' : null, 'title' : ""});
});

app.get('/incluir_versao_customizada', function (req, res) {
	res.render('pages/incluir_versao_customizada');
});

app.get('/pesquisarOAC', function (req, res)
{
	var title = req.query.title;
	connector.open(function(err, db)
	{
		if(err)
		{
			console.error(new Date() + " Erro ao Pesquisar OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar OAC: " + err], 'messagesTypes': ["danger"]});
			connector.close();
		}

		bd.buscarOAC(db, title, function(result)
		{
			console.log("chamou funcao");
			res.render('pages/pesquisar_oac', {'result' : result, 'title' : title});
		});
	});
});

app.get("/baixarOAC", function(res, req)
{
	//Lê a identificação do DescritorDeArquivoExecutável e o diretório em que 
	//o arquivo executável está localizado no servidor
	var id = req.req.query.id
	var filePath = req.req.query.filePath

	connector.open(function(err, db)
	{
		if(err)
		{
			console.error(new Date() + " Erro ao Baixar OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Baixar OAC: " + err], 'messagesTypes': ["danger"]});
			connector.close();
		}
		
		//Chama a função que gera e retornar o arquivo representando o OAC
		bd.gerarOACFromDb(db, id, filePath, function(oac)
		{
			//Informa ao navegador o tipo de arquivo a ser enviado. Neste caso, zip.
			res.res.set('Content-Type', 'application/zip');
			//Informa o nome do arquivo ao navegador.
			res.res.set('Content-Disposition', 'attachment; filename=' + path.basename(filePath) + '.zip');
			//Informa o tamanho do arquivo ao navegador.
			res.res.set('Content-Length', oac.toBuffer().length);
			//Envia o arquivo em forma de bytes.
			res.res.send(oac.toBuffer());

			db.close();
		});
	});
});

app.post("/incluirOAC", function(req, res)
{
	var oac = new admzip(req.files.fileInput.path);
	var manifestData = oacRead.lerManifest(oac);
	console.log(new Date() + " Versao do MANIFEST.MF: " + manifestData.version);
	connector.open(function(err, db)
	{
		if(err)
		{
			console.error(new Date() + " Erro ao Incluir OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Incluir OAC: " + err], 'messagesTypes': ["danger"]});
			connector.close();
		}
		bd.criarEntrada(db, oac, manifestData.fileNames, function()
		{
			fs.unlink(req.files.fileInput.path, function(err)
			{
				if(err) 
					throw err
				console.log(new Date() + " Arquivo temporário \"" + path.basename(req.files.fileInput.path) + "\" removido com sucesso.")
			});
			connector.close();
			res.render('pages/index', {'messages': ["OAC incluído com sucesso"], 'messagesTypes': ["success"]});
		});
	});
});

app.post("/sent", function(req, res)
{
	var title = req.body.title
	var description = req.body.description
	var languages = req.body.languages.split(";")
	var oac = new admzip(req.files.fileInput.path)
	connector.open(function(err, db)
	{
		if(err)
		{
			db.close()
		}
		bd.persistirCustomizacoes(db, oac, languages, title, description, function(output)
		{
			console.log(JSON.stringify(output, null, 1))
			fs.unlink(req.files.fileInput.path, function(err)
			{
				if(err) throw err
				console.log("Arquivo removido")
			})
			db.close()
		})
	})
})

app.use(express.static(__dirname + '/views/images'));
//Servidor fica ouvindo a porta 80.
server.listen(80);