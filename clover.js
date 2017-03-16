var cloUtils = require('./cloUtils.js');
var DIR = 'D:/clo/file';
var path = require('path');
var mongodb = require('mongodb');
var zip = require('adm-zip');
var crypto = require('crypto');
var bson = require('bson');

var moment = require('moment');

//Realiza a busca de um Descritor, com base no nome da coleção e no identificador passados como parâmetros,
//retornando os elementos do Descritor que forem definidos por parâmetro
var buscarDescritorPorId = function(mongoConnection, nomeColecao, idDescritor, arrayElementosDescritor, callback) {

	if (!bson.ObjectID.isValid(idDescritor)) {
		callback(new Error("Id do " + nomeColecao + " inválido"), null);
		return;
	}

	if (arrayElementosDescritor) {
		mongoConnection.collection(nomeColecao).findOne({ _id: new mongodb.ObjectID(idDescritor) }, arrayElementosDescritor, function(err, descritor) {
		
		    if(err) {
				console.error(new Date() + " Erro ao Pesquisar " + nomeColecao + ": " + err);
				callback(err, null);
				return;
			}

			callback(null, descritor);
			return;	
	    });
	} else {
		mongoConnection.collection(nomeColecao).findOne({ _id: new mongodb.ObjectID(idDescritor) }, function(err, descritor) {
		
		    if(err) {
				console.error(new Date() + " Erro ao Pesquisar " + nomeColecao + ": " + err);
				callback(err, null);
				return;
			}

			callback(null, descritor);	
			return;
	    });
	}
}

//Realiza a criação dos elementos que compõem um OAC no banco de dados
var criarOAC = function(mongoConnection, zip, userId, fileNames, callback)
{
  //Variáveis que receberão os JSONs de arquivos executáveis e seus componentes.
  var toCollection = []
  var count = 0
  //Variáveis para formatação de nome do JSON de cada arquivo executável e componente.
  var lista_componentes, dae, ext;
  var lomFile = JSON.parse(zip.readAsText("LOM.json").trim());  

  //Cria e insere o novo DescritorRaiz.
  criarDescritorRaiz(mongoConnection, lomFile, userId, function(err, data) {	
   		if(err) {
			console.error(new Date() + " Erro ao Criar DescritorRaiz: " + err);
			callback(err, null);
			return;
		}

		fileNames.forEach(function(element) {
		   var obj = {}
		   //Caminho completo do arquivo NomeDoOAC_extensao.json
		   dae = element.replace('.', '_').concat(".json");
		   //Caminho completo do arquivo NomeDoOAC.json		 
		   lista_componentes = element.substring(0, element.lastIndexOf('.')).concat(".json");

		   obj.exec = JSON.parse(zip.readAsText(dae).trim());
		   obj.exec.id_clo = lomFile._id;
		   obj.comp = JSON.parse(zip.readAsText(lista_componentes).trim());
		   obj.fileName = element;
		   toCollection.push(obj);
		});
	   	//Intera a lista de arquivos executáveis do OAC para incluí-los no banco
		toCollection.forEach(function(item) {
			criarDescritorDeArquivoExecutavel(mongoConnection, zip, item.fileName, lomFile.qualified_name, item.exec, item.comp, function(err, data) {
			   if(err) {
					console.error(new Date() + " Erro ao Criar DescritorDeArquivoExecutavel: " + err);
					callback(err, null);
					return;
				}
			   	count++;
			   	if(count == toCollection.length) {
					console.log(new Date() + " OAC inserido com sucesso.");
					callback(null, lomFile);
					return;
				}
			});
		});
	});
}

//Cria um novo documento na Collection DescritoresRaizes
function criarDescritorRaiz(mongoConnection, lom, userId, callback) {

	lom.qualified_name = lom.title.value.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

	mongoConnection.collection("DescritoresRaizes").count({"qualified_name" : lom.qualified_name}, function(err, qtyDescritores) {		

		if(err) {
			console.error(new Date() + " Erro ao Inserir DescritorRaiz: " + err);
			callback(err, null);
			return;
		}

		if(qtyDescritores == 0) {

			lom._id = new mongodb.ObjectID();    
		    lom.user = userId;
			lom.date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
		    mongoConnection.collection('DescritoresRaizes').insert(lom, function(err, data) {

			    if(err) {
					console.error(new Date() + " Erro ao Inserir DescritorRaiz: " + err);
					callback(err, null);
					return;
				}

			    console.log(new Date() + " Novo documento DescritorRaiz inserido: " + lom._id + ".");
				callback(null, data);
				return;
		    });

		} else {
			callback(new Error("Já existe um DescritorRaiz com o Nome Qualificado " + lom.qualified_name + ". Escolha um título diferente para o OAC."), null);	
			return;
		}
	});
  }
  
