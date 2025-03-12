<script setup>
import { useHead  } from '@vueuse/head';

// Defina o título da página
useHead ({
  title: 'Gráficos'
});

definePageMeta({
  middleware: 'sidebase-auth'
})

import { ref } from "vue";
import UiParentCard from "@/components/shared/UiParentCard.vue";
import Radial from "@/components/graficos/Radial.vue";
import Pizza from "@/components/graficos/Pizza.vue";
import Area from "@/components/graficos/Area.vue";

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
              <h3 class="text-h3 mb-2">Gráficos</h3>
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
                  <h6 class="text-medium-emphasis text-subtitle-1">Gráficos</h6>
                </li>
                <!----><!---->
              </ul>
            </div>
          </div>
          <div class="d-none py-0 d-lg-block overflow-hidden">
            <div class="mb-n16 mt-3">
              <img src="https://i.imgur.com/KCbY5G7.png" height="200" alt="breadcrumbw" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </v-row>
  
  <br>
  <v-row>
    <v-col cols="12" md="6">
        <div class="elevation-3">
          <UiParentCard title="Participação Geração">
            <Radial />    
            </UiParentCard>  
        </div>
    </v-col>

    <v-col cols="12" md="6">
        <div class="elevation-3">
            <UiParentCard title="Geração Geral"> 
                <Pizza />    
            </UiParentCard>  
        </div>
    </v-col>
  </v-row>
  <v-row>
    <v-col cols=12>
        <div class="elevation-3">
            <UiParentCard title="Geração total">
                <v-divider></v-divider>
                <Area />    
            </UiParentCard>  
        </div>
    </v-col>
  </v-row>
</template>
