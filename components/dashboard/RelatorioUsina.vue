<script setup>
import { ref, computed, watch } from 'vue';
import { API_BASE_URL } from '~/base/link';
import { useTheme } from 'vuetify';

const theme = useTheme();
const primary = theme.current.value.colors.primary;
const success = theme.current.value.colors.success;
const error = theme.current.value.colors.error;
const warning = theme.current.value.colors.warning;

const props = defineProps({
    idUsina: Number,
    ano: String
});

const relatorioPesquisa = ref([]);
const projecaoUsina = ref([]);
const geracaoUsina = ref([]);

const injecoes = ref([]);
const geracoes = ref([]);
const projecoes = ref([]);
const consumo = ref([]);
const dadosUsina = ref([]);

// Filtro de período
const startMonth = ref("jan"); 
const endMonth = ref("dez");  

// Carrega os dados da usina
watch([() => props.idUsina, () => props.ano], async ([idUsina, ano]) => {
    if (!idUsina || !ano) return;

    
    const { data: relatorioPesquisaData } = await useFetch(`${API_BASE_URL}/relatoriousina?idGeradora=${idUsina}&ano=${ano}`);
    const { data: projecaoUsinaData } = await useFetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${idUsina}&ano=${ano}`);
    const { data: geracaoUsinaData } = await useFetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${idUsina}&ano=${ano}`);
    const { data: usina } = await useFetch(`${API_BASE_URL}/usina/${idUsina}`);

    relatorioPesquisa.value = relatorioPesquisaData._rawValue;
    projecaoUsina.value = projecaoUsinaData._rawValue;
    geracaoUsina.value = geracaoUsinaData._rawValue;
    dadosUsina.value = usina._rawValue;

    injecoes.value = [];
    geracoes.value = [];
    projecoes.value = [];
    consumo.value = [];

    for (const rela of relatorioPesquisa.value) {
        injecoes.value.push(Number(rela.injetadoFPonta) + Number(rela.injetadoPonta));
        consumo.value.push(Math.abs((Number(rela.injetadoFPonta) + Number(rela.injetadoPonta)) - (geracaoUsina.value.filter(item => item.mes === rela.mes).reduce((total, item) => total + Number(item.geracao), 0))));
    }

    for (const item of projecaoUsina.value) {
        projecoes.value.push(item.projecao);
    }

    for (const item of geracaoUsina.value) {
        geracoes.value.push(item.geracao);
    }
}, { immediate: true });

// Filtro de período (dados do gráfico)
const filteredData = computed(() => {
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const startIndex = months.indexOf(startMonth.value);
    const endIndex = months.indexOf(endMonth.value) + 1;

    const filteredCategories = months.slice(startIndex, endIndex);
    const filteredInjecoes = injecoes.value.slice(startIndex, endIndex);
    const filteredGeracoes = geracoes.value.slice(startIndex, endIndex);
    const filteredProjecoes = projecoes.value.slice(startIndex, endIndex);
    const filteredConsumo = consumo.value.slice(startIndex, endIndex);

    return {
        categories: filteredCategories,
        injecoes: filteredInjecoes,
        geracoes: filteredGeracoes,
        projecoes: filteredProjecoes,
        consumo: filteredConsumo,
    };
});

// Configuração do gráfico
const chartOptions = computed(() => {
    return {
        series: [
            { name: "Geração Projetada:", data: filteredData.value.projecoes },
            { name: "Geração Real:", data: filteredData.value.geracoes },
            { name: "Consumo (geração):", data: filteredData.value.consumo },
            { name: "Quantidade Injetada:", data: filteredData.value.injecoes },
        ],
        chartOptions: {
            grid: {
                borderColor: 'rgba(0,0,0,0.1)',
                strokeDashArray: 3,
                xaxis: {
                    lines: {
                        show: false
                    }
                },
            },
            plotOptions: {
                bar: { horizontal: false, columnWidth: "35%", borderRadius: [8] },
            },
            colors: [primary, success, error, warning],
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
            title: {
                text: `Relatório Anual de Usina ${dadosUsina.value.nome}`,
                align: 'center',
                style: {
                    fontSize: '18px',
                    color: primary
                }
            },
            legend: {
                show: true,
                position: 'bottom',
                labels: {
                    colors: "#adb0bb",
                    useSeriesColors: true
                }
            },
            xaxis: {
                type: "category",
                categories: filteredData.value.categories,
                labels: {
                    style: { cssClass: "grey--text lighten-2--text fill-color" },
                },
            },
            yaxis: {
                show: true,
                min: 0,
                tickAmount: 10,
                labels: {
                    style: {
                        cssClass: "grey--text lighten-2--text fill-color",
                    },
                },
            },
            stroke: {
                show: true,
                width: 3,
                lineCap: "butt",
                colors: ["transparent"],
            },
            tooltip: { theme: "light" },
            responsive: [
                {
                    breakpoint: 600,
                    options: {
                        plotOptions: {
                            bar: {
                                borderRadius: 3,
                            }
                        },
                    }
                }
            ]
        }
    };
});
 
</script>

<template>
    <v-card elevation="10" class="withbg">
        <v-card-item>
            <div class="d-sm-flex align-center justify-space-between pt-sm-2">
                <div><v-card-title class="text-h5">Relatório Usina (kWh)</v-card-title></div>
            </div>
            <div class="d-flex justify-space-between mt-6">
                <v-select
                    v-model="startMonth"
                    :items="['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']"
                    label="Mês Inicial"
                ></v-select>
                <div style="width: 50px;"></div>
                <v-select
                    v-model="endMonth"
                    :items="['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']"
                    label="Mês Final"
                ></v-select>
            </div>
            <div class="mt-6">
                <apexchart type="bar" height="370px" :options="chartOptions.chartOptions" :series="chartOptions.series"></apexchart>
            </div>
        </v-card-item>
    </v-card>
</template>
