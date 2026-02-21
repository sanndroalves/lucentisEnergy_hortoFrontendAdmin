<script setup>
  import { useHead } from '@vueuse/head';
  import { nextTick, ref, onMounted } from 'vue';
  import UiParentCard from '@/components/shared/UiParentCard.vue';
  import { API_BASE_URL } from '~/base/link';

  // Definindo o título da página
  useHead({
    title: 'Lista de Rateio'
  });

  // Definindo o middleware para a página
  definePageMeta({
    middleware: 'sidebase-auth'
  })

  // Definindo variáveis reativas
  const consumoMedio = ref(null);
  const usinas = ref([]);
  const unidades = ref([]);
  const unidadesCompensadas = ref([]);
  const projecaoFiltrada = ref([]);
  const totalProjetado = ref(0);
  const somaProjecao = ref("");
  const calculoPosAutoConsumo = ref(0);
  const creditoParaInjecao = ref(0); 

  const mesAtual = new Date().getMonth() + 1;  
  const anoAtual = mesAtual === 1 ? new Date().getFullYear() -1 : new Date().getFullYear();

  // Função para buscar dados das usinas e unidades
  const fetchData = async () => {
    const { data: fetchedUsinas } = await useFetch(`${API_BASE_URL}/usina/`);
    const { data: fetchedUnidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao`);
    const { data: fetchedProjecao } = await useFetch(`${API_BASE_URL}/projecaogeracao`);
    
    usinas.value = fetchedUsinas.value.filter(usina => usina.id !== 19 && usina.id !== 20);
    unidades.value = fetchedUnidades.value 
    unidadesCompensadas.value = fetchedUnidades.value.filter(item => item.status == 'L')
    projecaoFiltrada.value = fetchedProjecao.value.filter(item => item.ano === anoAtual && item.idGeradora !== 19 && item.idGeradora !== 20);
     
  };

  // Função para calcular o consumo médio
  const buscarConsumoMedio = () => {
    usinas.value.forEach(usina => {
      const unidadeCorrespondente = unidades.value.filter(unidade => unidade.uc === usina.uc)[0];
      if (unidadeCorrespondente) {
        consumoMedio.value += unidadeCorrespondente.mediaConsumo;
      }
    });

    consumoMedio.value = (consumoMedio.value * 12)
  };

  // Função para somar projeções individuais por ano
  const somarIndividualProjecao = async (anoId, idGeradoraRemovida) => {

    // Se um idGeradora for removido, filtramos novamente
    if (idGeradoraRemovida != null) {
      projecaoFiltrada.value = projecaoFiltrada.value.filter(item => item.idGeradora !== idGeradoraRemovida);
    }

    const totalPorMes = projecaoFiltrada.value.reduce((acumulador, item) => {
      const mesAtual = item.mes;
      acumulador[mesAtual] = parseFloat(((acumulador[mesAtual] || 0) + Number(item.projecao)).toFixed(2));
      return acumulador;
    }, {});

    return totalPorMes;
  };
 

  // Função para calcular o total projetado
  const calcularTotalProjetado = async (idGeradoraRemovida) => {
    somaProjecao.value = await somarIndividualProjecao(anoAtual, idGeradoraRemovida);
    const valoresProjetado = Object.values(somaProjecao.value);
    totalProjetado.value = parseFloat(valoresProjetado.reduce((total, valor) => total + valor, 0).toFixed(2));
  }; 

  // Função para calcular os valores finais
  const calcularValoresFinais = () => {
    calculoPosAutoConsumo.value = (totalProjetado.value - consumoMedio.value).toFixed(2);
    creditoParaInjecao.value = ((totalProjetado.value - consumoMedio.value) / 12).toFixed(2);
  };

  //Função para remover usina da lista de rateio
  const removerUsina = async (id)  =>{
    consumoMedio.value = 0
    totalProjetado.value = 0
    calculoPosAutoConsumo.value = 0
    creditoParaInjecao.value = 0

    usinas.value = usinas.value.filter(usina => usina.id !== id);
    buscarConsumoMedio();
    await calcularTotalProjetado(id);
    calcularValoresFinais();
  }
 
  // Chamadas no ciclo de vida
  onMounted(async () => {
    await fetchData();  // Buscar dados das usinas e unidades
    buscarConsumoMedio();  // Calcular consumo médio
    await calcularTotalProjetado(null);  // Calcular total projetado
    calcularValoresFinais();  // Calcular valores finais
    calcularMediaConsumo();
  });

  const unidadesComMediaConsumo = ref([]);
  const calcularMediaConsumo = async () => { 
    const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`);
    
    for (const unidade of unidadesCompensadas.value) {  
      const relatoriosDaUnidade = relatorios.value.filter(item => item.idUnidadeCompensa === unidade.id);

      if (relatoriosDaUnidade.length > 0) {
        // Ordenar por ano e mês (mais recente primeiro)
        const relatoriosOrdenados = relatoriosDaUnidade.sort((a, b) => {
          if (b.ano === a.ano) {
            return b.mes - a.mes; // Meses do mesmo ano: mais recente primeiro
          }
          return b.ano - a.ano; // Anos diferentes: mais recente primeiro
        });

        // Selecionar os 6 últimos registros
        const ultimos6Relatorios = relatoriosOrdenados.slice(0, 6);

        // Calcular a média do consumo
        const somaConsumo = ultimos6Relatorios.reduce((soma, item) => soma + parseFloat(item.consumokWh || 0), 0);
        const mediaConsumo = somaConsumo / ultimos6Relatorios.length; 
        unidade.mediaConsumo = mediaConsumo.toFixed(2);

        // Verificar os últimos 3 relatórios para saldoEnergia
        const ultimos3Relatorios = relatoriosOrdenados.slice(0, 3); // Pega os últimos 3
        const saldoEnergiaPreenchido = ultimos3Relatorios.every(item => parseFloat(item.saldoEnergia || 0) !== 0);
        const saldoEnergiaStatus = saldoEnergiaPreenchido ? "True" : "False";

        // Adicionar unidade com a média calculada e status de saldoEnergia
        unidadesComMediaConsumo.value.push({
          uc: unidade.uc,
          nome: unidade.nome,
          mediaConsumo: unidade.mediaConsumo,
          saldoEnergia: saldoEnergiaStatus,
        });
      } else {
        // Caso não haja relatórios, definir mediaConsumo como 0
        unidade.mediaConsumo = 0;

        // Adicionar unidade com saldoEnergia como "NÃO"
        unidadesComMediaConsumo.value.push({
          uc: unidade.uc,
          nome: unidade.nome,
          mediaConsumo: unidade.mediaConsumo,
          saldoEnergia: "False",
        });
      }
    } 

    // Ordenar unidades pela média de consumo, do maior para o menor
    unidadesComMediaConsumo.value.sort((a, b) => b.mediaConsumo - a.mediaConsumo);
  };
  
