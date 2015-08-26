var path = require('path');
var mongodb = require('mongodb');
var ZIP = require('adm-zip');
var oacRead = require('./oacRead.js');
var DIR = './file';
var crypto = require('crypto');

var criarEntrada = function(db, zip, fileNames, callback)
{
  //Variáveis que receberão os jsons de arquivos executáveis e seus componentes.
  var toCollection = []
  var count = 0
  //Variáveis para formatação de nome do json de cada arquivo executável e componente.
  var lista_componentes, dae, ext, dir
  var lomFile = JSON.parse(zip.readAsText("LOM.json").trim())
  //Diretório principal para onde os arquivos serão extraídos.
  //Cria e insere o novo DescritorRaiz.
  criarDescritorRaiz(db, lomFile, function()
   {
	   fileNames.forEach(function(element)
	   {
		   var obj = {}
		   //Nome do executável a partir do caminho completo.
		   fileName = path.basename(element);
		   //Recebe o nome original do arquivo e substitui 
		   //sua extensão por json para que fique no formato NomeDoOAC.json
		   ext = (path.extname(element)).substr(1);
		   newFileName = fileName.replace(ext, "json");
		   //Caminho completo do arquivo NomeDoOAC_extensão.json
		   dae = element.replace(".", "_") + ".json";
		   //Caminho completo do arquivo NomeDoOAC.json
		   lista_componentes = element.replace(fileName, newFileName);
		   obj.exec = JSON.parse(zip.readAsText(dae).trim())
		   obj.exec.clo_id = lomFile._id
		   obj.comp = JSON.parse(zip.readAsText(lista_componentes).trim())
		   obj.fileName = element
		   toCollection.push(obj)
		})
	   	//Intera a lista de arquivos executáveis do OAC para incluí-los no banco
		toCollection.forEach(function(item)
		{
			criarDescritorDeArquivoExecutavel(db, zip, item.fileName, lomFile.qualified_name, item.exec, item.comp, function(err, data)
			{
			   if(err)
				   console.error(new Date() + " Erro ao Incluir Descritor Raiz: " + err);
			   count++
			   if(count == toCollection.length)
				{
					console.log(new Date() + " OAC inserido com sucesso.")
					callback()
				}
			})
		})
	})
}

//Cria um novo documento na Collection DescritorRaiz
function criarDescritorRaiz(db, lom, callback)
  {
    lom._id = new mongodb.ObjectID()
    lom.user = Math.floor(100000000*Math.random())
	lom.date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
    db.collection('DescritoresRaizes').insert(lom, function(err, data)
    {
      if(err)
		console.error(new Date() + " Erro ao Incluir DescritorRaiz: " + err);
      console.log(new Date() + " Novo documento DescritorRaiz inserido: " + lom._id + ".");
	  callback()
    })
  }
  
//Criar um novo DescritorDeArquivoExecutavel, criando também o DescritorDeComponents ao qual ele o referencia
function criarDescritorDeArquivoExecutavel(db, zip, element, qualified_name, jsonExec, jsonComp, callback)
{
  var count = 0;

  jsonExec._id = new mongodb.ObjectID();
  jsonComp._id = new mongodb.ObjectID();
  jsonExec.id_components = jsonComp._id;

  //Variáveis com o path dos diretórios de destino do Arquivo Executável e dos seus Componentes
  var diretorioDestinoExecutavel = DIR + '/' + path.dirname(element.replace("executable_files", qualified_name));
  var diretorioDestinoComponentes = diretorioDestinoExecutavel + "/components/";

  //Atualiza os campos "source" do JSON com o estado dos Componentes antes de incluí-lo no banco
  jsonComp.scenes.forEach(function(scene) 
  {
  	scene.components.forEach(function(component) 
  	{
	  	if (component.hasOwnProperty("source")) {
	  		component.source = diretorioDestinoComponentes + path.basename(component.source);
	  	}
  	});
  });
  db.collection('DescritoresDeComponentes').insert(jsonComp, function(err, data)
  {
    if(err)
	{
      console.error(new Date() + " Erro ao Incluir DescritorDeComponente: " + err);
      callback(err, data)
	}
	//Envia os componentes para o diretório de destino no servidor.
	//Caso exista arquivos com a mesma nomenclatura, eles não são substituidos.
    zip.extractEntryTo(path.dirname(element) + "/components/", diretorioDestinoComponentes, false, false);
    console.log(new Date() + " Novo documento DescritorDeComponente inserido: " + jsonComp._id + ".");
	count++
	if(count == 2)
		callback(err, data)
  })

  //Cria a lista "locations" no JSON que resultará no Descritor de Arquivo Executável,
  //contendo o path de onde ficará o Arquivo Executável.
  jsonExec.locations = [diretorioDestinoExecutavel + '/' + path.basename(element)];
  db.collection('DescritoresDeArquivosExecutaveis').insert(jsonExec, function(err, data)
  {
    if(err)
	{
      console.error(new Date() + " Erro ao Incluir DescritorDeArquivoExecutavel: " + err);
	  callback(err, data)
	}	
	//Envia o arquivo executável para o diretório de destino no servidor.
	//Caso exista um arquivo com a mesma nomenclatura, ele não é substituido.
	zip.extractEntryTo(element, diretorioDestinoExecutavel, false, false)
	console.log(new Date() + " Novo documento DescritorDeArquivoExecutavel inserido: " + jsonExec._id + ".");
	count++
	if(count == 2)
		callback(err, data)
  });
}