//Cria um novo DescritorDeArquivoExecutavel, criando também o DescritorDeComponents ao qual ele o referencia
function criarDescritorDeArquivoExecutavel(mongoConnection, zip, element, qualified_name, jsonExec, jsonComp, callback) {
  var count = 0;

  jsonExec._id = new mongodb.ObjectID();
  jsonComp._id = new mongodb.ObjectID();
  jsonExec.id_components = jsonComp._id;

  //Variáveis com o path dos diretórios de destino do Arquivo Executável e dos seus Componentes
  var diretorioDestinoExecutavel = DIR + '/' + path.dirname(element.replace("executable_files", qualified_name));
  var diretorioDestinoComponentes = diretorioDestinoExecutavel + "/components/";
   
  var inicioEscritaFilesystem = moment().utc();

  //Envia os componentes para o diretório de destino no servidor
  //e atualiza os campos "source" do JSON com o estado dos Componentes antes de incluí-lo no banco  
  jsonComp.scenes.forEach(function(scene) {
  	scene.components.forEach(function(component) {
	  	if (component.hasOwnProperty("source")) {	  		
			//Caso exista arquivos com a mesma nomenclatura, eles não são substituidos.	
			zip.extractEntryTo(path.dirname(element) + "/components/" + path.basename(component.source), diretorioDestinoComponentes, false, false);
			component.source = diretorioDestinoComponentes + path.basename(component.source);
	  	}
  	});
  });
  
  var fimEscritaFilesystem = moment().utc();
  console.log(fimEscritaFilesystem.diff(inicioEscritaFilesystem, "milliseconds") + " ### Tempo de escrita no filesystem ###");

  mongoConnection.collection('DescritoresDeComponentes').insert(jsonComp, function(err, data) {
    
    if(err) {
      console.error(new Date() + " Erro ao Inserir DescritorDeComponente: " + err);
      callback(err, null);
      return;
	}

    console.log(new Date() + " Novo documento DescritorDeComponente inserido: " + jsonComp._id + ".");
	count++
	if(count == 2) {
		callback(null, data);
		return;
	}
  })

  //Cria a lista "locations" no JSON que resultará no Descritor de Arquivo Executável,
  //contendo o path de onde ficará o Arquivo Executável.
  jsonExec.locations = [diretorioDestinoExecutavel + '/' + path.basename(element)];
  mongoConnection.collection('DescritoresDeArquivosExecutaveis').insert(jsonExec, function(err, data) {
    if(err) {
      console.error(new Date() + " Erro ao Inserir DescritorDeArquivoExecutavel: " + err);
	  callback(err, data);
	  return; 
	}	
	
	//Envia o arquivo executável para o diretório de destino no servidor.
	//Caso exista um arquivo com a mesma nomenclatura, ele não é substituido.
	
	var inicioEscritaExecFilesystem = moment().utc();
	
	zip.extractEntryTo(element, diretorioDestinoExecutavel, false, false)
	
	var fimEscritaExecFilesystem = moment().utc();
  	console.log(fimEscritaExecFilesystem.diff(inicioEscritaExecFilesystem, "milliseconds") + " ### Tempo de escrita do executável no filesystem ###");

	console.log(new Date() + " Novo documento DescritorDeArquivoExecutavel inserido: " + jsonExec._id + ".");
	count++
	if(count == 2) {
		callback(null, data);
		return;
	}
  });
}

//Define o Padrão de Regex adotado para as consultas utilizando filtros
var formatValuesInRegexPattern = function(filter) {
	if (!filter || filter.trim() == "") {
		return "/.*/i";
	} else {
		var regexPattern = "";
		filter.split(" ").forEach(function(currentValue, indexValue, values) {
			if (currentValue != "") {
				if (indexValue > 0) {
					regexPattern = regexPattern.concat("|");
				}
				regexPattern = regexPattern.concat(".*" + currentValue + ".*");				
			}
		});
		return "/" + regexPattern + "/i";
	}
}

