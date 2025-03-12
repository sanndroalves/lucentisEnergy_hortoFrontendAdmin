<script setup >

import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';

// Defina o título da página
useHead ({
  title: 'Manutenções'
});

definePageMeta({
  middleware: 'sidebase-auth'
})

import { ref } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';

const { data: manutencao } = await useFetch(`${API_BASE_URL}/manutencao/`);
const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);


//SELECIONAR A CATEGORIA DA MANUTENÇÃO
const selecionado = ref(null)
const categoriaSelecionada = (manutencoes) =>{
  if(selecionado.value !== null && selecionado.value != 4){
    const manuCategoria = manutencoes.filter(manu => manu.status === selecionado.value);
    return manuCategoria
  }else if(selecionado.value == 4){
    console.log("OI")
    return usinasProcuradas.value
  }else{
    return;
  }
}


// SELECIONAR INFORMAÇÕES DA USINA
const pegarUsina = (idUsina) =>{
    const usinaIndi = usinas._rawValue.find(usina => usina.id === idUsina);
    return usinaIndi 
}

const formatarData = (dataString) => {
        const timestamp = Date.parse(dataString);
        if(!isNaN(timestamp)){
          const [ano, mes, dia] = dataString.split('-');
          return `${dia}/${mes}/${ano}`;  
        }else{
          return dataString;
        }
        
    };

const manuProgramadas = manutencao.value.filter(item => item.status === '1')
const manuRealizando = manutencao.value.filter(item => item.status === '2')
const manuRealizadas = manutencao.value.filter(item => item.status === '3')


// PEGAR USINAS COM ALERTA
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
              const { data: individual } = await useFetch(`${API_BASE_URL}/usina/${usinasAbaixo._rawValue[i].usina}`);
              usinasProcuradas.value.push(individual.value);
        }
    }
    
    procurarUsina(usinasAbaixo)

    // PEGAR ULT MANU DA USINA COM ALERA
    const { data: checklists } = await useFetch(`${API_BASE_URL}/checklist/`);

    const procurarUltManu = (idUsina) =>{
      const manuUsina = manutencao.value.filter(item => item.idGeradora == idUsina && item.status == '3')
      if(manuUsina.length > 0){
        const itemMaisRecente = manuUsina.reduce((maisRecente, itemAtual) => {
            return new Date(itemAtual.date) > new Date(maisRecente.date) ? itemAtual : maisRecente;
        }, manuUsina[0]); 
        return itemMaisRecente.data
      }else{
        return 'Nenhuma Manutenção Realizada'
      } 
    }

    //PEGAR STATUS DO CHECKLIST 
    const verificarStatus = (idUsina) =>{ 
      const mesAtual = new Date().getMonth() + 1; 
      
      const selectedCheckListUsina = checklists.value.filter(item => item.idUsina == idUsina) 
      const checkListUsina = selectedCheckListUsina.filter(item =>  { 
              const itemMonth = new Date(item.data).getMonth() + 1;   
              return itemMonth === mesAtual; 
      })
      
      if(!checkListUsina[0]){
        return "SEM CHECKLIST";
      }

      /*
        1 - ÓTIMO: 3 OTIMOS/2 ÓTIMOS E 1 BOM
        2 - BOM: 1 ÓTIMO E 2 BONS / 3 BONS
        3 - VERIFICAR: ELSE EM TODOS ACIMA 
      */
    
      let placa = checkListUsina[0].sitPlaca
      let inversor = checkListUsina[0].sitInversor
      let roteador = checkListUsina[0].sitRoteador

      const STATUS_CHECKLIST = {
        "O": "Ótimo",
        "B": "Bom",
        "R": "Ruim",
        "Q": "Quebrado",
        "M": "Manutenção"
      };

      const statusCounts = {
        "Ótimo": 0,
        "Bom": 0,
        "Ruim": 0,
        "Quebrado": 0,
        "Manutenção": 0
      };

      const statuses = [placa, inversor, roteador];

      statuses.forEach(status => {
        const statusDesc = STATUS_CHECKLIST[status];
        if (statusDesc) {
          statusCounts[statusDesc]++;
        }
      });
    

      let classificacaoFinal = "VERIFICAR";

      if (statusCounts["Ótimo"] === 3) {
        classificacaoFinal = "ÓTIMO";
      } else if (statusCounts["Ótimo"] === 2 && statusCounts["Bom"] === 1) {
        classificacaoFinal = "ÓTIMO";
      } else if (statusCounts["Bom"] === 2 && statusCounts["Ótimo"] === 1) {
        classificacaoFinal = "BOM";
      } else if (statusCounts["Bom"] === 3) {
        classificacaoFinal = "BOM";
      }

      return classificacaoFinal;
    }

