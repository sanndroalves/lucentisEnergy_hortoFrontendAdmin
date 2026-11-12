<script setup>
// Mapa das usinas (e, para o admin, das unidades: prédios e IP).
//
// Camadas — correção do bug "volto para Prédios e aparecem IP + Prédios":
// as unidades são geocodificadas em lotes (demora). Antes, ao trocar de camada
// no meio do carregamento, o laço antigo continuava colocando marcadores no
// mapa. Agora cada camada guarda os próprios marcadores; trocar de camada só
// esconde/mostra, e um marcador só entra no mapa se a camada dele for a ativa.
// As coordenadas ficam em cache (memória + navegador), então voltar para uma
// camada já carregada é instantâneo e não repete chamadas ao Google.
import { API_BASE_URL } from '~/base/link';
import { Map, MapStyle, Marker, config, Popup } from '@maptiler/sdk';
import { shallowRef, ref, onMounted, onUnmounted, markRaw, computed } from 'vue';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import * as turf from '@turf/turf';

const mapContainer = shallowRef(null);
const map = shallowRef(null);
const dialogUsina = ref(false);
const usinaSelecionada = ref(null);
const modoVisualizacao = ref('geral');

const { data } = useAuth();
const isAdmin = computed(() => data.value?.username === 'admin');

const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);
const { data: imagens } = await useFetch(`${API_BASE_URL}/imagens/`);
const { data: geracoes } = await useFetch(`${API_BASE_URL}/relatoriogeracao/`);
const { data: injecoes } = await useFetch(`${API_BASE_URL}/relatoriousina/`);
const { data: unidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao`);

// ── cores (mesmas do resto do sistema) ──
const SEC = {
  E: { txt: 'Educação', c: '#34d37a' },
  S: { txt: 'Saúde', c: '#22c5e0' },
  O: { txt: 'Outros', c: '#ffa12e' },
  I: { txt: 'Iluminação', c: '#ff6b4a' },
  P: { txt: 'Praças', c: '#a855f7' },
};
const corSec = (s) => SEC[s]?.c ?? '#9aa7cc';
const txtSec = (s) => SEC[s]?.txt ?? 'Outros';
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const num = (v) => Number(v) || 0;

// ── geocodificação com cache ─────────────────────────────────────
const apiKey = 'AIzaSyA5BEipnfIyp7WAtvZq6u21oR8oKx1Sa9Q';
const CACHE_KEY = 'lx-mapa-geo-v1';
const geoCache = new globalThis.Map();
try { Object.entries(JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')).forEach(([k, v]) => geoCache.set(k, v)); } catch { /* sem cache */ }
let salvarT = 0;
const salvarCache = () => {
  clearTimeout(salvarT);
  salvarT = setTimeout(() => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(geoCache))); } catch { /* cheio/bloqueado */ } }, 800);
};
const geocodeEndereco = async (endereco) => {
  const chave = String(endereco).trim().toLowerCase();
  if (geoCache.has(chave)) return geoCache.get(chave);
  try {
    const r = await $fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${String(endereco).replace(/ /g, '_')}&key=${apiKey}`);
    const loc = r?.results?.[0]?.geometry?.location;
    const ll = loc ? [loc.lng, loc.lat] : null;
    if (ll) { geoCache.set(chave, ll); salvarCache(); }
    return ll;
  } catch { return null; }
};

// ── marcadores por camada (objetos comuns, fora da reatividade) ──
const camadaAtiva = ref('usinas');
const marcadores = { usinas: [], predios: [], ip: [] };
const iniciados = { predios: new Set(), ip: new Set() }; // ids já geocodificados (ou em andamento)
const carregandoCamada = ref(false);
const progresso = ref({ feito: 0, total: 0 });
let rodada = 0;

const naCamada = (u, camada) => (camada === 'predios' ? ['E', 'S', 'O'] : ['P', 'I']).includes(u.secretaria);
const contagem = computed(() => {
  const l = unidades.value ?? [];
  return { predios: l.filter(u => naCamada(u, 'predios')).length, ip: l.filter(u => naCamada(u, 'ip')).length, usinas: (usinas.value ?? []).length };
});

