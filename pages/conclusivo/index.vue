<script setup>
import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import * as XLSX from "xlsx";

// Defina o título da página
useHead ({
  title: 'Conclusivo'
});

definePageMeta({
  middleware: 'sidebase-auth'
})

import { ref } from "vue"; 

const unidades = ref(0)
const usinas = ref(0)

  const fetchData = async () => {
    const { data: fetchedUsinas } = await useFetch(`${API_BASE_URL}/usina/`);
    const { data: fetchedUnidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao`); 
    
    usinas.value = fetchedUsinas.value.filter(usina => usina.id !== 19 && usina.id !== 20);
    unidades.value = fetchedUnidades.value  
     
  };

  const unidadesComMediaConsumo = ref([]);
  const calcularMediaConsumo = async (tipo) => {
    unidadesComMediaConsumo.value = [] 
    const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`);
    
    if(tipo == 'PREDIO' ){
      unidades.value = unidades.value.filter(item => item.secretaria == 'E' || item.secretaria == 'S' || item.secretaria == 'O' )
    }else if (tipo == 'IP'){
      unidades.value = unidades.value.filter(item => item.secretaria == 'I' || item.secretaria == 'P') 
    }


    for (const unidade of unidades.value) {  
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
          status: unidade.status,
          tensao: unidade.tensao,
          endereco: unidade.endereco,
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
          status: unidade.status,
          tensao: unidade.tensao,
          endereco: unidade.endereco,
        });
      }
    } 

    // Ordenar unidades pela média de consumo, do maior para o menor
    unidadesComMediaConsumo.value.sort((a, b) => b.mediaConsumo - a.mediaConsumo);
  };

  // Chamadas no ciclo de vida
  onMounted(async () => {
      await fetchData();  // Buscar dados das usinas e unidades 
  });

  //EXPORTAR PARA PREDIOS E CIP
  const exportarParaExcel = async (tipo) => {
    await calcularMediaConsumo(tipo); // <- agora esperamos terminar

    if (unidadesComMediaConsumo.value.length === 0) {
      alert("Nenhum dado disponível para exportar.");
      return;
    }

    const dados = unidadesComMediaConsumo.value.map(unidade => ({
      UC: unidade.uc,
      Nome: unidade.nome,
      "Consumo Médio (kWh)": unidade.mediaConsumo,
      "Saldo": unidade.saldoEnergia,
      "Status": unidade.status,
      "Tensão": unidade.tensao,
      "Endereço": unidade.endereco,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Unidades");

    if(tipo == 'PREDIO'){
      XLSX.writeFile(workbook, "UC_Predios.xlsx");
    } else {
      XLSX.writeFile(workbook, "UC_CIP.xlsx");
    }
  };




//DADOS COMPENSADOS

//COMPENSADO
const { data: compensado } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`);

const somarIndividualCompensado = async () => {
  const totalPorMesAno = {};

  compensado.value.forEach(item => {
    const chave = `${item.ano}-${item.mes.toString().padStart(2, '0')}`;
    
    const energiaTUSD = parseFloat(item.enerInjTUSD) || 0;
    const energiaTE = parseFloat(item.enerInjTE) || 0;
    const energiaTotal = energiaTUSD + energiaTE;

    const valorTUSD = parseFloat(item.valorInjTUSD) || 0;
    const valorTE = parseFloat(item.valorInjTE) || 0;
    const valorTotal = valorTUSD + valorTE;

    const saldoEnergia = parseFloat(item.saldoEnergia) || 0;

    if (!totalPorMesAno[chave]) {
      totalPorMesAno[chave] = {
        energiaTotal: 0,
        valorTotal: 0,
        saldoEnergiaTotal: 0
      };
    }

    totalPorMesAno[chave].energiaTotal += energiaTotal;
    totalPorMesAno[chave].valorTotal += valorTotal;
    totalPorMesAno[chave].saldoEnergiaTotal += saldoEnergia;
  });

  // Arredonda os valores
  for (const chave in totalPorMesAno) {
    totalPorMesAno[chave].energiaTotal = parseFloat(totalPorMesAno[chave].energiaTotal.toFixed(2));
    totalPorMesAno[chave].valorTotal = parseFloat(totalPorMesAno[chave].valorTotal.toFixed(2));
    totalPorMesAno[chave].saldoEnergiaTotal = parseFloat(totalPorMesAno[chave].saldoEnergiaTotal.toFixed(2));
  }

  return totalPorMesAno;
};




const exportarParaExcel2 = async () => {
  const totalPorMesAno = await somarIndividualCompensado();

  const dados = Object.entries(totalPorMesAno)
    .map(([chave, valores]) => ({
      "Ano-Mês": chave,
      "Energia Compensada (kWh)": valores.energiaTotal,
      "Valor Compensado (R$)": valores.valorTotal,
      "Saldo de Energia (kWh)": valores.saldoEnergiaTotal
    }))
    .sort((a, b) => {
      // Converte "2024-05" => 202405 para ordenar corretamente
      const valorA = parseInt(a["Ano-Mês"].replace("-", ""));
      const valorB = parseInt(b["Ano-Mês"].replace("-", ""));
      return valorB - valorA; // do maior (mais recente) pro menor
    });

  const worksheet = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resumo Mensal");

  XLSX.writeFile(workbook, "Resumo_Mensal_Compensado.xlsx");
};


</script>
<template>
    <div>
        
    </div>
  <!--BANNER-->
  <v-row>
    <div
      class="v-card v-theme--BLUE_THEME v-card--density-default elevation-10 rounded-md v-card--variant-elevated bg-lightprimary elevation-0 rounded-md mb-8"
    >
      <div class="px-8 py-8 py-lg-0">
        <div class="d-flex justify-space-between">
          <div class="d-flex py-0 align-center">
            <div>
              <h3 class="text-h3 mb-2">Conclusivo</h3>
              <ul
                class="v-breadcrumbs v-breadcrumbs--density-default text-h6 font-weight-medium pa-0 ml-n1"
              >
                <!---->
                <li class="v-breadcrumbs-item" text="Solar">
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
                  text="Usinas"
                >
                  <h6 class="text-medium-emphasis text-subtitle-1">Conclusivo</h6>
                </li>
                <!----><!---->
              </ul>
            </div>
          </div>
          <div class="d-none py-0 d-lg-block overflow-hidden">
            <div class="mb-n16 mt-3">
              <img src="https://i.imgur.com/dP5K6xL.png" height="200" alt="breadcrumbw" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </v-row>
  
  <br>
  <v-row>
    <v-col sm="12" xs="12" md="12" lg="12" xl="12" cols="12">
            <v-card elevation="10" class="withbg">
                <!-- style="background-color: #ECF2FF; " -->
                <v-card-item class="pa-0">
                    <div class="d-sm-flex align-center">
                        
                        <h5 class="text-h3 pl-7 pt-7">
                            <v-avatar class="bg-lightsecondary text-secondary mb-1" size="25">
                                <FileReportIcon size="19" />
                            </v-avatar>
                             
                            
                            Exportar informações conclusivas </h5>

                    </div> 
                    <div class="pa-7 pt-1">  
                      <v-row class="mt-10" justify="space-around"> 
                        <v-btn @click="exportarParaExcel('PREDIO')" class="bg-primary text-white mb-5">
                          Dados Prédios
                        </v-btn>

                        <v-btn @click="exportarParaExcel('IP')" class="bg-primary text-white mb-5">
                          Dados CIP
                        </v-btn> 

                        <v-btn @click="exportarParaExcel2(3)" class="bg-primary text-white mb-5">
                          Dados Compensados
                        </v-btn>

                        <v-btn @click="exportarParaExcel2(4)" class="bg-primary text-white mb-5">
                         Conclusivo
                        </v-btn>
                      </v-row>
                    </div>
                </v-card-item>
            </v-card>
        </v-col>
  </v-row> 
</template>