//Realiza a busca de OACs cujo metadados correspondam com os campos passados como parâmetro
var buscarOAC = function(mongoConnection, title, description, keyWord, callback) {
	
	//Monta Regex para consulta pelos campos
	var titleRegex = formatValuesInRegexPattern(title);
	var descriptionRegex = formatValuesInRegexPattern(description);
	var keyWordRegex = formatValuesInRegexPattern(keyWord);

	var result = [];

	//Pesquisa os Descritores de Versão que os respectivos metadados correspondam aos campos utilizados como filtro, 
	//limitando o retorno aos identificadores do Descritores de Arquivo Executável das versões
	mongoConnection.collection("DescritoresDeVersoes").distinct("id_root_version", {metadata: { $elemMatch: {"title": titleRegex, "description": descriptionRegex}}}, {"id_root_version": 1}, function(err, idDescritoresDeArquivosExecutaveis) {

		if (err) {
		    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
			callback(err, result);
			return;
		}

		//Pesquisa os Descritores de Arquivo Executáveis referenciados pelos Descritores de Versão encontrados,
		//limitando o retorno aos identificadores dos Descritores Raízes dos executáveis
		mongoConnection.collection("DescritoresDeArquivosExecutaveis").distinct("id_clo", {_id: { $in: idDescritoresDeArquivosExecutaveis}}, {"id_clo": 1}, function(err, idDescritoresRaizes) {

			if (err) {
			    console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
				callback(err, result);
				return;
			}

			//Pesquisa os Descritores Raízes passando os campos utilizados como filtro e 
			//limitando o retorno aos campos que serão utilizados
			var cursorDescritoresRaizes = mongoConnection.collection("DescritoresRaizes").find({ $or: [{"title.value": titleRegex, "descriptions.value": descriptionRegex, "keywords.value": keyWordRegex}, {_id: { $in: idDescritoresRaizes}}] }, {"qualified_name": 1, "title.value": 1});	

			cursorDescritoresRaizes.count(function(err, count) {			

				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresRaizes: " + err);
					callback(err, result);
					return;
				}

				var countDescritoresRaizes = count;
				var indexDescritoresRaizes = 0;	

				if (countDescritoresRaizes == 0) {
					console.log(new Date() + " Pesquisa por OAC com retorno vazio");
					callback(null, result);
					return;
				}

				//Intera na lista de resultados
				cursorDescritoresRaizes.forEach(function(descritorRaiz)	{
					//Prepara objeto para representar um registro no retorno da busca
					var obj = {};
					obj._id = descritorRaiz._id;
					obj.title = descritorRaiz.title.value;
					obj.files = new Array();

					//Pesquisa os Descritores de Arquivos Executáveis referente ao Descritor Raiz,
					//limitando o retorno aos campos que serão utilizados
					var cursorDescritoresDeArqExec = mongoConnection.collection("DescritoresDeArquivosExecutaveis").find({"id_clo" : descritorRaiz._id}, {"locations": 1});		

					cursorDescritoresDeArqExec.count(function(err, count) {

						if (err) {
						    console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
							callback(err, result);
							return;
						}

						var countDescritoresDeArqExec = count;	
						var indexDescritoresDeArqExec = 0;						
						
						//Intera na lista dos Descritores de Arquivos Executáveis
						cursorDescritoresDeArqExec.forEach(function(descritorDeArqExec) {
							
							//Prepara objeto para representar o Arquivo Executável
							var file = {};
							file._id = descritorDeArqExec._id;
							//Caminhos onde o Arquivo Executável pode ser encontrado
							file.locations = [];
							descritorDeArqExec.locations.forEach(function(location) {
								var fileLocation = {};
								fileLocation.ext = path.extname(location);
								fileLocation.path = location;
								file.locations.push(fileLocation);
							});

							//Obtem a quantidade de Versões Customizadas do DescritorDeArquivoExecutavel
							mongoConnection.collection("DescritoresDeVersoes").count({"id_root_version" : descritorDeArqExec._id}, function(err, qtyCustomizedVersion) {

								if (err) {
								    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
									callback(err, result);
									return;
								}

								//Preenche o campo qtyCustomizedVersion
								file.qtyCustomizedVersion = qtyCustomizedVersion;						

								obj.files.push(file);						

								indexDescritoresDeArqExec++;						
								if(indexDescritoresDeArqExec == countDescritoresDeArqExec) {
									//Adiciona a lista de resultados o objeto montado para representar um registro na busca 
									result.push(obj);
									
									indexDescritoresRaizes++;
									if(indexDescritoresRaizes == countDescritoresRaizes) {					
										//Retorna a lista de resultados da pesquisa
										console.log(new Date() + " Retorno de uma Pesquisa por OAC: " + JSON.stringify(result) + ".");
										callback(null, result);
										return;
									}
								}
							});
						});
					});
				});
			});
		});	
	});	
}

