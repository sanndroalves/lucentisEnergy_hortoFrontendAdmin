<template>
    <apexchart type="area" height="350" :options="chartOptions" :series="series"></apexchart>
  </template>
  
<script setup>
  import { ref } from 'vue';
  import { API_BASE_URL } from '~/base/link';
  import VueApexCharts from 'vue3-apexcharts';
  
  const { data: agendamentos } = await useFetch(`${API_BASE_URL}/agendamento/`);
  const { data: dias } = await useFetch(`${API_BASE_URL}/diautil/`); 

const agendamentosComDatas = agendamentos.value.map(agendamento => {
  const diaUtil = dias.value.find(dia => dia.id === agendamento.diasAgendadoFK);
  return {
    ...agendamento,
    dia: diaUtil ? new Date(diaUtil.dia) : null
  };
});

const agruparPorMesEAno = (agendamentos, anoSelecionado) => {
  const grupos = {};

  agendamentos.forEach(agendamento => {
    if (agendamento.dia && agendamento.dia.getFullYear() === anoSelecionado) {
      const mes = agendamento.dia.getMonth() + 1; // 1 a 12
      if (!grupos[mes]) {
        grupos[mes] = 0;
      }
      grupos[mes]++;
    }
  });

    //ORDENANDO OS MESES EXISTENTES
    const mesesOrdenados = Object.keys(grupos).sort((a, b) => a - b);  


    //CRIANDO ARRAY PARA PESQUISA NO INDEX NO FOR
    const mesesFinal = {} 
        mesesOrdenados.forEach(mes => {
            mesesFinal[mes] = grupos[mes]
    });

    //FAZENDO PESQUISA NOS MESES FINAL E PREENCHENDO OS MESES COM 0
    const valoresCompletos = [];
    for(let i=0;i<12;i++){
        valoresCompletos[i+1] = mesesFinal[i+1] || 0;
    }
     

  return valoresCompletos
};


 
    //GERANDO DADOS COM OS ANOS
    const agendamentos2026 = agruparPorMesEAno(agendamentosComDatas, 2026);
    const valores2026 = Object.values(agendamentos2026)

    const agendamentos2025 = agruparPorMesEAno(agendamentosComDatas, 2025);
    const valores2025 = Object.values(agendamentos2025)

    const agendamentos2024 = agruparPorMesEAno(agendamentosComDatas, 2024);
    const valores2024 = Object.values(agendamentos2024)

    const agendamentos2023 = agruparPorMesEAno(agendamentosComDatas, 2023);
    const valores2023 = Object.values(agendamentos2023)

    //PEGANDO OS MESES
    const meses = Object.keys(agendamentos2024)
 




  const series = ref([
    {
      name: '2026',
      data: valores2026
    },
    {
      name: '2025',
      data: valores2025
    },
  
    {
      name: '2024',
      data: valores2024
    },
    {
      name: '2023',
      data: valores2023
    }
  ]);
  
  const chartOptions = ref({
    chart: {
      height: 350,
      type: 'area'
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth'
    },
    xaxis: {
      type: 'date',
      categories: meses,
    },
    tooltip: {
      x: {
        format: 'MM/yy'
      },
    },
  });
  </script>
  
  <style scoped>
  /* Estilos opcionais para o componente */
  </style>
  