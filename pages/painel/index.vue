<script setup> 
useHead({
  title: 'Controles • PEE Horto', 
});
definePageMeta({
  layout: "blank",
});
import { API_BASE_URL } from '~/base/link';


const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);


import Bar from "@/components/painel/Bar.vue";
import Radial from "@/components/painel/Radial.vue";
import Radial2 from "@/components/painel/RadialDois.vue";

onMounted(() => {
  const interval = setInterval(() => {
    window.location.reload();
  }, 120000);  

  onBeforeUnmount(() => clearInterval(interval));
});

</script>
 
<template> 

    <div class="wrapper">
        <v-row class="text-center mt-2" style="color: white">
            <v-col cols="12">
                <h1>Painel Central - Usinas Fotovoltaicas</h1>
            </v-col>
        </v-row>

        <v-row class="ml-3 mr-3">
            <v-col md="8" cols="12">
                <div class="box columnbox">
                    <h4 class="text-center" style="color: white; margin-bottom: 10px;">Porcentagens Geração Individual (kWp)</h4>
                    <div v-for="usina in usinas" :key="usina">
                      <div v-if="usina.id != 1 && usina.id !=19 && usina.id !=20">
                        <Bar :titulo="usina.nome" :idUsina="usina.uc" :idSolar="usina.idSolar" :capacidade="usina.potencia" /> 
                      </div>
                    </div>
                    
                </div>
            </v-col>

            <v-col md="4" cols="12">
                <div class="box radialbox">
                    <h2 class="text-center" style="color: white; margin-bottom: 0px;">Paço (1032 kWp)</h2>
                    <Radial2 />
                </div>
                <div class="box radialbox">
                    <h2 class="text-center" style="color: white; margin-bottom: 0px;">JAC1 (1032 kWp)</h2>
                    <Radial />
                </div> 
            </v-col> 
        </v-row>
 
    </div>
</template>

<style scoped>
.wrapper {
    background: #1B213B;
    color: #777;
    font-family: Montserrat, Arial, sans-serif;
    height: 100%;
  }
  
  .wrapper-bg {
    background: #F3F4FA !important;
  }
  
  h1, h2, h3, h4, h5, h6, strong {
    font-weight: 600;
  }
  
  .box .apexcharts-xaxistooltip {
    background: #1B213B;
    color: #fff;
  }
  
  .content-area {
    max-width: 1280px;
    margin: 0 auto;
  }
  
  .box {
    background-color: #262D47;
    padding: 25px 25px;
    border-radius: 4px;
  }
  
  .columnbox {
    padding-right: 15px;
  }
  .radialbox {
    max-height: 350px;
    margin-bottom: 40px;
  }
  
  .apexcharts-legend-series tspan:nth-child(3) {
    font-weight: bold;
    font-size: 20px;
  }
  
  .edit-on-codepen {
    text-align: right;
    width: 100%;
    padding: 0 20px 40px;
    position: relative;
    top: -30px;
    cursor: pointer;
  }
  
  .spinner-border {
    display: none;
  }
</style>
