var fs = require('fs')
var DIR = './file'
var ZIP = require('adm-zip')
var path = require('path');

//Lê o arquivo MANIFEST.MF e monta um objeto com a versão do MANIFEST e com
// lista de arquivos executáveis contidas no OAC.
var lerManifest = function(zip)
{
	var mf = zip.getEntry("MANIFEST.MF")
	var data = {}
	data.fileNames = []
	var mfContent = zip.readAsText(mf).toString().split(/[\s:]+/)
	for(var i = 0; i < mfContent.length; i++)
	{
		if(mfContent[i] == 'Manifest-Version')
			data.version = mfContent[i+1]
		if(mfContent[i] == 'Executable-File-Directory')
			data.fileNames.push(mfContent[i+1])
		if(mfContent[i] == 'Executable-File')
		{
			var last = data.fileNames.length-1
			data.fileNames[last] = data.fileNames[last].concat('/'+mfContent[i+1])
		}
	}
	return data;
}

//Apaga diretórios recursivamente.
//Fonte: http://stackoverflow.com/questions/12627586/is-node-js-rmdir-recursive-will-it-work-on-non-empty-directories
deleteFolderRecursive = function(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

//Gera arquivo OAC a partir dos dados informados na entrada.
var gerarArquivoOAC = function(fileId, filePath, componentContent, userId, permission, callback)
{
	//Extensão do arquivo executável.
	var fileExt = path.extname(filePath).replace('.','')
	//Nome do arquivo executável.
	var fileName = path.basename(filePath)
	//Diretório sem o nome do arquivo. A constante DIR pode ser
    //substituída por um diretório raiz qualquer.
	var dir = DIR+'/'+ path.dirname(filePath)
	//Diretório dos componentes. Basta substituir a extensão do 
    //executável, presente no diretório do mesmo, pela subpasta 
    //“components”, que é onde fica os componentes utilizados pelo objeto.
	var componentsDir = dir.replace(fileExt, "components")
	var oac =  new ZIP()
	//Função usada para ler o diretório de componentes.
	fs.readdir(componentsDir, function(err, files)
	{
		if(err)
			console.error(err)
		console.log(files.toString())
		//Adiciona cada arquivo encontrado no pacote.
		for(index in files)
			oac.addLocalFile(componentsDir+'/'+files[index], "components/")
		//Adiciona o arquivo JSON contendo o resultado da busca de descrições 	 //de componentes do banco no pacote.
		oac.addFile(path.basename(filePath, "."+fileExt)+".json", new Buffer(JSON.stringify(componentContent)), "comentário")
		//Cria arquivo token.txt contendo a identificação do executável, do 
		//usuário e a permissão.
		oac.addFile("token.txt", new Buffer(fileId+ " " +userId+ " "+ permission), "comentário")
		//Adiciona o arquivo executável.
		oac.addLocalFile(DIR+'/'+filePath)
		callback(oac)
	})
}

//Copia os arquivos contidos no OAC e os coloca com o prefixo "new_".
var prepararEdicaoOAC = function(zip)
{
	var entries = zip.getEntries()
	entries.forEach(function(zipEntry)
	{
		console.log(zipEntry.entryName)
		if(zipEntry.entryName.endsWith("json"))
		{
			fs.writeFile("./new_"+zipEntry.name, zip.readFile(zipEntry), function(err)
			{
				if(err)
					console.log(err)
				console.log("Arquivo " + "./new_"+zipEntry.entryName + " criado.")
			})
		}
		if(zipEntry.entryName.startsWith("components"))
		{
			deleteFolderRecursive("./new_components")
			zip.extractEntryTo(zipEntry, "./new_components", false, true)
		}
	})
}

//Salva as mudanças realizadas no OAC.
var salvarMudancas = function(dir, content)
{
	fs.writeFile(dir, content, function(err)
	{
		if(err)
			console.log(err)
		console.log("Mudanças salvas em "+dir+".")
	})
}

var checarPermissao = function(key, permission)
{
	if(permission == 4)
		return true
	if(permission == 3)
		return key == "enabled" || key == "visible" || key == "startTime" || key == "stopTime" || key == "label" || key == "text" || key == "source"
	if(permission == 2)
		return key == "enabled" || key == "visible" || key == "startTime" || key == "stopTime"
	if(permission == 1)
		return key == "enabled" || key == "visible"
	
}
//Compara os componentes scene por scene e retorna o delta.
var getDelta = function(jsonFromFile, jsonDescritor, permission, callback)
{
	var i
	var delta = new Array()
	//Lê arquivo json enviado pelo usuário.
	for(var k = 0; k < jsonFromFile.scenes.length; k++)
	{
		//Lê arquivo json obtido no banco.
		for(var j = 0; j < jsonDescritor.scenes.length; j++)
		{
			//Se as scenes forem iguais, inicializa-se a variável delta, que conterá a diferença entre as scenes.
			if(jsonFromFile.scenes[k].scene == jsonDescritor.scenes[j].scene)
			{
				var delta_scene = {}
				//Compara-se os componentes de cada arquivo. Se tiverem os mesmos nomes, armazena-se a diferença entre eles na variável obj.
				for(var a = 0; a < jsonFromFile.scenes[k].components.length; a++)
				{
					for(var b = 0; b < jsonDescritor.scenes[j].components.length; b++)
					{
						var obj = {}
						if(jsonDescritor.scenes[j].components[b].name == jsonFromFile.scenes[k].components[a].name)
						{
							for(var key in jsonFromFile.scenes[k].components[a])
							{		
									if(
									(!jsonDescritor.scenes[j].components[b].hasOwnProperty(key) || 
									jsonFromFile.scenes[k].components[a][key] != jsonDescritor.scenes[j].components[b][key])
									&&
									checarPermissao(key, permission)
									)
										obj[key] = jsonFromFile.scenes[k].components[a][key]
								
							}
							//Se o tamanho da variável obj for maior que zero, armazena-se nela o nome do componente e adiciona-o à variável delta.
							if(Object.keys(obj).length > 0)
							{
								obj.name = jsonFromFile.scenes[k].components[a].name
								if(!delta_scene.scene)
									delta_scene.scene = jsonFromFile.scenes[k].scene
								if(!delta_scene.components)
									delta_scene.components = []
								delta_scene.components.push(obj)
							}
						}
					}
				}
				if(delta_scene.components)
					delta.push(delta_scene)
			}
		}
	}
	callback(delta)
}

var gerarPacoteVersao = function(fullpath, callback)
{
	var dir = path.dirname(fullpath)
	var fileId
	var userId = (new mongodb.ObjectID()).toString()
	var permission = Math.floor(Math.random() * 5)
	var oac = new ZIP()
	//Contador para controle de retorno das funções assíncronas.
	var count = 0
	//Lê o diretório.
	fs.readdir(dir, function(err, files)
	{
		files.forEach(function(file)
		{
			//Confirma se o a entrada encontrada inicia com “new_”.
			if(file.startsWith("new_"))
			{
				//Checa se a entrada é arquivo ou diretório.
				fs.stat(dir+'/'+file, function(err, stats)
				{
					if(err)
						console.log(err)
					//Se for diretório, simplesmente adiciona-se o conteúdo 
					//para uma pasta “components” dentro do novo zip e 
					//incrementa o contador. Se o resultado for dois, chama 
					//a função de callback.
					if(stats.isDirectory())
					{
						fs.readdir(dir+'/'+file, function(err, files)
						{
							if(err)
								console.log(err)
							files.forEach(function(content)
							{
								oac.addLocalFile(dir+'/'+file+'/'+content, "components/")
							})
							console.log("Pasta de componentes copiada.")
							count++
							if(count == 2)
								callback(oac)
						})
					}
					//Se não for diretório, copia-se o conteúdo do arquivo para um novo sem o 
					//prefixo e incrementa o contador. Chama-se a função de callback caso o 
					//contador tenha chegado a dois.
					else
					{
						if(file.endsWith(".json"))
						{
							fs.readFile(file, function(err, data)
							{
								if(err)
									console.log(err)
								var json = JSON.parse(data.toString())
								fileId = json[0].file_id
								oac.addFile("token.txt", new Buffer(fileId+ " " +userId+ " "+ permission), "comentário")
								console.log("Arquivo de token gerado.")
								oac.addFile(file.replace('new_', ''), new Buffer(data), "comentário")
								console.log("Arquivo json copiado.")
								count++
								if(count == 2)
									callback(oac)
							})
						}
					}
				})
			}
		})
	})
}
module.exports.lerManifest = lerManifest
module.exports.prepararEdicaoOAC = prepararEdicaoOAC
module.exports.gerarPacoteVersao = gerarPacoteVersao
module.exports.getDelta = getDelta
module.exports.gerarArquivoOAC = gerarArquivoOAC