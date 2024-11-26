<script setup >
import { useHead  } from '@vueuse/head';
import { nextTick } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';

import { API_BASE_URL } from '~/base/link';

// Defina o título da página
useHead ({
  title: 'Relatórios'
});

definePageMeta({
    middleware: 'auth'
})


const consumoMedio = ref(null);
const usinas = ref([]);
const unidades = ref([]);

// Fetch dos dados das usinas e unidades
const { data: fetchedUsinas } = await useFetch(`${API_BASE_URL}/usina/`);
const { data: fetchedUnidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao/`);

// Armazene os dados retornados nas variáveis reativas
usinas.value = fetchedUsinas.value;
unidades.value = fetchedUnidades.value;

// Função para buscar o valor de MediaConsumo
const buscarConsumoMedio = () => {
  usinas.value.forEach(usina => {
    const unidadeCorrespondente = unidades.value.filter(unidade => unidade.uc === usina.uc)[0]; 
    if (unidadeCorrespondente) {  
      consumoMedio.value += unidadeCorrespondente.mediaConsumo;
    }
  });
};

const totalProjetado = ref()
const somaProjecao = ref("")

const { data: projecao } = await useFetch(`${API_BASE_URL}/projecaogeracao`);
    const somarIndividualProjecao = async (anoId) => {                                                                                                                                                                                                                                                              
        const totalPorMes = projecao.value
            .filter(item => item.ano === parseInt(anoId))
            .reduce((acumulador, item) => {
              const mesAtual = item.mes;
                acumulador[mesAtual] = parseFloat(((acumulador[mesAtual] || 0) + Number(item.projecao)).toFixed(2));
              return acumulador;
            }, {});
            return totalPorMes;
    };

    somaProjecao.value = await somarIndividualProjecao(2024);
    const valoresProjetado = Object.values(somaProjecao.value);
    totalProjetado.value = parseFloat(valoresProjetado.reduce((total, valor) => total + valor, 0).toFixed(2));
     




onMounted(() => {
  buscarConsumoMedio();
 
});    

consumoMedio.value = 1150797,78
const calculoPosAutoConsumo = ref((totalProjetado - consumoMedio).toFixed(2))
const creditoParaInjecao = ref(((totalProjetado - consumoMedio)/12).toFixed(2))
  
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
              <img src="https://i.imgur.com/9rJgHQv.png" height="200" alt="breadcrumbw" />
            </div>
          </div>
        </div>
      </div>
    </div>
    </v-row>
   
    <!-- TABELAS -->
    <v-row>
        <v-col cols="12" md="12">
            <UiParentCard title=""> 
                <div class="pa-7 pt-1"> 
                  <v-row justify="space-around" >
                      <v-table>
                        <thead>
                            <tr> 
                              <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Consumo Usinas <br><span style="font-size: 12px;">kWh/Ano</span></th>
                              <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Geração Usinas <br><span style="font-size: 12px;">Anual</span></th> 
                              <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Pós AutoConsumo <br><span style="font-size: 12px;">Anual</span></th> 
                              <th class="header-cell text-center" style="font-size: 17px; padding: 20px;">Créditos Para Injeção<br><span style="font-size: 12px;">Mensal</span></th> 
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
                </div> 
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
