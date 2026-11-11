<script setup>
// components/home/WeatherIntelPopup.vue
//
// Popup de clima + "Lucentis Intelligence": uma previsão de geração para hoje.
//
// Fonte de clima: Open-Meteo (api.open-meteo.com) — API pública, gratuita,
// sem chave, sem CORS bloqueado. Real, não mockada.
//
// "Lucentis Intelligence" NÃO é uma IA generativa por trás disso — é um
// heurístico transparente e documentado (radiação solar prevista +
// probabilidade de chuva), no mesmo espírito do City Energy Score: a fórmula
// fica visível no código e no popup, nada de caixa-preta. Colocar uma chamada
// de LLM real aqui exigiria uma chave de API exposta no frontend (o mesmo
// problema de segurança já identificado no Map2.vue) — por isso a
// "inteligência" é uma regra determinística e auditável, não uma promessa
// de IA que na prática seria insegura de implementar no cliente.

import { ref, computed, onMounted } from 'vue';

const props = defineProps({ modelValue: { type: Boolean, default: true } });
const emit = defineEmits(['update:modelValue']);

// Hortolândia/SP
const LAT = -22.8593;
const LON = -47.2199;

const carregando = ref(true);
const erro = ref(false);
const previsao = ref(null); // { radiacao, chuvaPct, tMax, tMin, codigoTempo }

async function carregarPrevisao() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&daily=shortwave_radiation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,weathercode` +
      `&timezone=America%2FSao_Paulo&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    previsao.value = {
      radiacao: json.daily.shortwave_radiation_sum?.[0] ?? null, // MJ/m²/dia
      chuvaPct: json.daily.precipitation_probability_max?.[0] ?? null,
      tMax: json.daily.temperature_2m_max?.[0] ?? null,
      tMin: json.daily.temperature_2m_min?.[0] ?? null,
      codigoTempo: json.daily.weathercode?.[0] ?? null,
    };
  } catch (e) {
    erro.value = true;
  } finally {
    carregando.value = false;
  }
}
onMounted(carregarPrevisao);

// ─── Heurístico documentado (nada de caixa-preta) ───────────────────────
// Radiação solar diária (MJ/m²) é o principal preditor de geração FV.
// Faixas calibradas para o Sudeste do Brasil em dias de céu aberto (~22-26)
// vs. nublado (~8-14) vs. muito nublado/chuvoso (<8). A probabilidade de
// chuva rebaixa o nível em um degrau quando alta, porque nuvem de chuva
// carregada reduz irradiância mesmo quando a média diária parece ok.
const nivelGeracao = computed(() => {
  if (!previsao.value || previsao.value.radiacao == null) return null;
  const rad = previsao.value.radiacao;
  const chuva = previsao.value.chuvaPct ?? 0;
  let nivel = rad >= 20 ? 'alta' : rad >= 12 ? 'media' : 'baixa';
  if (chuva >= 70 && nivel === 'alta') nivel = 'media';
  if (chuva >= 70 && nivel === 'media') nivel = 'baixa';
  return nivel;
});

const nivelInfo = computed(() => ({
  alta:  { label: 'Alta geração esperada',  cor: '#34d399', desc: 'Céu favorável — usinas devem operar próximo do pico.' },
  media: { label: 'Geração moderada esperada', cor: '#ffae1f', desc: 'Nebulosidade parcial pode reduzir a produção ao longo do dia.' },
  baixa: { label: 'Baixa geração esperada', cor: '#e0554f', desc: 'Céu encoberto/chuva devem limitar a geração fotovoltaica hoje.' },
}[nivelGeracao.value] || { label: '', cor: '#94A3B8', desc: '' }));

const fechar = () => emit('update:modelValue', false);
</script>

