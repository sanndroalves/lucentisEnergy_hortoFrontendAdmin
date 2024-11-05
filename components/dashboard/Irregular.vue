<script setup>
    import { API_BASE_URL } from '~/base/link';
    
    const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);

    const usinasAbaixo = ref([]) // apenas usinas abaixo com 3 repetições em segurarUsinas
    const segurarUsinas = ref([]) // salvar todas q estao abaixo, se tiver mais de 3 vezes, salva em usinasAbaixo


    for (let i=0; i<usinas.value.length; i++){
        const individual = usinas.value[i]

        const { data: proIndi } = await useFetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${individual.id}&ano=2024`);
        const { data: geraIndi } = await useFetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${individual.id}&ano=2024`);
         
        for (let a=0; a < geraIndi.value.length; a++){
                const projetado = proIndi.value[a]
                const gerado = geraIndi.value[a]
                 
                if(parseInt(gerado.geracao) < parseInt(projetado.projecao)){ 
                    segurarUsinas.value.push(individual.id)
                }
            
        }
        
    } 
    
    const encontrarIdRepetido = (array) => {
        const frequencia = {};

        array.forEach(id => {
            frequencia[id] = (frequencia[id] || 0) + 1;
        });

        Object.keys(frequencia).forEach(id => {
            if (frequencia[id] >= 3) {
                usinasAbaixo.value.push({ usina: id, qtd: frequencia[id] });;
            }
        });
    };

    encontrarIdRepetido(segurarUsinas.value);

    const usinasProcuradas = ref([]) // USINAS ABAIXO COM DADOS FINAIS

    const procurarUsina = async () => {
        for (let i=0; i < usinasAbaixo._rawValue.length; i++) {
          const { data: irregular } = await useFetch(`${API_BASE_URL}/irregular?idGeradora=${usinasAbaixo._rawValue[i].usina}`); 

          //caso não exista usina na tabela irregualar
          if(irregular.value.length == 0){
              //POST
              const response = await useFetch(`${API_BASE_URL}/irregular/`, {
                        method: 'POST',
                        body: 
                            {
                                idGeradora: usinasAbaixo._rawValue[i].usina,
                                qtdIrregular: 1,
                                qtdConhecimento: 0,
                                ultMes: usinasAbaixo._rawValue[i].qtd
                            },
                        key: 'GeradoraPost'
                    });
                
                    if(response){
                      console.log("DEU CERTO POST")
                    }else{
                      console.log("ERRO1 POST")
                    }

                    const { data: individual } = await useFetch(`${API_BASE_URL}/usina/${usinasAbaixo._rawValue[i].usina}`);
                    usinasProcuradas.value.push(individual.value);
          }else{ 
            // SE QTD IRREGULAR FOR DIFERENTE DE QTDCONHECIMENTO, JA FOI FEITO A ADIÇÃO NO QTDIRREGULAR EM PUT ANTERIOR
              if(Math.abs(irregular._rawValue[0].qtdIrregular - irregular._rawValue[0].qtdConhecimento) === 1){
                // SE O MES NO API É DIFERENTE DOQ O ATUAL DA ARRAY
                if(irregular._rawValue[0].ultMes !== usinasAbaixo._rawValue[i].qtd){

                const response = await useFetch(`${API_BASE_URL}/irregular/${irregular._rawValue[0].id}`, {
                    method: 'PUT',
                    body: 
                        {
                          idGeradora: usinasAbaixo._rawValue[i].usina,
                          qtdIrregular: irregular._rawValue[0].qtdIrregular,
                          qtdConhecimento: irregular._rawValue[0].qtdConhecimento,
                          ultMes: usinasAbaixo._rawValue[i].qtd
                        },
                    key: 'unidadePut'
                });

                if(response){
                  console.log("DEU CERTO PUT")
                  
                }else{
                  console.log("ERRO1 PUT")
                }   
              }

                const { data: individual } = await useFetch(`${API_BASE_URL}/usina/${usinasAbaixo._rawValue[i].usina}`);
                usinasProcuradas.value.push(individual.value);
              // QTD IRREGULAR E O QTDCONHEMNTO É 0
              //SE O MES FOI DIFERENTE, alterar a qtdIrregular, mas deixar o ultMes
            }else{
              if(irregular._rawValue[0].ultMes !== usinasAbaixo._rawValue[i].qtd){
                const response = await useFetch(`${API_BASE_URL}/irregular/${irregular._rawValue[0].id}`, {
                    method: 'PUT',
                    body: 
                        {
                          idGeradora: usinasAbaixo._rawValue[i].usina,
                          qtdIrregular: irregular._rawValue[0].qtdIrregular + 1,
                          qtdConhecimento: irregular._rawValue[0].qtdConhecimento,
                          ultMes: irregular._rawValue[0].ultMes,
                        },
                    key: 'unidadePut'
                });

                if(response){
                  console.log("DEU CERTO PUT2")
                }else{
                  console.log("ERRO1 PUT2")
                }

                const { data: individual } = await useFetch(`${API_BASE_URL}/usina/${usinasAbaixo._rawValue[i].usina}`);
                usinasProcuradas.value.push(individual.value);
              }
            }
          }
        }
    }

    procurarUsina(usinasAbaixo)

    const removerIndica = async(idGeradora) =>{
      const { data: irregular } = await useFetch(`${API_BASE_URL}/irregular?idGeradora=${idGeradora}`);

      let filtroUsina = null;
      for (const item of usinasAbaixo._rawValue) { 
        if (item.usina == idGeradora) {
          filtroUsina = item.qtd;
          break;
        }
      }

      const response = await useFetch(`${API_BASE_URL}/irregular/${irregular._rawValue[0].id}`, {
                  method: 'PUT',
                  body: 
                      {
                        qtdIrregular: irregular._rawValue[0].qtdIrregular,
                        qtdConhecimento: irregular._rawValue[0].qtdConhecimento + 1,
                        ultMes: filtroUsina
                      },
                  key: 'unidadePut'
              });

            if(response){
                const indexToRemove = usinasProcuradas.value.findIndex(item => item.id === idGeradora);

                if (indexToRemove !== -1) {
                  usinasProcuradas.value.splice(indexToRemove, 1);
                }
            }else{
                console.log("ERRO1")
            }  
    }