//Realiza a busca dos metadados do OAC cujo DescritorRaiz tem o mesmo id passado como parâmetro
function buscarMetadadosOAC(mongoConnection, idDescritorRaiz, callback) {
    
	buscarDescritorPorId(mongoConnection, "DescritoresRaizes", idDescritorRaiz, null, function(err, descritorRaiz) {

	    if(err) {
			console.error(new Date() + " Erro ao Pesquisar DescritorRaiz: " + err);
			callback(err, null);
			return;
		}

		if(descritorRaiz) {		
			console.log(new Date() + " Retornando Metadados para Visualização: " + idDescritorRaiz + ".");
			callback(null, descritorRaiz);	
			return;
		} else {
			callback(new Error("DescritorRaiz com o id " + idDescritorRaiz + " não encontrado."), null);
			return;
		}	    
		
    });
}

//Gera e retorna um arquivo compactado representando o OAC compatível com os parâmetros informados
var gerarPacoteOAC = function(mongoConnection, idDescritorDeArquivoExecutavel, pathArquivoExecutavel, userId, degreeOfFreedom, callback)
{		
	//Pesquisa o DescritorDeArquivoExecutavel do OAC que se deseja baixar
	buscarDescritorPorId(mongoConnection, "DescritoresDeArquivosExecutaveis", idDescritorDeArquivoExecutavel, {'id_components': 1}, function(err, descritorDeArquivoExecutavel) {

		if (err) {
			console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
			callback(err, null);
			return;
		}

		//Pesquisa o DescritorDeComponentes referenciado pelo DescritorDeArquivoExecutavel
		buscarDescritorPorId(mongoConnection, "DescritoresDeComponentes", descritorDeArquivoExecutavel.id_components, null, function(err, descritorDeComponentes) {

			if (err) {	
				console.error(new Date() + " Erro ao Pesquisar DescritoresDeComponentes: " + err);
				callback(err, null);
				return;
			}

			//Gera o arquivo compactado que representa o OAC
			cloUtils.gerarArquivoOAC(idDescritorDeArquivoExecutavel, pathArquivoExecutavel, descritorDeComponentes, userId, degreeOfFreedom, function(oac) {
				callback(null, oac);
				return;
			});
		});
	});
}

//Realiza a busca das Versões Customizadas do DescritorDeVersao ou DescritorDeArquivoExecutavel que tem o mesmo id passado como parâmetro
var buscarVersoesCustomizadas = function(mongoConnection, idSourceVersion, filePath, callback) {
	var result = [];

	if (bson.ObjectID.isValid(idSourceVersion)) {
		//Pesquisa as Versões Customizadas oriundas do DescritorDeVersao ou do DescritorDeArquivoExecutavel com o id passado como parâmetro
		var cursorDescritoresDeVersoes = mongoConnection.collection("DescritoresDeVersoes").find({"id_source_version" : new mongodb.ObjectID(idSourceVersion)});
	} else {
		callback(new Error("Id do Descritor de Arquivo Executável inválido"), null);
		return;
	}

	cursorDescritoresDeVersoes.count(function(err, cursorSize) {			

		if (err) {
		    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
			callback(err, result);
			return;
		}

		if (cursorSize == 0) {
			console.log(new Date() + " Pesquisa por Versões Customizadas com retorno vazio");
			callback(null, result);
			return;
		}
		
		indexDescritoresDeVersoes = 0;
		//Intera na lista de Versões Customizadas retornadas
		cursorDescritoresDeVersoes.forEach(function(descritorDeVersao)	{

			//Obtem a quantidade de Versões Customizadas do DescritorDeVersao ou do DescritorDeArquivoExecutavel
			mongoConnection.collection("DescritoresDeVersoes").count({"id_source_version" : descritorDeVersao._id}, function(err, qtyCustomizedVersion) {

				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
					callback(err, result);
					return;
				}

				indexMetadados = 0;
				//Um registro de Versão Customizada para cada Versão existente ou incorporação realizada
				descritorDeVersao.metadata.forEach(function(metadata) {

					//Prepara objeto para representar um registro no retorno da busca
					var obj = {};
					obj._id = descritorDeVersao._id;
					obj.id_root_version = descritorDeVersao.id_root_version;
					obj.id_source_version = descritorDeVersao.id_source_version;
					obj.version = descritorDeVersao.version;
					obj.languages = descritorDeVersao.languages;
					obj.path = filePath;

					//Preenche o campo qtyCustomizedVersion
					obj.qtyCustomizedVersion = qtyCustomizedVersion;

					obj.user = metadata.user;
					obj.date = metadata.date;
					obj.title = metadata.title;
					obj.description = metadata.description;
					
					result.push(obj);

					indexMetadados++;
					if (indexMetadados == descritorDeVersao.metadata.length) {
						indexDescritoresDeVersoes++;
						if (indexDescritoresDeVersoes == cursorSize) {
							callback(null, result);
							return;
						}
					}
				});
			});
		});		
	});
}