const popupUsina = (u) => {
  const cor = corSec(u.secretaria);
  return `
  <div class="lxp" style="--c:${cor}">
    <span class="lxp-badge"><i></i>${esc(txtSec(u.secretaria))}</span>
    <div class="lxp-nome">${esc(u.nome)}</div>
    <div class="lxp-sub">${esc(u.potencia)} kWp · ${esc(u.qtdPlaca ?? 0)} placas</div>
    <button class="lxp-btn" onclick="window.abrirDialogUsina('${esc(u.id)}')">Ver detalhes →</button>
  </div>`;
};
const popupUnidade = (u) => `
  <div class="lxp" style="--c:${corSec(u.secretaria)}">
    <span class="lxp-badge"><i></i>${esc(txtSec(u.secretaria))}</span>
    <div class="lxp-uc">UC ${esc(u.uc ?? '—')}</div>
    <div class="lxp-nome">${esc(u.nome ?? '—')}</div>
    ${u.endereco ? `<div class="lxp-sub">${esc(u.endereco)}</div>` : ''}
  </div>`;

const criarMarkerUsina = (u, lnglat) => {
  const cor = corSec(u.secretaria);
  const el = document.createElement('div');
  el.className = 'lxm-usina';
  el.style.setProperty('--c', cor);
  el.innerHTML = `
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" aria-hidden="true">
      <ellipse cx="17" cy="40" rx="6" ry="2" fill="rgba(0,0,0,.35)"/>
      <path d="M17 2C9.8 2 4 7.8 4 15C4 23.5 17 38 17 38C17 38 30 23.5 30 15C30 7.8 24.2 2 17 2Z" fill="#0d1330" stroke="${cor}" stroke-width="1.8"/>
      <circle cx="17" cy="15" r="7.5" fill="${cor}" fill-opacity=".18" stroke="${cor}" stroke-width="1"/>
      <circle cx="17" cy="15" r="3.8" fill="${cor}"/>
      <circle cx="15.5" cy="13.5" r="1.1" fill="rgba(255,255,255,.6)"/>
    </svg>`;
  return new Marker({ element: el }).setLngLat(lnglat).setPopup(new Popup({ offset: 22, className: 'lx-popup', closeButton: false }).setHTML(popupUsina(u)));
};

const criarMarkerUnidade = (u, lnglat) => {
  const el = document.createElement('div');
  el.className = 'lxm-uni';
  el.style.setProperty('--c', corSec(u.secretaria));
  el.innerHTML = '<i></i>';
  return new Marker({ element: el }).setLngLat(lnglat).setPopup(new Popup({ offset: 12, className: 'lx-popup', closeButton: false }).setHTML(popupUnidade(u)));
};

const alterarCamada = async (nova) => {
  if (nova === camadaAtiva.value || !map.value) return;
  camadaAtiva.value = nova;
  const minha = ++rodada;

  // esconde as outras camadas e mostra o que já existe desta
  Object.keys(marcadores).forEach((c) => { if (c !== nova) marcadores[c].forEach(m => m.remove()); });
  marcadores[nova].forEach(m => m.addTo(map.value));

  if (nova === 'usinas') { carregandoCamada.value = false; return; }

  const todas = (unidades.value ?? []).filter(u => naCamada(u, nova));
  const faltam = todas.filter(u => !iniciados[nova].has(u.id));
  progresso.value = { feito: todas.length - faltam.length, total: todas.length };
  if (!faltam.length) { carregandoCamada.value = false; return; }
  carregandoCamada.value = true;

  const LOTE = 8;
  for (let i = 0; i < faltam.length; i += LOTE) {
    if (minha !== rodada) return; // trocou de camada: para (o que já foi feito fica guardado)
    await Promise.all(faltam.slice(i, i + LOTE).map(async (u) => {
      if (iniciados[nova].has(u.id)) return;
      iniciados[nova].add(u.id);
      const endereco = u.endereco ?? u.logradouro ?? u.nome ?? '';
      const ll = endereco ? await geocodeEndereco(`${endereco}, Hortolândia SP`) : null;
      if (minha === rodada) progresso.value = { ...progresso.value, feito: progresso.value.feito + 1 };
      if (!ll) return;
      const m = criarMarkerUnidade(u, ll);
      marcadores[nova].push(m);
      if (camadaAtiva.value === nova) m.addTo(map.value); // só entra no mapa se esta camada ainda estiver ativa
    }));
  }
  if (minha === rodada) carregandoCamada.value = false;
};