<template>
  <Teleport to="body">
  <div class="wi-backdrop" v-if="modelValue" @click.self="fechar">
    <div class="wi-card">
      <button class="wi-close" @click="fechar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <span class="wi-eyebrow">LUCENTIS INTELLIGENCE · Previsão do dia</span>
      <h3 class="wi-title">Como está o dia para gerar energia?</h3>

      <div v-if="carregando" class="wi-loading">
        <v-progress-circular indeterminate size="24" width="2" color="#22d3ee" />
        <span>Consultando previsão do tempo...</span>
      </div>

      <div v-else-if="erro" class="wi-error">
        Não foi possível consultar a previsão do tempo agora. Tente novamente mais tarde.
      </div>

      <div v-else class="wi-body">
        <div class="wi-weather-row">
          <div class="wi-temp">
            <span class="wi-temp-max">{{ Math.round(previsao.tMax) }}°</span>
            <span class="wi-temp-min">/ {{ Math.round(previsao.tMin) }}°</span>
          </div>
          <div class="wi-weather-meta">
            <span>{{ previsao.chuvaPct }}% chance de chuva</span>
            <span>{{ previsao.radiacao?.toFixed(1) }} MJ/m² de radiação prevista</span>
          </div>
        </div>

        <div class="wi-verdict" :style="{ '--vc': nivelInfo.cor }">
          <span class="wi-verdict-dot"></span>
          <div>
            <p class="wi-verdict-label">{{ nivelInfo.label }}</p>
            <p class="wi-verdict-desc">{{ nivelInfo.desc }}</p>
          </div>
        </div>

        <p class="wi-formula-note">Estimativa baseada em radiação solar prevista e probabilidade de chuva (Open-Meteo) — não é uma média de geração real das usinas.</p>
      </div>

      <div class="wi-actions">
        <a href="/painel" class="wi-btn-primary">Ver Painel em Tempo Real →</a>
        <button class="wi-btn-secondary" @click="fechar">Fechar</button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<style scoped>
.wi-backdrop {
  position: fixed; inset: 0; z-index: 940;
  background: rgba(4,9,16,.72); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.wi-card {
  width: 100%; max-width: 440px; position: relative;
  background: linear-gradient(165deg, #101f30, #0d1826);
  border: 1px solid rgba(255,255,255,.08); border-radius: 18px;
  padding: 26px 24px 20px; box-shadow: 0 24px 60px rgba(0,0,0,.5);
  font-family: var(--lct-font-body, 'Public Sans', sans-serif); color: #fff;
}
.wi-close {
  position: absolute; top: 14px; right: 14px; width: 26px; height: 26px; border-radius: 8px;
  background: rgba(255,255,255,.06); border: none; color: rgba(255,255,255,.5);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.wi-close:hover { background: rgba(255,255,255,.12); color: #fff; }
.wi-eyebrow { font-family: var(--lct-font-mono, monospace); font-size: 10px; letter-spacing: .1em; color: #22d3ee; }
.wi-title { font-family: var(--lct-font-display, sans-serif); font-size: 19px; font-weight: 700; margin: 6px 0 18px; padding-right: 20px; }
.wi-loading, .wi-error { display: flex; align-items: center; gap: 10px; font-size: 13px; color: rgba(255,255,255,.5); padding: 10px 0 4px; }
.wi-weather-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.wi-temp { font-family: var(--lct-font-display, sans-serif); font-weight: 700; }
.wi-temp-max { font-size: 2rem; }
.wi-temp-min { font-size: 1.1rem; color: rgba(255,255,255,.4); }
.wi-weather-meta { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: rgba(255,255,255,.5); text-align: right; }
.wi-verdict {
  display: flex; align-items: flex-start; gap: 10px; margin-top: 18px; padding: 14px;
  background: color-mix(in srgb, var(--vc) 12%, transparent); border: 1px solid color-mix(in srgb, var(--vc) 35%, transparent);
  border-radius: 12px;
}
.wi-verdict-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--vc); margin-top: 5px; flex-shrink: 0; box-shadow: 0 0 8px var(--vc); }
.wi-verdict-label { font-weight: 700; font-size: 13px; margin: 0; color: var(--vc); }
.wi-verdict-desc { font-size: 12px; color: rgba(255,255,255,.55); margin: 3px 0 0; }
.wi-formula-note { font-size: 10px; color: rgba(255,255,255,.3); margin: 12px 0 0; line-height: 1.4; }
.wi-actions { display: flex; gap: 10px; margin-top: 20px; }
.wi-btn-primary {
  flex: 1; text-align: center; background: #22d3ee; color: #0d1826; font-weight: 800; font-size: 12.5px;
  padding: 11px; border-radius: 10px; text-decoration: none;
}
.wi-btn-primary:hover { background: #67e3f5; }
.wi-btn-secondary { background: rgba(255,255,255,.06); color: rgba(255,255,255,.6); border: none; border-radius: 10px; padding: 11px 16px; font-size: 12.5px; cursor: pointer; }
.wi-btn-secondary:hover { background: rgba(255,255,255,.12); color: #fff; }
</style>