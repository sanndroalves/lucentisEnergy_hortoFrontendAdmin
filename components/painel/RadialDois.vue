<template>
  <div>
    <apexchart type="radialBar" height="320" :options="chartOptions" :series="series"></apexchart>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { API_BASE_URL } from '~/base/link';

import VueApexCharts from 'vue3-apexcharts';

import UsinaPaco from '~/components/painel/dados/UsinaPaco.vue';
import { calcularPercentualDeGeracaoPaco } from '~/components/painel/dados/UsinaPaco.vue';

// Função para buscar o percentual de geração
const fetchPercentual = async () => {
  const percentual = await calcularPercentualDeGeracaoPaco();
  return percentual;
};

// Estado reativo para armazenar os dados da série
const series = ref([await fetchPercentual()]);

// Opções do gráfico
const chartOptions = ref({
  chart: {
    type: 'radialBar',
    height: 320,
    offsetY: 0,
    offsetX: 0
  },
  plotOptions: {
    radialBar: {
      size: undefined,
      inverseOrder: false,
      hollow: {
        margin: 5,
        size: '48%',
        background: 'transparent',
      },
      track: {
        show: true,
        background: '#40475D',
        strokeWidth: '10%',
        opacity: 1,
        margin: 3,
      },
      dataLabels: {
        name: {
          fontSize: '22px',
        },
        value: {
          fontSize: '22px',
          color: '#FFFFFF', // Define a cor branca para o valor da porcentagem
          show: true,
        }
      },
    },
  },
  labels: ['Paço'],
  legend: {
    show: false,
    position: 'left',
    offsetX: -10,
    offsetY: 20,
    labels: {
      colors: '#FFFFFF', // Define a cor branca para as legendas
    },
    formatter: function (val, opts) {
      return val + " - " + opts.w.globals.series[opts.seriesIndex] + '%'
    }
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'horizontal',
      shadeIntensity: 0.5,
      inverseColors: true,
      opacityFrom: 1,
      opacityTo: 1,
      stops: [0, 100]
    }
  }
});

// Função para atualizar os dados da série
const updateSeries = async () => {
  series.value = [await fetchPercentual()];
};

// Configurar intervalo para atualizar os dados a cada 10 segundos
let intervalId = null;

onMounted(() => {
  intervalId = setInterval(updateSeries, 10000);
});

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<style scoped>
/* Estilos opcionais para o componente */
</style>