var buscarOAC = function(db, term, callback)
{
	var myRegex = new RegExp(".*["+term+"].*", "i")
	var result = []
	var countMeta = 0
	var countExe = 0
	var metadadosCount
	var execCount
	var cursorExe
	var cursorMetadados = db.collection("DescritorDeMetadados").find({"title.value": myRegex})
	cursorMetadados.count(function(err, count)
	{
		metadadosCount = count
		console.log(metadadosCount)
		cursorMetadados.forEach(function(ret)
		{
			var obj = {}
			obj.title = ret.title.value
			obj.files = new Array()
			console.log("Buscando Descritores de Arquivos Executáveis.")
			cursorExe = db.collection("DescritorDeArquivoExecutavel").find({"clo_id" : ret._id})
			cursorExe.count(function(err, count)
			{
				execCount = count
				cursorExe.forEach(function(doc)
				{
					var file = {}
					file._id = doc._id
					file.info = new Array()
					console.log("Iniciando construção de path de cada arquivo")
					doc.locations.forEach(function(location)
					{
						var infoData = {}
						infoData.ext = path.extname(location).substr(1)
						infoData.path = ret.qualified_name.concat('/'+infoData.ext).concat('/'+path.basename(location).substr(1))
						console.log(JSON.stringify(infoData))
						file.info.push(infoData)
					})
					console.log("Adicionando arquivo à lista.")
					obj.files.push(file)
					countExe++
					if(countExe == execCount)
					{
						console.log("Jogando arquivos no resultado buscado.")
						console.log(JSON.stringify(obj))
						result.push(obj)
						countMeta++
						console.log(countMeta)
						if(countMeta == metadadosCount)
						{
							console.log("Retornando resultado.")
							console.log(JSON.stringify(result))
							callback(result)
						}
					}
				})
			})
		})
	})
}


var buscarArquivos = function(db, lom_id, callback)
{
	var filesJSON = []
	db.collection("DescritorDeArquivoExecutavel").find({"clo_id" : lom_id}).toArray(function(err, fileDes)
	{
		filesJSON = fileDes
		callback(filesJSON)
	})
	
}

var gerarOACFromDb = function(db, fileId, filePath, callback)
{
	var userId = (new mongodb.ObjectID()).toString()
	var permission = Math.floor(Math.random() * 5)
	db.collection("DescritorDeArquivoExecutavel").findOne({_id : new mongodb.ObjectID(fileId)}, function(err, document)
	{
		if(err)
			console.log(err)
		db.collection("Componentes").findOne({_id : new mongodb.ObjectID(document._id_components)},function(err, component)
		{
			if(err)
				console.log(err)
			oacRead.gerarArquivoOAC(fileId, filePath, component, userId, permission, function(oac)
			{
				callback(oac);
			})
		})
	})
}

