<script setup>
import { API_BASE_URL } from '~/base/link';
import { Map, MapStyle, Marker, config, Popup } from '@maptiler/sdk';
import { shallowRef, ref, onMounted, onUnmounted, markRaw } from 'vue';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import * as turf from '@turf/turf';  

const mapContainer = shallowRef(null);
const map = shallowRef(null);
const dialogUsina = ref(false);
const usinaSelecionada = ref(null);

const loadingMes = ref(false);
const modoVisualizacao = ref('geral');

const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);
const { data: imagens } = await useFetch(`${API_BASE_URL}/imagens/`);
const { data: geracoes } = await useFetch(`${API_BASE_URL}/relatoriogeracao/`);
const { data: injecoes } = await useFetch(`${API_BASE_URL}/relatoriousina/`);

const alterarColor = (secretaria) => {
  const colorMap = { E: "#2dccfc", S: "#13DEB9", O: "#FFAE1F" };
  return colorMap[secretaria] || "#5D87FF";
};

const imagensSelecionada = ref()
const apiKey = ref("AIzaSyA5BEipnfIyp7WAtvZq6u21oR8oKx1Sa9Q");

const totalGerado = ref(0);
const totalInjetado = ref(0);

const dataSelecionada = ref(new Date());
const mesAtual = computed(() => dataSelecionada.value.getMonth() + 1);
const anoAtual = computed(() => dataSelecionada.value.getFullYear());
const mesAnoLabel = computed(() =>
  dataSelecionada.value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
);

const proximoMes = () => {
  loadingMes.value = true;
  setTimeout(() => {
    const d = new Date(dataSelecionada.value);
    d.setMonth(d.getMonth() + 1);
    dataSelecionada.value = d;
    loadingMes.value = false;
  }, 300);
};

const mesAnterior = () => {
  loadingMes.value = true;
  setTimeout(() => {
    const d = new Date(dataSelecionada.value);
    d.setMonth(d.getMonth() - 1);
    dataSelecionada.value = d;
    loadingMes.value = false;
  }, 300);
};

const calcularTotais = (id) => {
  const g = geracoes.value.filter(i => i.idGeradora === id);
  const inj = injecoes.value.filter(i => i.idGeradora === id);
  totalGerado.value = g.reduce((a, i) => a + Number(i.geracao), 0);
  totalInjetado.value = inj.reduce((a, i) => a + Number(i.injetadoFPonta), 0);
};

const totalGeradoMes = computed(() => {
  if (!usinaSelecionada.value) return 0;
  return geracoes.value?.filter(i =>
    i.idGeradora === usinaSelecionada.value.id &&
    i.mes === mesAtual.value && i.ano === anoAtual.value
  ).reduce((a, i) => a + Number(i.geracao), 0) || 0;
});

const totalInjetadoMes = computed(() => {
  if (!usinaSelecionada.value) return 0;
  return injecoes.value?.filter(i =>
    i.idGeradora === usinaSelecionada.value.id &&
    i.mes === mesAtual.value && i.ano === anoAtual.value
  ).reduce((a, i) => a + Number(i.injetadoFPonta), 0) || 0;
});

const geradoExibido = computed(() =>
  modoVisualizacao.value === 'geral' ? totalGerado.value : totalGeradoMes.value
);
const injetadoExibido = computed(() =>
  modoVisualizacao.value === 'geral' ? totalInjetado.value : totalInjetadoMes.value
);

const co2Total = computed(() => totalGerado.value * 0.536);
const co2Ton = computed(() => co2Total.value / 1000);
const arvores = computed(() => Math.round(co2Total.value / 150));

const abrirDialogUsina = (usina) => {
  usinaSelecionada.value = usina;
  dialogUsina.value = true;
  imagensSelecionada.value = imagens.value.filter(i => i.idGeradora === usina.id);
  calcularTotais(usina.id);
};

