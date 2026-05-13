<script setup>
import { ref, computed, watch } from 'vue';
import { useTheme } from 'vuetify';
import { API_BASE_URL } from '~/base/link';

const theme     = useTheme();
const primary   = theme.current.value.colors.primary;
const secondary = theme.current.value.colors.secondary;

const select = ref(new Date().getFullYear());
const items  = ref(['2026', '2025', '2024', '2023']);

const itemProjecao    = ref({});
const itemReal        = ref({});
const ultimaProjetada = ref('');
const ultimaReal      = ref('');

const carregarDados = async (anoId) => {
  const projecao = (await useFetch(`${API_BASE_URL}/projecaogeracao`)).data.value;
  const real     = (await useFetch(`${API_BASE_URL}/relatoriogeracao`)).data.value;
  if (!projecao || !real) return;

  const totalPorMesProjecao = projecao
    .filter(i => i.ano === parseInt(anoId))
    .reduce((acc, i) => { acc[i.mes] = (acc[i.mes] || 0) + parseInt(i.projecao); return acc; }, {});

  const totalPorMesReal = real
    .filter(i => i.ano === parseInt(anoId))
    .reduce((acc, i) => { acc[i.mes] = (acc[i.mes] || 0) + parseInt(i.geracao); return acc; }, {});

  itemProjecao.value = totalPorMesProjecao;
  itemReal.value     = totalPorMesReal;

  const mesAtual       = new Date().getMonth() + 1;
  const mesParaBuscar  = mesAtual === 1 ? 12 : mesAtual - 1;
  ultimaProjetada.value = totalPorMesProjecao[mesParaBuscar] || 0;
  ultimaReal.value      = Object.values(totalPorMesReal).pop() || 0;

  const { data: dadosSalvar } = await useFetch(`${API_BASE_URL}/salvar?ano=${anoId}`);
  const idSalvar = ref('');
  if (dadosSalvar.value && dadosSalvar.value[0]) {
    idSalvar.value = dadosSalvar.value[0].id;
    await useFetch(`${API_BASE_URL}/salvar/${idSalvar.value}`, { method: 'DELETE', key: 'deleteDados' });
  }
  await useFetch(`${API_BASE_URL}/salvar/`, {
    method: 'POST',
    body: { ultimaProjecao: ultimaProjetada.value, ultimaReal: ultimaReal.value, ano: anoId },
    key: 'salvarUltimas',
  });
};

watch(select, async (newYear) => {
  chartReady.value = false;
  await carregarDados(newYear);
  chartReady.value = true;
});

const chartOptions = computed(() => ({
  series: [
    { name: 'Projeção', data: Object.values(itemProjecao.value || {}) },
    { name: 'Real',     data: Object.values(itemReal.value || {}) },
  ],
  chartOptions: {
    grid: {
      borderColor: '#F1F5F9',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    plotOptions: {
      bar: { horizontal: false, columnWidth: '38%', borderRadius: 6, borderRadiusApplication: 'end' }
    },
    colors: ['#4F46E5', '#059669'],
    chart: {
      type: 'bar',
      height: 320,
      toolbar: { show: false },
      foreColor: '#94A3B8',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      sparkline: { enabled: false },
    },
    dataLabels: { enabled: false },
    markers:    { size: 0 },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      fontWeight: 700,
      fontSize: '12px',
      markers: { radius: 4 },
      itemMargin: { horizontal: 12 },
    },
    xaxis: {
      type: 'category',
      categories: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
      axisBorder: { show: false },
      axisTicks:  { show: false },
      labels: { style: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 600, fontSize: '11px', colors: '#94A3B8' } },
    },
    yaxis: {
      show: true,
      min: 0,
      tickAmount: 6,
      labels: {
        style: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 600, fontSize: '11px', colors: '#94A3B8' },
        formatter: (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v,
      },
    },
    stroke:  { show: true, width: 2, colors: ['transparent'] },
    tooltip: {
      theme: 'light',
      y: { formatter: (v) => `${parseInt(v).toLocaleString('pt-BR')} kWh` },
    },
    responsive: [{ breakpoint: 600, options: { plotOptions: { bar: { borderRadius: 3 } } } }],
  },
}));

// KPIs calculados
const totalProjecao = computed(() => Object.values(itemProjecao.value).reduce((a,v)=>a+v,0));
const totalReal     = computed(() => Object.values(itemReal.value).reduce((a,v)=>a+v,0));
const eficiencia    = computed(() => totalProjecao.value > 0 ? ((totalReal.value / totalProjecao.value) * 100).toFixed(1) : '—');

const chartReady = ref(false);

carregarDados(select.value).then(() => { chartReady.value = true; });
</script>

