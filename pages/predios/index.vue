<script setup >
import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';

// Defina o título da página
useHead ({
  title: 'Prédios Públicos'
});

definePageMeta({
  middleware: 'sidebase-auth'
})

import UiParentCard from '@/components/shared/UiParentCard.vue'; 

import { ref } from 'vue';
import { SearchIcon } from 'vue-tabler-icons';

const { data: predios } = await useFetch(`${API_BASE_URL}/unidadecompensacao/`);
const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);

// ALTERANDO OS STATUS
const getStatusLabel = (status) => {
  switch (status) {
    case "L":
      return "Ligado";
    case "D":
      return "Desligado";
    case "M":
      return "Manutenção";
    default:
      return "Desconhecido";
  }
};

const getStatusSecretaria = (status) => {
  switch (status) {
    case "E":
      return "Educação";
    case "S":
      return "Saúde";
    case "O":
      return "Outros";
    default:
      return "Desconhecido";
  }
};

const getStatusColorClass = (status) => {
  const colorMap = {
    E: "primary",
    S: "success",
    O: "warning",
  };

  return colorMap[status] || "error";
};


//SELECIONANDO CATEGORIA
const selecionado = ref(null)

const categoriaSelecionada = (prediosNovo) =>{
  if(selecionado !== null){
    const prediosPorCategoria = prediosNovo.filter(predio => predio.secretaria === selecionado.value);
    return prediosPorCategoria
  }else{
    return predios
  }
}

// BUSCANDO AS PORCENTAGEM POR UNIDADE
const { data: listaPorcento } = await useFetch(`${API_BASE_URL}/porcentagem/`);
const procurarPorcentagem = (predioId) =>{
  const listaFinal = listaPorcento.value.filter(porcento => porcento.idUnidadeCompensa === predioId);

  return listaFinal
}


const procurarGeradora = (geradoraId) =>{
  const listaGeradora = usinas.value.filter(usina => usina.id === geradoraId)
  return listaGeradora
}


/* LISTAGEM DE PORCENTAGENS */
// Variáveis reativas
const dialogOpen = ref(false);
const porcentagensAtivas = ref([]);
const porcentagensHistoricas = ref([]);

const openDialog = (predioId) => {
  // Carregar as porcentagens do prédio
  const porcentagens = procurarPorcentagem(predioId);

  // Separar em ativas e históricas
  porcentagensAtivas.value = porcentagens.filter((p) => !p.data_fim);
  porcentagensHistoricas.value = porcentagens.filter((p) => p.data_fim);

  dialogOpen.value = true;
};


// Função para formatar datas no formato MM/YYYY
const formatarData = (data) => {
  if (!data) return ''; // Caso a data seja nula ou indefinida
  const date = new Date(data);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};




/* ADICIONAR GERADORA AO PRÉDIO*/
const dialogGeradora = ref(false)

const showErrorAlertGeracao = ref(false)
const showErrorCampoGeracao = ref(false)
const showSuccessAlertGeracao = ref(false)

const selectedUsina = ref("")
const porcentagem = ref("")
const selectedPredio = ref("")

const openDialogGeradora = async (predioId) =>{
  dialogGeradora.value = true

  showErrorCampoGeracao.value = false
  showSuccessAlertGeracao.value = false
  selectedUsina.value = ""
  porcentagem.value = ""

  const {data: unidadeDetalhe} = await useFetch(`${API_BASE_URL}/unidadecompensacao/${predioId}`)
        ucUnidadeRela.value = unidadeDetalhe.value.uc
        nomeUnidadeRela.value = unidadeDetalhe.value.nome
        selectedPredio.value = unidadeDetalhe.value.id
}

const sendGeradora = async () => {
  if (!selectedUsina.value || !porcentagem.value) {
      showErrorCampoGeracao.value = true
      showSuccessAlertGeracao.value = false
      return;
  }

  try {
    const response = await useFetch(`${API_BASE_URL}/porcentagem/`, {
            method: 'POST',
            body: 
                {
                    idUnidadeCompensa: selectedPredio.value,
                    idGeradora: selectedUsina.value,
                    porcentagem: porcentagem.value,
                },
            key: 'GeradoraPost'
        });
    
        if (response){
          showErrorCampoGeracao.value = false
          showSuccessAlertGeracao.value = true
          
          const { data: listaPorcentoNova } = await useFetch(`${API_BASE_URL}/porcentagem/`);
          listaPorcento.value = listaPorcentoNova._value;

        } else {
            showErrorAlertGeracao.value = true
            showErrorCampoGeracao.value = false
            showSuccessAlertGeracao.value = false
        }
    } catch (error){
            showErrorAlertGeracao.value = true
            showErrorCampoGeracao.value = false
            showSuccessAlertGeracao.value = false
    }
}

