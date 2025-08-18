<script setup>

import Alerta from "@/components/dashboard/Alerta.vue"; 
import VerificarStrings from "@/components/dashboard/VerificarStrings.vue"; 

</script>

<template>
  <div>
    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-title>
          <div class="d-flex flex-column align-items-start">
            <div class="d-flex align-items-center">
              <v-avatar class="bg-lightprimary text-primary mb-1 mr-2" size="40">
                <AlertTriangleIcon size="30" />
              </v-avatar>
              <b style="font-size: 18px; margin: 10px;">SOLARMAN</b> 
            </div>
            <div class="mt-1 text-subtitle-1 text-medium-emphasis">
              Interligação com o sistema Solarman.
            </div>
          </div>
        </v-expansion-panel-title>


        <v-expansion-panel-text>  
             <v-row justify="center" align="center">
                <v-col class="text-center" cols="auto">
                    <v-btn class="bg-primary"  href="https://painel.peehorto.com" target="_blank">
                        Painel Central
                    </v-btn> 
                </v-col> 
            </v-row> 
            <br>
            <Alerta />  
            <br>    
            <VerificarStrings />  
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div> 
</template>