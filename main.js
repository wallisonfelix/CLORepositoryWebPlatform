var oacRead = require('./oacRead.js');
var bd = require('./bd.js');
var path = require('path');
var fs = require('fs');
var admzip = require('adm-zip');
var express = require('express');
var app = express();
var http = require('http');
var server = http.Server(app);
var io = require('socket.io')(server);
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
/*
//bd.prepararEdicaoOAC(zip)
var userId = (new mongodb.ObjectID()).toString()
var permission = Math.floor(Math.random() * 5)
var fullpath = "./newteste.zip"	
bd.gerarPacoteVersao(fullpath, function(oac)
{
	console.log("Escrevendo arquivo "+fullpath+".")
	oac.writeZip(fullpath)
})*/

//Servidor do mongodb
var mongo = new mongodb.Server('127.0.0.1', 27017);
//Conector do banco de dados.
var connector = new mongodb.Db("clorepository", mongo, {w:0})

/*var oac = new admzip("./teste.oac")
manifestData = oacRead.readManifest(oac)

console.log("Versao do MANIFEST.MF: " + manifestData.version)
console.log(JSON.stringify(manifestData.fileNames))

connector.open(function(err, db)
{
	if(err)
	{
		console.log(err)
		connector.close()
	}
	bd.criarEntrada(db, oac, manifestData.fileNames, function()
	{
		connector.close()
	})
})*/
	
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
	res.render('pages/pesquisar_oac', {'data' : null, 'term' : ""});
});

app.get('/incluir_versao_customizada', function (req, res) {
	res.render('pages/incluir_versao_customizada');
});

app.get('/pesquisarOAC', function (req, res)
{
	var input = req.query.title
	var result = new Array()
	connector.open(function(err, db)
	{
		if(err)
		{
			console.error(new Date() + " Erro ao Pesquisar OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar OAC: " + err], 'messagesTypes': ["danger"]});
			connector.close();
		}
		bd.buscarOAC(db, input, function(list)
		{
			res.render('pages/pesquisar_oac', {'data' : list, 'term' : input})
		})
	})
})

app.get("/OAC", function(res, req)
{
	//Lê a identificação de executável contida na query string enviada 
	//pelo usuário ao clicar no link desejado.
	var id = req.req.query.id
	//Lê o diretório contido na query string.
	var filepath = req.req.query.filePath
	connector.open(function(err, db)
	{
		if(err)
		{
			console.log("Erro: Fechando conexão")
			db.close()
		}
		//Chama a função de geração de arquivo.
		bd.gerarOACFromDb(db, id, filepath, function(oac)
		{
			//Informa ao navegador o tipo de arquivo a ser enviado. Neste caso, zip.
			res.res.set('Content-Type', 'application/zip')
			//Informa o nome do arquivo ao navegador.
			res.res.set('Content-Disposition', 'attachment; filename='+path.basename(filepath)+'.zip')
			//Informa o tamanho do arquivo ao navegador para que apareça o tamanho total na hora de baixar o arquivo.
			res.res.set('Content-Length', oac.toBuffer().length)
			//Envia o arquivo em forma de bytes.
			res.res.send(oac.toBuffer())
			db.close()
		})
	})
})
				
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
		})
	})
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

/*
io.on('connection', function(socket)
{
	socket.on('oacSearch', function(input)
	{
		connector.open(function(err, db)
		{
			if(err)
			{
				console.log("Erro: Fechando conexão")
				connector.close()
			}
			bd.buscarOAC(db, input, function(list)
			{
				for(index in list)
				{
					bd.buscarArquivos(db, new mongodb.ObjectID(list[index]._id), function(fileEntries)
					{
						var qualified_name = list[index].qualified_name
						var pos = parseInt(index) + 1
						var toHtml = pos +". "+list[index].title.value
						var link
						for(j in fileEntries)
						{
							for(i in fileEntries[j].locations)
							{
								var ext = path.extname(fileEntries[j].locations[i]).replace('.', '')
								var filePath = qualified_name + "/" + ext + "/" + fileEntries[j].locations[i].replace('.', '')
								link = "<a href='/OAC?id="+encodeURIComponent(fileEntries[j]._id)+"&filePath="+encodeURIComponent(filePath)+"'>("+ext+")</a>"
								toHtml += link
								io.sockets.connected[socket.id].emit("resultOac", toHtml)
							}	
						}
						io.sockets.connected[socket.id].emit("resultOac", toHtml)
						connector.oacse()
					})
				}
			})
		})
	})
})*/