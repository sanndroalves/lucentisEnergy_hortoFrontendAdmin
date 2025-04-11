<template>
    <div>
      <apexchart type="radialBar" height="320" :options="chartOptions" :series="series"></apexchart>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { API_BASE_URL } from '~/base/link';
  
  import VueApexCharts from 'vue3-apexcharts';
    
  // GRÁFICO 
  const series = ref([0]);
  
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
    labels: ['JAC1'],
    legend: {
      show: false,
      position: 'left', 
      offsetX: -30,
      offsetY: 10,
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
  </script>
  
  <style scoped>
  /* Estilos opcionais para o componente */
  </style>
  