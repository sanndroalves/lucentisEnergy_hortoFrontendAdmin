<script setup >
import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';

// Defina o título da página
useHead ({
  title: 'Contas'
});

definePageMeta({
  middleware: 'sidebase-auth'
})
 
import Automatizacao from '@/components/predios/automatizacao.vue';

import { ref } from 'vue';

const { data: solicitacoes } = await useFetch(`${API_BASE_URL}/logsolicitacao/`);
const { data: downloads } = await useFetch(`${API_BASE_URL}/logdownloadpdf?download=True`);

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
              <h3 class="text-h3 mb-2">Automatização Contas</h3>
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
                  <h6 class="text-medium-emphasis text-subtitle-1">Automatização Contas</h6>
                </li>
                <!----><!---->
              </ul>
            </div>
          </div>
          <div class="d-none py-0 d-lg-block overflow-hidden">
            <div class="mb-n16 mt-3">
              <img src="https://i.imgur.com/5Hlw8ig.png" height="200" alt="breadcrumbw" />
            </div>
          </div>
        </div>
      </div>
    </div>
    </v-row>

    <!--CAIXAS DASHBOARD-->
    <div class="v-col v-col-12">
      <v-row justify="space-around">  
        <div class="v-col-sm-6 v-col-md-6 v-col-lg-6 v-col-12">
          <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightprimary">
            <div class="bg-lightprimary">
              <BooksIcon size="30" class="text-primary" />
              <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-primary">
                Solicitações
              </div>
              <h4 class="text-h4 mt-1 text-primary">
                {{ solicitacoes.length }}
              </h4>
            </div>
          </div>
        </div> 

        <div class="v-col-sm-6 v-col-md-6 v-col-lg-6 v-col-12">
          <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightsuccess">
            <div class="bg-lightsuccess">
              <FirstAidKitIcon size="30" class="text-success" />
              <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-success">
                Total Baixado
              </div>
              <h4 class="text-h4 mt-1 text-success">
                {{ downloads.length }}
            </h4>
            </div>
          </div>
        </div> 
       </v-row>
    </div>      

    <v-divider></v-divider>
    <br> 

    <!-- LER CONTAS PRÉDIOS (AUTOMATIZAÇÃO)-->
    <Automatizacao/>
 

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