/* ADICIONAR NOVA UNIDADE COMPENSADA*/
    const showSuccessAlertUnidade = ref(false);
    const showErrorAlertUnidade = ref(false);
    const showErrorCampoUnidade = ref(false);;

    const dialogNovaUnidade = ref(false);

    const ucUnidade = ref("");
    const nomeUnidade = ref("");
    const dataInicioUnidade = ref("");
    const consumoUnidade = ref("");
    const kwhUnidade = ref("");
    const enderecoUnidade = ref("");
    const cep = ref("")
    const secretaria = ref("")
    const statusUnidade = ref("");

    const openDialogNovaUnidade = () => {
        dialogNovaUnidade.value = true;
        showSuccessAlertUnidade.value = false;
        showErrorAlertUnidade.value = false;
        showErrorCampoUnidade.value = false;
    }; 

    const sendUnidade = async () => {
        if (!ucUnidade.value || !nomeUnidade.value || !dataInicioUnidade.value || !consumoUnidade.value || !kwhUnidade.value || !cep.value || !enderecoUnidade.value || !statusUnidade.value || !secretaria.value) {
            showErrorCampoUnidade.value = true;
            showSuccessAlertUnidade.value = false;
            showErrorAlertUnidade.value = false;
            return;
        }

        try {
            const response =  await useFetch(`${API_BASE_URL}/unidadecompensacao/`, {
            method: 'POST',
                body: 
                    {
                        uc: ucUnidade.value,
                        nome: nomeUnidade.value,
                        dataInicio: dataInicioUnidade.value,
                        mediaConsumo: consumoUnidade.value,
                        valorKWH: kwhUnidade.value,
                        endereco: enderecoUnidade.value,
                        status: statusUnidade.value,
                        cep: cep.value,
                        secretaria: secretaria.value
                    },
                key: 'unidadePost'
            });

            if (response) {
                showSuccessAlertUnidade.value = true;
                showErrorAlertUnidade.value = false;
                showErrorCampoUnidade.value = false;

                const {data: prediosUpdated} = await useFetch(`${API_BASE_URL}/unidadecompensacao/`)
                predios.value = prediosUpdated._value
                
            } else {
                showSuccessAlertUnidade.value = false;
                showErrorAlertUnidade.value = true;
                showErrorCampoUnidade.value = false;
            }
            
        } catch (error) {
          showSuccessAlertUnidade.value = false;
          showErrorAlertUnidade.value = true;
          showErrorCampoUnidade.value = false;
        }
    }





const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const anos = [2024, 2023];