//VEFICIAR SE TEM SALDO
const verificarSaldoEnergia = () => {
  return unidadesComMediaConsumo.value.some(unidade => unidade.saldoEnergia === "True");
};
 
// CALCULAR LIST DE RATEIO
const unidadesListaDeRateio = ref([]);

const calcularRateio = (creditoParaInjecao) => {
  let creditoRestante = creditoParaInjecao;

  unidadesListaDeRateio.value = unidadesComMediaConsumo.value
    .filter(unidade => unidade.mediaConsumo >= 200) // Apenas prédios com consumo médio acima de 200 kWh
    .map(unidade => {
      let injetar = 0;

      if (unidade.mediaConsumo > 2000) {
        injetar = unidade.mediaConsumo - 1000;
      } else if (unidade.mediaConsumo > 1300) {
        injetar = 1200;
      } else if (unidade.mediaConsumo > 1000) {
        injetar = 1000;
      } else if (unidade.mediaConsumo > 700) {
        injetar = 500;
      } else if (unidade.mediaConsumo > 400) {
        injetar = 300;
      } else if (unidade.mediaConsumo > 300) {
        injetar = 200;
      } else if (unidade.mediaConsumo > 200) {
        injetar = 100;
      }

      if (injetar > creditoRestante) {
        injetar = creditoRestante; // Limita a injeção ao crédito restante
      }

      const porcentagemInjetada = ((injetar / creditoParaInjecao) * 100).toFixed(2); // Porcentagem do total de crédito

      creditoRestante -= injetar; // Subtrai o valor injetado do crédito restante

      return {
        uc: unidade.uc,
        nome: unidade.nome,
        mediaConsumo: unidade.mediaConsumo,
        injetado: injetar,
        porcentagemInjetada,
        creditoRestante: creditoRestante.toFixed(2),
      };
    })
    .filter(unidade => unidade.injetado > 0); // Apenas unidades que receberam injeção
 
};
 

import * as XLSX from "xlsx";

// Função para exportar a lista de rateio para Excel
// const exportarParaExcel = () => {
//   if (unidadesListaDeRateio.value.length === 0) {
//     console.warn("Nenhum dado disponível para exportar.");
//     return;
//   }

//   // Preparar os dados para a planilha
//   const dados = unidadesListaDeRateio.value.map(unidade => ({
//     UC: unidade.uc,
//     Nome: unidade.nome,
//     "Consumo Médio (kWh)": unidade.mediaConsumo,
//     "Energia Injetada (kWh)": unidade.injetado,
//     "Porcentagem Injetada (%)": unidade.porcentagemInjetada,
//     "Crédito Restante (kWh)": unidade.creditoRestante,
//   }));

//   // Criar uma nova planilha
//   const worksheet = XLSX.utils.json_to_sheet(dados);
//   const workbook = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(workbook, worksheet, "Rateio");