//Gera e retorna um arquivo compactado representando a Versão Customizada compatível com os parâmetros informados
var gerarPacoteVersao = function(mongoConnection, idVersion, idRootVersion, pathArquivoExecutavel, userId, degreeOfFreedom, callback) {	

	//Pesquisa o DescritorDeArquivoExecutavel raiz da hierarquia em que a Versão está inserida
	buscarDescritorPorId(mongoConnection, "DescritoresDeArquivosExecutaveis", idRootVersion, {'id_components': 1}, function(err, descritorDeArquivoExecutavel) {
		
		if (err) {
			console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
			callback(err, null);
			return;
		}

		if (!descritorDeArquivoExecutavel) {
			callback(new Error("DescritorDeArquivosExecutavel com o id " + idRootVersion + " não encontrado."), null);
			return;
		}

		//Pesquisa o DescritorDeComponentes referenciado pelo DescritorDeArquivoExecutavel raiz da hierarquia em que a Versão está inserida
		buscarDescritorPorId(mongoConnection, "DescritoresDeComponentes", descritorDeArquivoExecutavel.id_components, null, function(err, descritorDeComponentesRaiz) {
			
			if (err) {
				console.error(new Date() + " Erro ao Pesquisar DescritoresDeComponentes: " + err);
				callback(err, null);
				return;
			}

			if (!descritorDeComponentesRaiz) {
				callback(new Error("DescritorDeComponentes com o id " + descritorDeArquivoExecutavel.id_components + " não encontrado."), null);
				return;
			}

			//Pesquisa o DescritorDeVersao referente à versão que se deseja fazer o download
			buscarDescritorPorId(mongoConnection, "DescritoresDeVersoes", idVersion, null, function(err, descritorDeVersao) {

				if (err) {
					console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
					callback(err, null);
					return;
				}

				if (!descritorDeVersao) {
					callback(new Error("DescritorDeVersao com o id " + idVersion + " não encontrado."), null);
					return;
				}
				
				//Gera o arquivo compactado que representa a Versão Customizada
				cloUtils.gerarArquivoVersaoCustomizada(descritorDeVersao, descritorDeComponentesRaiz, pathArquivoExecutavel, userId, degreeOfFreedom, function(versaoCustomizada) {
					callback(null, versaoCustomizada);
					return;
				});
			});
		});
	});	
}