/* ADICIONAR NOVO RELATÓRIO NA UNIDADE*/
const mesRelUni = ref("");
    const anoRelUni = ref("");
    const consumoUni = ref("");
    const valorConUni = ref("");
    const enerTusdUni = ref("");
    const valorTusdUni = ref("");
    const enerTeUni = ref("");
    const valorTeUni = ref("");

    const compensada =   ref("")
    const ucUnidadeRela =   ref("")
    const nomeUnidadeRela =   ref("")

    const dialogNovoRelatorio = ref(false)
    const showSuccessAlertRelatorio = ref(false);
    const showErrorCampoRelatorio = ref(false);;
    const showErrorMesRelatorio = ref(false);
    const showErrorAlertRelatorio = ref(false);



    const openDialogNovoRelatorio = async (idUnidadeCompensa) =>{
        dialogNovoRelatorio.value = true
        compensada.value = idUnidadeCompensa

        const {data: unidadeDetalhe} = await useFetch(`${API_BASE_URL}/unidadecompensacao/${compensada.value}`)
        ucUnidadeRela.value = unidadeDetalhe.value.uc
        nomeUnidadeRela.value = unidadeDetalhe.value.nome
    }


    const sendRelatorioUni = async () => {
        if (!mesRelUni.value || !anoRelUni.value || !consumoUni.value || !valorConUni.value || !enerTusdUni.value || !valorTusdUni.value || !enerTeUni.value || !valorTeUni.value ) {
            showErrorCampoRelatorio.value = true
            showSuccessAlertRelatorio.value = false
            showErrorMesRelatorio.value = false
            return;
        }
        
        const {data: relaVerificar} = await useFetch(`${API_BASE_URL}/relatoriocompensacao?idUnidadeCompensa=${compensada.value}&mes=${mesRelUni.value}&ano=${anoRelUni.value}`)
    
        if(relaVerificar.value.length){
            showErrorMesRelatorio.value = true
            showSuccessAlertRelatorio.value = false
            showErrorCampoRelatorio.value = false
            return;
        }
        try {
            const response = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`, {
                    method: 'POST',
                    body: 
                        {
                            idUnidadeCompensa: compensada.value,
                            mes: mesRelUni.value,
                            ano: anoRelUni.value,
                            consumokWh: consumoUni.value,
                            consumoReais: valorConUni.value,
                            enerInjTUSD:  enerTusdUni.value,
                            enerInjTE:  enerTeUni.value,
                            valorInjTUSD: valorTusdUni.value,
                            valorInjTE: valorTeUni.value
                        },
                    key: 'RelatorioUniPost'
                });
            
                if (response){
                    showSuccessAlertRelatorio.value = true
                    showErrorCampoRelatorio.value = false
                    showErrorMesRelatorio.value = false

                } else {
                    showErrorAlertRelatorio.value = true
                    showSuccessAlertRelatorio.value = false
                    showErrorCampoRelatorio.value = false
                    showErrorMesRelatorio.value = false
                }
            } catch (error){
                showErrorAlertRelatorio.value = true
                showSuccessAlertRelatorio.value = false
                showErrorCampoRelatorio.value = false
                showErrorMesRelatorio.value = false
            }
    }

    //EDITAR UNIDADE COMPENSADA
    const dialogEditUnidade = ref(false)
    const showErrorCampoUnidadeEdit = ref(false)
    const showSuccessAlertUnidadeEdit = ref(false);
    const showErrorAlertUnidadeEdit = ref(false);

    const ucUnidadeEdit = ref("");
    const nomeUnidadeEdit = ref("");
    const dataInicioUnidadeEdit = ref("");
    const consumoUnidadeEdit = ref("");
    const kwhUnidadeEdit = ref("");
    const enderecoUnidadeEdit = ref("");
    const statusUnidadeEdit = ref("");
    const secretariaEdit = ref("")
    const cepEdit = ref("")

    const compensadaId = ref("")

    const openDialogEditUnidade = async (unidadeId) => {
        showErrorCampoUnidadeEdit.value = false
        showSuccessAlertUnidadeEdit.value = false
        showErrorAlertUnidadeEdit.value = false

        dialogEditUnidade.value = true
        

        const {data: unidadeDetalhe} = await useFetch(`${API_BASE_URL}/unidadecompensacao/${unidadeId}`)
            ucUnidadeEdit.value = unidadeDetalhe.value.uc
            nomeUnidadeEdit.value = unidadeDetalhe.value.nome
            dataInicioUnidadeEdit.value = unidadeDetalhe.value.dataInicio
            consumoUnidadeEdit.value = unidadeDetalhe.value.mediaConsumo
            kwhUnidadeEdit.value = unidadeDetalhe.value.valorKWH
            enderecoUnidadeEdit.value = unidadeDetalhe.value.endereco
            statusUnidadeEdit.value = unidadeDetalhe.value.status
            compensadaId.value = unidadeDetalhe.value.id
            secretariaEdit.value = unidadeDetalhe.value.secretaria
            cepEdit.value = unidadeDetalhe.value.cep
    }

    /* EDITAR UNIDADE ENVIO*/
    const editUnidade = async () => {
        if (!ucUnidadeEdit.value || !nomeUnidadeEdit.value || !dataInicioUnidadeEdit.value || !consumoUnidadeEdit.value || !kwhUnidadeEdit.value || !enderecoUnidadeEdit.value || !statusUnidadeEdit.value) {
            showErrorCampoUnidadeEdit.value = true
            showSuccessAlertUnidadeEdit.value = false
            return;
        }

        try {
            const response = await useFetch(`${API_BASE_URL}/unidadecompensacao/${compensadaId.value}`, {
                method: 'PUT',
                body: 
                    {
                        uc: ucUnidadeEdit.value,
                        nome: nomeUnidadeEdit.value,
                        dataInicio: dataInicioUnidadeEdit.value,
                        mediaConsumo: consumoUnidadeEdit.value,
                        valorKWH: kwhUnidadeEdit.value,
                        endereco: enderecoUnidadeEdit.value,
                        status: statusUnidadeEdit.value,
                        cep: cepEdit.value,
                        secretaria: secretariaEdit.value
                    },
                key: 'unidadePut'
            });

            if (response){
                showErrorCampoUnidadeEdit.value = false
                showSuccessAlertUnidadeEdit.value = true

                const {data: updPredios} = await useFetch(`${API_BASE_URL}/unidadecompensacao/`)
                predios.value = updPredios._value


            } else{
                showErrorAlertUnidadeEdit.value = true
                showErrorCampoUnidadeEdit.value = false
                showSuccessAlertUnidadeEdit.value = false
            }
        } catch (error){
            showErrorAlertUnidadeEdit.value = true
            showErrorCampoUnidadeEdit.value = false
            showSuccessAlertUnidadeEdit.value = false
        }
    }


    //EXCLUIR UNIDADE COMPENSADA
    const dialogExcluirUnidade = ref(false)
    const showSuccessAlertUnidadeExcluida = ref(false)
    const showErrorAlertUnidadeExcluida = ref(false)

    const ucUnidadeExcluir = ref("")
    const nomeUnidadeExcluir = ref("")
    const idUnidadeExcluir = ref("")

    const openDialogExcluirUnidade = async (unidadeId) =>{
        dialogExcluirUnidade.value = true
        showSuccessAlertUnidadeExcluida.value = false

        const {data: unidadeDetalhe} = await useFetch(`${API_BASE_URL}/unidadecompensacao/${unidadeId}`)
        ucUnidadeExcluir.value = unidadeDetalhe.value.uc
        nomeUnidadeExcluir.value = unidadeDetalhe.value.nome
        idUnidadeExcluir.value = unidadeDetalhe.value.id
    } 

    const deleteUnidade = async () => {
    try {
        const response = await useFetch(`${API_BASE_URL}/unidadecompensacao/${idUnidadeExcluir.value}`, {
          method: 'DELETE',
          key: 'deleteUnidade'
        });

        if(response){
            showSuccessAlertUnidadeExcluida.value = true
        } else{
            showSuccessAlertUnidadeExcluida.value = false
            showErrorAlertUnidadeExcluida.value = true

        }

        const { data: updPredios } = await useFetch(`${API_BASE_URL}/unidadecompensacao/`);
        predios.value = updPredios._value;

      } catch (error) {
        console.error("Erro ao excluir a unidade compensada:", error);
        alert("Erro ao excluir a unidade. Consulte o console para obter mais detalhes.");
      }
    }

    // LISTA DE RELATORIOS
    const dialogRelatorios = ref(false)
    const relatoriosUnidade = ref("")
    const idUnidadeRela = ref("")

    const ucUnidadeRelatorio = ref("")
    const nomeUnidadeRelatorio = ref("")

    const openDialogRelatorios = async (unidadeId) =>{
        dialogRelatorios.value = true
        
        const {data: unidade} = await useFetch(`${API_BASE_URL}/unidadecompensacao/${unidadeId}`)
        ucUnidadeRelatorio.value = unidade.value.uc
        nomeUnidadeRelatorio.value = unidade.value.nome

        const {data: relatorios} = await useFetch(`${API_BASE_URL}/relatoriocompensacao?idUnidadeCompensa=${unidadeId}`)
        relatoriosUnidade.value = relatorios._value
        idUnidadeRela.value = unidadeId
    }

    /* DELETAR RELATORIOS */
    const deleteRelatorio = async (relatorioId) => {
        try {
            await useFetch(`${API_BASE_URL}/relatoriocompensacao/${relatorioId}`, {
                method: 'DELETE',
                key: 'deleteRelatorio'
            });

            const { data: updatedRelatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao?idUnidadeCompensa=${idUnidadeRela.value}`);
            relatoriosUnidade.value = updatedRelatorios._value;

        } catch (error) {
            console.error("Erro ao excluir relatorio:", error);
            alert("Erro ao excluir relatorio. Consulte o console para obter mais detalhes.");
            }
    }

    /* EDITAR RELATORIOS*/
    const dialogRelatoriosEditar = ref(false);
    const showErrorCampoEdit = ref(false)
    const showSuccessAlertEdit = ref(false)
    const showErrorAlertEdit = ref(false)

    const idRelaEdit = ref("");
    const mesRelUniEdit = ref("");
    const anoRelUniEdit = ref("");
    const consumoUniEdit = ref("");
    const valorConUniEdit = ref("");
    const enerTusdUniEdit = ref("");
    const valorTusdUniEdit = ref("");
    const enerTeUniEdit = ref("");
    const valorTeUniEdit = ref("");

    const openDialogRelatoriosEditar = async (relatorioId) =>{
        const { data: relatorioInd } = await useFetch(`${API_BASE_URL}/relatoriocompensacao/${relatorioId}`);

        idRelaEdit.value = relatorioInd.value.id
        mesRelUniEdit.value = relatorioInd.value.mes
        anoRelUniEdit.value = relatorioInd.value.ano
        consumoUniEdit.value = relatorioInd.value.consumokWh
        valorConUniEdit.value = relatorioInd.value.consumoReais
        enerTusdUniEdit.value = relatorioInd.value.enerInjTUSD
        valorTusdUniEdit.value = relatorioInd.value.valorInjTUSD
        enerTeUniEdit.value = relatorioInd.value.enerInjTE
        valorTeUniEdit.value = relatorioInd.value.valorInjTE

        dialogRelatoriosEditar.value = true
    }

    const saveChangesRelatorio = async (idRelaEdit) => {
      if (!mesRelUniEdit.value || !anoRelUniEdit.value || !consumoUniEdit.value || !valorConUniEdit.value || !enerTusdUniEdit.value || !valorTusdUniEdit.value || !enerTeUniEdit.value || !valorTeUniEdit.value) {
        showErrorCampoEdit.value = true;
        showSuccessAlertEdit.value = false;
        return;
      }


      try {
        const response = await useFetch(`${API_BASE_URL}/relatoriocompensacao/${idRelaEdit}`,
          {
            method: "PUT",
            body: {
                mes: mesRelUniEdit.value,
                ano: anoRelUniEdit.value,
                consumokWh: consumoUniEdit.value,
                consumoReais: valorConUniEdit.value,
                enerInjTUSD:  enerTusdUniEdit.value,
                enerInjTE:  enerTeUniEdit.value,
                valorInjTUSD: valorTusdUniEdit.value,
                valorInjTE: valorTeUniEdit.value
            },
            key: "relatorioPut",
          }
        );

        if (response) {
          showSuccessAlertEdit.value = true;
          showErrorCampoEdit.value = false;
        } else {
          showErrorAlertEdit.value = true;
          showSuccessAlertEdit.value = false;
          showErrorCampoEdit.value = false;
        }
      } catch (error) {
        showErrorAlertEdit.value = true;
        showSuccessAlertEdit.value = false;
        showErrorCampoEdit.value = false;
      }

  const { data: prediosUpdated } = await useFetch(`${API_BASE_URL}/unidadecompensacao/`);
  predios.value = prediosUpdated._value;
};

