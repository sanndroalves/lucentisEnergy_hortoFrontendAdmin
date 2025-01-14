<script setup>
import { ref } from 'vue';
import { API_BASE_URL } from '~/base/link';

import { computed } from 'vue';
import { useTheme } from 'vuetify';
const theme = useTheme();
const primary = theme.current.value.colors.primary;
const lightprimary = theme.current.value.colors.lightprimary;

const anoAtual = new Date().getFullYear();
const mesAtual = new Date().getMonth(); // Janeiro = 0

// Verifica se é janeiro e ajusta o ano para o ano anterior, se necessário
const anoParaBuscar = mesAtual === 0 ? anoAtual - 1 : anoAtual;

// Faz a requisição com o ano ajustado
const { data: dados } = await useFetch(`${API_BASE_URL}/salvar?ano=${anoParaBuscar}`);


const ultDados = dados.value[0];

const chartOptions = computed(() => {
    return {
        labels: ['Projeção', 'Real'],
        chart: {
            type: 'donut',
            fontFamily: `inherit`,
            foreColor: '#a1aab2',
            toolbar: {
                show: false
            }
        },
        colors: [primary, lightprimary, '#F9F9FD'],
        plotOptions: {
            pie: {
                startAngle: 0,
                endAngle: 360,
                donut: {
                    size: '75%',
                    background: 'transparent'
                }
            }
        },
        stroke: {
            show: false
        },
        
        dataLabels: {
            enabled: false
        },
        legend: {
            show: false
        },
        tooltip: { theme: "light", fillSeriesColor: false },
    };
});

const projecao = ref(0)
const real = ref(0)

if(ultDados !== undefined){
    projecao.value = ultDados.ultimaProjecao
    real.value = ultDados.ultimaReal
}

const Chart = [parseInt(projecao.value/1000), parseInt(real.value/1000)];

</script>
<template>
    <v-card elevation="10" class="withbg">
        <v-card-item>
            <div class="d-sm-flex align-center justify-space-between pt-sm-2">
                <v-card-title class="text-h5">Análise Geração</v-card-title>
            </div>
            <v-row>
                <v-col cols="7" sm="7">
                    <div class="mt-2">
                        <h3 class="text-h3">{{ parseInt((real)/1000) }} MWh</h3>
                        <div>
                            <span class="text-subtitle-1 text-muted ml-2">Total gerado último mês</span>
                        </div>
                        <div class="d-flex align-center mt-sm-10 mt-8">
                            <h6 class="text-subtitle-1 text-muted">
                                <v-icon icon="mdi mdi-checkbox-blank-circle" class="mr-1" size="10" color="primary"></v-icon> Projeção
                            </h6>
                            <h6 class="text-subtitle-1 text-muted pl-5">
                                <v-icon icon="mdi mdi-checkbox-blank-circle" class="mr-1" size="10" color="lightprimary"></v-icon> Real
                            </h6>
                        </div>
                    </div>
                </v-col>
                <v-col cols="5" sm="5" class="pl-lg-0">
                    <div class="d-flex align-center flex-shrink-0">
                        <apexchart  type="donut" height="145" :options="chartOptions" :series="Chart"> </apexchart>
                    </div>
                </v-col>
            </v-row>
        </v-card-item>
    </v-card>
</template>