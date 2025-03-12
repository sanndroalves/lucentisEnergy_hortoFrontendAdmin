<script setup>

    import UiParentCard from '@/components/shared/UiParentCard.vue'; 
    import { API_BASE_URL } from '~/base/link';
    
    const { data } = useAuth()
    const idUsuario = ref(JSON.stringify(data.value.id))

    const idSolicitacao = ref('-')
    const btnSolicita = ref(true) 
    const { data: dadosDownload } = await useFetch(`${API_BASE_URL}/logdownloadpdf/`);

    
    
    //SE TIVER ALGUMA SOLICITAÇÃO EM ANDAMENTO, MOSTRA OS DADOS DELA
    const { data: solicitacoes } = await useFetch(`${API_BASE_URL}/logsolicitacao/`); 

    const verificarSoli = ref()   
    const btnS = ref(true) //varia´vel para a div dos botoes solicitções

    const showAlertSuccessDownload = ref(false)

    const verSolicitacao = async () =>{
        verificarSoli.value = solicitacoes.value.filter(item => item.status === 'P') 

        if(verificarSoli.value.length > 0){
                idSolicitacao.value = verificarSoli.value[0].id
                btnSolicita.value = false

                const { data: updtDownload } = await useFetch(`${API_BASE_URL}/logdownloadpdf?idSolicitacao=${idSolicitacao.value}`);
                dadosDownload.value = updtDownload._rawValue

        }else{
            btnSolicita.value = true
            idSolicitacao.value = '-'   
        }
    }

    /* SOLICITAÇÕES */
    const showAlertError = ref(false)
    const showAlertSuccess = ref(false)
     
    const gerarSolicitação = async () =>{
        try {
            const response = await useFetch(`${API_BASE_URL}/logsolicitacao/`, {
                    method: 'POST',
                    body: 
                        {
                            userFK: idUsuario.value,
                            status: 'P',
                            categoria: 'P'
                        },
                    key: 'solicitaoPUT'
                }); 

            if(!response.error.value){
                btnSolicita.value = false

                showAlertSuccess.value = true
                showAlertError.value = false
                showAlertCanceled.value = false
                
                idSolicitacao.value = response.data._rawValue.id
                setTimeout(() => {
                    showAlertSuccess.value = false
                }, 4000);

            }else{
                showAlertSuccess.value = true
                showAlertError.value = false
                showAlertCanceled.value = false
            }

        } catch (error) {
            showAlertSuccess.value = false
            showAlertError.value = true
            showAlertCanceled.value = false
        }
        
    }

    const showAlertCanceled = ref(false)

    const cancelarSolicitação = async () =>{
        try {
            const response = await useFetch(`${API_BASE_URL}/logsolicitacao/${idSolicitacao.value}`, {
                    method: 'PUT',
                    body: 
                        {
                            userFK: idUsuario.value,
                            status: 'CA',
                            categoria: 'P'
                        },
                    key: 'solicitaoPUT'
                }); 

            if(!response.error.value){
                showAlertCanceled.value = true
                btnSolicita.value = true
                showAlertSuccess.value = false
                showAlertError.value = false
                
                idSolicitacao.value = '-'
                setTimeout(() => {
                    showAlertSuccess.value = false
                }, 4000);

            }else{
                showAlertSuccess.value = false
                showAlertError.value = true
                showAlertCanceled.value = false
            }

        } catch (error) {
            showAlertSuccess.value = false
            showAlertError.value = true
            showAlertCanceled.value = false
        }
    }

    /* ELEMENTOS DA TABELA */

    // DADOS SELECT SOLICITA TABELA E ATUALIZAR SISTEMA
    const soliciSelected = ref()
    const atualizarDownloads = async ()=>{
        const { data: uptedDownload } = await useFetch(`${API_BASE_URL}/logdownloadpdf/`);
        dadosDownload.value = uptedDownload._rawValue

        const { data: uptedSolicitacao } = await useFetch(`${API_BASE_URL}/logsolicitacao?statusSoli=P`);
        solicitacoes.value = uptedSolicitacao._rawValue
    }

    // Configuração para buscar dados a cada 2 segundos
    const intervalId = setInterval(() => {
        atualizarDownloads();
        verSolicitacao();
    }, 2000);

    // Garantir que o intervalo seja limpo quando o componente for desmontado
    onUnmounted(() => {
        clearInterval(intervalId);
    });


    /* DADOS DA TABELA */
    const procurarSolicita = (idSolicitacao) =>{
            const filtro = dadosDownload.value.filter(item => item.idSolicitacao === idSolicitacao)
            
            return filtro
    }
    //LISTA DE SOLICITAÇÕES PARA O V-SELECT
    const arraySolici = ref([])
    for(const solicita of solicitacoes.value){
        arraySolici.value.push(solicita.id)
    }
 
    //PROCURAR UNIDADE POR ID SELECIONADO
    const { data: unidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao/`);
    const procurarUnidade = (idUnidade) =>{
        const unidadeEncontrada = unidades.value.filter(item => item.id == idUnidade) 
        return unidadeEncontrada[0].nome
    }

    // TEXTO V-CHIP
    const getStatusLabel = (status) => {
        switch (status) {
            case true:
                return "Realizado";
            case false:
                return "Processando"; 
            default:
                return "Error";
        }
    };

    //COLOR V-CHIP
    const getStatusColorClass = (status) => {
        const colorMap = {
            true: "success",
            false: "warning", 
        };

        return colorMap[status] || "error";
    };
</script>

<template>
     
    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-title>Verificar solicitações</v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row>
                <v-col cols="12" md="12">
                    <UiParentCard elevation="11" title="Automatização de contas"> 
                        <div class="pa-7 pt-1">
                          <v-row justify="space-around" class="mb-2">
                            <v-col cols="auto">
                              <div v-if="btnS" class="text-center "> 
                                <v-btn v-if="btnSolicita" class="bg-primary" @click="gerarSolicitação">
                                  Nova Solicitação
                                </v-btn> 
                                <v-btn v-if="!btnSolicita" class="bg-warning" @click="cancelarSolicitação">
                                  Cancelar Solicitação
                                </v-btn>
                              </div>   
                            </v-col>
                            <v-col v-if="showAlertError" cols="12">
                                <v-alert  type="error">
                                    Erro ao iniciar automatização.
                                </v-alert>
                            </v-col>
                            <v-col v-if="showAlertSuccess" cols="12">
                                <v-alert type="success">
                                   Solicitação iniciada...
                                </v-alert>
                            </v-col>
                            <v-col v-if="showAlertSuccessDownload" cols="12">
                                <v-alert type="success">
                                  Solicatação concluída com sucesso!
                                </v-alert>
                            </v-col>
                            <v-col v-if="showAlertCanceled" cols="12">
                                <v-alert type="warning">
                                  Solicatação cancelada com sucesso!
                                </v-alert>
                            </v-col>
                          </v-row>
                          <v-row>
                            <v-col cols="12">

                            </v-col> 
                            <v-table class="table" style="width: 100vw;">
                                <thead>
                                    <tr>
                                        <th colspan="4" style="font-size: 17px; text-align: center;">Solicitação ID:</th>
                                        <th colspan="3" v-if="idSolicitacao !== '-'">{{ idSolicitacao }}</th>
                                        <th colspan="3" v-else style="padding: 10px;">
                                            <v-select v-model="soliciSelected" :items="arraySolici"  label="Solicitações"  return-object color="primary"></v-select>
                                        </th>
                                    </tr>
                                    <tr>
                                    <th class="header-cell">ID</th>
                                    <th class="header-cell">Local</th>
                                    <th class="header-cell">Mês</th>
                                    <th class="header-cell">Ano</th>
                                    <th class="header-cell">Solicitação</th>
                                    <th class="header-cell">Download</th>
                                    <th class="header-cell">Leitura</th>
                                    </tr>
                                </thead>
                                <tbody> 
                                    <tr v-for="pdf in procurarSolicita(idSolicitacao !== '-' ? idSolicitacao : soliciSelected )" :key="pdf.id" class="text-center">
                                        <td>{{ pdf.id }}</td>
                                        <td>{{ procurarUnidade(pdf.idUnidadeCompensada) }}</td>
                                        <td>{{ pdf.mes }}</td>
                                        <td>{{ pdf.ano }}</td>
                                        <td>{{ pdf.idSolicitacao }}</td>
                                        <td>
                                            <v-chip variant="flat" :color="getStatusColorClass(pdf.download)" text>
                                                {{ getStatusLabel(pdf.download)  }}
                                            </v-chip>
                                        </td> 
                                        <td>
                                            <v-chip variant="flat" :color="getStatusColorClass(pdf.leitura)" text>
                                                {{ getStatusLabel(pdf.leitura)  }}
                                            </v-chip>
                                        </td> 
                                    </tr>
                                </tbody>
                            </v-table>    
                             
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
  font-size: 18px;
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