// ── dialog da usina ─────────────────────────────────────────────
const imagensSelecionada = ref([]);
const dataSelecionada = ref(new Date());
const mesAtual = computed(() => dataSelecionada.value.getMonth() + 1);
const anoAtual = computed(() => dataSelecionada.value.getFullYear());
const mesAnoLabel = computed(() => dataSelecionada.value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
const mudarMes = (d) => { const x = new Date(dataSelecionada.value); x.setMonth(x.getMonth() + d); dataSelecionada.value = x; };

const injetado = (r) => num(r.injetadoPonta) + num(r.injetadoFPonta);
const doUsina = (lista) => (lista ?? []).filter(i => i.idGeradora === usinaSelecionada.value?.id);
const totalGerado = computed(() => doUsina(geracoes.value).reduce((a, i) => a + num(i.geracao), 0));
const totalInjetado = computed(() => doUsina(injecoes.value).reduce((a, i) => a + injetado(i), 0));
const totalGeradoMes = computed(() => doUsina(geracoes.value).filter(i => i.mes === mesAtual.value && i.ano === anoAtual.value).reduce((a, i) => a + num(i.geracao), 0));
const totalInjetadoMes = computed(() => doUsina(injecoes.value).filter(i => i.mes === mesAtual.value && i.ano === anoAtual.value).reduce((a, i) => a + injetado(i), 0));
const geradoExibido = computed(() => (modoVisualizacao.value === 'geral' ? totalGerado.value : totalGeradoMes.value));
const injetadoExibido = computed(() => (modoVisualizacao.value === 'geral' ? totalInjetado.value : totalInjetadoMes.value));
const co2Ton = computed(() => (totalGerado.value * 0.536) / 1000);
const arvores = computed(() => Math.round((totalGerado.value * 0.536) / 150));

const abrirDialogUsina = (usina) => {
  if (!usina) return;
  usinaSelecionada.value = usina;
  imagensSelecionada.value = (imagens.value ?? []).filter(i => i.idGeradora === usina.id);
  // a visão mensal abre no último mês com geração desta usina (não no mês do relógio, que quase sempre está vazio)
  const ult = (geracoes.value ?? []).filter(g => g.idGeradora === usina.id && num(g.geracao) > 0)
    .reduce((b, g) => (!b || g.ano > b.ano || (g.ano === b.ano && g.mes > b.mes) ? g : b), null);
  dataSelecionada.value = ult ? new Date(ult.ano, ult.mes - 1, 1) : new Date();
  dialogUsina.value = true;
};
window.abrirDialogUsina = (id) => abrirDialogUsina((usinas.value ?? []).find(u => u.id == id));

const nf = (v, c = 0) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

// ── montagem ───────────────────────────────────────────────────
onMounted(async () => {
  config.apiKey = 'IIHRnngOE9Csi4hREWUJ';
  map.value = markRaw(new Map({
    container: mapContainer.value,
    style: MapStyle.OUTDOOR,
    center: [-47.20619897861493, -22.87629069748016],
    zoom: 11.3, pitch: 60, bearing: -17.8,
  }));

  // contorno do município
  fetch('/geojson/export.geojson').then(r => r.json()).then((geojson) => {
    const desenhar = () => {
      const mundo = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];
      const cidade = geojson.features.filter(f => f.geometry.type === 'Polygon').map(f => f.geometry.coordinates[0]);
      map.value.addSource('mask-source', { type: 'geojson', data: turf.polygon([mundo, ...cidade]) });
      map.value.addLayer({ id: 'outside-hortolandia', type: 'fill', source: 'mask-source', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.45 } });
      map.value.addSource('hortolandia-area', { type: 'geojson', data: geojson });
      map.value.addLayer({ id: 'hortolandia-glow', type: 'line', source: 'hortolandia-area', paint: { 'line-color': '#22c5e0', 'line-width': 8, 'line-opacity': 0.18, 'line-blur': 4 } });
      map.value.addLayer({ id: 'hortolandia-border', type: 'line', source: 'hortolandia-area', paint: { 'line-color': '#22c5e0', 'line-width': 2 } });
    };
    if (map.value.loaded()) desenhar(); else map.value.on('load', desenhar);
  }).catch(e => console.error('GeoJSON:', e));

  // usinas
  await Promise.all((usinas.value ?? []).map(async (u) => {
    const ll = await geocodeEndereco(u.endereco);
    if (!ll) return;
    const m = criarMarkerUsina(u, ll);
    marcadores.usinas.push(m);
    if (camadaAtiva.value === 'usinas') m.addTo(map.value);
  }));
});