</script>
<template>
    <!--BANNER-->
    <v-row>
        <div
        class="v-card v-theme--BLUE_THEME v-card--density-default elevation-10 rounded-md v-card--variant-elevated bg-lightprimary elevation-0 rounded-md mb-8"
        >
        <div class="px-8 py-8 py-lg-0">
            <div class="d-flex justify-space-between">
            <div class="d-flex py-0 align-center">
                <div>
                <h3 class="text-h3 mb-2">Manutenções</h3>
                <ul
                    class="v-breadcrumbs v-breadcrumbs--density-default text-h6 font-weight-medium pa-0 ml-n1"
                >
                    <!---->
                    <li class="v-breadcrumbs-item" text="Eficiência">
                    <a class="v-breadcrumbs-item--link" href="/" style="text-decoration:none"
                        ><h6 class="text-medium-emphasis text-subtitle-1">
                          Eficiência
                        </h6></a
                    >
                    </li>
                    <li class="v-breadcrumbs-divider">
                    <div class="d-flex align-center text-h3 mt-n4">.</div>
                    </li>
                    <li
                    class="v-breadcrumbs-item v-breadcrumbs-item--disabled"
                    text="Relatórios"
                    >
                    <h6 class="text-medium-emphasis text-subtitle-1">Manutenções</h6>
                    </li>
                    <!----><!---->
                </ul>
                </div>
            </div>
            <div class="d-none py-0 d-lg-block overflow-hidden">
                <div class="mb-n16 mt-3">
                <img src="https://i.imgur.com/0JGDYAT.png" height="200" alt="breadcrumbw" />
                </div>
            </div>
            </div>
        </div>
        </div>
    </v-row>

    <!--CAIXAS DASHBOARD-->
    <div class="v-col v-col-12">
      <v-row justify="space-around">  
        <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
          <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lighterror">
            <div class="bg-lighterror">
              <AlertTriangleIcon size="30" class="text-error" />
              <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-error">
                Alerta
              </div>
              <h4 class="text-h4 mt-1 text-error">
                {{ usinasProcuradas.length }}
              </h4>
            </div>
          </div>
        </div>

        <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
          <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightprimary">
            <div class="bg-lightprimary">
              <ToolsIcon size="30" class="text-primary" />
              <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-primary">
                Programadas
              </div>
              <h4 class="text-h4 mt-1 text-primary">
                {{ manuProgramadas.length }}
              </h4>
            </div>
          </div>
        </div>

        <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
          <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightwarning">
            <div class="bg-lightwarning">
              <SettingsAutomationIcon size="30" class="text-warning" />
              <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-warning">
                Realizando
              </div>
              <h4 class="text-h4 mt-1 text-warning">
                {{ manuRealizando.length }}
            </h4>
            </div>
          </div>
        </div> 

        <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
          <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightsuccess">
            <div class="bg-lightsuccess">
              <ToolIcon size="30" class="text-success" />
              <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-success">
                Realizadas
              </div>
              <h4 class="text-h4 mt-1 text-success">
                {{ manuRealizadas.length }}
            </h4>
            </div>
          </div>
        </div> 


      </v-row>
    </div>

    <v-divider></v-divider>
    <br>

    <!--LISTAR MANUTENÇÕES-->
    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-title>Informações Individuais</v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row>
                <v-col cols="12" md="12">
                    <UiParentCard title="Lista de manutenções"> 
                        <div class="pa-7 pt-1"> 
                            <v-row justify="space-around" class="mb-2">
                            <v-col cols="auto">
                                <v-chip-group mandatory v-model="selecionado" selected-class="text-secondary">
                                  <v-chip value="4">Alerta</v-chip>
                                  <v-chip value="1">Programada</v-chip>
                                  <v-chip value="2">Realizando</v-chip>
                                  <v-chip value="3">Realizada</v-chip>
                                </v-chip-group>
                            </v-col>
                          </v-row>
                          <br>
                          <v-row v-if="selecionado != 4">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th class="header-cell">UC</th>
                                        <th class="header-cell">Usina</th>
                                        <th class="header-cell">Data</th>
                                        <th class="header-cell">Descrição</th>
                                        <th class="header-cell">Acesso</th> 
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(manu, index) in categoriaSelecionada(manutencao)" :key="index"> 
                                        <td class="text-center">{{ pegarUsina(manu.idGeradora).uc }}</td>
                                        <td class="text-center">{{ pegarUsina(manu.idGeradora).nome }}</td>
                                        <td class="text-center">{{  formatarData(manu.data) }}</td>
                                        <td class="text-center">{{ manu.empresa }}</td>
                                        <td class="text-center">
                                            <NuxtLink :to="`/usinas/${manu.idGeradora}`">
                                                <v-btn @click="openDialogRelatorios(predio.id)" size="30" icon class="bg-primary mr-2">
                                                    <v-avatar size="30" class="text-white">
                                                        <EyeIcon size="18" />
                                                    </v-avatar>
                                                    <v-tooltip activator="parent" location="bottom">Ver página da usina</v-tooltip>
                                                </v-btn>   
                                            </NuxtLink>
                                            
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                          </v-row>

                          <v-row v-else>
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th class="header-cell">UC</th>
                                        <th class="header-cell">Usina</th>
                                        <th class="header-cell">Descrição</th>
                                        <th class="header-cell">Últ. Manutenção</th>
                                        <th class="header-cell">CheckList</th>
                                        <th class="header-cell">Acesso</th> 
                                    </tr>
                                </thead>
                                <tbody>
                                  <tr v-for="usina in usinasProcuradas" :key="usina">
                                    <td class="text-center">{{ usina.uc }}</td>
                                    <td class="text-center">{{ usina.nome }}</td>
                                    <td class="text-center">Geração Baixa</td>
                                    <td class="text-center">{{ formatarData(procurarUltManu(usina.id)) }}</td>
                                    <td class="text-center">
                                        <v-chip  :color="verificarStatus(usina.id) == 'ÓTIMO'? 'success': verificarStatus(usina.id) == 'BOM'? 'primary': verificarStatus(usina.id) == 'VERIFICAR'? 'warning':''" variant="flat">
                                            {{ verificarStatus(usina.id)}}
                                        </v-chip>
                                    </td>
                                    <td class="text-center">
                                            <NuxtLink :to="`/usinas/${usina.id}`">
                                                <v-btn size="30" icon class="bg-primary mr-2">
                                                    <v-avatar size="30" class="text-white">
                                                        <EyeIcon size="18" />
                                                    </v-avatar>
                                                    <v-tooltip activator="parent" location="bottom">Ver página da usina</v-tooltip>
                                                </v-btn>   
                                            </NuxtLink>
                                            
                                        </td>
                                  </tr>
                                </tbody>
                              </table>
                          </v-row>
                        </div>
                    </UiParentCard>
                </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

</template>

<style scoped>
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  border: 1px solid #e0e0e0;
  padding: 8px;
}

.table th {
  background-color: #f5f5f5;
}

.header-cell {
  border: 1px solid #e0e0e0;
  padding: 8px;
  background: linear-gradient(to bottom, #4d7fff, #1e73be);
  color: white;
  font-weight: bold;
}

.header-cell:hover {
  cursor: pointer;
}

tbody tr:nth-child(even) {
  background-color: #f2f2f2;
}

tbody tr:hover {
  background-color: #ddd;
}

.custom-select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ced4da;
    border-radius: 5px;
    font-size: 16px;
    color: #495057;
    background-color: #fff;
    background-image: none;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }

  .custom-select:focus {
    border-color: #80bdff;
    outline: 0;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
</style>