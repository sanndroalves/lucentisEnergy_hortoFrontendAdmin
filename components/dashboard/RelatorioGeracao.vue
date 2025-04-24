<script setup>
import { ref, computed, watch } from 'vue'; 
import { useTheme } from 'vuetify';
import { API_BASE_URL } from '~/base/link';

const theme = useTheme();
const primary = theme.current.value.colors.primary;
const secondary = theme.current.value.colors.secondary;

const select = ref(new Date().getFullYear());
const items = ref(['2026', '2025', '2024', '2023']);

const itemProjecao = ref({});
const itemReal = ref({});
const ultimaProjetada = ref('');
const ultimaReal = ref('');

const carregarDados = async (anoId) => {
    const projecao = (await useFetch(`${API_BASE_URL}/projecaogeracao`)).data.value;
    const real = (await useFetch(`${API_BASE_URL}/relatoriogeracao`)).data.value;

    if (!projecao || !real) return;
    
    const totalPorMesProjecao = projecao
    .filter(item => item.ano === parseInt(anoId))
    .reduce((acc, item) => {
        acc[item.mes] = (acc[item.mes] || 0) + parseInt(item.projecao);
        return acc;
    }, {});

    const totalPorMesReal = real
    .filter(item => item.ano === parseInt(anoId))
    .reduce((acc, item) => {
        acc[item.mes] = (acc[item.mes] || 0) + parseInt(item.geracao);
        return acc;
    }, {});

    itemProjecao.value = totalPorMesProjecao;
    itemReal.value = totalPorMesReal;

    const mesAtual = new Date().getMonth() + 1; // Janeiro = 0
    const mesParaBuscar = mesAtual === 1 ? 12 : mesAtual - 1; // Ajusta para 12 (dezembro) se for janeiro

    ultimaProjetada.value = totalPorMesProjecao[mesParaBuscar] || 0;
    ultimaReal.value = Object.values(totalPorMesReal).pop() || 0;
  
    // Salvar os dados no servidor
    const { data: dadosSalvar } = await useFetch(`${API_BASE_URL}/salvar?ano=${anoId}`);
    const idSalvar = ref("");

    if (dadosSalvar.value && dadosSalvar.value[0]) {
        const arrayDados = dadosSalvar.value[0];
        idSalvar.value = arrayDados.id;

        await useFetch(`${API_BASE_URL}/salvar/${idSalvar.value}`, {
        method: 'DELETE',
        key: 'deleteDados',
        });
    }

    await useFetch(`${API_BASE_URL}/salvar/`, {
        method: 'POST',
        body: {
        ultimaProjecao: ultimaProjetada.value,
        ultimaReal: ultimaReal.value,
        ano: anoId,
        },
        key: 'salvarUltimas',
    });


};

watch(select, (newYear) => {
  carregarDados(newYear);
});

const chartOptions = computed(() => ({
  series: [
    { name: "Projeção:", data: Object.values(itemProjecao.value) },
    { name: "Real:", data: Object.values(itemReal.value) },
  ],
  chartOptions: {
    grid: { borderColor: 'rgba(0,0,0,0.1)', strokeDashArray: 3 },
    plotOptions: { bar: { horizontal: false, columnWidth: "35%", borderRadius: [8] } },
    colors: [primary, secondary],
    chart: {
      type: "bar",
      height: 370,
      offsetX: -15,
      toolbar: { show: true },
      foreColor: "#adb0bb",
      fontFamily: 'inherit',
      sparkline: { enabled: false },
    },
    dataLabels: { enabled: false },
    markers: { size: 0 },
    legend: { show: false },
    xaxis: {
      type: "category",
      categories: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
      labels: { style: { cssClass: "grey--text lighten-2--text fill-color" } },
    },
    yaxis: {
      show: true,
      min: 0,
      tickAmount: 10,
      labels: { style: { cssClass: "grey--text lighten-2--text fill-color" } },
    },
    stroke: { show: true, width: 3, lineCap: "butt", colors: ["transparent"] },
    tooltip: { theme: "light" },
    responsive: [
      {
        breakpoint: 600,
        options: {
          plotOptions: { bar: { borderRadius: 3 } },
        },
      },
    ],
  },
}));


carregarDados(select.value);
</script>
 
<template>
    <v-card elevation="10" class="withbg">
        <v-card-item>
            <div class="d-sm-flex align-center justify-space-between pt-sm-2">
                <div><v-card-title class="text-h5">Relatório Geração (kWh)</v-card-title></div>
                <div class="my-sm-0 my-2">
                    <v-select v-model="select" variant="outlined" hide-details :items="items" density="compact" @change="updateItemsBasedOnYear(select)"></v-select>
                </div>
            </div>
            <div class="mt-6">
                <apexchart type="bar" height="370px" :options="chartOptions.chartOptions" :series="chartOptions.series">
                </apexchart> 
            </div>
        </v-card-item>
    </v-card>
</template>