<template>
  <div class="rg-root">

    <!-- Cabeçalho -->
    <div class="rg-header">
      <div class="rg-header-left">
        <div class="rg-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
            <rect x="3" y="3" width="4" height="18" rx="1"/>
            <rect x="10" y="8" width="4" height="13" rx="1"/>
            <rect x="17" y="5" width="4" height="16" rx="1"/>
          </svg>
        </div>
        <div>
          <p class="rg-eyebrow">Desempenho anual · kWh</p>
          <h3 class="rg-title">Relatório de Geração</h3>
        </div>
      </div>

      <div class="rg-header-right">
        <!-- KPIs inline -->
        <div class="rg-kpi-mini rg-kpi-indigo">
          <span class="rg-kpi-mini-lbl">Projetado</span>
          <span class="rg-kpi-mini-val">{{ parseInt(totalProjecao/1000).toLocaleString('pt-BR') }} MWh</span>
        </div>
        <div class="rg-kpi-mini rg-kpi-green">
          <span class="rg-kpi-mini-lbl">Real</span>
          <span class="rg-kpi-mini-val">{{ parseInt(totalReal/1000).toLocaleString('pt-BR') }} MWh</span>
        </div>
        <div class="rg-kpi-mini rg-kpi-amber">
          <span class="rg-kpi-mini-lbl">Eficiência</span>
          <span class="rg-kpi-mini-val">{{ eficiencia }}%</span>
        </div>

        <!-- Seletor de ano -->
        <div class="rg-year-wrap">
          <select v-model="select" class="rg-year-select" @change="carregarDados(select)">
            <option v-for="y in items" :key="y" :value="y">{{ y }}</option>
          </select>
          <svg class="rg-year-arr" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Divisor -->
    <div class="rg-divider"></div>

    <!-- Gráfico -->
    <div class="rg-chart">
      <apexchart
        v-if="chartReady"
        type="bar"
        height="300"
        :options="chartOptions.chartOptions"
        :series="chartOptions.series"
      />
      <div v-else class="rg-loading">
        <div class="rg-loading-spinner"></div>
        <span>Carregando dados...</span>
      </div>
    </div>

  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* ══════ ROOT ══════ */
.rg-root {
  background: #ffffff !important;
  border-radius: 16px !important;
  overflow: hidden !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
}

/* ══════ HEADER ══════ */
.rg-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 18px 20px 14px !important;
  gap: 12px !important;
  flex-wrap: wrap !important;
}
.rg-header-left {
  display: flex !important; align-items: center !important; gap: 12px !important;
}
.rg-icon {
  width: 38px !important; height: 38px !important; border-radius: 10px !important;
  background: linear-gradient(135deg, #4F46E5, #059669) !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  box-shadow: 0 3px 10px rgba(79,70,229,.25) !important; flex-shrink: 0 !important;
}
.rg-eyebrow {
  font-size: 10px !important; font-weight: 700 !important; letter-spacing: .1em !important;
  text-transform: uppercase !important; color: #94A3B8 !important; margin: 0 0 1px !important;
}
.rg-title {
  font-size: 15px !important; font-weight: 800 !important; color: #0f172a !important; margin: 0 !important;
}

/* KPIs inline */
.rg-header-right {
  display: flex !important; align-items: center !important; gap: 8px !important; flex-wrap: wrap !important;
}
.rg-kpi-mini {
  display: flex !important; flex-direction: column !important; gap: 1px !important;
  padding: 7px 12px !important; border-radius: 10px !important;
  border: 1px solid transparent !important;
}
.rg-kpi-indigo { background: #EEF2FF !important; border-color: #C7D2FE !important; }
.rg-kpi-green  { background: #ECFDF5 !important; border-color: #A7F3D0 !important; }
.rg-kpi-amber  { background: #FFFBEB !important; border-color: #FDE68A !important; }
.rg-kpi-mini-lbl {
  font-size: 9px !important; font-weight: 700 !important; letter-spacing: .1em !important;
  text-transform: uppercase !important;
}
.rg-kpi-indigo .rg-kpi-mini-lbl { color: #4F46E5 !important; }
.rg-kpi-green  .rg-kpi-mini-lbl { color: #059669 !important; }
.rg-kpi-amber  .rg-kpi-mini-lbl { color: #D97706 !important; }
.rg-kpi-mini-val {
  font-size: 13px !important; font-weight: 900 !important; letter-spacing: -.02em !important;
}
.rg-kpi-indigo .rg-kpi-mini-val { color: #4F46E5 !important; }
.rg-kpi-green  .rg-kpi-mini-val { color: #059669 !important; }
.rg-kpi-amber  .rg-kpi-mini-val { color: #D97706 !important; }

/* Seletor de ano */
.rg-year-wrap {
  position: relative !important; display: inline-flex !important; align-items: center !important;
}
.rg-year-select {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 13px !important; font-weight: 800 !important; color: #0f172a !important;
  background: #F8FAFC !important; border: 1.5px solid #E2E8F0 !important;
  border-radius: 10px !important; padding: 7px 32px 7px 14px !important;
  outline: none !important; cursor: pointer !important;
  -webkit-appearance: none !important; appearance: none !important;
  transition: border-color .14s !important;
}
.rg-year-select:focus { border-color: #4F46E5 !important; }
.rg-year-arr {
  position: absolute !important; right: 10px !important; pointer-events: none !important;
  color: #94A3B8 !important;
}

/* Divisor */
.rg-divider {
  height: 1px !important;
  background: linear-gradient(90deg, transparent, #E2E8F0 15%, #E2E8F0 85%, transparent) !important;
  margin: 0 20px !important;
}

/* Gráfico */
.rg-chart { padding: 8px 8px 4px !important; }

/* ══════ LOADING ══════ */
.rg-loading {
  display: flex !important; flex-direction: column !important;
  align-items: center !important; justify-content: center !important;
  gap: 12px !important; height: 300px !important;
  color: #94A3B8 !important; font-size: 13px !important; font-weight: 600 !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
}
.rg-loading-spinner {
  width: 32px !important; height: 32px !important; border-radius: 50% !important;
  border: 3px solid #EEF2FF !important; border-top-color: #4F46E5 !important;
  animation: rgSpin .7s linear infinite !important;
}
@keyframes rgSpin { to { transform: rotate(360deg); } }
</style>