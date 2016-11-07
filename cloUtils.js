var DIR = './file';
var fs = require('fs');
var zip = require('adm-zip');
var path = require('path');
var async = require('async');

var moment = require('moment');
var archiver = require('archiver');

//Lê o arquivo MANIFEST.MF e monta um objeto com a versão do MANIFEST e com
// lista de arquivos executáveis contidas no OAC.
var lerManifest = function(zip)
{
	var mf = zip.getEntry("MANIFEST.MF");
	var data = {};
	data.fileNames = [];
	var mfContent = zip.readAsText(mf).toString().split("\n");
	data.version = mfContent[0].toString().split(": ")[1];

	switch (data.version) {
		case '1.0':
			mfContent.forEach(function(line) {
				if(line.startsWith("Executable-File-Directory")) {			
					data.fileNames.push(line.split(": ")[1]);		
				} else if (line.startsWith("Executable-File")) {
					var last = data.fileNames.length - 1;
					data.fileNames[lastFileName] = data.fileNames[lastFileName].concat('/' + line.split(": ")[1]);
				}	
			});
			break;
		default:
			break;
	}
			
	return data;
}

//Gera, a partir dos dados informados, o arquivo compactado que representará o OAC
var gerarArquivoOAC = function(idDescritorDeArquivoExecutavel, pathArquivoExecutavel, descritorDeComponentes, userId, grauDeLiberdade, callback) {
	//Monta o arquivo compactado que representará o OAC
	var oac = archiver.create('zip');
	
	console.log(moment().format("DD/MM/YYYY HH:mm:ss.SSS") + " ### Iniciando a leitura do filesystem ###");
	//Adiciona ao arquivo compactado os arquivos referenciados pelos Componentes do OAC
	descritorDeComponentes.scenes.forEach(function(scene) {
	  	scene.components.forEach(function(component) {
		  	if (component.hasOwnProperty("source")) {
		  		//Adiciona, no diretório "components/", o arquivo referenciado pelo campo "source"
		  		oac.file(component.source, { "name": "components/" + path.basename(component.source) });
		  		//E atualiza a referência do campo
		  		component.source = "./components/" + path.basename(component.source);
		  	}
	  	});
	});
	console.log(moment().format("DD/MM/YYYY HH:mm:ss.SSS") + " ### Finalizando a leitura do filesystem ###");

	//Adiciona o DescritorDeComponentes
	oac.append(JSON.stringify(descritorDeComponentes), { "name": path.basename(pathArquivoExecutavel).replace(path.extname(pathArquivoExecutavel), ".json") });
	//Adiciona o Arquivo Executável
	oac.file(pathArquivoExecutavel, { "name": path.basename(pathArquivoExecutavel) });	
	//Adiciona o token.txt
	oac.append(idDescritorDeArquivoExecutavel + " " + userId + " " + grauDeLiberdade, { "name": "token.txt" });
	
	//Retorna o arquivo criado
	oac.finalize();
	callback(oac);
}