</script>

<!--<template>
    <div>
            <div
              class="v-card v-theme--BLUE_THEME v-card--density-default elevation-10 rounded-md v-card--variant-elevated"
            >
              <div class="v-card-item pb-sm-8 pb-6">
                <div class="v-card-item__content">
                  <div class="v-card-title text-h5">
                    <v-avatar class="bg-lightwarning text-warning mb-1 mr-2" size="30">
                        <BoltIcon size="20" />
                    </v-avatar>
                    Déficit Gerações</div>
                  <div class="v-card-subtitle text-subtitle-1 mt-n1">
                    Gerações irregulares (+3 meses)
                  </div>
                  <div class="mt-sm-5 mt-5" v-for="usina in usinasProcuradas" :key="usina.id">
                    <div class="d-flex align-items-center justify-content-between mt-2">
                        <div class="v-avatar v-theme--BLUE_THEME v-avatar--density-default v-avatar--variant-flat rounded-md bg-lightwarning" style="width: 40px; height: 40px">
                            <AlertTriangleIcon size="22" class="text-warning" />
                        </div>
                        <div class="pl-4 mt-n1 flex-grow-1">
                            <h5 class="text-h6">{{ usina.uc }}</h5>
                            <h6 class="text-subtitle-1 text-medium-emphasis">{{ usina.nome }}</h6>
                        </div>
                        <div style="width: 40px;">
                            <v-btn @click="removerIndica(usina.id)" size="20" icon class="bg-warning">
                                <v-avatar size="20" class="text-white">
                                    <XIcon size="15" />
                                </v-avatar>
                                <v-tooltip activator="parent" location="bottom">Remover Indicação</v-tooltip>
                            </v-btn>
                        </div>
                    </div>
                  </div>
                </div>
              </div><span class="v-card__underlay"></span>
            </div>
          </div> 
</template> -->

<!-- TEMPLATE OFICIAL -->
<template>
  <div>
    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-title>
          <div class="d-flex flex-column align-items-start">
            <div class="d-flex align-items-center">
              <v-avatar class="bg-lightwarning text-warning mb-1 mr-2" size="40">
                <BoltIcon size="30" />
              </v-avatar>
              <b style="font-size: 18px; margin: 10px;">Déficit Gerações</b>
              <v-chip color="warning" style="font-size: 12px; padding: 4px; height: 20px; margin-top: 10px;">{{usinasProcuradas.length}}</v-chip>
            </div>
            <div class="mt-1 text-subtitle-1 text-medium-emphasis">
              Gerações irregulares (+3 meses)
            </div>
          </div>
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <div v-for="usina in usinasProcuradas" :key="usina.id" class="mt-5">
            <div class="d-flex align-items-center justify-content-between mt-2">
              <div class="v-avatar bg-lightwarning rounded-md" style="width: 40px; height: 40px">
                <AlertTriangleIcon size="22" class="text-warning" />
              </div>
              <div class="pl-4 mt-n1 flex-grow-1">
                <h5 class="text-h6">{{ usina.uc }}</h5>
                <h6 class="text-subtitle-1 text-medium-emphasis">{{ usina.nome }}</h6>
              </div>
              <div style="width: 40px;">
                <v-btn @click="removerIndica(usina.id)" size="20" icon class="bg-warning">
                  <v-avatar size="20" class="text-white">
                    <XIcon size="15" />
                  </v-avatar>
                  <v-tooltip activator="parent" location="bottom">Remover Indicação</v-tooltip>
                </v-btn>
              </div>
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