//Retorna as informações referentes à versão de um novo DescritorDeVersao deve assumir, 
//com base no identificador da versão de origem passado como parâmetro
var getVersion = function(mongoConnection, id, callback) {

	//Pesquisa um DescritorDeArquivoExecutavel que possua o identificador passado como parâmetro
	buscarDescritorPorId(mongoConnection, "DescritoresDeArquivosExecutaveis", id, {"_id": 1}, function(err, resultDescDeArqExec) {

		if (err) {
		    console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
			callback(err, null);
			return;
		}

		//Caso seja retornado um DescritorDeArquivoExecutavel,
		//a nova Versão Customizada é uma versão de Primeiro Nível	
		if(resultDescDeArqExec) {
			
			var ret = {};
			//A versão raiz e a de origem para o novo DescritorDeVersao são o próprio DescritorDeArquivoExecutavel retornado
			ret.id_root_version = id;
			ret.id_source_version = id;

			//Pesquisa os DescritoresDeVersoes cuja versão de origem seja o próprio DescritorDeArquivoExecutavel retornado
			mongoConnection.collection("DescritoresDeVersoes").find({"id_source_version" : id}, {'version': 1}).toArray(function(err, resultDescDeVerPrimeiroNivel) {

				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
					callback(err, null);
					return;
				}

				//Define a versão que o novo DescritorDeVersao deve assumir
				var version = 0;
				for(var i = 0; i < resultDescDeVerPrimeiroNivel.length; i++) {
					if(parseInt(resultDescDeVerPrimeiroNivel[i].version) > version) {
						version = parseInt(resultDescDeVerPrimeiroNivel[i].version);
					}	
				}
				ret.version = (version + 1).toString();				
				
				callback(null, ret);
				return;
			});
		
		} else {
			//Não sendo encontrado um DescritorDeArquivoExecutavel com o identificador passado como parâmetro,
			//busca-se DescritoresDeVersoes com esse id e, simultaneamente, suas Versões Customizadas
			mongoConnection.collection("DescritoresDeVersoes").find({$or: [{"_id" : id}, {"id_source_version": id}]}, {"id_root_version": 1, "id_source_version": 1, "version": 1}).toArray(function(err, resultDescDeVers) {
				
				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
					callback(err, null);
					return;
				}

				var ret = {};						

				//Caso seja retornado um DescritorDeVersao,
				//a nova Versão Customizada é uma versão de Segundo Nível em diante	
				if(resultDescDeVers.length > 0) {
					
					//A versão raiz do novo DescritorDeVersao é a mesma dos demais elementos na sua hierarquia
					ret.id_root_version = resultDescDeVers[0].id_root_version;
					//A versão de origem do novo DescritorDeVersao
					ret.id_source_version = id;

					//Define a versão que o novo DescritorDeVersao deve assumir
					var prefix = "";
					var greaterLastVersionNumber = 0;
					var versionNumbers = [];
					var lastVersionNumber;
					//O retorno de mais de um DescritorDeVersao indica a existência de outras Versões Customizadas
					//derivadas da versão de origem	
					for(var i = 0; i < resultDescDeVers.length; i++) {

						if(resultDescDeVers[i]._id.valueOf() != "" + id) {
							//Obtêm o último inteiro do campo version
							versionNumbers = resultDescDeVers[i].version.split(".");
							lastVersionNumber = parseInt(versionNumbers[versionNumbers.length-1]);
							//Obtêm o último número de versão de um dado nível da hierarquia
							if(lastVersionNumber > greaterLastVersionNumber) {
								greaterLastVersionNumber = lastVersionNumber;
							}
						} else {
							//Obtêm o prefixo do número de versão
							prefix = resultDescDeVers[i].version;
						}	

					}							
					greaterLastVersionNumber++;
					ret.version = prefix.concat('.' + greaterLastVersionNumber);					
				} else {
					//Caso não se encontre DescritoresDeArquivosExecutaveis e DescritoresDeVersoes com o identificador,
					//o retorno da função é anulada
					ret = null;
				}

				callback(null, ret);
				return;
			});
		}
	});
}

