// composables/useClimaHoje.ts
//
// Previsão de clima de hoje para Hortolândia (Open-Meteo, API pública sem
// chave) + nível de geração esperado. Mesmo heurístico transparente do
// components/home/WeatherIntelPopup.vue: radiação solar diária prevista,
// rebaixada um degrau quando a probabilidade de chuva é alta.

import { ref, computed } from 'vue';

const LAT = -22.8593;
const LON = -47.2199;

export interface PrevisaoDia {
  radiacao: number | null; // MJ/m²/dia
  chuvaPct: number | null;
  tMax: number | null;
  tMin: number | null;
  codigoTempo: number | null;
}

// Códigos WMO usados pelo Open-Meteo
function descreverTempo(codigo: number | null): { icone: string; texto: string } {
  if (codigo == null) return { icone: '🌡️', texto: 'Sem descrição' };
  if (codigo === 0) return { icone: '☀️', texto: 'Céu limpo' };
  if (codigo <= 2) return { icone: '🌤️', texto: 'Poucas nuvens' };
  if (codigo === 3) return { icone: '☁️', texto: 'Nublado' };
  if (codigo === 45 || codigo === 48) return { icone: '🌫️', texto: 'Neblina' };
  if (codigo >= 51 && codigo <= 57) return { icone: '🌦️', texto: 'Garoa' };
  if (codigo >= 61 && codigo <= 67) return { icone: '🌧️', texto: 'Chuva' };
  if (codigo >= 80 && codigo <= 82) return { icone: '🌧️', texto: 'Pancadas de chuva' };
  if (codigo >= 95) return { icone: '⛈️', texto: 'Trovoadas' };
  return { icone: '⛅', texto: 'Tempo variável' };
}

export function useClimaHoje() {
  const carregando = ref(true);
  const erro = ref(false);
  const previsao = ref<PrevisaoDia | null>(null);

  async function carregar() {
    carregando.value = true;
    erro.value = false;
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
        `&daily=shortwave_radiation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,weathercode` +
        `&timezone=America%2FSao_Paulo&forecast_days=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      previsao.value = {
        radiacao: json.daily.shortwave_radiation_sum?.[0] ?? null,
        chuvaPct: json.daily.precipitation_probability_max?.[0] ?? null,
        tMax: json.daily.temperature_2m_max?.[0] ?? null,
        tMin: json.daily.temperature_2m_min?.[0] ?? null,
        codigoTempo: json.daily.weathercode?.[0] ?? null,
      };
    } catch {
      erro.value = true;
    } finally {
      carregando.value = false;
    }
  }

  /** 'alta' | 'media' | 'baixa' | null */
  const nivel = computed(() => {
    const p = previsao.value;
    if (!p || p.radiacao == null) return null;
    const chuva = p.chuvaPct ?? 0;
    let n = p.radiacao >= 20 ? 'alta' : p.radiacao >= 12 ? 'media' : 'baixa';
    if (chuva >= 70 && n === 'alta') n = 'media';
    else if (chuva >= 70 && n === 'media') n = 'baixa';
    return n;
  });

  /** Radiação convertida de MJ/m² para kWh/m² (= horas de sol pleno). */
  const radiacaoKwh = computed(() =>
    previsao.value?.radiacao != null ? previsao.value.radiacao / 3.6 : null,
  );

  const tempo = computed(() => descreverTempo(previsao.value?.codigoTempo ?? null));

  return { carregando, erro, previsao, nivel, radiacaoKwh, tempo, carregar };
}
