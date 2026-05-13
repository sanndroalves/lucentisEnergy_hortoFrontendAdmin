<script setup>
import { ref, computed } from 'vue';
import { API_BASE_URL } from '~/base/link';
import { useTheme } from 'vuetify';

const theme        = useTheme();
const primary      = theme.current.value.colors.primary;
const lightprimary = theme.current.value.colors.lightprimary;

const anoAtual      = new Date().getFullYear();
const mesAtual      = new Date().getMonth();
const anoParaBuscar = mesAtual === 0 ? anoAtual - 1 : anoAtual;

const { data: dados } = await useFetch(`${API_BASE_URL}/salvar?ano=${anoParaBuscar}`);

const ultDados = dados.value[0];

const projecao = ref(0);
const real     = ref(0);

if (ultDados !== undefined) {
  projecao.value = ultDados.ultimaProjecao;
  real.value     = ultDados.ultimaReal;
}

const Chart = [parseInt(projecao.value / 1000), parseInt(real.value / 1000)];

const chartOptions = computed(() => ({
  labels: ['Projeção', 'Real'],
  chart: {
    type: 'donut',
    fontFamily: `'Plus Jakarta Sans', system-ui, sans-serif`,
    foreColor: '#94A3B8',
    toolbar: { show: false },
  },
  colors: ['#4F46E5', '#059669', '#F1F5F9'],
  plotOptions: {
    pie: {
      startAngle: 0,
      endAngle: 360,
      donut: {
        size: '78%',
        background: 'transparent',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Eficiência',
            fontSize: '11px',
            fontFamily: `'Plus Jakarta Sans', system-ui, sans-serif`,
            fontWeight: 700,
            color: '#94A3B8',
            formatter: () => {
              if (!projecao.value || projecao.value === 0) return '—';
              return ((real.value / projecao.value) * 100).toFixed(1) + '%';
            }
          },
          value: {
            show: false,
          }
        }
      }
    }
  },
  stroke:      { show: false },
  dataLabels:  { enabled: false },
  legend:      { show: false },
  tooltip: {
    theme: 'light',
    fillSeriesColor: false,
    y: { formatter: (v) => `${v} MWh` }
  },
}));

// % de eficiência para a barra
const eficiencia = computed(() => {
  if (!projecao.value || projecao.value === 0) return 0;
  return Math.min(((real.value / projecao.value) * 100), 100).toFixed(1);
});

const eficienciaColor = computed(() => {
  const v = parseFloat(eficiencia.value);
  if (v >= 90) return '#059669';
  if (v >= 70) return '#D97706';
  return '#E11D48';
});
</script>

<template>
  <div class="ag-root">

    <!-- Cabeçalho -->
    <div class="ag-header">
      <div class="ag-header-left">
        <div class="ag-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div>
          <p class="ag-eyebrow">Desempenho · {{ anoParaBuscar }}</p>
          <h3 class="ag-title">Análise de Geração</h3>
        </div>
      </div>
    </div>

    <!-- Corpo -->
    <div class="ag-body">

      <!-- Coluna esquerda: KPI + legenda + barra -->
      <div class="ag-left">
        <div class="ag-kpi-block">
          <span class="ag-kpi-label">Total gerado último mês</span>
          <span class="ag-kpi-val">{{ parseInt(real / 1000) }} <span class="ag-kpi-unit">MWh</span></span>
        </div>

        <!-- Legenda -->
        <div class="ag-legend">
          <div class="ag-legend-item">
            <span class="ag-legend-dot" style="background:#4F46E5"></span>
            <span class="ag-legend-lbl">Projeção</span>
            <span class="ag-legend-num">{{ parseInt(projecao / 1000) }} MWh</span>
          </div>
          <div class="ag-legend-item">
            <span class="ag-legend-dot" style="background:#059669"></span>
            <span class="ag-legend-lbl">Real</span>
            <span class="ag-legend-num">{{ parseInt(real / 1000) }} MWh</span>
          </div>
        </div>

        <!-- Barra de eficiência -->
        <div class="ag-eff-wrap">
          <div class="ag-eff-labels">
            <span class="ag-eff-lbl">Eficiência</span>
            <span class="ag-eff-pct" :style="{ color: eficienciaColor }">{{ eficiencia }}%</span>
          </div>
          <div class="ag-eff-track">
            <div class="ag-eff-fill"
              :style="{ width: eficiencia + '%', background: eficienciaColor }">
            </div>
          </div>
        </div>
      </div>

      <!-- Coluna direita: donut -->
      <div class="ag-right">
        <apexchart
          type="donut"
          height="160"
          :options="chartOptions"
          :series="Chart"
        />
      </div>

    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* ══════ ROOT ══════ */
