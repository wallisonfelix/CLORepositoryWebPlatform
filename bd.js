var path = require('path');
var mongodb = require('mongodb');
var ZIP = require('adm-zip');
var oacRead = require('./oacRead.js');
var DIR = './file';
var crypto = require('crypto');

var criarEntrada = function(db, zip, fileNames, callback)
{
  //Variáveis que receberão os JSONs de arquivos executáveis e seus componentes.
  var toCollection = []
  var count = 0
  //Variáveis para formatação de nome do JSON de cada arquivo executável e componente.
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
		   //sua extensão por JSON para que fique no formato NomeDoOAC.json
		   ext = (path.extname(element)).substr(1);
		   newFileName = fileName.replace(ext, "json");
		   //Caminho completo do arquivo NomeDoOAC_extensao.json
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
				   console.error(new Date() + " Erro ao Inserir DescritorRaiz: " + err);
			   count++
			   if(count == toCollection.length)
				{
					console.log(new Date() + " OAC inserido com sucesso.");
					callback();
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
		console.error(new Date() + " Erro ao Inserir DescritorRaiz: " + err);
      console.log(new Date() + " Novo documento DescritorRaiz inserido: " + lom._id + ".");
	  callback()
    })
  }
  
//Cria um novo DescritorDeArquivoExecutavel, criando também o DescritorDeComponents ao qual ele o referencia
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
  jsonComp.scenes.forEach(function(scene) {
  	scene.components.forEach(function(component) {
	  	if (component.hasOwnProperty("source")) {
	  		component.source = diretorioDestinoComponentes + path.basename(component.source);
	  	}
  	});
  });
  db.collection('DescritoresDeComponentes').insert(jsonComp, function(err, data) {
    
    if(err) {
      console.error(new Date() + " Erro ao Inserir DescritorDeComponente: " + err);
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
  db.collection('DescritoresDeArquivosExecutaveis').insert(jsonExec, function(err, data) {
    if(err) {
      console.error(new Date() + " Erro ao Inserir DescritorDeArquivoExecutavel: " + err);
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

//Realiza a busca de OACs cujo metadados correspondam com os campos passados como parâmetro
var buscarOAC = function(db, title, callback)
{
	//Monta Regex para consulta pelo campo Título do OAC
	var titleRegex = new RegExp(".*" + title + ".*", "i");
	
	var result = [];

	//Pesquisa os Descritores Raízes passando os campos utilizados como filtro e 
	//limitando o retorno aos campos que serão utilizados
	var cursorDescritoresRaizes = db.collection("DescritoresRaizes").find({"title.value": titleRegex}, {"qualified_name": 1, "title.value": 1});

	cursorDescritoresRaizes.count(function(err, count) {			

		if (err) {
		    console.error(new Date() + " Erro ao Pesquisar DescritoresRaizes: " + err);
			callback(err, result);
		}

		var countDescritoresRaizes = count;
		var indexDescritoresRaizes = 0;	

		if (countDescritoresRaizes == 0) {
			console.log(new Date() + " Pesquisa por OAC com retorno vazio.");
			callback(result);
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
			var cursorDescritoresDeArqExec = db.collection("DescritoresDeArquivosExecutaveis").find({"clo_id" : descritorRaiz._id}, {"locations": 1});

			cursorDescritoresDeArqExec.count(function(err, count) {

				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
					callback(err, result);
				}

				var countDescritoresDeArqExec = count;	
				var indexDescritoresDeArqExec = 0;						
				
				//Intera na lista dos Descritores de Arquivos Executáveis
				cursorDescritoresDeArqExec.forEach(function(descritorDeArqExec) {
					//Prepara objeto para representar o Arquivo Executável
					var file = {};
					file._id = descritorDeArqExec._id;
					//TODO: Preencher o campo qtyCustomizedVersion
					file.qtyCustomizedVersion = 1;
					//Caminhos onde o Arquivo Executável pode ser encontrado
					file.locations = [];
					descritorDeArqExec.locations.forEach(function(location) {
						var fileLocation = {};
						fileLocation.ext = path.extname(location);
						fileLocation.path = location;
						file.locations.push(fileLocation);
					});

					obj.files.push(file);

					indexDescritoresDeArqExec++;
					if(indexDescritoresDeArqExec == countDescritoresDeArqExec) {
						//Adiciona a lista de resultados o objeto montado para representar um registro na busca 
						result.push(obj);
						
						indexDescritoresRaizes++;
						if(indexDescritoresRaizes == countDescritoresRaizes) {					
							//Retorna a lista de resultados da pesquisa
							console.log(new Date() + " Retorno de uma Pesquisa por OAC: " + JSON.stringify(result) + ".");
							callback(result);
						}
					}
				});
			});
		});
	});
}

//Gera e retorna um arquivo compactado representando o OAC compatível com os parâmetros informados
var gerarOACFromDb = function(db, idDescritorDeArquivoExecutavel, pathArquivoExecutavel, callback)
{
	//Gera, temporariamente, números aleatórios para representar o id e o Grau de Liberdade do Usuário  que faz o download
	//TODO: setar corretamente quando a Plataforma possuir autenticação. Caso o usuário não esteja autenticado, setar 'null'
	var userId = (new mongodb.ObjectID()).toString();
	var permission = Math.floor(Math.random() * 5);

	//Pesquisa o DescritorDeArquivoExecutavel do OAC que se deseja baixar
	db.collection("DescritoresDeArquivosExecutaveis").findOne({_id : new mongodb.ObjectID(idDescritorDeArquivoExecutavel)}, {'id_components': 1}, function(err, descritorDeArquivoExecutavel) {
		
		if (err) {
			console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
			callback(err);
		}

		//Pesquisa o DescritorDeComponentes referenciado pelo DescritorDeArquivoExecutavel
		db.collection('DescritoresDeComponentes').findOne({_id : descritorDeArquivoExecutavel.id_components}, function(err, descritorDeComponentes) {

			if (err) {	
				console.error(new Date() + " Erro ao Pesquisar DescritoresDeComponentes: " + err);
				callback(err);
			}

			//Gera o arquivo compactado que representa o OAC
			oacRead.gerarArquivoOAC(idDescritorDeArquivoExecutavel, pathArquivoExecutavel, descritorDeComponentes, userId, permission, function(oac) {
				callback(oac);
			});
		});
	});
}

var isValueIn = function(value, keyName, array)
{
	var is = false
	var key = keyName
	for(var i = 0; i < array.length && !is; i++)
	{
		if(array[i][key] === value)
			is = true
	}
	return is
}

var gerarDescritorVersao = function(db, id, componentsJson, callback)
{
	var userId = (new mongodb.ObjectID()).toString()
	var permission = Math.floor(Math.random() * 5)
	db.collection("DescritorDeVersao").findOne({"_id" : id}, function(err, document)
	{
		if(err)
			console.log(err)
		document.customizations.forEach(function(desScenes)
		{
			if(isValueIn(desScenes.scene, "scene", componentsJson.scenes))
			{
				componentsJson.scenes.forEach(function(componentScene)
				{
					if(componentScene.scene == desScenes.scene)
					{
						desScenes.components.forEach(function(delta)
						{
							if(isValueIn(delta.name, "name", componentScene.components))
							{
								componentScene.components.forEach(function(comp)
								{
									if(delta.name == comp.name)
									{
										for(var key in delta)
											comp[key] = delta[key]
									}
								})
							}
							else
								componentScene.components.push(delta)
						})
					}
				})
			}
			else
				componentsJson.scenes.push(desScene)
		})
		callback(componentsJson)
	})
}

//Retorna as informações referentes à versão de um novo DescritorDeVersao deve assumir, 
//com base no identificador da versão de origem passado como parâmetro
var getVersion = function(db, id, callback) {

	//Pesquisa um DescritorDeArquivoExecutavel que possua o identificador passado como parâmetro
	db.collection("DescritoresDeArquivosExecutaveis").findOne({"_id": id}, {'id_source_version': 1}, function(err, resultDescDeArqExec) {		
		
		if (err) {
		    console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
			callback(err, null);
		}
		
		//Caso seja retornado um DescritorDeArquivoExecutavel,
		//a nova Versão Customizada é uma versão de Primeiro Nível
		if(resultDescDeArqExec) {

			var ret = {};
			//A versão raiz e a de origem para o novo DescritorDeVersao são o próprio DescritorDeArquivoExecutavel retornado
			ret.id_root_version = id;
			ret.id_source_version = id;

			//Pesquisa os DescritoresDeVersoes cuja versão de origem seja o próprio DescritorDeArquivoExecutavel retornado
			db.collection("DescritoresDeVersoes").find({"id_source_version" : id}, {'id_source_version': 1}).toArray(function(err, resultDescDeVerPrimeiroNivel) {

				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
					callback(err, null);
				}

				//Define a versão que o novo DescritorDeVersao deve assumir
				var version = 0;
				for(var i = 0; i < resultDescDeVerPrimeiroNivel.length; i++) {
					if(parseInt(resultDescDeVerPrimeiroNivel[i].version) > version) {
						version = parseInt(resultDescDeVerPrimeiroNivel[i].version);
					}	
				}
				ret.version = (version + 1).toString();
				
				callback(ret);
			});
		
		} else {
			//Não sendo encontrado um DescritorDeArquivoExecutavel com o identificador passado como parâmetro,
			//busca-se DescritoresDeVersoes com esse _id e, simultaneamente, suas Versões Customizadas
			db.collection("DescritoresDeVersoes").find({$or: [{"_id" : id}, {"id_source_version": id}]}, {"id_root_version": 1, "id_source_version": 1}).toArray(function(err, resultDescDeVers) {
				
				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
					callback(err, null);
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
					var prefix;
					var greaterLastVersionNumber = 0;
					var versionNumbers = [];
					var lastVersionNumber;
					//O retorno de mais de um DescritorDeVersao indica a existência de outras Versões Customizadas
					//derivadas da versão de origem	
					for(var i = 0; i < resultDescDeVers.length; i++) {
						
						if(resultDescDeVers[i]._id != id) {
							//Obtêm o último inteiro do campo version
							versionNumbers = resultDescDeVers[i].version.split(".");
							lastVersionNumber = parseInt(versionNumbers[versionNumbers.length-1]));
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

				callback(ret);
			});
		}
	});
}

var persistirCustomizacoes = function(db, oac, title, description, languages, callback) {
	
	//Novo DescritorDeVersao
	var descritorDeVersao = {};
	//Gerador de Hash SHA1
	var shasum = crypto.createHash('sha1');
	
	//Conteúdo do token.txt
	var tokenAsArray = oac.readAsText("token.txt").split(" ");
	//Descritor de origem da nova Versão Customizada
	var idDescritorOrigem = new mongodb.ObjectID(token_array[0]);
	//Grau de Liberdade do Usuário
	var grauDeLiberdade = parseInt(token_array[2]);

	//Diretório em que o Arquivo Executável da Versão está localizado no servidor
	var diretorioArquivoExecutavel;
	//Path do diretório de destino dos arquivos de mídias modificados
	var diretorioDestinoComponentes;

	//Conteúdo do Arquivo Compactado
	var oacEntries = oac.getEntries();

	//Obtêm o JSON com o novo estado dos componentes
	var jsonComp;
	oacEntries.forEach(function(entry) {
		if(entry.entryName.endsWith(".json")) {
			jsonComp = JSON.parse(oac.readAsText(entry.entryName));
		}
	});
	
	//Obtêm as informações referentes à versão para o novo DescritorDeVersao
	getVersion(db, idDescritorOrigem, function(err, result) {

		if (err) {
		    console.error(new Date() + " Erro ao Obter Número de Versão para novo DescritorDeVersao: " + err);
			callback(err, null);
		}

		if(result) {
			console.log(new Date() + " Inserindo nova Versão Customizada: \n" + result);
			//Preenche o novo DescritorDeVersao
			descritorDeVersao = {
				_id : new mongodb.ObjectID(),			
				id_source_version : result.id_source_version,
				id_root_version : result.id_root_version,
				version : result.version,
				languages : languages,
				//TODO: setar corretamente o Usuário quando a Plataforma possuir autenticação
				metadata : [{user : token_array[1], date : new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''), title : title, description : description}];
			}

			//Pesquisa o DescritorDeArquivoExecutavel raiz da hierarquia onde o novo DescritorDeVersao será inserido
			db.collection("DescritorDeArquivoExecutavel").findOne({_id: new mongodb.ObjectID(result.id_root_version)}, {id_components: 1}, function(err, descritorDeArqExec) {

				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
					callback(err, null);
				}

				diretorioArquivoExecutavel = descritorDeArqExec.locations;

				//Pesquisa o DescritorDeComponente referenciado pelo DescritorDeArquivoExecutavel raiz da hierarquia
				db.collection("DescritoresDeComponentes").findOne({_id : new mongodb.ObjectID(descritorDeArqExec.id_components)}, function(error, descritorDeComponente) {
					
				    if(error) {
				      console.error(new Date() + " Erro ao Pesquisar DescritoresDeComponentes: " + error);
				      callback(error, null);
					}

					//Obtêm o Delta (diferença) entre o estado dos componentes na raiz da hierarquia e a nova Versão Customizada
					oacRead.getDelta(jsonComp, descritorDeComponente, grauDeLiberdade, function(err, delta) {

						if (err) {
						    console.error(new Date() + " Erro ao Obter Delta para novo DescritorDeVersao: " + err);
							callback(err, null);
						}

						descritorDeVersao.customizations = delta;
						//Obtêm o Hash do Delta
						descritorDeVersao.hash = shasum.update(JSON.stringify(delta)).digest('hex');

						//Pesquisa DescritorDeVersao com o mesmo Hash na hierarquia
						db.collection("DescritoresDeVersoes").findOne({id_root_version: new mongodb.ObjectID(descritorDeVersao.id_root_version), hash: descritorDeVersao.hash}, function(err, descDeVersParaIncorporacao) {

							if(err) {						      
						    	console.error(new Date() + " Erro ao Pesquisar DescritoresDeComponentes: " + err);
						    	callback(err, null);
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
									db.collection("DescritoresDeVersoes").update({_id : descDeVersParaIncorporacao._id}, {$set: {metadata: metadata}}, function(err, descDeVersAtualizado) {
										if(err) {						      
									    	console.error(new Date() + " Erro ao Atualizar DescritorDeVersao: " + err);
									    	callback(err, null);
										}

										console.log(new Date() + " Nova Incorporação de Versão realizada: " + descDeVersParaIncorporacao._id);
										callback(metadata);
									});
								}																
							} else {
								//Caso não seja encontrado DescritorDeVersao com as mesmas customizações, 
								//um novo DescritorDeVersao é incluído

								//Atualiza os campos "source" dos Componentes que tiveram o arquivo de mídia referenciado modificado
								diretorioDestinoComponentes = path.dirname(diretorioArquivoExecutavel[0]) + "/components/";
								descritorDeVersao.version.split(".").forEach(function(numberVersion) {
									diretorioDestinoComponentes.concat(numberVersion + "/");
								}

								descritorDeVersao.customizations.forEach(function(scene) {
								  	scene.components.forEach(function(component) {
								  		if (component.hasOwnProperty("source")) {
									  		oacEntries.forEach(function(file) {
									  				if(component.source == path.basename(file.entryName)) {
									  					component.source = diretorioDestinoComponentes + path.basename(component.source);
									  				}
											  	}
											});  	
										}
								  	});
								});

								//Inclui um novo DescritorDeVersao
								db.collection("DescritoresDeVersoes").insert(descritorDeVersao, function(err, data) {
									
									if(err) {						      
								    	console.error(new Date() + " Erro ao Inserir DescritorDeVersao: " + err);
								    	callback(err, null);
									}

									//Envia os novos Componentes para o diretório de destino no servidor.
									//Caso exista arquivos com a mesma nomenclatura, eles não são substituidos.
								    oac.extractEntryTo("/components/", diretorioDestinoComponentes, false, false);
									
									console.log(new Date() + " Novo documento DescritorDeVersao inserido: " + descritorDeVersao._id);
									callback(descritorDeVersao);
								});
							}
						});
					});
				});
			});
		}
	});
}

module.exports.criarEntrada = criarEntrada
module.exports.buscarOAC = buscarOAC
module.exports.gerarOACFromDb = gerarOACFromDb
module.exports.persistirCustomizacoes = persistirCustomizacoes
module.exports.gerarDescritorVersao = gerarDescritorVersao