//Gera, a partir dos dados informados, o arquivo compactado que representará a Versão Customizada
var gerarArquivoVersaoCustomizada = function(descritorDeVersao, descritorDeComponentesRaiz, pathArquivoExecutavel, userId, degreeOfFreedom, callback) {
	//Monta o arquivo compactado que representará a Versão Customizada
	var versaoCustomizada = archiver.create('zip');
	var idSourceVersion = descritorDeVersao._id;
	
	console.log(moment().format("DD/MM/YYYY HH:mm:ss.SSS") + " ### Iniciando a Realização do Merge ###");
	mergeCustomizations(descritorDeVersao, descritorDeComponentesRaiz, function(descritorDeComponentes) {
		
		console.log(moment().format("DD/MM/YYYY HH:mm:ss.SSS") + " ### Finalizando a Realização do Merge ###");

		console.log(moment().format("DD/MM/YYYY HH:mm:ss.SSS") + " ### Iniciando a leitura do filesystem ###");
		//Adiciona ao arquivo compactado os arquivos referenciados pelos Componentes da Versão Customizada
		descritorDeComponentes.scenes.forEach(function(scene) {
		  	scene.components.forEach(function(component) {
			  	if (component.hasOwnProperty("source")) {
			  		//Adiciona, no diretório "components/", o arquivo referenciado pelo campo "source"
					versaoCustomizada.file(component.source, { "name": "components/" + path.basename(component.source) });
			  		//E atualiza a referência do campo
			  		component.source = "./components/" + path.basename(component.source);
			  	}
		  	});
		});
		console.log(moment().format("DD/MM/YYYY HH:mm:ss.SSS") + " ### Finalizando a leitura do filesystem ###");

		//Adiciona o DescritorDeComponentes		
		versaoCustomizada.append(JSON.stringify(descritorDeComponentes), { "name": path.basename(pathArquivoExecutavel).replace(path.extname(pathArquivoExecutavel), ".json") });
		//Adiciona o Arquivo Executável
		versaoCustomizada.file(pathArquivoExecutavel, { "name": path.basename(pathArquivoExecutavel) });
		//Adiciona o token.txt
		versaoCustomizada.append(idSourceVersion + " " + userId + " " + degreeOfFreedom, { "name": "token.txt" });
		
		//Retorna o arquivo criado
		versaoCustomizada.finalize();
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

//Identifica as Cenas diferentes entre os arquivos JSONs de Componentes da nova versão e de início da hierarquia de versão, 
//retornando o Delta resultante, contendo apenas as cenas e os componentes modificados.
var getDeltaAsync = function(jsonFromFile, jsonDescritor, grauDeLiberdade, callback) {
	
	var delta = new Array();

	//Realiza o processamento das cenas em paralelo a fim de detectar 
	//as diferenças entre as duas versões do JSON com o estados dos Componentes.
	async.each(jsonFromFile.scenes, processarCenas, function(err) {
		
		if (err) {
		    console.error(new Date() + " Erro ao Processar Cenas para a Obtenção de Delta: " + err);
			callback(err, null);
		} else {
			callback(null, delta);
		}			
	});
	
	//Processa as Cenas para o cálculo do Delta
	function processarCenas(scene, sceneProcessDone) {

		//Identifica a Cena no arquivo JSON com o estado dos componentes no início da hierarquia equivalente a que será processada.  
		jsonDescritor.scenes.forEach(function(sceneDescritor) {

			//Identifica a Cena equivalente para a realização da comparação.
			if(scene.scene == sceneDescritor.scene) {				
				var delta_scene = {}				
				//Processa os Componentes da Cena para o cálculo do Delta
				async.each(scene.components, function processarComponentes(component, componentProcessDone) {
					
					//Identifica o Componente no arquivo JSON com o estado dos componentes no início da hierarquia equivalente a que será processada.  					
					sceneDescritor.components.forEach(function(componentDescritor) {

						//Identifica o Componente equivalente para a realização da comparação.
						if(component.name == componentDescritor.name) {
							//Obtém as diferenças entre os Componentes comparados e as armazena no Delta da Cena que está sendo processada.
							getDiffComponente(component, componenteDescritor, function (err, deltaComponente) {

								if (err) {
								    console.error(new Date() + " Erro ao Verificar as Customizações Realizadas nos Componentes: " + err);
									componentProcessDone(err);
								} 

								//Caso os Componentes sejam distintos, as modificações são adicionadas no Delta da Cena que está sendo processada.
								if (deltaComponente) {
									//Inicializa o Delta da Cena, caso necessário.
									if(!delta_scene.scene) {
										delta_scene.scene = scene.scene;
									} if(!delta_scene.components) {
										delta_scene.components = new Array();
									}
									//Adiciona as alterações do novo Componente ao Delta da Cena.
									delta_scene.components.push(deltaComponente);								
								}

								componentProcessDone(null);
							});
						}						
					});
					//Caso não encontre o Componente equivalente para a Comparação
					componentProcessDone(new Error("Componente não encontrado em Cena"));					
				}, function(err) {

					if (err) {
					    console.error(new Date() + " Erro ao Processar Componentes para a Obtenção de Delta: " + err);
						componentProcessDone(err);
					} 

					//Adiciona o Delta da Cena processada ao Delta final resultante da comparação dos arquivos JSONs
					if(delta_scene.components) {
						delta.push(delta_scene);
					}
				});
			}
		});
	}
	
	//Calcula o Delta entre dois Componentes.
	function getDiffComponente(componentA, componentB, callback) {
		
		var deltaComponente = {};
		
		for(var key in componentA) {			
			
			if(!componentB.hasOwnProperty(key) || 
				(key == 'source' && path.basename(componentA[key]) != path.basename(componentB[key])) ||
				(key != 'source' && componentA[key] != componentB[key])) {

				//É verificado se o usuário que realiza a inclusão da Versão Customizada
				//possui Grau de Liberdade compatível com as modificações
				if (checarPermissao(key, grauDeLiberdade)) {
					deltaComponente[key] = componentA[key];
				} else {
					//Se as alterações não forem compatíveis com o Grau de Liberdade, 
					//a inclusão deve ser cancelada
					callback(new Error("Customizações não compatíveis com o Grau de Liberdade"), null);
				}
			}
		}

		//Retorna o Delta entre os componentes, caso existam diferenças. 
		if(Object.keys(deltaComponente).length > 0) {
			deltaComponente.name = componentA.name;
			callback(null, deltaComponente);
		} else {
			callback(null, null);
		}		
	}
}

//@deprecated
//Compara os componentes scene por scene e retorna o delta.
var getDelta = function(jsonFromFile, jsonDescritor, grauDeLiberdade, callback) {

	console.warn("Chamando Função Obsoleta.");
	
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
										return;
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

module.exports.lerManifest = lerManifest;
module.exports.gerarArquivoOAC = gerarArquivoOAC;
module.exports.gerarArquivoVersaoCustomizada = gerarArquivoVersaoCustomizada;
module.exports.getDeltaAsync = getDeltaAsync;