const procurarLocal = async (usinaInfo) => {
  const local_formatado = usinaInfo.endereco.replace(/ /g, "_");
  const { data: localInfo } = await useFetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${local_formatado}&key=${apiKey.value}`);

  const cor = alterarColor(usinaInfo.secretaria);
  const secLabel = usinaInfo.secretaria === 'E' ? 'Educação' : usinaInfo.secretaria === 'S' ? 'Saúde' : 'Outros';

  // ── POPUP HTML TECH ────────────────────────────────────────────────
  const popupHTML = `
    <style>
      .pp-wrap {
        font-family: 'DM Sans', 'Segoe UI', sans-serif;
        background: #0b0f1a;
        border: 1px solid ${cor}44;
        border-radius: 14px;
        padding: 14px 14px 12px;
        min-width: 180px;
        max-width: 210px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
      }
      .pp-grid {
        position: absolute; inset: 0;
        background-image: radial-gradient(circle, ${cor}18 1px, transparent 1px);
        background-size: 16px 16px;
        pointer-events: none;
      }
      .pp-glow {
        position: absolute; top: -30px; right: -30px;
        width: 90px; height: 90px; border-radius: 50%;
        background: ${cor}22; filter: blur(24px); pointer-events: none;
      }
      .pp-badge {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
        text-transform: uppercase;
        background: ${cor}18; border: 1px solid ${cor}55;
        color: ${cor}; padding: 3px 9px; border-radius: 20px;
        margin-bottom: 8px;
      }
      .pp-dot {
        width: 5px; height: 5px; border-radius: 50%; background: ${cor};
      }
      .pp-nome {
        font-size: 14px; font-weight: 800; color: #fff;
        letter-spacing: -0.01em; line-height: 1.2; margin-bottom: 10px;
      }
      .pp-btn {
        display: flex; align-items: center; justify-content: center; gap: 6px;
        width: 100%; padding: 8px 0;
        background: linear-gradient(135deg, ${cor}22, ${cor}11);
        border: 1px solid ${cor}55; border-radius: 9px;
        color: ${cor}; font-size: 11px; font-weight: 700;
        letter-spacing: 0.08em; cursor: pointer;
        transition: background 0.15s, box-shadow 0.15s;
        text-decoration: none;
      }
      .pp-btn:hover {
        background: ${cor}33;
        box-shadow: 0 0 14px ${cor}44;
      }
      .pp-arrow { font-size: 12px; }
    </style>
    <div class="pp-wrap">
      <div class="pp-grid"></div>
      <div class="pp-glow"></div>
      <div class="pp-badge">
        <div class="pp-dot"></div>
        ${secLabel}
      </div>
      <div class="pp-nome">${usinaInfo.nome}</div>
      <button class="pp-btn" onclick="window.abrirDialogUsina('${usinaInfo.id}')">
        VER DETALHES <span class="pp-arrow">→</span>
      </button>
    </div>
  `;

  // ── MARKER SVG CUSTOM TECH ─────────────────────────────────────────
  const markerEl = document.createElement('div');
  markerEl.innerHTML = `
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow-${usinaInfo.id}" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <!-- sombra base -->
      <ellipse cx="16" cy="38" rx="6" ry="2" fill="rgba(0,0,0,0.3)"/>
      <!-- corpo do pin -->
      <path d="M16 2C9.37 2 4 7.37 4 14C4 22 16 36 16 36C16 36 28 22 28 14C28 7.37 22.63 2 16 2Z"
        fill="#0b0f1a" stroke="${cor}" stroke-width="1.5" filter="url(#glow-${usinaInfo.id})"/>
      <!-- anel externo -->
      <circle cx="16" cy="14" r="7" fill="${cor}22" stroke="${cor}" stroke-width="1"/>
      <!-- ponto central -->
      <circle cx="16" cy="14" r="3.5" fill="${cor}"/>
      <!-- brilho interno -->
      <circle cx="14.5" cy="12.5" r="1" fill="rgba(255,255,255,0.55)"/>
    </svg>
  `;
  markerEl.style.cssText = 'cursor:pointer; filter: drop-shadow(0 4px 8px ' + cor + '66);';

  const marker = new Marker({ element: markerEl })
    .setLngLat([localInfo.value.results[0].geometry.location.lng, localInfo.value.results[0].geometry.location.lat])
    .setPopup(new Popup({ offset: 20, className: 'tech-popup' }).setHTML(popupHTML))
    .addTo(map.value);

  return marker;
};

window.abrirDialogUsina = (id) => {
  const usina = usinas.value.find((u) => u.id == id);
  abrirDialogUsina(usina);
};

onMounted(async () => {
  config.apiKey = 'IIHRnngOE9Csi4hREWUJ';

  const initialState = {
    lng: -47.20619897861493,
    lat: -22.87629069748016,
    zoom: 11.3, pitch: 60, bearing: -17.8
  };

  map.value = markRaw(new Map({
    container: mapContainer.value,
    style: MapStyle.OUTDOOR,
    center: [initialState.lng, initialState.lat],
    zoom: initialState.zoom,
    pitch: initialState.pitch,
    bearing: initialState.bearing
  }));

  usinas.value.forEach((usina) => procurarLocal(usina));

  try {
    const response = await fetch('/geojson/export.geojson');
    const geojson = await response.json();

    map.value.on('load', () => {
      let worldPolygon = [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]];
      const cityPolygons = geojson.features
        .filter(f => f.geometry.type === "Polygon")
        .map(f => f.geometry.coordinates[0]);

      const maskFeature = turf.polygon([worldPolygon, ...cityPolygons]);

      map.value.addSource('mask-source', { type: 'geojson', data: maskFeature });
      map.value.addLayer({
        id: 'outside-hortolandia', type: 'fill', source: 'mask-source',
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.57 }
      });

      map.value.addSource('hortolandia-area', { type: 'geojson', data: geojson });
      map.value.addLayer({
        id: 'hortolandia-border', type: 'line', source: 'hortolandia-area',
        paint: { 'line-color': '#5D87FF', 'line-width': 2 }
      });
    });
  } catch (error) {
    console.error("Erro ao carregar o GeoJSON:", error);
  }
});

onUnmounted(() => { map.value?.remove(); });
</script>

<template>
  <div class="map-wrap">
    <div class="map" ref="mapContainer"></div>

    <!-- ═══════════════════════════════════
         DIALOG DA USINA — COMPACTO MOBILE
    ═══════════════════════════════════ -->
    <v-row justify="center">
      <v-dialog v-model="dialogUsina" width="520" content-class="usina-dialog">
        <div class="ud-shell">

          <!-- ── HEADER ──────────────────────────────── -->
          <div class="ud-header">
            <div class="ud-header-grid"></div>

            <div class="ud-header-top">
              <!-- badge secretaria -->
              <div
                class="ud-sec-badge"
                :style="{
                  background: alterarColor(usinaSelecionada?.secretaria) + '1a',
                  borderColor: alterarColor(usinaSelecionada?.secretaria) + '66',
                  color: alterarColor(usinaSelecionada?.secretaria)
                }"
              >
                <span class="ud-sec-dot" :style="{ background: alterarColor(usinaSelecionada?.secretaria) }"></span>
                {{
                  usinaSelecionada?.secretaria === 'E' ? 'Educação' :
                  usinaSelecionada?.secretaria === 'S' ? 'Saúde' : 'Outros'
                }}
              </div>
              <button class="ud-close" @click="dialogUsina = false">✕</button>
            </div>

            <!-- nome + potência numa linha só -->
            <h2 class="ud-nome">{{ usinaSelecionada?.nome }}</h2>

            <div class="ud-potencia-row">
              <span class="ud-potencia-icon">⚡</span>
              <span class="ud-potencia-val">{{ usinaSelecionada?.potencia }}</span>
              <span class="ud-potencia-unit">kWp</span>
              <span class="ud-potencia-label">· Potência instalada</span>
            </div>
          </div>

          <!-- ── CARROSSEL (menor) ───────────────────── -->
          <div class="ud-carousel-wrap">
            <v-carousel hide-delimiters height="160" show-arrows="hover">
              <v-carousel-item
                v-for="(imagem, index) in imagensSelecionada"
                :key="index"
                :src="imagem.link"
                cover
              />
            </v-carousel>
            <div class="ud-carousel-fade"></div>
          </div>

          <!-- ── BODY ───────────────────────────────── -->
          <div class="ud-body">

            <!-- Toggle compacto -->
            <div class="ud-toggle-row">
              <div class="ud-toggle">
                <button
                  class="ud-toggle-btn"
                  :class="{ 'ud-toggle-active': modoVisualizacao === 'geral' }"
                  @click="modoVisualizacao = 'geral'"
                >
                  <span class="ud-toggle-icon">◈</span> Geral
                </button>
                <button
                  class="ud-toggle-btn"
                  :class="{ 'ud-toggle-active': modoVisualizacao === 'mensal' }"
                  @click="modoVisualizacao = 'mensal'"
                >
                  <span class="ud-toggle-icon">◷</span> Mensal
                </button>
              </div>
            </div>

            <!-- Seletor de mês -->
            <transition name="ud-fade">
              <div v-if="modoVisualizacao === 'mensal'" class="ud-month-nav">
                <button class="ud-arrow-btn" @click="mesAnterior">‹</button>
                <div class="ud-month-label">
                  <span class="ud-month-text">{{ mesAnoLabel }}</span>
                </div>
                <button class="ud-arrow-btn" @click="proximoMes">›</button>
              </div>
            </transition>

            <!-- Cards -->
            <transition name="ud-slide" mode="out-in">
              <div :key="modoVisualizacao + mesAnoLabel">

                <div v-if="loadingMes" class="ud-loading-grid">
                  <div class="ud-skeleton" v-for="n in 2" :key="n"></div>
                </div>

                <template v-else>
                  <!-- Linha 1: gerado + injetado -->
                  <div class="ud-cards-row">
                    <div class="ud-card ud-card-primary">
                      <div class="ud-card-glow" style="background:#00e5ff2a"></div>
                      <span class="ud-card-icon">↑</span>
                      <span class="ud-card-label">Energia Gerada</span>
                      <span class="ud-card-val">{{ geradoExibido.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }}</span>
                      <span class="ud-card-unit">kWh</span>
                    </div>
                    <div class="ud-card ud-card-secondary">
                      <div class="ud-card-glow" style="background:#13deb92a"></div>
                      <span class="ud-card-icon" style="color:#13deb9">⇢</span>
                      <span class="ud-card-label">Energia Injetada</span>
                      <span class="ud-card-val">{{ injetadoExibido.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }}</span>
                      <span class="ud-card-unit">kWh</span>
                    </div>
                  </div>

                  <!-- Linha 2: só no geral -->
                  <div v-if="modoVisualizacao === 'geral'" class="ud-cards-row ud-cards-row-3">
                    <div class="ud-card ud-card-sm">
                      <div class="ud-card-glow" style="background:#ffae1f1a"></div>
                      <span class="ud-card-icon-sm">☀</span>
                      <span class="ud-card-label">Placas</span>
                      <span class="ud-card-val-sm">{{ usinaSelecionada?.qtdPlaca }}</span>
                    </div>
                    <div class="ud-card ud-card-sm">
                      <div class="ud-card-glow" style="background:#13deb91a"></div>
                      <span class="ud-card-icon-sm">♻</span>
                      <span class="ud-card-label">CO₂ Evitado</span>
                      <span class="ud-card-val-sm">{{ co2Ton.toFixed(2) }}</span>
                      <span class="ud-card-unit-sm">ton</span>
                    </div>
                    <div class="ud-card ud-card-sm">
                      <div class="ud-card-glow" style="background:#13deb914"></div>
                      <span class="ud-card-icon-sm">🌳</span>
                      <span class="ud-card-label">Árvores</span>
                      <span class="ud-card-val-sm">{{ arvores.toLocaleString('pt-BR') }}</span>
                    </div>
                  </div>
                </template>

              </div>
            </transition>
          </div>
          <!-- fim ud-body -->

        </div>
      </v-dialog>
    </v-row>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════
   MAP
═══════════════════════════════════════════ */
.map-wrap { position: relative; width: 100%; height: 100%; }
.map      { position: absolute; width: 100%; height: 100%; }

/* Popup do maptiler: remove fundo padrão */
:global(.tech-popup .maplibregl-popup-content),
:global(.tech-popup .mapboxgl-popup-content) {
  background: transparent !important;
  padding: 0 !important;
  box-shadow: none !important;
  border-radius: 14px !important;
}
:global(.tech-popup .maplibregl-popup-tip),
:global(.tech-popup .mapboxgl-popup-tip) {
  display: none !important;
}

/* ═══════════════════════════════════════════
   DIALOG SHELL
═══════════════════════════════════════════ */
:deep(.usina-dialog) {
  border-radius: 20px !important;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05) !important;
  /* garante que o dialog não ultrapasse a tela no mobile */
  max-height: 92dvh !important;
}

.ud-shell {
  background: #0b0f1a;
  border-radius: 20px;
  overflow-y: auto;           /* scroll interno se necessário */
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
  color: #e8edf5;
}

/* ═══════════════════════════════════════════
   HEADER — compacto
═══════════════════════════════════════════ */
.ud-header {
  position: relative;
  padding: 16px 16px 14px;
  background: linear-gradient(145deg, #0d1628 0%, #111827 60%, #0a1020 100%);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
  flex-shrink: 0;
}

.ud-header-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(0,180,255,0.07) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}

/* linha topo: badge + fechar */
.ud-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.ud-sec-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; padding: 3px 10px;
  border-radius: 20px; border: 1px solid;
}

.ud-sec-dot { width: 5px; height: 5px; border-radius: 50%; }

.ud-nome {
  font-size: 17px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-bottom: 6px;
}

.ud-potencia-row {
  display: flex; align-items: baseline; gap: 4px;
}

.ud-potencia-icon { font-size: 12px; }
.ud-potencia-val  { font-size: 16px; font-weight: 700; color: #00e5ff; }
.ud-potencia-unit { font-size: 11px; color: rgba(0,229,255,0.65); font-weight: 600; }
.ud-potencia-label{ font-size: 10px; color: rgba(255,255,255,0.3); margin-left: 3px; }

.ud-close {
  width: 26px; height: 26px; border-radius: 50%;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.5); font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; line-height: 1; flex-shrink: 0;
}
.ud-close:hover { background: rgba(255,255,255,0.14); color: #fff; }

/* ═══════════════════════════════════════════
   CARROSSEL
═══════════════════════════════════════════ */
.ud-carousel-wrap { position: relative; flex-shrink: 0; }
.ud-carousel-fade {
  position: absolute; bottom: 0; left: 0; right: 0; height: 40px;
  background: linear-gradient(to bottom, transparent, #0b0f1a);
  pointer-events: none; z-index: 1;
}

/* ═══════════════════════════════════════════
   BODY
═══════════════════════════════════════════ */
.ud-body {
  padding: 12px 14px 16px;
  display: flex; flex-direction: column; gap: 10px;
  flex-shrink: 0;
}

/* ── Toggle ── */
.ud-toggle-row { display: flex; justify-content: center; }

.ud-toggle {
  display: flex;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 3px; gap: 3px;
}

.ud-toggle-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 18px; border-radius: 9px; border: none;
  background: transparent; color: rgba(255,255,255,0.38);
  font-size: 12px; font-weight: 600; cursor: pointer;
  letter-spacing: 0.03em; transition: all 0.2s;
}
.ud-toggle-btn:hover { color: rgba(255,255,255,0.7); }
.ud-toggle-active {
  background: linear-gradient(135deg, #0047cc, #0091ff) !important;
  color: #fff !important;
  box-shadow: 0 3px 12px rgba(0,71,204,0.4);
}
.ud-toggle-icon { font-size: 13px; opacity: 0.8; }

/* ── Seletor de mês ── */
.ud-month-nav {
  display: flex; align-items: center; justify-content: center; gap: 10px;
}

.ud-arrow-btn {
  width: 34px; height: 34px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.7); font-size: 20px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; line-height: 1;
}
.ud-arrow-btn:hover {
  background: rgba(0,145,255,0.2); border-color: rgba(0,145,255,0.5);
  color: #00e5ff; box-shadow: 0 0 10px rgba(0,145,255,0.2);
}

.ud-month-label {
  min-width: 140px; text-align: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 9px; padding: 6px 14px;
}
.ud-month-text {
  font-size: 12px; font-weight: 700; color: #e8edf5;
  text-transform: capitalize; letter-spacing: 0.04em;
}

/* ── Cards ── */
.ud-cards-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.ud-cards-row-3 {
  grid-template-columns: 1fr 1fr 1fr; margin-top: 6px; gap: 6px;
}

.ud-card {
  position: relative; border-radius: 13px;
  padding: 13px 12px 11px;
  display: flex; flex-direction: column; gap: 3px;
  overflow: hidden; border: 1px solid rgba(255,255,255,0.07);
  transition: transform 0.2s, box-shadow 0.2s;
}
.ud-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }

.ud-card-glow {
  position: absolute; top: -18px; right: -18px;
  width: 70px; height: 70px; border-radius: 50%;
  filter: blur(20px); pointer-events: none;
}

.ud-card-primary   { background: linear-gradient(145deg, #0d1e3a, #0b1628); }
.ud-card-secondary { background: linear-gradient(145deg, #0a1e18, #091510); }
.ud-card-sm        { background: linear-gradient(145deg, #111827, #0d1525); padding: 11px 10px 10px; }

.ud-card-icon      { font-size: 16px; color: #00e5ff; margin-bottom: 1px; }
.ud-card-label     { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.35); }
.ud-card-val       { font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.1; letter-spacing: -0.02em; }
.ud-card-unit      { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.32); }

.ud-card-icon-sm   { font-size: 17px; margin-bottom: 1px; }
.ud-card-val-sm    { font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; line-height: 1.1; }
.ud-card-unit-sm   { font-size: 10px; color: rgba(255,255,255,0.32); font-weight: 600; }

/* ── Skeleton ── */
.ud-loading-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ud-skeleton {
  height: 80px; border-radius: 13px;
  background: linear-gradient(90deg, #1a2035 25%, #1e2a42 50%, #1a2035 75%);
  background-size: 200% 100%;
  animation: ud-shimmer 1.5s infinite;
}
@keyframes ud-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ═══════════════════════════════════════════
   TRANSITIONS
═══════════════════════════════════════════ */
.ud-fade-enter-active, .ud-fade-leave-active { transition: all 0.2s ease; }
.ud-fade-enter-from, .ud-fade-leave-to       { opacity: 0; transform: translateY(-5px); }

.ud-slide-enter-active, .ud-slide-leave-active { transition: all 0.22s ease; }
.ud-slide-enter-from   { opacity: 0; transform: translateY(7px); }
.ud-slide-leave-to     { opacity: 0; transform: translateY(-7px); }

/* ═══════════════════════════════════════════
   MOBILE
═══════════════════════════════════════════ */
@media (max-width: 500px) {
  .ud-nome            { font-size: 14px; }
  .ud-potencia-val    { font-size: 14px; }
  .ud-cards-row-3     { grid-template-columns: 1fr 1fr; }
  .ud-toggle-btn      { padding: 6px 12px; font-size: 11px; }
  .ud-card-val        { font-size: 18px; }
  .ud-card-val-sm     { font-size: 15px; }
}
</style>