<script setup>

import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';


// Defina o título da página
useHead ({
  title: 'Controle'
});

definePageMeta({
  middleware: 'sidebase-auth'
})

import { defineAsyncComponent } from 'vue';


import RelatorioGeracao from "~~/components/dashboard/RelatorioGeracao.vue";
import AnaliseGeracao from "~~/components/dashboard/AnaliseGeracao.vue";
import GeracaoDinheiro from "@/components/dashboard/GeracaoDinheiro.vue"; 
const Irregular = defineAsyncComponent(() => import("@/components/dashboard/Irregular.vue"));
import Alerta from "@/components/dashboard/Alerta.vue"; 
import VerificarStrings from "@/components/dashboard/VerificarStrings.vue"; 

const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`); 
const { data: unidades } = await useFetch( `${API_BASE_URL}/unidadecompensacao`); 
const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`);
const { data: manutencoes } = await useFetch(`${API_BASE_URL}/manutencao/`);  

const valorIluminacao = unidades.value.filter(item => item.secretaria == 'I' || item.secretaria == 'P') 
const valoresPredios = unidades.value.filter(item => item.secretaria == 'E' || item.secretaria == 'S' || item.secretaria == 'O' && item.status == 'L')
const valoresUnidadesCompensa = unidades.value.filter(item => item.status == 'L')

const overlay = ref(true);
onMounted(() => { 

  // Esconde o overlay após 5 segundos
  setTimeout(() => {
    overlay.value = false; 
  }, 5000);
});

   /* BAIXAR PDF */
   import html2pdf from 'html2pdf.js';
    const baixarPDF = () => {
        // Referência para os elementos 
        const tituloElement = document.getElementById('TelaPDF'); 
        
        const tempContainer = document.createElement('div');
            
        const clonedTitulo = tituloElement.cloneNode(true); 
        
        tempContainer.appendChild(clonedTitulo); 

        // Gera o PDF usando o contêiner temporário
        html2pdf(tituloElement, {
            margin: 0, // Margem em polegadas
            filename: 'InfoPeeHorto.pdf',
            html2canvas: {
            scale: 3, // Aumenta a qualidade
            },
            jsPDF: {
            unit: 'in',
            format: 'a3', // Tamanho do papel
            //   orientation: 'landscape', // Orientação do papel
            }
        });
    };

</script>
<template>
    <v-row>
    <div
      class="v-card v-theme--BLUE_THEME v-card--density-default elevation-10 rounded-md v-card--variant-elevated bg-lightprimary elevation-0 rounded-md mb-8"
    >
      <div class="px-8 py-8 py-lg-0">
        <div class="d-flex justify-space-between">
          <div class="d-flex py-0 align-center">
            <div>
              <h3 class="text-h3 mb-2">Painel de Controle</h3>
              <ul
                class="v-breadcrumbs v-breadcrumbs--density-default text-h6 font-weight-medium pa-0 ml-n1"
              >
                <!---->
                <li class="v-breadcrumbs-item" text="Dashboard">
                  <a class="v-breadcrumbs-item--link" href="/" style="text-decoration:none"
                    ><h6 class="text-medium-emphasis text-subtitle-1">
                      Início
                    </h6></a
                  >
                </li>
                <!----><!---->
              </ul>
            </div>
          </div>
          <div class="d-none py-0 d-lg-block overflow-hidden">
            <div class="mb-n16 mt-3">
              <img src="https://i.imgur.com/dn2LqE5.png" height="200" alt="breadcrumbw" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </v-row>
  <v-row>
    <v-col cols="12">
      <v-row>
        <div class="v-col v-col-12">
          <div class="v-row">
            <div class="v-col-sm-4 v-col-md-4 v-col-lg-2 v-col-12">
              <div
                class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightprimary"
              >
                <div class="bg-lightprimary">
                  <BoltIcon size="30" class="text-primary" />
                  <div
                    class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-primary"
                  >
                    Usinas
                  </div>
                  <h4 class="text-h4 mt-1 text-primary">{{ usinas.length }}</h4>
                </div>
              </div>
            </div>

            <div class="v-col-sm-4 v-col-md-4 v-col-lg-2 v-col-12">
              <div
                class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightwarning"
              >
                <div class="bg-lightwarning">
                  <BuildingStoreIcon size="30" class="text-warning" />
                  <div
                    class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-warning"
                  >
                    IP
                  </div>
                  <h4 class="text-h4 mt-1 text-warning">
                    {{ valorIluminacao.length }}
                  </h4>
                </div>
              </div>
            </div>

            <div class="v-col-sm-4 v-col-md-4 v-col-lg-2 v-col-12">
              <div
                class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightsuccess"
              >
                <div class="bg-lightsuccess">
                  <BuildingIcon size="30" class="text-success" />
                  <div
                    class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-success"
                  >
                    Prédios
                  </div>
                  <h4 class="text-h4 mt-1 text-success">
                    {{ valoresPredios.length }}
                  </h4>
                </div>
              </div>
            </div>

            <div class="v-col-sm-4 v-col-md-4 v-col-lg-2 v-col-12">
              <div
                class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightprimary"
              >
                <div class="bg-lightprimary">
                  <BuildingStoreIcon size="30" class="text-primary" />
                  <div
                    class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-primary"
                  >
                    Unidades
                  </div>
                  <h4 class="text-h4 mt-1 text-primary">
                    {{ valoresUnidadesCompensa.length }}
                  </h4>
                </div>
              </div>
            </div>

            <div class="v-col-sm-4 v-col-md-4 v-col-lg-2 v-col-12">
              <div
                class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightsecondary"
              >
                <div class="bg-lightsecondary">
                  <FilePowerIcon size="30" class="text-secondary" />
                  <div
                    class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-secondary"
                  >
                    Relatórios
                  </div>
                  <h4 class="text-h4 mt-1 text-secondary">
                    {{ relatorios.length }}
                  </h4>
                </div>
              </div>
            </div>

            <div class="v-col-sm-4 v-col-md-4 v-col-lg-2 v-col-12">
              <div
                class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lighterror"
              >
                <div class="bg-lighterror">
                  <SettingsIcon size="30" class="text-error" />
                  <div
                    class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-error"
                  >
                    Manutenções
                  </div>
                  <h4 class="text-h4 mt-1 text-error">
                    {{ manutencoes.length }}
                  </h4>
                </div>
              </div>
            </div>
 

          </div>
        </div>

      <v-col class="text-center TelaPDF" id="TelaPDF" cols="12">

          <v-btn class="bg-primary"  href="https://painel.peehorto.com" target="_blank">
            Painel Central
          </v-btn> 
        </v-col> 
        
        <v-col cols="12" lg="8">
           <GeracaoDinheiro />  
            <br>
          <RelatorioGeracao />
        </v-col>

        <v-col cols="12" lg="4">
          <div class="mb-6">
            <AnaliseGeracao /> 
          </div>
          
          
          <div class="mb-6">
            <Alerta />
          </div> 
          <div class="mb-15">
            <VerificarStrings />
          </div>  
          <div>
            <Suspense>
              <template #default>
                <Irregular />
              </template>
              <template #fallback>
                <v-progress-circular indeterminate color="primary" />
              </template>
            </Suspense>
          </div>  
          
           
        </v-col>
      </v-row>

    
    </v-col>
    <v-col class="text-center mt-2">
      <p class="text-muted">Desenvolvido por AleTechLab.</p>
    </v-col>
  </v-row>
</template>