.ag-root {
  background: #ffffff !important;
  border-radius: 16px !important;
  overflow: hidden !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
}

/* ══════ HEADER ══════ */
.ag-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 18px 20px 12px !important;
  border-bottom: 1px solid #F1F5F9 !important;
}
.ag-header-left {
  display: flex !important; align-items: center !important; gap: 12px !important;
}
.ag-icon {
  width: 36px !important; height: 36px !important; border-radius: 10px !important;
  background: linear-gradient(135deg, #4F46E5, #059669) !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  box-shadow: 0 3px 10px rgba(79,70,229,.25) !important; flex-shrink: 0 !important;
}
.ag-eyebrow {
  font-size: 10px !important; font-weight: 700 !important; letter-spacing: .1em !important;
  text-transform: uppercase !important; color: #94A3B8 !important; margin: 0 0 1px !important;
}
.ag-title {
  font-size: 14px !important; font-weight: 800 !important; color: #0f172a !important; margin: 0 !important;
}

/* ══════ BODY ══════ */
.ag-body {
  display: flex !important;
  align-items: center !important;
  padding: 16px 20px 20px !important;
  gap: 16px !important;
}

/* ── Left ── */
.ag-left {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
}

/* KPI */
.ag-kpi-block { display: flex !important; flex-direction: column !important; gap: 2px !important; }
.ag-kpi-label {
  font-size: 10px !important; font-weight: 700 !important; letter-spacing: .1em !important;
  text-transform: uppercase !important; color: #94A3B8 !important;
}
.ag-kpi-val {
  font-size: 30px !important; font-weight: 900 !important;
  color: #059669 !important; letter-spacing: -.03em !important; line-height: 1 !important;
}
.ag-kpi-unit {
  font-size: 16px !important; font-weight: 700 !important; color: #94A3B8 !important;
}

/* Legenda */
.ag-legend { display: flex !important; flex-direction: column !important; gap: 6px !important; }
.ag-legend-item {
  display: flex !important; align-items: center !important; gap: 8px !important;
}
.ag-legend-dot {
  width: 8px !important; height: 8px !important; border-radius: 50% !important; flex-shrink: 0 !important;
}
.ag-legend-lbl {
  font-size: 12px !important; font-weight: 600 !important; color: #64748b !important; flex: 1 !important;
}
.ag-legend-num {
  font-size: 12px !important; font-weight: 800 !important; color: #0f172a !important;
  font-family: 'DM Mono', monospace, sans-serif !important;
}

/* Barra de eficiência */
.ag-eff-wrap { display: flex !important; flex-direction: column !important; gap: 5px !important; }
.ag-eff-labels {
  display: flex !important; align-items: center !important; justify-content: space-between !important;
}
.ag-eff-lbl { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .1em !important; text-transform: uppercase !important; color: #94A3B8 !important; }
.ag-eff-pct { font-size: 14px !important; font-weight: 900 !important; letter-spacing: -.02em !important; }
.ag-eff-track {
  height: 6px !important; background: #F1F5F9 !important; border-radius: 4px !important; overflow: hidden !important;
}
.ag-eff-fill {
  height: 100% !important; border-radius: 4px !important; transition: width .5s ease !important;
}

/* ── Right: donut ── */
.ag-right {
  flex-shrink: 0 !important;
  width: 160px !important;
}
</style>