onUnmounted(() => { rodada++; map.value?.remove(); delete window.abrirDialogUsina; });

const CAMADAS = [
  { v: 'usinas', txt: 'Usinas', c: 'var(--teal)' },
  { v: 'predios', txt: 'Prédios', c: 'var(--green)' },
  { v: 'ip', txt: 'IP e praças', c: 'var(--orange)' },
];
</script>

<template>
  <div class="map-wrap lx-page">
    <div ref="mapContainer" class="map"></div>

    <!-- Camadas (admin) -->
    <div v-if="isAdmin" class="mp-camadas" role="group" aria-label="Camada do mapa">
      <span class="mp-camadas-lb">Camada</span>
      <button v-for="c in CAMADAS" :key="c.v" class="mp-cam" :class="{ on: camadaAtiva === c.v }" :style="{ '--c': c.c }" :aria-pressed="camadaAtiva === c.v" @click="alterarCamada(c.v)">
        <i></i>{{ c.txt }}<small>{{ contagem[c.v] }}</small>
      </button>
      <Transition name="mp-fade">
        <div v-if="carregandoCamada && camadaAtiva !== 'usinas'" class="mp-prog">
          <div class="mp-prog-bar"><i :style="{ width: (progresso.total ? progresso.feito / progresso.total * 100 : 0) + '%' }"></i></div>
          <span>Localizando unidades… {{ progresso.feito }}/{{ progresso.total }}</span>
        </div>
      </Transition>
    </div>

    <!-- Dialog da usina -->
    <v-dialog v-model="dialogUsina" width="540" scrim="#03060f">
      <div class="lx-dlg ud" :style="{ '--c': corSec(usinaSelecionada?.secretaria) }">
        <header class="ud-hd">
          <div class="ud-hd-top">
            <span class="lx-pill" :style="{ '--c': corSec(usinaSelecionada?.secretaria) }"><i></i>{{ txtSec(usinaSelecionada?.secretaria) }}</span>
            <button class="lx-dlg-x" aria-label="Fechar" @click="dialogUsina = false">×</button>
          </div>
          <h2 class="ud-nome">{{ usinaSelecionada?.nome }}</h2>
          <p class="ud-pot"><b>{{ usinaSelecionada?.potencia }}</b> kWp instalados · {{ nf(usinaSelecionada?.qtdPlaca) }} placas</p>
        </header>

        <div v-if="imagensSelecionada.length" class="ud-car">
          <v-carousel hide-delimiters height="170" show-arrows="hover">
            <v-carousel-item v-for="(img, i) in imagensSelecionada" :key="i" :src="img.link" cover />
          </v-carousel>
          <div class="ud-car-fade"></div>
        </div>

        <div class="ud-body">
          <div class="ud-barra">
            <div class="lx-seg">
              <button :class="{ on: modoVisualizacao === 'geral' }" @click="modoVisualizacao = 'geral'">Geral</button>
              <button :class="{ on: modoVisualizacao === 'mensal' }" @click="modoVisualizacao = 'mensal'">Mensal</button>
            </div>
            <div v-if="modoVisualizacao === 'mensal'" class="lx-mnav">
              <button class="lx-icon-btn" aria-label="Mês anterior" @click="mudarMes(-1)">‹</button>
              <span>{{ mesAnoLabel }}</span>
              <button class="lx-icon-btn" aria-label="Próximo mês" @click="mudarMes(1)">›</button>
            </div>
          </div>

          <div class="ud-kpis">
            <div class="lx-kpi" style="--c:var(--teal)"><span>Energia gerada</span><b>{{ nf(geradoExibido) }}</b><small>kWh{{ modoVisualizacao === 'geral' ? ' desde o início' : '' }}</small></div>
            <div class="lx-kpi" style="--c:var(--green)"><span>Energia injetada</span><b>{{ nf(injetadoExibido) }}</b><small>kWh · ponta + fora ponta</small></div>
          </div>
          <div v-if="modoVisualizacao === 'geral'" class="ud-kpis tres">
            <div class="lx-kpi" style="--c:var(--orange)"><span>Placas</span><b>{{ nf(usinaSelecionada?.qtdPlaca) }}</b></div>
            <div class="lx-kpi" style="--c:var(--purple)"><span>CO₂ evitado</span><b>{{ nf(co2Ton, 2) }}</b><small>toneladas</small></div>
            <div class="lx-kpi" style="--c:var(--green)"><span>Árvores</span><b>{{ nf(arvores) }}</b><small>equivalentes</small></div>
          </div>
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<style scoped>
.map-wrap { position: relative; width: 100%; height: 100%; }
.map { position: absolute; inset: 0; }