//   // Salvar o arquivo como Excel
//   XLSX.writeFile(workbook, "Rateio.xlsx");
// };
const exportarParaExcel = () => {
  if (unidadesListaDeRateio.value.length === 0) {
    console.warn("Nenhum dado disponível para exportar.");
    return;
  }

  // Preparar os dados para a planilha
  const dados = unidadesComMediaConsumo.value.map(unidade => ({
    UC: unidade.uc,
    Nome: unidade.nome,
    "Consumo Médio (kWh)": unidade.mediaConsumo, 
    "Saldo": unidade.saldoEnergia
  }));

  // Criar uma nova planilha
  const worksheet = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rateio");

  // Salvar o arquivo como Excel
  XLSX.writeFile(workbook, "Rateio.xlsx");
};
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
              <h3 class="text-h3 mb-2">Lista de Rateio</h3>
              <ul
                class="v-breadcrumbs v-breadcrumbs--density-default text-h6 font-weight-medium pa-0 ml-n1"
              >
                <!---->
                <li class="v-breadcrumbs-item" text="Dashboard">
                  <a class="v-breadcrumbs-item--link" href="/" style="text-decoration:none"
                    ><h6 class="text-medium-emphasis text-subtitle-1">
                      Unidades
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
                  <h6 class="text-medium-emphasis text-subtitle-1">Lista de Rateio</h6>
                </li>
                <!----><!---->
              </ul>
            </div>
          </div>
          <div class="d-none py-0 d-lg-block overflow-hidden">
            <div class="mb-n16 mt-3">
              <img src="https://i.imgur.com/QYFVuX6.png" height="200" alt="breadcrumbw" />
            </div>
          </div>
        </div>
      </div>
    </div>
    </v-row>
   
    <!-- TABELAS -->
    <v-row>
        <v-col cols="12" md="12">
            <UiParentCard title="Configurações e Dados de Rateio"> 
                <div class="pa-7 pt-1"> 

                  <!-- LISTA DE USINAS PARA RATEIO -->
                  <v-row class="mb-10">
                    <v-expansion-panels> 
                      <v-expansion-panel>
                        <v-expansion-panel-title class="text-center">
                          <div class="d-flex flex-column align-items-start">
                            <div class="d-flex align-items-center">
                              <v-avatar class="bg-lightsuccess text-success" size="40">
                                <BoltIcon size="30" />
                              </v-avatar>
                              <b style="font-size: 18px; margin: 10px;">Usinas para Rateio</b>  
                            </div> 
                          </div>
                        </v-expansion-panel-title>
                        

                        <v-expansion-panel-text>
                          <v-chip v-for="usina in usinas" :key="usina.uc" class="ma-1"> 
                              {{ usina.uc + '-' + usina.nome }}
                              <v-btn @click="removerUsina(usina.id)" size="20" icon class="bg-error ml-2">
                                <v-avatar size="20" class="text-white">
                                  <XIcon size="15" />
                                </v-avatar>
                                <v-tooltip activator="parent" location="bottom">Remover Geradora</v-tooltip>
                              </v-btn> 
                          </v-chip>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>

                  </v-row>
                  
                  <!-- VALORES PARA RATEIO TABELA -->
                  <v-row justify="space-around" >
                      <v-table>
                        <thead>
                            <tr> 
                              <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Consumo Usinas <br><span style="font-size: 12px;">kWh/Ano</span></th>
                              <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Geração Usinas <br><span style="font-size: 12px;">kWh/Ano</span></th> 
                              <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Pós AutoConsumo <br><span style="font-size: 12px;">kWh/Ano</span></th> 
                              <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Créditos Para Injeção<br><span style="font-size: 12px;">kWh/Mensal</span></th> 
                            </tr>
                            <tr>
                              <td class="text-center" style="border: 1px solid #4d7fff">{{ consumoMedio  }}</td>
                              <td class="text-center" style="border: 1px solid #4d7fff">{{ totalProjetado }}</td>
                              <td class="text-center" style="border: 1px solid #4d7fff">{{ calculoPosAutoConsumo }}</td>
                              <td class="text-center" style="border: 1px solid #4d7fff">{{ creditoParaInjecao }}</td>
                            </tr>
                          </thead>
                      </v-table>
                    </v-row>  
                    <v-row class="mt-10" justify="space-around">
                    <div>
                      <b>Unidades com Saldo:</b> 
                      <span v-if="!verificarSaldoEnergia()" class="ml-5" style="color: red;"><b>NÃO HÁ UNIDADES COM SALDO</b></span>
                      <span v-else class="ml-5" style="color: green;"><b>UNIDADES COM SALDO</b></span>
                    </div>
                    </v-row>
                    <v-row class="mt-10" justify="space-around">
                      <v-btn v-if="verificarSaldoEnergia()"  @click="calcularRateio(creditoParaInjecao);" class="bg-success text-white">
                        Calcular Lista
                      </v-btn>
                      <v-btn v-if="verificarSaldoEnergia() && unidadesListaDeRateio.length > 0" @click="exportarParaExcel()" class="bg-primary text-white">
                        Exportar para Excel
                      </v-btn>
                    </v-row>
                </div>  
                <br>
                
            </UiParentCard>
        </v-col>
    </v-row>
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
  }

  .header-cell { 
  padding: 8px;
  background: linear-gradient(to bottom, #4d7fff, #1e73be);
  color: white;
  font-weight: bold; 
  font-size: 17px; 
  padding: 20px;
}

  .footer {
  text-align: center;
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  margin: auto;
  font-size: 12px;
  color: #000;
}
</style>
