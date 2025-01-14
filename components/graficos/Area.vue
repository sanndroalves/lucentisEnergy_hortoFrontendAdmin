<template>
  <div id="chart"></div>
</template>

<script setup>
import { onMounted } from 'vue';
import { API_BASE_URL } from '~/base/link';
import ApexCharts from 'apexcharts';

// SOMA POR MES FUNÇÃO
const { data: real } = await useFetch(`${API_BASE_URL}/relatoriogeracao`);
        
const somarIndividualReal = async (anoId) => {
    const totalPorMes = real.value
        .filter(item => item.ano === parseInt(anoId))
        .reduce((acumulador, item) => {
        const mesAtual = item.mes;
            acumulador[mesAtual] = (acumulador[mesAtual] || 0) + parseInt(item.geracao);
        return acumulador;
        }, {});
        if(totalPorMes){
         return totalPorMes; 
        }else{
          total
        }
        
    };

const anos = [2026, 2025, 2024, 2023];
const valoresCompletos = ref({});

const preencherValores = async (ano) => {
  const valores = await somarIndividualReal(ano);
  const valoresCompletosAno = [];
  
  for (let i = 0; i < 13; i++) {
    valoresCompletosAno[i] = i === 0 ? 0 : valores[i] || 0;
  }

  return valoresCompletosAno.slice(1); // Remove o primeiro índice
};

// Preencher os valores para cada ano desejado
for (let ano of anos) {
  valoresCompletos.value[ano] = await preencherValores(ano);
}


const options = {
  series: [
    {
      name: "Geração - 2026",
      data: valoresCompletos.value[2026]
    },
    {
      name: "Geração - 2025",
      data: valoresCompletos.value[2025]
    },
    {
      name: "Geração - 2024",
      data: valoresCompletos.value[2024]
    },
    {
      name: "Geração - 2023",
      data: valoresCompletos.value[2023]
    }
  ],
  chart: {
    height: 350,
    // width: 1000,
    type: 'line',
    dropShadow: {
      enabled: true,
      color: '#000',
      top: 18,
      left: 7,
      blur: 10,
      opacity: 0.2
    },
    zoom: {
      enabled: false
    },
    toolbar: {
      show: false
    }
  },
  colors: ['#77B6EA', '#545454'],
  dataLabels: {
    enabled: true,
  },
  stroke: {
    curve: 'smooth'
  },
  title: {
    text: 'Geração dos meses no ano de 2026, 2025, 2024, 2023',
    align: 'left'
  },
  grid: {
    borderColor: '#e7e7e7',
    row: {
      colors: ['#f3f3f3', 'transparent'], // takes an array which will be repeated on columns
      opacity: 0.5
    },
  },
  markers: {
    size: 1
  },
  xaxis: {
    categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    title: {
      text: 'Meses'
    }
  },
  yaxis: {
    title: {
      text: 'Quantidade'
    }, 
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    floating: true,
    offsetY: -25,
    offsetX: -5
  }
};

onMounted(() => {
  const chart = new ApexCharts(document.querySelector("#chart"), options);
  chart.render();
});
</script>

<style scoped>
#chart { 
  margin: 35px auto;
  padding: 30px;
}
</style>