/* ── Camadas ── */
.mp-camadas {
  position: absolute; left: 14px; bottom: 64px; z-index: 20; min-width: 168px;
  display: flex; flex-direction: column; gap: 5px; padding: 12px;
  background: rgba(13, 19, 48, .82); backdrop-filter: blur(14px); border: 1px solid var(--line); border-radius: 18px;
  box-shadow: 0 16px 40px -14px rgba(0, 0, 0, .7);
}
.mp-camadas-lb { font-size: 10.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--mut); padding: 0 2px 3px; }
.mp-cam {
  all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 12px;
  font: 600 12.5px var(--font); color: var(--mut); border: 1px solid transparent; transition: background .2s, color .2s, border-color .2s;
}
.mp-cam i { width: 9px; height: 9px; border-radius: 50%; border: 2px solid var(--c); flex: none; }
.mp-cam small { margin-left: auto; font: 500 10.5px var(--mono); opacity: .8; }
.mp-cam:hover { color: var(--tx); background: rgba(255, 255, 255, .05); }
.mp-cam.on { color: var(--tx); background: color-mix(in srgb, var(--c) 14%, transparent); border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.mp-cam.on i { background: var(--c); box-shadow: 0 0 10px var(--c); }
.mp-cam:focus-visible { outline: 2px solid #fff; }
.mp-prog { display: flex; flex-direction: column; gap: 5px; padding: 6px 2px 0; font-size: 10.5px; color: var(--mut); }
.mp-prog-bar { height: 4px; border-radius: 99px; background: rgba(255, 255, 255, .08); overflow: hidden; }
.mp-prog-bar i { display: block; height: 100%; background: linear-gradient(90deg, var(--teal), var(--purple)); transition: width .3s; }
.mp-fade-enter-active, .mp-fade-leave-active { transition: opacity .25s; }
.mp-fade-enter-from, .mp-fade-leave-to { opacity: 0; }

/* ── Marcadores e popups (criados fora do Vue) ── */
:global(.lxm-usina) { cursor: pointer; filter: drop-shadow(0 4px 10px color-mix(in srgb, var(--c) 55%, transparent)); transition: transform .2s; }
:global(.lxm-usina:hover) { transform: translateY(-3px) scale(1.06); }
:global(.lxm-uni) { cursor: pointer; width: 16px; height: 16px; border-radius: 50%; display: grid; place-items: center;
  background: color-mix(in srgb, var(--c) 22%, transparent); border: 1px solid var(--c); box-shadow: 0 0 10px color-mix(in srgb, var(--c) 70%, transparent); }
:global(.lxm-uni i) { width: 6px; height: 6px; border-radius: 50%; background: var(--c); }
:global(.lx-popup .maplibregl-popup-content), :global(.lx-popup .mapboxgl-popup-content) { background: transparent !important; padding: 0 !important; box-shadow: none !important; }
:global(.lx-popup .maplibregl-popup-tip), :global(.lx-popup .mapboxgl-popup-tip) { display: none !important; }
:global(.lxp) {
  font-family: 'Sora', system-ui, sans-serif; color: #eef2ff; min-width: 190px; max-width: 240px; padding: 14px; border-radius: 16px; position: relative; overflow: hidden;
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--c) 22%, transparent), transparent 60%), #0d1330;
  border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 18px 40px -12px rgba(0, 0, 0, .75), 0 0 30px -12px var(--c);
}
:global(.lxp-badge) { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 600; padding: 3px 9px; border-radius: 99px; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); margin-bottom: 8px; }
:global(.lxp-badge i) { width: 6px; height: 6px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c); }
:global(.lxp-uc) { font: 600 10.5px 'JetBrains Mono', monospace; color: var(--c); margin-bottom: 3px; }
:global(.lxp-nome) { font-size: 14px; font-weight: 700; line-height: 1.25; }
:global(.lxp-sub) { font-size: 11.5px; color: #9aa7cc; margin-top: 4px; line-height: 1.35; }
:global(.lxp-btn) { all: unset; box-sizing: border-box; cursor: pointer; display: block; width: 100%; text-align: center; margin-top: 12px; padding: 8px 0; border-radius: 99px;
  font-size: 12px; font-weight: 600; color: #fff; background: linear-gradient(120deg, var(--c), #22c5e0); box-shadow: 0 8px 20px -10px var(--c); transition: transform .2s; }
:global(.lxp-btn:hover) { transform: translateY(-1px); }

/* ── Dialog da usina ── */
.ud { max-height: 92dvh; overflow-y: auto; }
.ud-hd { padding: 16px 18px 14px; border-bottom: 1px solid var(--line2); background: linear-gradient(120deg, color-mix(in srgb, var(--c) 18%, transparent), transparent 70%); }
.ud-hd-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ud-nome { font-size: 19px; font-weight: 700; letter-spacing: -.01em; margin: 0 0 4px; }
.ud-pot { margin: 0; font-size: 12.5px; color: var(--mut); }
.ud-pot b { font-family: var(--mono); color: var(--teal); font-size: 14px; }
.ud-car { position: relative; }
.ud-car-fade { position: absolute; left: 0; right: 0; bottom: 0; height: 46px; background: linear-gradient(transparent, var(--bg2)); pointer-events: none; z-index: 1; }
.ud-body { padding: 14px 18px 18px; display: flex; flex-direction: column; gap: 12px; }
.ud-barra { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.ud-barra .lx-mnav > span { min-width: 130px; text-transform: capitalize; }
.ud-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ud-kpis.tres { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ud-kpis .lx-kpi b { font-variant-numeric: tabular-nums; }

@media (max-width: 520px) {
  .mp-camadas { left: 10px; bottom: 58px; min-width: 150px; padding: 10px; }
  .ud-kpis.tres { grid-template-columns: 1fr 1fr; }
}
</style>
