<script setup >
import { ref } from 'vue';
import { API_BASE_URL } from '~/base/link';

import { computed } from 'vue';
import { useTheme } from 'vuetify';
const theme = useTheme();
const primary = theme.current.value.colors.primary;
const secondary = theme.current.value.colors.secondary;
const success = theme.current.value.colors.success;

    
/* Chart */
const areachartOptions = computed(() => {

    return {
        labels: ['1','2','3','4','5','6','7','8','9','10','11','12'],
        chart: {
            type: 'area',
            height: 60,
            fontFamily: `inherit`,
            foreColor: '#a1aab2',
            toolbar: {
                show: false
            },
            sparkline: {
                enabled: true
            },
            group: 'sparklines'
        },
        colors: [success],
        stroke: {
            curve: 'smooth',
            width: 2
        },
        fill: {
            type: 'solid',
            opacity: 0.05
        },
        markers: {
            size: 0
        },
        tooltip: {
            theme: 'light',
            x: {
                show: true
            }
        }
    };
});

const novaLista = ref([])

const calcularSomaPorMes = (relatorios) => {
    const somaPorMes = {};
    
    relatorios.forEach(relatorio => {
        const { mes, valorInjTUSD, valorInjTE } = relatorio;
        const chave = `${mes}`;
        
        if (!somaPorMes[chave]) {
            somaPorMes[chave] = 0;
        }
        
        somaPorMes[chave] += parseInt(valorInjTUSD) + parseInt(valorInjTE);
    });
    return somaPorMes;
};

const calcularSomaPorAno = (relatorios) => {
    const somaPorAno = {};
    
    relatorios.forEach(relatorio => {
        const { ano, valorInjTUSD, valorInjTE } = relatorio;
        
        if (!somaPorAno[ano]) {
            somaPorAno[ano] = 0;
        }
        
        somaPorAno[ano] += parseInt(valorInjTUSD) + parseInt(valorInjTE);
    });
    return somaPorAno;
};

const anoId = ref(new Date().getFullYear());
const totalAnual = ref(0)
const somaTotalAnual = ref(0)
const mudarAno = () => {
  const limiteSuperior = 2026; // O maior ano permitido
  const limiteInferior = 2023; // O menor ano permitido
 
  anoId.value = anoId.value < limiteSuperior ? anoId.value + 1 : limiteInferior;

  carregarDados(anoId.value);
};

const carregarDados = async (ano) => {
    const { data: relatorioPesquisa } = await useFetch(`${API_BASE_URL}/relatoriocompensacao?ano=${ano}`);
    novaLista.value = calcularSomaPorMes(relatorioPesquisa._value);
    totalAnual.value = calcularSomaPorAno(relatorioPesquisa._value)
    somaTotalAnual.value = Object.values(totalAnual.value).reduce((acc, curr) => acc + curr, 0);
}

carregarDados(anoId.value)

 



const areaChart = computed(() => {
    return {
        series: [
            {
                name: '',
                data: Object.values(novaLista.value)
            }
        ]
    };
});
</script>
<template>
    <v-card elevation="10" class="withbg">
        <v-card-item>
            <div class="d-flex align-center justify-space-between pt-sm-2">
                <v-card-title class="text-h5">
                    <v-avatar class="bg-lightsuccess text-success mb-1 mr-2" size="50">
                                <CashIcon size="28" />
                    </v-avatar>
                     Compensação (R$)
                </v-card-title>
                <v-btn size="large" icon @click="mudarAno" class="bg-success">
                    <v-avatar size="large" class="text-white">
                        <RefreshIcon size="25" />
                    </v-avatar>
                </v-btn>
            </div>
            <v-row>
                <v-col cols="12">
                    <div class="mt-2">
                        <h3 class="text-h3">R$ {{parseInt(somaTotalAnual) }}</h3>
                        <div class="mt-1">
                            <v-avatar class="bg-lightsuccess text-success" size="25">
                                <InfoCircleIcon size="20" />
                            </v-avatar>
                            <span class="text-subtitle-1 ml-2 font-weight-bold">{{ anoId }}</span>
                            <span class="text-subtitle-1 text-muted ml-2"></span>
                        </div>
                    </div>
                </v-col>
            </v-row>
        </v-card-item>
        <div>
            <apexchart  type="area" height="100" :options="areachartOptions" :series="areaChart.series"> </apexchart>
        </div>
    </v-card>
</template>
