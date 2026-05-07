<script setup>
import { ref } from 'vue';
import { API_BASE_URL } from '~/base/link';
import { computed } from 'vue';
import { useTheme } from 'vuetify';
const theme = useTheme();
const primary = theme.current.value.colors.primary;
const secondary = theme.current.value.colors.secondary;
const success = theme.current.value.colors.success;

const areachartOptions = computed(() => {
    return {
        labels: ['1','2','3','4','5','6','7','8','9','10','11','12'],
        chart: {
            type: 'area',
            height: 110,
            fontFamily: `'Plus Jakarta Sans', system-ui, sans-serif`,
            foreColor: '#94A3B8',
            toolbar: { show: false },
            sparkline: { enabled: false },
            zoom: { enabled: false },
        },
        colors: ['#059669'],
        stroke: { curve: 'smooth', width: 2.5 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.25,
                opacityTo: 0.02,
                stops: [0, 100]
            }
        },
        grid: {
            borderColor: '#F1F5F9',
            strokeDashArray: 4,
            padding: { left: 0, right: 0, top: 0, bottom: 0 }
        },
        markers: { size: 0 },
        xaxis: {
            labels: { style: { fontSize: '10px', fontWeight: 600, fontFamily: 'Plus Jakarta Sans' }, formatter: (v) => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][v-1] || v },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                style: { fontSize: '10px', fontFamily: 'Plus Jakarta Sans' },
                formatter: (v) => v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v}`
            }
        },
        tooltip: {
            theme: 'light',
            y: { formatter: (v) => `R$ ${parseInt(v).toLocaleString('pt-BR')}` }
        },
        dataLabels: { enabled: false }
    };
});

const novaLista = ref([])
const calcularSomaPorMes = (relatorios) => {
    const somaPorMes = {};
    relatorios.forEach(relatorio => {
        const { mes, valorInjTUSD, valorInjTE } = relatorio;
        const chave = `${mes}`;
        if (!somaPorMes[chave]) somaPorMes[chave] = 0;
        somaPorMes[chave] += parseInt(valorInjTUSD) + parseInt(valorInjTE);
    });
    return somaPorMes;
};
const calcularSomaPorAno = (relatorios) => {
    const somaPorAno = {};
    relatorios.forEach(relatorio => {
        const { ano, valorInjTUSD, valorInjTE } = relatorio;
        if (!somaPorAno[ano]) somaPorAno[ano] = 0;
        somaPorAno[ano] += parseInt(valorInjTUSD) + parseInt(valorInjTE);
    });
    return somaPorAno;
};

const anoId = ref(new Date().getFullYear());
const totalAnual = ref(0);
const somaTotalAnual = ref(0);
const mudarAno = () => {
    const limiteSuperior = 2026;
    const limiteInferior = 2023;
    anoId.value = anoId.value < limiteSuperior ? anoId.value + 1 : limiteInferior;
    carregarDados(anoId.value);
};
const carregarDados = async (ano) => {
    const { data: relatorioPesquisa } = await useFetch(`${API_BASE_URL}/relatoriocompensacao?ano=${ano}`);
    novaLista.value = calcularSomaPorMes(relatorioPesquisa._value);
    totalAnual.value = calcularSomaPorAno(relatorioPesquisa._value);
    somaTotalAnual.value = Object.values(totalAnual.value).reduce((acc, curr) => acc + curr, 0);
};
carregarDados(anoId.value);

const areaChart = computed(() => ({
    series: [{ name: 'Compensação', data: Object.values(novaLista.value) }]
}));

// helpers
const fmtBrl = (v) => `R$ ${parseInt(v).toLocaleString('pt-BR')}`;
const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const maiorMes = computed(() => {
    const vals = Object.entries(novaLista.value);
    if (!vals.length) return null;
    const max = vals.reduce((a, b) => b[1] > a[1] ? b : a);
    return { mes: meses[parseInt(max[0])-1], val: max[1] };
});
</script>

<template>
  <div class="gd-root">

    <!-- Cabeçalho do card -->
    <div class="gd-header">
      <div class="gd-header-left">
        <div class="gd-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
        </div>
        <div>
          <p class="gd-eyebrow">Economia gerada · Compensação</p>
          <h3 class="gd-title">Compensação (R$)</h3>
        </div>
      </div>
      <button class="gd-year-btn" @click="mudarAno">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
        </svg>
        {{ anoId }}
      </button>
    </div>

    <!-- KPI principal -->
    <div class="gd-kpi-wrap">
      <div class="gd-kpi-main">
        <span class="gd-kpi-label">Total compensado no ano</span>
        <span class="gd-kpi-val">{{ fmtBrl(somaTotalAnual) }}</span>
      </div>

    </div>

    <!-- Divisor -->
    <div class="gd-divider"></div>

    <!-- Gráfico -->
    <div class="gd-chart-wrap">
      <apexchart
        type="area"
        height="110"
        :options="areachartOptions"
        :series="areaChart.series"
      />
    </div>

    <!-- Mini barras por mês (visual complementar) -->
    <div class="gd-mini-bars">
      <div
        v-for="(val, idx) in Object.values(novaLista)"
        :key="idx"
        class="gd-mini-bar-col"
        :title="`${meses[idx]}: R$ ${parseInt(val).toLocaleString('pt-BR')}`"
      >
        <div
          class="gd-mini-bar-fill"
          :style="{
            height: Math.max(4, (val / Math.max(...Object.values(novaLista))) * 40) + 'px',
            opacity: val === Math.max(...Object.values(novaLista)) ? 1 : 0.45
          }"
        ></div>
        <span class="gd-mini-bar-label">{{ meses[idx] }}</span>
      </div>
    </div>

  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* ══════ ROOT ══════ */
.gd-root {
  background: #ffffff !important;
  border-radius: 16px !important;
  overflow: hidden !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
}

/* ══════ HEADER ══════ */
.gd-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 20px 20px 14px !important;
}
.gd-header-left {
  display: flex !important; align-items: center !important; gap: 12px !important;
}
.gd-icon {
  width: 40px !important; height: 40px !important; border-radius: 11px !important;
  background: #059669 !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  box-shadow: 0 4px 12px rgba(5,150,105,.3) !important; flex-shrink: 0 !important;
}
.gd-eyebrow {
  font-size: 10px !important; font-weight: 700 !important;
  letter-spacing: .1em !important; text-transform: uppercase !important;
  color: #94A3B8 !important; margin: 0 0 1px !important;
}
.gd-title {
  font-size: 15px !important; font-weight: 800 !important;
  color: #0f172a !important; margin: 0 !important;
}
.gd-year-btn {
  display: flex !important; align-items: center !important; gap: 6px !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 12px !important; font-weight: 800 !important;
  color: #059669 !important;
  background: #ECFDF5 !important;
  border: 1.5px solid #A7F3D0 !important;
  border-radius: 20px !important; padding: 6px 14px !important;
  cursor: pointer !important; transition: all .15s !important;
  letter-spacing: .04em !important;
}
.gd-year-btn:hover { background: #D1FAE5 !important; border-color: #059669 !important; }
.gd-year-btn svg { stroke: #059669 !important; }

/* ══════ KPI ══════ */
.gd-kpi-wrap {
  padding: 0 20px 16px !important;
  display: flex !important; align-items: flex-end !important;
  justify-content: space-between !important; gap: 12px !important;
  flex-wrap: wrap !important;
}
.gd-kpi-main { display: flex !important; flex-direction: column !important; gap: 3px !important; }
.gd-kpi-label {
  font-size: 10px !important; font-weight: 700 !important;
  letter-spacing: .1em !important; text-transform: uppercase !important;
  color: #94A3B8 !important;
}
.gd-kpi-val {
  font-size: 34px !important; font-weight: 900 !important;
  letter-spacing: -.03em !important; color: #059669 !important; line-height: 1 !important;
}


/* ══════ DIVIDER ══════ */
.gd-divider {
  height: 1px !important;
  background: linear-gradient(90deg, transparent, #E2E8F0 20%, #E2E8F0 80%, transparent) !important;
  margin: 0 20px !important;
}

/* ══════ CHART ══════ */
.gd-chart-wrap {
  padding: 10px 4px 0 !important;
}

/* ══════ MINI BARS ══════ */
.gd-mini-bars {
  display: flex !important; align-items: flex-end !important;
  gap: 4px !important; padding: 10px 20px 16px !important;
  border-top: 1px solid #F1F5F9 !important;
}
.gd-mini-bar-col {
  flex: 1 !important; display: flex !important; flex-direction: column !important;
  align-items: center !important; gap: 4px !important;
}
.gd-mini-bar-fill {
  width: 100% !important; max-width: 18px !important;
  background: #059669 !important; border-radius: 3px 3px 0 0 !important;
  transition: height .4s ease !important;
}
.gd-mini-bar-label {
  font-size: 8px !important; font-weight: 700 !important;
  color: #94A3B8 !important; letter-spacing: .04em !important;
  text-transform: uppercase !important;
}
</style>