//Cria um novo documento na Collection DescritoresDeVersoes ou realiza uma incorporação,
//para a representação da nova Versão Customizada no banco de dados
var criarVersaoCustomizada = function(mongoConnection, oac, userId, degreeOfFreedom, title, description, languages, callback) {
	
	//Novo DescritorDeVersao
	var descritorDeVersao = {};
	//Gerador de Hash SHA1
	var shasum = crypto.createHash('sha1');
	
	//Conteúdo do token.txt
	var token = oac.getEntry("token.txt");
	var tokenAsArray = null;
	if (token) {
		tokenAsArray = oac.readAsText(token).split(" ");		
	} else {
		callback(new Error("Arquivo token.txt não encontrado"), null);
		return;
	}
	
	//Descritor de origem da nova Versão Customizada
	var idDescritorOrigem;
	if (bson.ObjectID.isValid(tokenAsArray[0])) {		
		idDescritorOrigem = new mongodb.ObjectID(tokenAsArray[0]);	
	} else {
		callback(new Error("Id do Descritor de Origem definido no token.txt inválido"), null);
		return;
	}

	//Diretório em que o Arquivo Executável da Versão está localizado no servidor
	var diretorioArquivoExecutavel;
	//Path do diretório de destino dos arquivos de mídias modificados
	var diretorioDestinoComponentes;

	//Conteúdo do Arquivo Compactado
	var oacEntries = oac.getEntries();	

	//Obtêm o JSON com o novo estado dos componentes
	//E popula o array com os nomes dos arquivos mídias customizados
	var jsonComp;
	oacEntries.forEach(function(entry) {
		if(entry.entryName.endsWith(".json")) {
			jsonComp = JSON.parse(oac.readAsText(entry.entryName).trim());
		}
	});
		
	//Obtêm as informações referentes à versão para o novo DescritorDeVersao

	var inicioCalculoNumeroVersao = moment().utc();

	getVersion(mongoConnection, idDescritorOrigem, function(err, result) {		

		var fimCalculoNumeroVersao = moment().utc();
	  	console.log(fimCalculoNumeroVersao.diff(inicioCalculoNumeroVersao, "milliseconds") + " ### Tempo do Cálculo do Número da Versão ###");

		if (err) {
		    console.error(new Date() + " Erro ao Obter Número de Versão para novo DescritorDeVersao: " + err);
			callback(err, null);
			return;
		}
	
		if(result) {
			console.log(new Date() + " Inserindo nova Versão Customizada: \n" + JSON.stringify(result));
			//Preenche o novo DescritorDeVersao
			descritorDeVersao = {
				_id : new mongodb.ObjectID(),			
				id_source_version : new mongodb.ObjectID(result.id_source_version),
				id_root_version : new mongodb.ObjectID(result.id_root_version),
				version : result.version,
				languages : languages,							
				metadata : [{user : userId, date : new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''), title : title, description : description}]
			}

			//Pesquisa o DescritorDeArquivoExecutavel raiz da hierarquia onde o novo DescritorDeVersao será inserido
			buscarDescritorPorId(mongoConnection, "DescritoresDeArquivosExecutaveis", descritorDeVersao.id_root_version, {'id_components': 1, 'locations': 1}, function(err, descritorDeArqExec) {
			
				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
					callback(err, null);
					return;
				}

				diretorioArquivoExecutavel = descritorDeArqExec.locations;

				//Pesquisa o DescritorDeComponente referenciado pelo DescritorDeArquivoExecutavel raiz da hierarquia
				buscarDescritorPorId(mongoConnection, "DescritoresDeComponentes", descritorDeArqExec.id_components, null, function(error, descritorDeComponente) {

				    if(error) {
				      console.error(new Date() + " Erro ao Pesquisar DescritoresDeComponentes: " + error);
				      callback(error, null);
				      return;
					}
					
					//Obtêm o Delta (diferença) entre o estado dos componentes na raiz da hierarquia e a nova Versão Customizada

					var inicioCalculoDelta = moment().utc();

					cloUtils.getDeltaAsync(jsonComp, descritorDeComponente, degreeOfFreedom, function(err, delta) {

						var fimCalculoDelta = moment().utc();
	  					console.log(fimCalculoDelta.diff(inicioCalculoDelta, "milliseconds") + " ### Tempo do Cálculo do Delta ###");

						if (err) {
						    console.error(new Date() + " Erro ao Obter Delta para novo DescritorDeVersao: " + err);
							callback(err, null);
							return;
						}

						descritorDeVersao.customizations = delta;
						//Obtêm o Hash do Delta
						descritorDeVersao.hash = shasum.update(JSON.stringify(delta)).digest('hex');

						//Pesquisa DescritorDeVersao com o mesmo Hash na hierarquia
						mongoConnection.collection("DescritoresDeVersoes").findOne({id_root_version: new mongodb.ObjectID(descritorDeVersao.id_root_version), hash: descritorDeVersao.hash}, function(err, descDeVersParaIncorporacao) {

							if(err) {						      
						    	console.error(new Date() + " Erro ao Pesquisar DescritoresDeComponentes: " + err);
						    	callback(err, null);
						    	return;
							}

							if(descDeVersParaIncorporacao) {
								//Caso seja encontrado DescritorDeVersao com as mesmas customizações, 
								//a Incorporação de Versão é realizada
								var metadata = descDeVersParaIncorporacao.metadata;						
								//Verifica se já existe um nó com os mesmos metadados
								var exists = false;								
								metadata.forEach(function(data) {
									if(descritorDeVersao.metadata[0].user == data.user && 
									descritorDeVersao.metadata[0].title == data.title && 
									descritorDeVersao.metadata[0].description == data.description) {
										exists = true;
									}
								});
								//Caso não exista um nó idêntico, realiza-se a Incorporação de Versão
								if(!exists) {
									metadata.push(descritorDeVersao.metadata[0]);
									//Atualiza o DescritorDeVersao
									mongoConnection.collection("DescritoresDeVersoes").update({_id : descDeVersParaIncorporacao._id}, {$set: {metadata: metadata}}, function(err, descDeVersAtualizado) {
										if(err) {						      
									    	console.error(new Date() + " Erro ao Atualizar DescritorDeVersao: " + err);
									    	callback(err, null);
									    	return;
										}

										console.log(new Date() + " Nova Incorporação de Versão realizada: " + descDeVersParaIncorporacao._id);
										callback(null, descDeVersParaIncorporacao);
										return;
									});
								} else {
									console.log(new Date() + " Nova Incorporação de Versão realizada: " + descDeVersParaIncorporacao._id);
									callback(null, descDeVersParaIncorporacao);
									return;
								}																
							} else {
								//Caso não seja encontrado DescritorDeVersao com as mesmas customizações, 
								//um novo DescritorDeVersao é incluído

								//Atualiza os campos "source" dos Componentes que tiveram o arquivo de mídia referenciado modificado
								diretorioDestinoComponentes = path.dirname(diretorioArquivoExecutavel[0]) + "/components/";
								descritorDeVersao.version.split(".").forEach(function(numberVersion) {								
									diretorioDestinoComponentes = diretorioDestinoComponentes + numberVersion + "/";
								});
								
								//Envia os componentes para o diretório de destino no servidor
								//e atualiza os campos "source" do campo Customizations antes de incluí-lo no banco

								var inicioEscritaFilesystem = moment().utc();

								descritorDeVersao.customizations.forEach(function(scene) {
								  	scene.components.forEach(function(component) {
								  		if (component.hasOwnProperty("source")) {								  			
						  					//Caso exista arquivos com a mesma nomenclatura, eles não são substituidos.	
											oac.extractEntryTo("components/" + path.basename(component.source), diretorioDestinoComponentes, false, false);
						  					component.source = diretorioDestinoComponentes + path.basename(component.source);								  														
										}
								  	});
								});								
								
								var fimEscritaFilesystem = moment().utc();
  								console.log(fimEscritaFilesystem.diff(inicioEscritaFilesystem, "milliseconds") + " ### Tempo de escrita no filesystem ###");

								//Inclui um novo DescritorDeVersao
								mongoConnection.collection("DescritoresDeVersoes").insert(descritorDeVersao, function(err, data) {
									
									if(err) {						      
								    	console.error(new Date() + " Erro ao Inserir DescritorDeVersao: " + err);
								    	callback(err, null);
								    	return;
									}
									
									console.log(new Date() + " Novo documento DescritorDeVersao inserido: " + descritorDeVersao._id);
									callback(null, descritorDeVersao);
									return;
								});
							}
						});
					});
				});
			});
		} else {
			callback(new Error("Versão de origem com id " + idDescritorOrigem + " não encontrada."), null);	
			return;		
		}
	});
}

