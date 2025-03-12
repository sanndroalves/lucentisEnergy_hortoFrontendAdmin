<script setup>
import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';

// Defina o título da página
useHead ({
  title: 'CheckList'
});

definePageMeta({
  middleware: 'sidebase-auth'
})

import { ref } from "vue";
import UiParentCard from "@/components/shared/UiParentCard.vue";

const cateSelecionada = ref()

const predioSelect = ref()
const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);
const { data: checklists } = await useFetch(`${API_BASE_URL}/checklist/`);


// CARDS VALORES

const mesAtual = new Date().getMonth() + 1; 

const mesFilter = checklists.value.filter(item => {
    const itemMonth = new Date(item.data).getMonth() + 1; // Extrai o mês do item
    return itemMonth === mesAtual;
});
 
// FORMULÁRIO CHECKLIST
const array = []
    for(var id in usinas._rawValue){ 
        const usina = usinas._rawValue[id];
        array.push({ id: usina.id, nome: usina.nome });
    }

const sitPlaca = ref()
const sitInversor = ref()
const sitRoteador = ref()
const checkComentario = ref()

const showAlertCampo = ref(false)
const showAlertError = ref(false)
const showAlertSuccess = ref(false)
const showAlertErrorMes = ref(false)


const enviarCheck = async () =>{
    if(!sitPlaca.value || !sitInversor.value || !sitRoteador.value || !checkComentario.value){
      showAlertCampo.value = true
      showAlertError.value = false
      showAlertSuccess.value = false
    }

    const { data: usinaInfo } = await useFetch(`${API_BASE_URL}/checklist?idUsina=${predioSelect.value.id}`);
    const mesAtual = new Date().getMonth() + 1; 

    const mesFilter = usinaInfo.value.filter(item => {
        const itemMonth = new Date(item.data).getMonth() + 1; // Extrai o mês do item
        return itemMonth === mesAtual;
    });

    if (usinaInfo && mesFilter.length > 0) {
        showAlertErrorMes.value = true
        showAlertError.value = false
        showAlertCampo.value = false
        showAlertSuccess.value = false
        return;
    }

    try {
      const response = await useFetch(`${API_BASE_URL}/checklist/`, {
                method: 'POST',
                body: {
                    idUsina: predioSelect.value.id,
                    sitPlaca: sitPlaca.value,
                    sitInversor: sitInversor.value,
                    sitRoteador: sitRoteador.value,
                    comentario: checkComentario.value,
        }
      })
      if(!response.error.value){
          showAlertError.value = false
          showAlertCampo.value = false
          showAlertSuccess.value = true
          showAlertErrorMes.value = false
      }else{
        showAlertError.value = true
        showAlertCampo.value = false
        showAlertSuccess.value = false
        showAlertErrorMes.value = false
      }
    } catch (error) {
        showAlertError.value = true
        showAlertCampo.value = false
        showAlertSuccess.value = false
        showAlertErrorMes.value = false
    }

}
 

// TABELA CHECKLISTS
const qtdChecks =  (idUsina) =>{
    const qtd = checklists.value.filter(item => item.idUsina == idUsina)
    return qtd.length
}

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

// DIALOG CHECKLISTS
const dialogListCheckLists = ref(false)
const dadosUsina = ref()
const dadosCheck = ref()

const openDialog = async (idUsina) =>{
  dialogListCheckLists.value = true
  const dados = usinas.value.filter(item => item.id == idUsina)
  dadosUsina.value = dados[0]

  dadosCheck.value = checklists.value.filter(item => item.idUsina == idUsina)
}

const getStatusLabel = (status) => {
  switch (status) {
    case "O":
      return "Ótimo";
    case "B":
      return "Bom";
    case "R":
      return "Ruim";
    case "Q":
      return "Quebrado";
    case "M":
      return "Manutenção";
    default:
      return "Desconhecido";
  }
};

