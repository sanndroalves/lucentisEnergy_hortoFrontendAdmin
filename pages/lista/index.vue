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


  //GETs
  
  const usinas = ref([]);
  const unidades = ref([]); 
  const prediosRateio = ref([]);
  const iluminacaoRateio = ref([]);
  const projecaoFiltrada = ref([]); 
  const porcentagens = ref([]);

  const mesAtual = new Date().getMonth() + 1;  
  const anoAtual = mesAtual === 1 ? new Date().getFullYear() -1 : new Date().getFullYear();

  const projecaoJac1 = ref([]);

  const unidadesCompensadas = ref([]);

  // Função para buscar dados das usinas e unidades
  const fetchData = async () => {
    const { data: fetchedUsinas } = await useFetch(`${API_BASE_URL}/usina/`);
    const { data: fetchedUnidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao`);
    const { data: fetchedProjecao } = await useFetch(`${API_BASE_URL}/projecaogeracao`);
    const { data: fetchedPorcentagens } = await useFetch(`${API_BASE_URL}/porcentagem/`);
    
    //RETIRANDO O UPA E O HOSPITAL E JAC1 DAS USINAS E PROJEÇÃO
    usinas.value = fetchedUsinas.value.filter(usina => usina.id !== 19 && usina.id !== 20 && usina.id !== 22);
    unidades.value = fetchedUnidades.value  
    projecaoFiltrada.value = fetchedProjecao.value.filter(item => item.ano === anoAtual && item.idGeradora !== 19 && item.idGeradora !== 20 && item.idGeradora !== 22);
    projecaoJac1.value = fetchedProjecao.value.filter(item => item.ano === anoAtual && item.idGeradora === 22);
    porcentagens.value = fetchedPorcentagens.value

    // FILTRANDO UNIDADES (apenas status L)
    const unidadesAtivas = fetchedUnidades.value.filter(u => u.status === 'L');

    // SEPARANDO POR SECRETARIA
    prediosRateio.value = unidadesAtivas.filter(u => ['E', 'S', 'O'].includes(u.secretaria));
    iluminacaoRateio.value = unidadesAtivas.filter(u => ['I', 'P'].includes(u.secretaria));


    unidadesCompensadas.value = prediosRateio.value 
    

  };
 

  /* AMBIENTE DE DADOS DAS USINAS sem upa, hospital e jac1 */
  const consumoMedioUsinas = ref(0);
  const totalProjetado = ref(0);
  const somaProjecao = ref("");

  const calculoPosAutoConsumo = ref(0);
  const creditoParaInjecao = ref(0); 

  const totalProjetadoJac1 = ref(0);
  const creditoParaInjecaoJac1 = ref(0);

  // CALCULAR CONSUMO MÉDIO DAS USINAS
  const buscarConsumoMedioUsinas = () => {
    usinas.value.forEach(usina => {
    const unidade = unidades.value.find(u => u.uc == usina.uc); 
      if (unidade) { 
        consumoMedioUsinas.value += Number(unidade.mediaConsumo);
      }
    });

    // Transforma para consumo anual (multiplicando por 12)
    consumoMedioUsinas.value = parseFloat((consumoMedioUsinas.value * 12).toFixed(2));
 
  };

  // CALCULAR PROJEÇÃO TOTAL (INDIVIDUAL + GERAL)
  const calcularProjecaoTotalUsinas = async () => {
    // 17 usinas e Paço Municipal
    // Soma individual por mês
    somaProjecao.value = projecaoFiltrada.value.reduce((acumulador, item) => {
      const mes = item.mes;
      acumulador[mes] = parseFloat(((acumulador[mes] || 0) + Number(item.projecao)).toFixed(2));
      return acumulador;
    }, {});

    // Soma total geral
    const valores = Object.values(somaProjecao.value);
    totalProjetado.value = parseFloat(valores.reduce((total, valor) => total + valor, 0).toFixed(2));

    // Incluindo a projeção do Jac1
    const somaJac1 = projecaoJac1.value.reduce((total, item) => total + Number(item.projecao), 0);
    totalProjetadoJac1.value += parseFloat(somaJac1.toFixed(2)); 
  };

  // CALCULO VALORES FINAIS EXPOSTOS
  const calcularValoresFinais = () => {
    calculoPosAutoConsumo.value = (totalProjetado.value - consumoMedioUsinas.value).toFixed(2);
    creditoParaInjecao.value = ((totalProjetado.value - consumoMedioUsinas.value) / 12).toFixed(2);

    creditoParaInjecaoJac1.value = ((totalProjetadoJac1.value / 12).toFixed(2));
  };
  
  // Função para inicializar os dados ao montar o componente 
  onMounted(async () => {
    await fetchData();  // Buscar dados das usinas e unidades
    buscarConsumoMedioUsinas();  // Calcular consumo médio
    await calcularProjecaoTotalUsinas();  // Calcular total projetado
    calcularValoresFinais();  // Calcular valores finais 
    await calcularMediaConsumo();  // Calcular média de consumo para unidades
    somarMediaConsumoGrupos();  // Somar médias de consumo por grupo
  });


  /* AMBIENTE DAS UNIDADES GERAIS */ 
  const unidadesComMediaConsumoPredios = ref([]);
  const unidadesComMediaConsumoIluminacao = ref([]);

  // CALCULAR MÉDIA DE CONSUMO (para prédios e iluminação separadamente)
  const calcularMediaConsumo = async () => { 
    const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`);

    // Função auxiliar para calcular a média de uma lista específica
    const calcularParaGrupo = (unidadesGrupo, destino) => {
      destino.value = []; // zera antes de recalcular

      for (const unidade of unidadesGrupo) {  
        const relatoriosDaUnidade = relatorios.value.filter(item => item.idUnidadeCompensa === unidade.id);

        if (relatoriosDaUnidade.length > 0) {
          // Ordenar relatórios (mais recentes primeiro)
          const relatoriosOrdenados = relatoriosDaUnidade.sort((a, b) => {
            if (b.ano === a.ano) return b.mes - a.mes;
            return b.ano - a.ano;
          });

          // Últimos 6 relatórios → média de consumo
          const ultimos6 = relatoriosOrdenados.slice(0, 6);
          const somaConsumo = ultimos6.reduce((soma, item) => soma + parseFloat(item.consumokWh || 0), 0);
          const mediaConsumo = somaConsumo / ultimos6.length; 
          unidade.mediaConsumo = parseFloat(mediaConsumo.toFixed(2));

          // Últimos 3 relatórios → verificar saldoEnergia
          const ultimos3 = relatoriosOrdenados.slice(0, 3);
          const saldoEnergiaPreenchido = ultimos3.every(item => parseFloat(item.saldoEnergia || 0) !== 0);
          const saldoEnergiaStatus = saldoEnergiaPreenchido ? "True" : "False";

          // Adiciona ao grupo
          destino.value.push({
            uc: unidade.uc,
            nome: unidade.nome,
            mediaConsumo: unidade.mediaConsumo,
            saldoEnergia: saldoEnergiaStatus,
          });
        } else {
          unidade.mediaConsumo = 0;
          destino.value.push({
            uc: unidade.uc,
            nome: unidade.nome,
            mediaConsumo: 0,
            saldoEnergia: "False",
          });
        }
      }

      // Ordenar por consumo (maior → menor)
      destino.value.sort((a, b) => b.mediaConsumo - a.mediaConsumo);
    };

    // Rodar o cálculo para cada grupo
    calcularParaGrupo(prediosRateio.value, unidadesComMediaConsumoPredios);
    calcularParaGrupo(iluminacaoRateio.value, unidadesComMediaConsumoIluminacao);
  };

  // CALCULAR MÉDIA DE CONSUMO POR GRUPO
  const somaPredios = ref(0);
  const somaIluminacao = ref(0);

  const somarMediaConsumoGrupos = () => {
    somaPredios.value = unidadesComMediaConsumoPredios.value.reduce(
      (total, item) => total + parseFloat(item.mediaConsumo || 0),
      0
    );

    somaIluminacao.value = unidadesComMediaConsumoIluminacao.value.reduce(
      (total, item) => total + parseFloat(item.mediaConsumo || 0),
      0
    );

    somaPredios.value = parseFloat(somaPredios.value.toFixed(2));
    somaIluminacao.value = parseFloat(somaIluminacao.value.toFixed(2));
  };

  /* CALCULOS PARA RATEIO */
  // ARRAYS DE RESULTADO
  const unidadesRateioPredios = ref([]);
  const unidadesRateioIluminacao = ref([]);
  const unidadesRateioRestantes = ref([]);

  // Função genérica de rateio (reutilizável)
  const calcularRateioGrupo = (
    unidades,
    creditoDisponivel,
    creditoBasePercentual = null
  ) => {
    let creditoRestante = creditoDisponivel;

    // Se não passar base percentual, usa o próprio crédito
    const basePercentual = creditoBasePercentual ?? creditoDisponivel;

    const unidadesValidas = unidades
      .filter(u => u.mediaConsumo > 200)
      .sort((a, b) => b.mediaConsumo - a.mediaConsumo);

    const resultado = [];
    const naoContempladas = [];

    for (const unidade of unidadesValidas) {
      let injetar = 0;

      if (creditoRestante >= unidade.mediaConsumo) {
        injetar = unidade.mediaConsumo;
        creditoRestante -= injetar;
      } else if (creditoRestante > 0) {
        injetar = creditoRestante;
        creditoRestante = 0;
      }

      if (injetar > 0) {
        const porcentagemInjetada = (
          (injetar / basePercentual) * 100
        ).toFixed(2);

        resultado.push({
          uc: unidade.uc,
          nome: unidade.nome,
          mediaConsumo: parseFloat(unidade.mediaConsumo),
          injetado: parseFloat(injetar.toFixed(2)),
          "%": porcentagemInjetada,
          creditoRestante: parseFloat(creditoRestante.toFixed(2)),
        });
      }

      if (injetar === 0) {
        naoContempladas.push(unidade);
      }
    }

    return { resultado, naoContempladas };
  };

  // Função 1 → Rateio principal dos prédios
  const calcularRateioPredios = (creditoParaInjecao) => {
    const { resultado, naoContempladas } = calcularRateioGrupo(
      unidadesComMediaConsumoPredios.value,
      creditoParaInjecao
    );

    unidadesRateioPredios.value = resultado;
    return naoContempladas;
  };

  // Função 2 → Rateio da iluminação (50% do Jac1)
  const calcularRateioIluminacao = (creditoParaInjecaoJac1) => {
    const { resultado } = calcularRateioGrupo(
      unidadesComMediaConsumoIluminacao.value,
      creditoParaInjecaoJac1 * 0.5,
      creditoParaInjecaoJac1
    );

    unidadesRateioIluminacao.value = resultado;
  };

  // Função 3 → Rateio dos prédios restantes (50% do Jac1)
  const calcularRateioRestantes = (arrayRestantes, creditoParaInjecaoJac1) => {
    const { resultado } = calcularRateioGrupo(
      arrayRestantes,
      creditoParaInjecaoJac1 * 0.5,
      creditoParaInjecaoJac1
    );

    unidadesRateioRestantes.value = resultado;
  };

  // Controle de exibição dos botões
  const mostrarBotaoCalcular = computed(() => somaPredios.value !== 0);
  const mostrarBotaoDownload = ref(false);

  // Função principal para coordenar tudo
  const calcularRateios = (creditoParaInjecao, creditoParaInjecaoJac1) => {
    const arrayRestantes = calcularRateioPredios(creditoParaInjecao); 
    calcularRateioIluminacao(creditoParaInjecaoJac1);
    calcularRateioRestantes(arrayRestantes, creditoParaInjecaoJac1);

    mostrarBotaoCalcular.value = false;
    mostrarBotaoDownload.value = true;
  };

  
  // Unindo os arrays de rateio para exibição final
  const unidadesListaDeRateioJac1 = ref([]);

  const executarCalculoRateios = () => {
    calcularRateios(creditoParaInjecao.value, creditoParaInjecaoJac1.value);
 
      unidadesListaDeRateioJac1.value = [
      ...unidadesRateioIluminacao.value,
      ...unidadesRateioRestantes.value
    ];
  };

  /* SISTEMA DE DOWNLOAD */
  import * as XLSX from "xlsx";

  // Função para baixar cada planilha
  const baixarPlanilhas = () => {
    const exportarXLSX = (dados, nomeArquivo) => {
      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rateio");
      XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
    };

    exportarXLSX(unidadesListaDeRateioJac1.value, "Rateio_Iluminacao_Restantes");
    exportarXLSX(unidadesRateioPredios.value, "Rateio_Predios");
  };

  /* ATUALIZANDO PORCENTAGENS NO SISTEMA PEEHORTO */

  const progresso = ref(0);          // % de progresso
  const carregando = ref(false);     // controla a barra
  const totalRegistros = ref(0);

  const atualizarDataFimNaAPI = async (dados) => {
    const hoje = new Date();
    const dataFim = new Date(hoje);
    dataFim.setMonth(dataFim.getMonth() + 1);
    const dataFimFormatada = dataFim.toISOString().split("T")[0];

    carregando.value = true;
    totalRegistros.value = dados.length;
    progresso.value = 0;

    for (let i = 0; i < dados.length; i++) {
      const item = dados[i];
      const payload = { ...item, data_fim: dataFimFormatada };

      await useFetch(`${API_BASE_URL}/porcentagem/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      // Atualiza progresso
      progresso.value = Math.round(((i + 1) / dados.length) * 100);
    }

    carregando.value = false;
    console.log("Todos os registros foram atualizados.");
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
                      Gerenciamento
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

                  <!-- CARDS PREDIO E IP PARA RATEIO -->
                  <v-row>
                    <div class="v-col v-col-12">
                      <div class="v-row">
                        <div class="v-col-sm-6 v-col-md-6 v-col-lg-6 v-col-12">
                          <div
                            class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightprimary"
                          >
                            <div class="bg-lightprimary">
                              <BoltIcon size="30" class="text-primary" />
                              <div
                                class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-primary"
                              >
                                Prédios<br>para Rateio
                              </div>
                              <h4 class="text-h4 mt-1 text-primary">{{ prediosRateio.length }}</h4>
                            </div>
                          </div>
                        </div>

                        <div class="v-col-sm-6 v-col-md-6 v-col-lg-6 v-col-12">
                          <div
                            class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightwarning"
                          >
                            <div class="bg-lightwarning">
                              <BuildingStoreIcon size="30" class="text-warning" />
                              <div
                                class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-warning"
                              >
                                IP<br>para Rateio
                              </div>
                              <h4 class="text-h4 mt-1 text-warning">
                                {{ iluminacaoRateio.length }}
                              </h4>
                            </div>
                          </div>
                        </div> 
                      </div>
                    </div>   
                  </v-row>

                  <h3 class="mt-4 mb-4 text-center"><code>Dados</code>- Consumo Unidades</h3>
                  <!-- VALORES PARA CONSUMO TABELA -->
                  <v-row justify="space-around" >
                    <v-table>
                      <thead>
                          <tr> 
                            <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Consumo Prédios <br><span style="font-size: 12px;">kWh/Mensal</span></th> 
                            <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Consumo Iluminação<br><span style="font-size: 12px;">kWh/Mensal</span></th> 
                          </tr>
                          <tr> 
                            <td class="text-center" style="border: 1px solid #4d7fff">{{ somaPredios }}</td> 
                            <td class="text-center" style="border: 1px solid #4d7fff">{{ somaIluminacao }}</td> 
                          </tr>
                        </thead>
                    </v-table>
                  </v-row>

                  <br>
                  <h3 class="mt-4 mb-4 text-center"><code>Dados</code>- 17 usinas + Paço Municipal</h3>
                  <!-- VALORES PARA RATEIO TABELA prédios -->
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
                            <td class="text-center" style="border: 1px solid #4d7fff">{{ consumoMedioUsinas }}</td>
                            <td class="text-center" style="border: 1px solid #4d7fff">{{ totalProjetado }}</td>
                            <td class="text-center" style="border: 1px solid #4d7fff">{{ calculoPosAutoConsumo }}</td>
                            <td class="text-center" style="border: 1px solid #4d7fff">{{ creditoParaInjecao }}</td>
                          </tr>
                        </thead>
                    </v-table>
                  </v-row>

                  <br>
                  <h3 class="mt-4 mb-4 text-center"><code>Dados</code>- Centro de Eventos JAC1</h3>
                  <!-- VALORES PARA RATEIO TABELA iluminação -->
                  <v-row justify="space-around" >
                    <v-table>
                      <thead>
                          <tr> 
                            <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Geração Usina <br><span style="font-size: 12px;">kWh/Ano</span></th> 
                            <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Créditos Para Injeção Total<br><span style="font-size: 12px;">kWh/Mensal</span></th> 
                            <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Créditos Para Injeção 50%<br><span style="font-size: 12px;">kWh/Mensal</span></th> 
                          </tr>
                          <tr> 
                            <td class="text-center" style="border: 1px solid #4d7fff">{{ totalProjetadoJac1 }}</td> 
                            <td class="text-center" style="border: 1px solid #4d7fff">{{ creditoParaInjecaoJac1}}</td>
                            <td class="text-center" style="border: 1px solid #4d7fff">{{ creditoParaInjecaoJac1 / 2 }}</td>
                          </tr>
                        </thead>
                    </v-table>
                  </v-row>
                  <br> 

                  <!-- BOTÃO PARA CALCULAR RATEIOS -->
                  <v-row class="mt-10" justify="space-around">
                    <v-btn v-if="mostrarBotaoCalcular" class="bg-primary text-white" color="primary" @click="executarCalculoRateios">
                      Calcular Rateios
                    </v-btn>

                    <v-btn v-if="mostrarBotaoDownload" color="success" @click="baixarPlanilhas"> 
                      Baixar Arquivos XLSX
                    </v-btn> 
                  </v-row>

                  <!-- BOTÃO PARA ATUALIZAR DATA FIM 
                  <v-row class="mt-10" justify="space-around">
                    <div v-if="carregando">
                      <p>Atualizando registros... {{ progresso }}%</p>
                      <v-progress-linear :value="progresso" height="20" color="primary" striped>
                      </v-progress-linear>
                    </div>

                    <v-btn
                      v-else-if="mostrarBotaoDownload"
                      color="primary"
                      @click="atualizarDataFimNaAPI(porcentagens)"
                    >
                      Atualizar Data Fim
                    </v-btn>  
                  </v-row>-->
                  
                    
                    
                  
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
