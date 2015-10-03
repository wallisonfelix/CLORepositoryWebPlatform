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

//Gera, a partir dos dados informados, o arquivo compactado que representará o OAC
var gerarArquivoOAC = function(idDescritorDeArquivoExecutavel, pathArquivoExecutavel, descritorDeComponentes, userId, grauDeLiberdade, callback) {
	//Monta o arquivo compactado que representará o OAC
	var oac =  new ZIP();
	s
	//Adiciona ao arquivo compactado os arquivos referenciados pelos Componentes do OAC
	descritorDeComponentes.scenes.forEach(function(scene) {
	  	scene.components.forEach(function(component) {
		  	if (component.hasOwnProperty("source")) {
		  		//Adiciona, no diretório "components/", o arquivo referenciado pelo campo "source"
		  		oac.addLocalFile(component.source, "components/");
		  		//E atualiza a referência do campo
		  		component.source = "./components/" + path.basename(component.source);
		  	}
	  	});
	});
	//Adiciona o DescritorDeComponentes
	oac.addFile(path.basename(pathArquivoExecutavel).replace(path.extname(pathArquivoExecutavel), ".json"), new Buffer(JSON.stringify(descritorDeComponentes)));
	//Adiciona o Arquivo Executável
	oac.addLocalFile(pathArquivoExecutavel);	
	//Adiciona o token.txt
	oac.addFile("token.txt", new Buffer(idDescritorDeArquivoExecutavel + " " + userId + " " + grauDeLiberdade));

	//Retorna o arquivo criado
	callback(oac);
}

//Gera, a partir dos dados informados, o arquivo compactado que representará a Versão Customizada
var gerarArquivoVersaoCustomizada = function(descritorDeVersao, descritorDeComponentesRaiz, pathArquivoExecutavel, userId, grauDeLiberdade, callback) {
	//Monta o arquivo compactado que representará a Versão Customizada
	var versaoCustomizada =  new ZIP();
	var idSourceVersion = descritorDeVersao._id;
	
	mergeCustomizations(descritorDeVersao, descritorDeComponentesRaiz, function(descritorDeComponentes) {
		//Adiciona ao arquivo compactado os arquivos referenciados pelos Componentes da Versão Customizada
		descritorDeComponentes.scenes.forEach(function(scene) {
		  	scene.components.forEach(function(component) {
			  	if (component.hasOwnProperty("source")) {
			  		//Adiciona, no diretório "components/", o arquivo referenciado pelo campo "source"
			  		versaoCustomizada.addLocalFile(component.source, "components/");
			  		//E atualiza a referência do campo
			  		component.source = "./components/" + path.basename(component.source);
			  	}
		  	});
		});
		//Adiciona o DescritorDeComponentes
		versaoCustomizada.addFile(path.basename(pathArquivoExecutavel).replace(path.extname(pathArquivoExecutavel), ".json"), new Buffer(JSON.stringify(descritorDeComponentes)));
		//Adiciona o Arquivo Executável
		versaoCustomizada.addLocalFile(pathArquivoExecutavel);	
		//Adiciona o token.txt
		versaoCustomizada.addFile("token.txt", new Buffer(idSourceVersion + " " + userId + " " + grauDeLiberdade));

		//Retorna o arquivo criado
		callback(versaoCustomizada);
	});
}

//Função que faz o merge das customizações realizadas para um determinado DescritorDeVersaoCustomizada 
//com o estado inicial dos componentes
var mergeCustomizations = function(descritorDeVersao, descritorDeComponentes, callback) {
	
	//Intera em todas as cenas que foram customizadas para a Versão Customizada
	descritorDeVersao.customizations.forEach(function(customizedScene) {
		descritorDeComponentes.scenes.forEach(function(scene) {
			if (customizedScene.scene === scene.scene) {
				//Intera em todos os componentes que foram customizadas em uma determinada cena
				customizedScene.components.forEach(function(customizedComponent) {
					scene.components.forEach(function(component) {
						if (customizedComponent.name === component.name) {
							//Substitui os valores dos atributos originais pelos os seus respectivos valores customizados
							for(var key in customizedComponent) {
								component[key] = customizedComponent[key];
							}
						}
					});
				});
			}
		});
	});

	//Retorna o DescritorDeComponentes com as customizações incorporadas,
	//representando dessa forma o estado dos componentes para uma determinada Versão Customizada
	console.log(JSON.stringify(descritorDeComponentes));
	callback(descritorDeComponentes);
}

//Verifica se o Grau de Liberdade informado como parâmetro tem permissão para 
//customizar um determinado atributo de componente
var checarPermissao = function(key, grauDeLiberdade) {
	if(grauDeLiberdade == 4)
		return true
	if(grauDeLiberdade == 3)
		return key == "enabled" || key == "visible" || key == "startTime" || key == "stopTime" || key == "label" || key == "text" || key == "source"
	if(grauDeLiberdade == 2)
		return key == "enabled" || key == "visible" || key == "startTime" || key == "stopTime"
	if(grauDeLiberdade == 1)
		return key == "enabled" || key == "visible"
	
}

//Compara os componentes scene por scene e retorna o delta.
var getDelta = function(jsonFromFile, jsonDescritor, grauDeLiberdade, callback) {
	
	var i;
	var delta = new Array();

	//Lê arquivo JSON com o estado dos componentes do arquivo compactado
	for(var k = 0; k < jsonFromFile.scenes.length; k++) {
		
		//Lê arquivo JSON com o estado dos componentes no início da hierarquia
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
								if(!jsonDescritor.scenes[j].components[b].hasOwnProperty(key) || 
										(key == 'source' && path.basename(jsonFromFile.scenes[k].components[a][key]) != path.basename(jsonDescritor.scenes[j].components[b][key])) ||
										(key != 'source' && jsonFromFile.scenes[k].components[a][key] != jsonDescritor.scenes[j].components[b][key])) {
									//É verificado se o usuário que realiza a inclusão da Versão Customizada
									//possui Grau de Liberdade compatível com as modificações
									if (checarPermissao(key, grauDeLiberdade)) {
										obj[key] = jsonFromFile.scenes[k].components[a][key]
									} else {
										//Se as alterações não forem compatíveis com o Grau de Liberdade, 
										//a inclusão deve ser cancelada
										callback(new Error("Customizações não compatíveis com o Grau de Liberdade"), null);
									}
								}
								
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

	callback(null, delta);
}

module.exports.lerManifest = lerManifest
module.exports.gerarArquivoOAC = gerarArquivoOAC
module.exports.gerarArquivoVersaoCustomizada = gerarArquivoVersaoCustomizada
module.exports.getDelta = getDelta