const getStatusColorClass = (status) => {
  const colorMap = {
    O: "success",
    B: "primary",
    R: "warning",
    Q: "error",
    M: "warning",
  };

  return colorMap[status] || "bg-primary";
};

// APAGANDO CHECKLIST DA LISTA

const deleteCheck = async (idCheck) => {
    try {
        await useFetch(`${API_BASE_URL}/checklist/${idCheck}`, {
          method: 'DELETE',
          key: 'deleteCheck'
        });

        const { data: checklists } = await useFetch(`${API_BASE_URL}/checklist/`);
        dadosCheck.value = checklists.value.filter(item => item.idUsina == idUsina)
        

      } catch (error) {
        alert("Erro ao excluir a checklist..");
      }
    }

    //FORMATANDO DATA DO DIALGO
    const formatarMesAno = (data) => {
      const dataObj = new Date(data);
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0'); // Meses em JS começam em 0, então adicionamos 1
      const ano = dataObj.getFullYear();
      return `${mes}/${ano}`;
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
              <h3 class="text-h3 mb-2">CheckList</h3>
              <ul
                class="v-breadcrumbs v-breadcrumbs--density-default text-h6 font-weight-medium pa-0 ml-n1"
              >
                <!---->
                <li class="v-breadcrumbs-item" text="Solar">
                  <a class="v-breadcrumbs-item--link" href="/" style="text-decoration:none"
                    ><h6 class="text-medium-emphasis text-subtitle-1">
                        Solar
                    </h6></a
                  >
                </li>
                <li class="v-breadcrumbs-divider">
                  <div class="d-flex align-center text-h3 mt-n4">.</div>
                </li>
                <li
                  class="v-breadcrumbs-item v-breadcrumbs-item--disabled"
                  text="Usinas"
                >
                  <h6 class="text-medium-emphasis text-subtitle-1">CheckList</h6>
                </li>
                <!----><!---->
              </ul>
            </div>
          </div>
          <div class="d-none py-0 d-lg-block overflow-hidden">
            <div class="mb-n16 mt-3">
              <img src="https://i.imgur.com/vpEwz5j.png" height="200" alt="breadcrumbw" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </v-row>
 
  <!--CAIXAS DASHBOARD-->
  <div class="v-col v-col-12">
    <v-row justify="space-around">  
      <div class="v-col-sm-4 v-col-md-4 v-col-lg-4 v-col-12">
        <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightwarning">
          <div class="bg-lightwarning">
            <BoltIcon size="30" class="text-warning" />
            <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-warning">
              A fazer (mês)
            </div>
            <h4 class="text-h4 mt-1 text-warning">
              {{(Number(usinas.length) - Number(mesFilter.length))}}
            </h4>
          </div>
        </div>
      </div> 

      <div class="v-col-sm-4 v-col-md-4 v-col-lg-4 v-col-12">
        <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightsuccess">
          <div class="bg-lightsuccess">
            <XIcon size="30" class="text-success" />
            <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-success">
              Realizados (Geral)
            </div>
            <h4 class="text-h4 mt-1 text-success">
              {{ checklists.length }}
          </h4>
          </div>
        </div>
      </div> 
    </v-row>
  </div>
  
  <v-divider></v-divider> 
  <br> 

  
  <!--LISTAR USINAS-->
  <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-title>Informações Individuais</v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row justify="space-around" class="mb-2">
                    <v-col cols="auto">
                        <v-chip-group mandatory v-model="cateSelecionada" selected-class="text-primary">
                          <v-chip value="NOVO">Novo</v-chip>
                          <v-chip value="REALIZADOS">Realizados</v-chip> 
                        </v-chip-group>
                    </v-col>
                  </v-row>

                  <v-row v-if="cateSelecionada == 'NOVO'">
                    <v-col v-if="showAlertCampo" cols="12">
                        <v-alert  type="error">
                            Preencha todos os campos antes de enviar o CheckList!
                        </v-alert>
                    </v-col>
                    <v-col v-if="showAlertError" cols="12">
                        <v-alert  type="error">
                            Erro ao enviar CheckList!
                        </v-alert>
                    </v-col>
                    <v-col v-if="showAlertErrorMes" cols="12">
                        <v-alert  type="warning">
                            CheckList dessa usina já foi preenchido esse mês!
                        </v-alert>
                    </v-col>
                    <v-col v-if="showAlertSuccess" cols="12">
                        <v-alert type="success">
                            CheckList enviado com sucesso!
                        </v-alert>
                    </v-col>

                    <v-col cols="12">
                        <v-label class="font-weight-bold mb-1">Usina</v-label>
                        <v-select v-model="predioSelect" :items="array" item-title="nome" item-value="id" label="Prédio"  return-object color="primary" required></v-select>
                    </v-col>

                    <v-col cols="12">
                        <v-label class="font-weight-bold mb-1">Situação da Placa: </v-label>
                        <v-container fluid> 
                            <v-radio-group v-model="sitPlaca" inline>
                                <v-radio label="Ótimo" value="O"></v-radio>
                                <v-radio label="Bom" value="B"></v-radio>
                                <v-radio label="Ruim" value="R"></v-radio>
                                <v-radio label="Quebrado" value="Q"></v-radio>
                                <v-radio label="Manutenção" value="M"></v-radio>
                            </v-radio-group>
                        </v-container>
                    </v-col>

                    <v-col cols="12">
                        <v-label class="font-weight-bold mb-1">Situação do Inversor: </v-label>
                        <v-container fluid> 
                            <v-radio-group v-model="sitInversor" inline>
                                <v-radio label="Ótimo" value="O"></v-radio>
                                <v-radio label="Bom" value="B"></v-radio>
                                <v-radio label="Ruim" value="R"></v-radio>
                                <v-radio label="Quebrado" value="Q"></v-radio>
                                <v-radio label="Manutenção" value="M"></v-radio>
                            </v-radio-group>
                        </v-container>
                    </v-col>

                    <v-col cols="12">
                        <v-label class="font-weight-bold mb-1">Situação da sinal WIFI: </v-label>
                        <v-container fluid> 
                            <v-radio-group v-model="sitRoteador" inline>
                                <v-radio label="Ótimo" value="O"></v-radio>
                                <v-radio label="Bom" value="B"></v-radio>
                                <v-radio label="Ruim" value="R"></v-radio>
                                <v-radio label="Quebrado" value="Q"></v-radio>
                                <v-radio label="Manutenção" value="M"></v-radio>
                            </v-radio-group>
                        </v-container>
                    </v-col>

                    <v-col cols="12">
                        <v-label class="font-weight-bold mb-1">Comentário: </v-label>
                        <v-text-field v-model="checkComentario"></v-text-field>
                    </v-col>

                    <v-col class="text-right" cols="12">
                        <v-btn class="bg-primary" @click="enviarCheck">
                            Enviar
                        </v-btn>
                    </v-col>
                  </v-row>

                  <v-row v-if="cateSelecionada == 'REALIZADOS'" justify="space-around">
                    <v-table style="width: 100vw;">
                        <thead>
                        <tr>
                            <th class="text-center">ID</th>
                            <th class="text-center">UC</th>
                            <th class="text-center">Nome</th> 
                            <th class="text-center">CheckLists</th> 
                            <th class="text-center">Status</th>
                            <th class="text-center">Operações</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr v-for="usina in usinas" :key="usina.id" class="text-center"> 
                            <td>{{ usina.id }}</td>
                            <td class="text-center">{{ usina.uc }}</td>
                            <td>{{ usina.nome.toUpperCase() }}</td> 
                            <td>{{ qtdChecks(usina.id) }}</td>
                            <td>
                                <v-chip :color="verificarStatus(usina.id) == 'ÓTIMO'? 'success': verificarStatus(usina.id) == 'BOM'? 'primary': verificarStatus(usina.id) == 'VERIFICAR'? 'warning':''" variant="flat">
                                   {{ verificarStatus(usina.id)}}
                                </v-chip>
                            </td>
                            <td class="text-center"> 
                                <v-btn size="40" icon class="bg-primary mr-5" @click="openDialog(usina.id)">
                                  <v-avatar size="30" class="text-white">
                                      <EditIcon size="20" />
                                  </v-avatar>
                                  <v-tooltip activator="parent" location="bottom"
                                      >Verificar checklists
                                  </v-tooltip>
                                </v-btn> 
                            </td>
                        </tr>
                        </tbody>
                    </v-table>
                  </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <v-dialog v-model="dialogListCheckLists" width="1024">
        <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">Informações dos CheckLists</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <strong>Usina: </strong>
                <span style="font-size: 20px;">{{ dadosUsina.nome }}</span>
              </v-col>
              <v-divider></v-divider>
              
              <v-col cols="12" class="text-center">
                <v-chip style="font-size: 20px; padding: 20px;" :color="verificarStatus(dadosUsina.id) == 'ÓTIMO'? 'success': verificarStatus(dadosUsina.id) == 'BOM'? 'primary': verificarStatus(dadosUsina.id) == 'VERIFICAR'? 'warning':''" variant="flat">
                    {{ verificarStatus(dadosUsina.id)}}
                </v-chip>
              </v-col>
              
              <v-divider></v-divider>
              <v-col cols="12" class="text-center">
                    <strong style="font-size: 20px">TABELA DE CHECKLISTS REALIZADOS</strong>
                    <v-table class="mt-3">
                        <thead>
                            <tr>
                                <th class="header-cell text-center">ID</th>
                                <th class="header-cell text-center">Placa</th>
                                <th class="header-cell text-center">Inversor</th>
                                <th class="header-cell text-center">Roteador</th>
                                <th class="header-cell text-center">Comentário</th>
                                <th class="header-cell text-center">Data</th>
                                <th class="header-cell text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="check in dadosCheck" :key="check">
                                <td>{{ check.id }}</td> 
                                <td>
                                  <v-chip :color="getStatusColorClass(check.sitPlaca)" variant="flat">
                                      {{ getStatusLabel(check.sitPlaca)}}
                                  </v-chip>
                                </td>
                                <td>
                                  <v-chip :color="getStatusColorClass(check.sitInversor)" variant="flat">
                                      {{ getStatusLabel(check.sitInversor)}}
                                  </v-chip>
                                </td>
                                <td>
                                  <v-chip :color="getStatusColorClass(check.sitRoteador)" variant="flat">
                                      {{ getStatusLabel(check.sitRoteador)}}
                                  </v-chip>
                                </td>
                                <td>{{ check.comentario }}</td>
                                <td>{{ formatarMesAno(check.data) }}</td>
                                <td>
                                  <v-col>
                                    <v-btn @click="deleteCheck(check.id)" size="30" icon class="bg-error mr-2">
                                        <v-avatar size="30" class="text-white">
                                            <TrashIcon size="18" />
                                        </v-avatar>
                                        <v-tooltip activator="parent" location="bottom">Excluir CheckList</v-tooltip>
                                    </v-btn>
                                  </v-col>
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
              </v-col> 
            </v-row>
          </v-container>
        </v-card-text>
      </v-card>
    </v-dialog>
</template>

<style scoped>
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

  .custom-btn {
    margin-left: 15px;
  }

  .button-container {
    display: flex;
    align-items: center;
  }

  .bordered td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: center;
    width: 100vw;
  }

  .header-cell { 
  padding: 8px;
  background: linear-gradient(to bottom, #4d7fff, #1e73be);
  color: white;
  font-weight: bold;
}
</style>