//Realiza a busca dos IdsDescritoresDeArquivosExecutaveis de um DescritorRaiz, com base no identificador passado como parâmetro
var buscarIdDescritoresDeArquivoExecutavelPorIdRaiz = function(mongoConnection, idDescritorRaiz, callback) {

	if (bson.ObjectID.isValid(idDescritorRaiz)) {
		mongoConnection.collection("DescritoresDeArquivosExecutaveis").distinct('_id', {id_clo: new mongodb.ObjectID(idDescritorRaiz)}, {}, function(err, idDescritoresDeArquivosExecutaveis) {
		
		    if(err) {
				console.error(new Date() + " Erro ao Pesquisar DescritorDeArquivoExecutavel: " + err);
				callback(err, null);
				return;
			}

			callback(null, idDescritoresDeArquivosExecutaveis);	
			return;
	    });
	} else {
		callback(new Error("Id do Descritor Raiz inválido"), null);
		return;
	}    
}

//Realiza a busca de um DescritorDeVersao específico, com base nos parâmetros passados como parâmetro
var buscarDescritorDeVersao = function(mongoConnection, idDescritorDeArquivoExecutavel, versionNumber, callback) {

	if (bson.ObjectID.isValid(idDescritorDeArquivoExecutavel)) {
		mongoConnection.collection("DescritoresDeVersoes").findOne({id_root_version: new mongodb.ObjectID(idDescritorDeArquivoExecutavel), version: versionNumber}, {"id_source_version": 1, "id_root_version": 1, "version": 1}, function(err, descritorDeVersao) {
		
		    if(err) {
				console.error(new Date() + " Erro ao Pesquisar DescritorDeVersao: " + err);
				callback(err, null);
				return;
			}

			callback(null, descritorDeVersao);	
			return;
	    });
	} else {
		callback(new Error("Id do Descritor de Arquivo Executável inválido"), null);
		return;
	}    
}

module.exports.criarOAC = criarOAC;
module.exports.buscarOAC = buscarOAC;
module.exports.buscarMetadadosOAC = buscarMetadadosOAC;
module.exports.buscarVersoesCustomizadas = buscarVersoesCustomizadas;
module.exports.gerarPacoteOAC = gerarPacoteOAC;
module.exports.gerarPacoteVersao = gerarPacoteVersao;
module.exports.criarVersaoCustomizada = criarVersaoCustomizada;

module.exports.buscarDescritorPorId = buscarDescritorPorId;
module.exports.buscarIdDescritoresDeArquivoExecutavelPorIdRaiz = buscarIdDescritoresDeArquivoExecutavelPorIdRaiz;
module.exports.buscarDescritorDeVersao = buscarDescritorDeVersao;