var getVersion = function(db, id, callback)
{
	db.collection("DescritorDeArquivoExecutavel").findOne({"_id" : id},function(anErr, anResult)
	{
		if(anErr)
			console.log(anErr)
		//Primeiro nível.
		if(anResult)
		{
			var ret = {}
			ret.root = id
			db.collection("DescritorDeVersao").find({"_id_source_version" : id}).toArray(function(err, result)
			{
				var version = 0.0
				for(var i = 0; i < result.length; i++)
				{
					if(parseFloat(result[i].version) > version)
						version = parseFloat(result[i].version)
				}
				ret.version = ""+(version+1.0)+".0"
				callback(ret)
			})
		}
		else
		{
			db.collection("DescritorDeVersao").find({$or: [{"_id" : id}, {"_id_source_version" : id}]}).toArray(function(err3, list)
			{
				var prefix
				var lastDigit
				var ret = {}
				if(list.length > 0)
				{
					ret.root = list[0]._id_root_version
					if(list.length > 1)
					{
						var version_maior
						var maiorLastDigit = 0
						for(var i = 0; i < list.length; i++)
						{
							if(list[i]._id != id)
							{
								lastDigit = parseInt(list[i].version.charAt(list[i].version.length-1)) //Último dígito convertido para inteiro.
								if(lastDigit > maiorLastDigit)
								{
									version_maior = list[i].version
									maiorLastDigit = parseInt(version_maior.charAt(version_maior.length-1))
								}
							}
						}		
						prefix = version_maior.substr(0, version_maior.length-1)
						maiorLastDigit++
						ret.version = prefix.concat(maiorLastDigit)
					}
					else
					{
						lastDigit = parseInt(list[0].version.charAt(list[0].version.length-1))
						if(lastDigit == 0)
						{
							lastDigit++
							prefix = list[0].version.substr(0, list[0].version.length-1)
							ret.version = prefix.concat(lastDigit)
						}
						else
							ret.version = list[0].version.concat(".1")
					}
				}
				else
					ret = null
				callback(ret)
			})
		}
	})
}

var persistirCustomizacoes = function(db, oac, language, title, description, callback)
{
	var jsonDescritor = []
	var jsonFromFile
	var descritorVersao
	var shasum = crypto.createHash('sha1')
	var token_array = oac.readAsText("token.txt").split(" ")
	var file_id = new mongodb.ObjectID(token_array[0])
	var permission = token_array[2]
	var oacEntries = oac.getEntries()
	var extractDir
	oacEntries.forEach(function(entry)
	{
		if(entry.entryName.endsWith(".json"))
			jsonFromFile = JSON.parse(oac.readAsText(entry.entryName))
	})
	getVersion(db, file_id, function(result)
	{
		if(result)
		{
			descritorVersao =
			{
				_id : new mongodb.ObjectID(),
				_id_source_version : file_id,
				_id_root_version : result.root,
				version : result.version,
				languages : language,
				metadata : [{user : token_array[1], date : new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''), title : title, description : description}]
			}
			db.collection("DescritorDeArquivoExecutavel").findOne({_id: new mongodb.ObjectID(result.root)}, function(err, file)
			{
				if(err)
					console.log(err)
				db.collection("Componentes").findOne({_id : new mongodb.ObjectID(file._id_components)}, function(error, component)
				{
					if(error)
						console.log(error)
					jsonDescritor = component
					oacRead.getDelta(jsonFromFile, jsonDescritor, permission, function(delta)
					{
						descritorVersao.customizations = delta
						shasum.update(JSON.stringify(delta))
						descritorVersao.hash = shasum.digest('hex')
						console.log(JSON.stringify(descritorVersao, null, 1))
						db.collection("DescritorDeVersao").findOne({hash: descritorVersao.hash}, function(err, file)
						{
							if(err)
								console.log(err)
							if(file)
							{
								var metadata = file.metadata
								var exists = false
								metadata.forEach(function(data)
								{
									if(descritorVersao.metadata[0].user == data.user && 
									descritorVersao.metadata[0].title == data.title && 
									descritorVersao.metadata[0].description == data.description)
										exists = true
								})
								if(!exists)
								{
									metadata.push(descritorVersao.metadata[0])
									db.collection("DescritorDeVersao").update({_id : file._id}, {$set: {metadata: metadata}})
								}
								callback(metadata)
							}
							else
							{
								db.collection("DescritorDeVersao").insert(descritorVersao, function(err1, data)
								{
									if(err1)
										console.log(err1)
									jsonFromFile.scenes.forEach(function(element)
									{
										element.components.forEach(function(entry)
										{
											oacEntries.forEach(function(file)
											{
												extractDir = DIR+entry.source
												if(path.basename(extractDir) == path.basename(file.entryName))
												{
													console.log(DIR+entry.source+"\n")
													oac.extractEntryTo(file, DIR+path.dirname(entry.source), false, true)
												}
											})
										})
									})
									console.log("Inserção concluída.")
									callback(descritorVersao)
								})
							}
						})
					})
				})
			})
		}
	})
}

module.exports.criarEntrada = criarEntrada
module.exports.buscarOAC = buscarOAC
module.exports.buscarArquivos = buscarArquivos
module.exports.gerarOACFromDb = gerarOACFromDb
module.exports.persistirCustomizacoes = persistirCustomizacoes