const deletePorcetagem = async (idPorcentagem) =>{
        try {
            await useFetch(`${API_BASE_URL}/porcentagem/${idPorcentagem}`, {
                method: 'DELETE',
                key: 'deletePorcetagem'
            });

            const { data: listaPorcentoNova } = await useFetch(`${API_BASE_URL}/porcentagem/`);
            listaPorcento.value = listaPorcentoNova._value;
 
            porcentagensAtivas.value = porcentagensAtivas.value.filter((porcentagem) => porcentagem.id !== idPorcentagem);

        } catch (error) {
            console.error("Erro ao excluir porcentagem:", error);
            alert("Erro ao excluir porcentagem. Consulte o console para obter mais detalhes.");
            }
}

const contaEducacao = predios.value.filter(item => item.secretaria === 'E')
const contaSaude = predios.value.filter(item => item.secretaria === 'S')
const contaOutros = predios.value.filter(item => item.secretaria === 'O')
</script>
<template>

    <!-- BANNER -->
    <v-row>
    <div
      class="v-card v-theme--BLUE_THEME v-card--density-default elevation-10 rounded-md v-card--variant-elevated bg-lightprimary elevation-0 rounded-md mb-8"
    >
      <div class="px-8 py-8 py-lg-0">
        <div class="d-flex justify-space-between">
          <div class="d-flex py-0 align-center">
            <div>
              <h3 class="text-h3 mb-2">Prédios Públicos</h3>
              <ul
                class="v-breadcrumbs v-breadcrumbs--density-default text-h6 font-weight-medium pa-0 ml-n1"
              >
                <!---->
                <li class="v-breadcrumbs-item" text="Dashboard">
                  <a class="v-breadcrumbs-item--link" href="/" style="text-decoration:none"
                    ><h6 class="text-medium-emphasis text-subtitle-1">
                      Unidades Consumidoras
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
                  <h6 class="text-medium-emphasis text-subtitle-1">Prédios Públicos</h6>
                </li>
                <!----><!---->
              </ul>
            </div>
          </div>
          <div class="d-none py-0 d-lg-block overflow-hidden">
            <div class="mb-n16 mt-3">
              <img src="https://i.imgur.com/NeDPR3O.png" height="200" alt="breadcrumbw" />
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
          <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightprimary">
            <div class="bg-lightprimary">
              <BooksIcon size="30" class="text-primary" />
              <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-primary">
                Educação
              </div>
              <h4 class="text-h4 mt-1 text-primary">
                {{ contaEducacao.length }}
              </h4>
            </div>
          </div>
        </div> 

        <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
          <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightsuccess">
            <div class="bg-lightsuccess">
              <FirstAidKitIcon size="30" class="text-success" />
              <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-success">
                Saúde
              </div>
              <h4 class="text-h4 mt-1 text-success">
                {{ contaSaude.length }}
            </h4>
            </div>
          </div>
        </div> 

        <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
          <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightwarning">
            <div class="bg-lightwarning">
              <BuildingCommunityIcon size="30" class="text-warning" />
              <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-warning">
                Outros
              </div>
              <h4 class="text-h4 mt-1 text-warning">
                {{ contaOutros.length }}
            </h4>
            </div>
          </div>
        </div>
      </v-row>
    </div>

    <v-divider></v-divider>
    <br>

    <!--LISTAR PRÉDIOS-->
    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-title>Informações Individuais</v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row>
                <v-col cols="12" md="12">
                    <UiParentCard title="Lista de Prédios Públicos"> 
                        <div class="pa-7 pt-1">
                          <v-row justify="space-around" class="mb-2">
                            <v-col cols="auto">
                              <div class="text-center "> 
                                <v-btn class="bg-primary" @click="openDialogNovaUnidade">
                                  Adicionar Prédio
                                </v-btn>
                              </div>  
                              <br>
                                <v-chip-group mandatory v-model="selecionado" selected-class="text-primary">
                                  <v-chip value="E">Educação</v-chip>
                                  <v-chip value="S">Saúde</v-chip>
                                  <v-chip value="O">Outros</v-chip>
                                </v-chip-group>
                                <!-- <v-chip-group mandatory v-model="statusSelecionado" selected-class="text-primary">
                                  <v-chip value="L">Ligado</v-chip>
                                  <v-chip value="P">Desligado</v-chip>
                                  <v-chip value="O">Manutenção</v-chip>
                                </v-chip-group> -->
                            </v-col>
                          </v-row>
                            <table class="table">
                              <thead>
                                <tr>
                                  <th class="header-cell">UC</th>
                                  <th class="header-cell">Nome</th>
                                  <th class="header-cell">Tensão</th>
                                  <th class="header-cell">Status</th>
                                  <th class="header-cell">Geradora</th>
                                  <th class="header-cell">Secretaria</th>
                                  <th class="header-cell">Configurações</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr v-for="(predio, index) in categoriaSelecionada(predios)" :key="index">
                                  <td>{{ predio.uc }}</td>
                                  <td>{{ predio.nome }}</td>
                                  <td class="text-center">{{ predio.tensao }}</td>
                                  <td class="text-center">
                                    <v-chip variant="flat" :color="predio.status === 'L' ? 'success' : 'error'" text>
                                      {{ getStatusLabel(predio.status) }}
                                    </v-chip>
                                  </td>
                                  
                                  <!-- <td class="text-center">
                                    <template v-if="predio.status === 'L'">
                                      <v-chip variant="flat" class="mb-2 ml-2 " v-for="(qtd, index) in procurarPorcentagem(predio.id)" :key="index" color="secondary">
                                        <span v-for="geradora in procurarGeradora(qtd.idGeradora)" :key="geradora.id">{{ geradora.uc }}</span> -
                                        {{ qtd.porcentagem }}% 

                                        <v-btn @click="deletePorcetagem(qtd.id)" size="20" icon class="bg-error ml-2">
                                          <v-avatar size="20" class="text-white">
                                              <XIcon size="15" />
                                          </v-avatar>
                                          <v-tooltip activator="parent" location="bottom">Remover Geradora</v-tooltip>
                                        </v-btn>
                                      </v-chip>
                                    </template>

                                    <template v-else>
                                      <v-chip variant="flat" color="secondary" text>
                                        Off
                                      </v-chip>
                                    </template>
                                    
                                  </td> -->

                                  <td class="text-center">
                                    <template v-if="predio.status === 'L'"> 
                                      <v-btn @click="openDialog(predio.id)" size="30" icon class="bg-primary mr-2">
                                          <v-avatar size="30" class="text-white">
                                              <SearchIcon size="18" />
                                          </v-avatar>
                                          <v-tooltip activator="parent" location="bottom">Ver Porcentagens</v-tooltip>
                                      </v-btn>
                                    </template>

                                    <template v-else>
                                      <v-chip variant="flat" color="secondary" text>Off</v-chip>
                                    </template>
                                  </td>


                                  <td class="text-center">
                                    <v-chip :color="getStatusColorClass(predio.secretaria)" text>
                                      {{ getStatusSecretaria(predio.secretaria)  }}
                                    </v-chip>
                                  </td>
                                  <td class="text-center">
                                      <v-btn @click="openDialogNovoRelatorio(predio.id)" size="30" icon class="bg-primary mr-2">
                                          <v-avatar size="30" class="text-white">
                                              <PlusIcon size="20" />
                                          </v-avatar>
                                          <v-tooltip activator="parent" location="bottom">Novo Relatório</v-tooltip>
                                      </v-btn>

                                      <v-btn @click="openDialogRelatorios(predio.id)" size="30" icon class="bg-primary mr-2">
                                          <v-avatar size="30" class="text-white">
                                              <NotesIcon size="18" />
                                          </v-avatar>
                                          <v-tooltip activator="parent" location="bottom">Editar Relatórios</v-tooltip>
                                      </v-btn>
                                      
                                      <v-btn v-if="predio.status == 'L'" @click="openDialogGeradora(predio.id)" size="30" icon class="bg-warning mr-2">
                                          <v-avatar size="30" class="text-white">
                                              <BoltIcon size="18" />
                                          </v-avatar>
                                          <v-tooltip activator="parent" location="bottom">Adicionar Geradora</v-tooltip>
                                      </v-btn>

                                      <v-btn @click="openDialogEditUnidade(predio.id)" size="30" icon class="bg-secondary mr-2">
                                          <v-avatar size="30" class="text-white">
                                              <EditIcon size="18" />
                                          </v-avatar>
                                          <v-tooltip activator="parent" location="bottom">Editar Prédio</v-tooltip>
                                      </v-btn>

                                      <v-btn @click="openDialogExcluirUnidade(predio.id)"  size="30" icon class="bg-error mr-2">
                                          <v-avatar size="30" class="text-white">
                                              <TrashIcon size="18" />
                                          </v-avatar>
                                          <v-tooltip activator="parent" location="bottom">Excluir Prédio</v-tooltip>
                                      </v-btn>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                        </div>
                    </UiParentCard>
                </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
    </v-expansion-panels>
     
    <!--ADICIONAR PORCENTAM A UNIDADE-->
    <v-row justify="center">
    <v-dialog v-model="dialogGeradora" width="1024">
      <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">Adicionar Usina ao Prédio - Prédios Públicos</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
                <v-col v-if="showErrorAlertGeracao" cols="12">
                    <v-alert  type="error">
                        Error ao enviar Geradora!
                    </v-alert>
                </v-col>
                <v-col v-if="showErrorCampoGeracao" cols="12">
                    <v-alert  type="error">
                        Preencha todos os campos!
                    </v-alert>
                </v-col>
                <v-col v-if="showSuccessAlertGeracao" cols="12">
                    <v-alert type="success">
                        Geradora enviada com sucesso!
                    </v-alert>
                </v-col>
                <v-col cols="12">
                    <strong>UC:</strong> {{ ucUnidadeRela }}
                    <br>
                    <strong>UNIDADE:</strong> {{ nomeUnidadeRela }}
                </v-col>
                <v-divider></v-divider>
                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Usinas</v-label>
                    <select v-model="selectedUsina" class="custom-select">
                      <option disabled value="">Selecione...</option>
                      <option v-for="usina in usinas" :key="usina.id" :value="usina.id">
                          {{ usina.uc }} - {{ usina.nome }}
                      </option>
                    </select>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Porcentagem</v-label>
                    <v-text-field v-model="porcentagem" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="sendGeradora">
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </v-row>

    <v-row justify="center">
      <!-- Dialog -->
      <v-dialog v-model="dialogOpen" max-width="600"> 
        <v-card>
          <v-card-title>Porcentagens para o Prédio</v-card-title>
          <v-card-text>
            <v-expansion-panels>
              <!-- Painel para Porcentagens Ativas -->
              <v-expansion-panel class="mb-5">
                <v-expansion-panel-title>
                  Porcentagens Ativas
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-chip
                    v-for="(qtd, index) in porcentagensAtivas"
                    :key="index"
                    variant="flat"
                    class="mb-2 ml-2"
                    color="secondary"
                  >
                    <span
                      v-for="geradora in procurarGeradora(qtd.idGeradora)"
                      :key="geradora.id"
                    >
                      {{ geradora.uc }}
                    </span>
                    - {{ qtd.porcentagem }}%

                    <v-btn
                      @click="deletePorcetagem(qtd.id)"
                      size="20"
                      icon
                      class="bg-error ml-2"
                    >
                      <v-avatar size="20" class="text-white">
                        <XIcon size="15" />
                      </v-avatar>
                      <v-tooltip activator="parent" location="bottom">
                        Remover Geradora
                      </v-tooltip>
                    </v-btn>
                  </v-chip>
                </v-expansion-panel-text>
              </v-expansion-panel>
              
              <!-- Painel para Porcentagens Históricas -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  Porcentagens Históricas
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-chip
                    v-for="(qtd, index) in porcentagensHistoricas"
                    :key="index"
                    variant="flat"
                    class="mb-2 ml-2"
                    color="secondary"
                  >
                    <span
                      v-for="geradora in procurarGeradora(qtd.idGeradora)"
                      :key="geradora.id"
                    >
                      {{ geradora.uc }}
                    </span>
                    - {{ qtd.porcentagem }}% ({{ formatarData(qtd.data_inicio) }} - {{ formatarData(qtd.data_fim) }})
                  </v-chip>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn @click="dialogOpen = false" color="primary" text>
              Fechar
            </v-btn>
          </v-card-actions>
        </v-card>
        </v-dialog>
    </v-row>
    <!--ADICIONAR PRÉDIO PÚBLICO-->
    <v-row justify="center">
      <v-dialog v-model="dialogNovaUnidade" width="1024">
        <v-card>
          <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
            <span class="text-h5">Adicionar - Prédio Público</span>
          </v-card-title>
          <v-card-text>
            <v-container>
              <v-row>
                  <v-col v-if="showErrorCampoUnidade" cols="12">
                      <v-alert  type="error">
                          Preencha todos os campos!
                      </v-alert>
                  </v-col>
                  <v-col v-if="showSuccessAlertUnidade" cols="12">
                      <v-alert type="success">
                          Prédio adicionado com sucesso!
                      </v-alert>
                  </v-col>

                  <v-col cols="6">
                          <v-label class="font-weight-bold mb-1">UC</v-label>
                          <v-text-field v-model="ucUnidade" type="number" variant="outlined" hide-details color="primary" required></v-text-field>
                      </v-col>

                      <v-col cols="6">
                          <v-label class="font-weight-bold mb-1">Nome</v-label>
                          <v-text-field v-model="nomeUnidade" variant="outlined" hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="4">
                          <v-label class="font-weight-bold mb-1">Início</v-label>
                          <v-text-field v-model="dataInicioUnidade" variant="outlined" type="date"  hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="4">
                          <v-label class="font-weight-bold mb-1">Consumo (médio)</v-label>
                          <v-text-field v-model="consumoUnidade" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="4">
                          <v-label class="font-weight-bold mb-1">Valor kWh (R$)</v-label>
                          <v-text-field v-model="kwhUnidade" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="6">
                          <v-label class="font-weight-bold mb-1">Endereço</v-label>
                          <v-text-field v-model="enderecoUnidade" variant="outlined"  hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="6">
                          <v-label class="font-weight-bold mb-1">CEP</v-label>
                          <v-text-field v-model="cep" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="6">
                          <v-label class="font-weight-bold mb-1">Secretaria</v-label>
                          <v-radio-group v-model="secretaria" inline>
                              <v-radio label="Educação" value="E"></v-radio>
                              <v-radio label="Saúde" value="S"></v-radio>
                              <v-radio label="Outros" value="O"></v-radio>
                          </v-radio-group>
                      </v-col>

                      <v-col cols="6" >
                          <v-label class="font-weight-bold mb-1">Status</v-label>
                          <v-radio-group v-model="statusUnidade" inline>
                              <v-radio label="Ligado" value="L"></v-radio>
                              <v-radio label="Desligado" value="D"></v-radio>
                              <v-radio label="Manutenção" value="M"></v-radio>
                          </v-radio-group>
                      </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" variant="text" @click="sendUnidade">
              Enviar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-row>

    <!-- ADICIONAR RELATÓRIO AO PRÉDIO-->
    <v-row justify="center">
    <v-dialog v-model="dialogNovoRelatorio" width="1024">
      <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">Criar Relatório Mensal - Prédios Públicos</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
                <v-col v-if="showErrorAlertRelatorio" cols="12">
                    <v-alert  type="error">
                        Error ao enviar projeção!
                    </v-alert>
                </v-col>
                <v-col v-if="showErrorCampoRelatorio" cols="12">
                    <v-alert  type="error">
                        Preencha todos os campos!
                    </v-alert>
                </v-col>
                <v-col v-if="showErrorMesRelatorio" cols="12">
                    <v-alert  type="error">
                        Esse mês/ano já está preenchido!
                    </v-alert>
                </v-col>
                <v-col v-if="showSuccessAlertRelatorio" cols="12">
                    <v-alert type="success">
                            Relatório enviado com sucesso!
                        </v-alert>
                </v-col>
                <v-col cols="12">
                    <strong>UC:</strong> {{ ucUnidadeRela }}
                    <br>
                    <strong>UNIDADE:</strong> {{ nomeUnidadeRela }}
                </v-col>
                <v-divider></v-divider>
                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Mês</v-label>
                    <v-select v-model="mesRelUni" :items="meses" label="Mês" hide-details color="primary" required></v-select>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Ano</v-label>
                    <v-select v-model="anoRelUni" :items="anos" label="Ano" hide-details color="primary"></v-select>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Consumo (kWh)</v-label>
                    <v-text-field v-model="consumoUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Consumo (R$)</v-label>
                    <v-text-field v-model="valorConUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Ener. Inj-TUSD (kWh)</v-label>
                    <v-text-field v-model="enerTusdUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Valor (R$ - TUSD)</v-label>
                    <v-text-field v-model="valorTusdUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Ener. Inj-TE (kWh)</v-label>
                    <v-text-field v-model="enerTeUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Valor (R$ - TE)</v-label>
                    <v-text-field v-model="valorTeUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="sendRelatorioUni">
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </v-row>

    <!-- EDITAR PRÉDIO-->
    <v-row justify="center">
      <v-dialog v-model="dialogEditUnidade" width="1024">
        <v-card>
          <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
            <span class="text-h5">Editar - Prédios Públicos</span>
          </v-card-title>
          <v-card-text>
            <v-container>
              <v-row>
                  <v-col v-if="showErrorAlertUnidadeEdit" cols="12">
                      <v-alert  type="error">
                          Erro em editar unidade!
                      </v-alert>
                  </v-col>
                  <v-col v-if="showErrorCampoUnidadeEdit" cols="12">
                      <v-alert  type="error">
                          Preencha todos os campos!
                      </v-alert>
                  </v-col>
                  <v-col v-if="showSuccessAlertUnidadeEdit" cols="12">
                      <v-alert type="success">
                              Unidade editada com sucesso!
                          </v-alert>
                  </v-col>

                    <v-col cols="6">
                          <v-label class="font-weight-bold mb-1">UC</v-label>
                          <v-text-field v-model="ucUnidadeEdit" type="number" variant="outlined" hide-details color="primary" required></v-text-field>
                      </v-col>

                      <v-col cols="6">
                          <v-label class="font-weight-bold mb-1">Nome</v-label>
                          <v-text-field v-model="nomeUnidadeEdit" variant="outlined" hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="4">
                          <v-label class="font-weight-bold mb-1">Início</v-label>
                          <v-text-field v-model="dataInicioUnidadeEdit" variant="outlined" type="date"  hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="4">
                          <v-label class="font-weight-bold mb-1">Consumo (médio)</v-label>
                          <v-text-field v-model="consumoUnidadeEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="4">
                          <v-label class="font-weight-bold mb-1">Valor kWh (R$)</v-label>
                          <v-text-field v-model="kwhUnidadeEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="6">
                          <v-label class="font-weight-bold mb-1">Endereço</v-label>
                          <v-text-field v-model="enderecoUnidadeEdit" variant="outlined"  hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="6">
                          <v-label class="font-weight-bold mb-1">CEP</v-label>
                          <v-text-field v-model="cepEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                      </v-col>

                      <v-col cols="6">
                          <v-label class="font-weight-bold mb-1">Secretaria</v-label>
                          <v-radio-group v-model="secretariaEdit" inline>
                              <v-radio label="Educação" value="E"></v-radio>
                              <v-radio label="Saúde" value="S"></v-radio>
                              <v-radio label="Outros" value="O"></v-radio>
                          </v-radio-group>
                      </v-col>

                      <v-col cols="6" >
                          <v-label class="font-weight-bold mb-1">Status</v-label>
                          <v-radio-group v-model="statusUnidadeEdit" inline>
                              <v-radio label="Ligado" value="L"></v-radio>
                              <v-radio label="Desligado" value="D"></v-radio>
                              <v-radio label="Manutenção" value="M"></v-radio>
                          </v-radio-group>
                      </v-col>
              </v-row>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" variant="text" @click="editUnidade">
              Editar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-row>

    <!-- EXCLUIR PRÉDIO-->
    <div class="text-center">
        <v-dialog v-model="dialogExcluirUnidade"  width="auto">
            <v-card>
                <v-card-text v-if="showSuccessAlertUnidadeExcluida">
                   <v-alert type="success" title="Exclusão" text="Prédio excluído com sucesso!"></v-alert> 
                </v-card-text>

                <v-col v-if="showErrorAlertUnidadeExcluida" cols="12">
                    <v-alert  type="error">
                        Erro ao excluir prédio!
                    </v-alert>
                </v-col>
                
                <v-card-text v-if="!showSuccessAlertUnidadeExcluida">
                    <v-col cols="12">
                        Você tem certeza que deseja o prédio público?
                    </v-col>
                    <v-divider></v-divider>
                    <v-col>
                        <strong>UC: </strong> {{ ucUnidadeExcluir }}
                        <br>
                        <strong>NOME: </strong> {{ nomeUnidadeExcluir }}
                    </v-col>
                </v-card-text>
                <v-card-actions v-if="!showSuccessAlertUnidadeExcluida">
                        <v-btn color="error" block @click="deleteUnidade">Excluir</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>

    <!-- LISTAR RELATÓRIOS-->
    <v-row justify="center">
        <v-dialog v-model="dialogRelatorios" width="1024">
            <v-card>
              <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
                <span class="text-h5">Lista de relatórios</span>
            </v-card-title>
            <v-card-text>
                <v-row>
                    <v-col cols="6">
                        <strong>UC: </strong> {{ ucUnidadeRelatorio }}
                    </v-col>
                    <v-col cols="6">
                        <strong>Unidade: </strong> {{ nomeUnidadeRelatorio }}
                    </v-col>
                </v-row>
                <v-container>
                <v-table>
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Ano</th>
                        <th>Mês</th>
                        <th>Configurações</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="relatorio in relatoriosUnidade" :key="relatorio.id">
                        <td>{{ relatorio.id }}</td>
                        <td>{{ relatorio.ano }}</td>
                        <td>{{ relatorio.mes }}</td>
                        <td>
                        <v-btn class="mr-5" @click="openDialogRelatoriosEditar(relatorio.id)" icon>
                            <v-icon color="primary">mdi-pencil</v-icon>
                        </v-btn>
                        <v-btn @click="deleteRelatorio(relatorio.id)" icon>
                            <v-icon color="error">mdi-delete</v-icon>
                    </v-btn>
                    </td>
                </tr>
                </tbody>
            </v-table>
            </v-container>
        </v-card-text>
        </v-card>
    </v-dialog>
    </v-row>

    <!-- EDITAR RELATÓRIO SELECIONADO-->
    <v-row justify="center">
        <v-dialog v-model="dialogRelatoriosEditar" width="1024">
            <v-card>
              <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
                <span class="text-h5">Editando Relatório</span>
            </v-card-title>
                <v-card-text>
                    <v-container>
                        <v-row>
                            <strong>ID: </strong> {{ idRelaEdit }}
                            <br><br>
                            <v-divider></v-divider>
                            <br>
                        </v-row>
                        <v-row>
                          <v-col v-if="showErrorAlertEdit" cols="12">
                              <v-alert  type="error">
                                  Erro em editar relatório!
                              </v-alert>
                          </v-col>
                          <v-col v-if="showErrorCampoEdit" cols="12">
                              <v-alert  type="error">
                                  Preencha todos os campos!
                              </v-alert>
                          </v-col>
                          <v-col v-if="showSuccessAlertEdit" cols="12">
                              <v-alert type="success">
                                      Relatório editado com sucesso!
                                  </v-alert>
                          </v-col>
                        </v-row>
                        <v-row>
                            <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Mês</v-label>
                            <v-select v-model="mesRelUniEdit" :items="meses" label="Mês" hide-details color="primary" disabled ></v-select>
                            </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Ano</v-label>
                            <v-select v-model="anoRelUniEdit" :items="anos" label="Ano" hide-details color="primary" disabled></v-select>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Consumo (kWh)</v-label>
                            <v-text-field v-model="consumoUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Consumo (R$)</v-label>
                            <v-text-field v-model="valorConUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Ener. Inj-TUSD (kWh)</v-label>
                            <v-text-field v-model="enerTusdUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Valor (R$ - TUSD)</v-label>
                            <v-text-field v-model="valorTusdUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Ener. Inj-TE (kWh)</v-label>
                            <v-text-field v-model="enerTeUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Valor (R$ - TE)</v-label>
                            <v-text-field v-model="valorTeUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>
                        </v-row>
                    </v-container>
                </v-card-text>
                <v-card-actions>
                            <v-btn color="primary" block @click="saveChangesRelatorio(idRelaEdit)">Editar</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-row>

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