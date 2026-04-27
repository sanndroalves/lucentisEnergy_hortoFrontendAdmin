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
  const colorMap = {
    E: "#2dccfc",
    S: "#13DEB9",
    O: "#FFAE1F",
  };
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
  dataSelecionada.value.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  })
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

// 🔥 TOTAL GERAL
const calcularTotais = (id) => {
  const g = geracoes.value.filter(i => i.idGeradora === id);
  const inj = injecoes.value.filter(i => i.idGeradora === id);

  totalGerado.value = g.reduce((a, i) => a + Number(i.geracao), 0);
  totalInjetado.value = inj.reduce((a, i) => a + Number(i.injetadoFPonta), 0);
};

// 🔥 MENSAL
const totalGeradoMes = computed(() => {
  if (!usinaSelecionada.value) return 0;

  return geracoes.value
    ?.filter(i =>
      i.idGeradora === usinaSelecionada.value.id &&
      i.mes === mesAtual.value &&
      i.ano === anoAtual.value
    )
    .reduce((a, i) => a + Number(i.geracao), 0) || 0;
});

const totalInjetadoMes = computed(() => {
  if (!usinaSelecionada.value) return 0;

  return injecoes.value
    ?.filter(i =>
      i.idGeradora === usinaSelecionada.value.id &&
      i.mes === mesAtual.value &&
      i.ano === anoAtual.value
    )
    .reduce((a, i) => a + Number(i.injetadoFPonta), 0) || 0;
});

// 🔄 DISPLAY
const geradoExibido = computed(() =>
  modoVisualizacao.value === 'geral'
    ? totalGerado.value
    : totalGeradoMes.value
);

const injetadoExibido = computed(() =>
  modoVisualizacao.value === 'geral'
    ? totalInjetado.value
    : totalInjetadoMes.value
);

// 🌱 SUSTENTABILIDADE (APENAS GERAL)
const co2Total = computed(() => totalGerado.value * 0.536);
const co2Ton = computed(() => co2Total.value / 1000);
const arvores = computed(() => Math.round(co2Total.value / 150));

// 📍 ABRIR DIALOG
const abrirDialogUsina = (usina) => {
  usinaSelecionada.value = usina;
  dialogUsina.value = true;

  imagensSelecionada.value = imagens.value.filter(i => i.idGeradora === usina.id);
  calcularTotais(usina.id);
};

const procurarLocal = async (usinaInfo) => {
  const local_formatado = usinaInfo.endereco.replace(/ /g, "_");
  const { data: localInfo } = await useFetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${local_formatado}&key=${apiKey.value}`);
  
  const popupHTML = `
  <div style="
    text-align: center;
    background: white;
    padding: 12px;
    border-radius: 10px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
    font-family: Arial, sans-serif;
    max-width: 200px;
  ">
    <span style="font-size: 14px; color: #1e73be; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
      USINA
    </span>
    <br>
    <span style="font-size: 18px; font-weight: bold; color: #333; display: block; margin: 5px 0;">
      ${usinaInfo.nome}
    </span>
    <button style="
      background-color: #1e73be;
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      margin-top: 8px;
      transition: background 0.3s, transform 0.2s;
    " 
    onmouseover="this.style.backgroundColor='#155a9b'; this.style.transform='scale(1.05)';" 
    onmouseout="this.style.backgroundColor='#1e73be'; this.style.transform='scale(1)';"
    onclick="window.abrirDialogUsina('${usinaInfo.id}')">
      SAIBA MAIS
    </button>
  </div>
`;


  const marker = new Marker({ color: alterarColor(usinaInfo.secretaria) })
    .setLngLat([localInfo.value.results[0].geometry.location.lng, localInfo.value.results[0].geometry.location.lat])
    .setPopup(new Popup().setHTML(popupHTML))
    .addTo(map.value);
  
  return marker;
};

// Expor a função globalmente para o botão do popup funcionar
window.abrirDialogUsina = (id) => {
  const usina = usinas.value.find((u) => u.id == id); 
  abrirDialogUsina(usina);
};

// onMounted(() => {
//   config.apiKey = 'IIHRnngOE9Csi4hREWUJ';

//   const initialState = { lng: -47.2078177, lat: -22.8703437, zoom: 11.5 };

//   map.value = markRaw(new Map({
//     container: mapContainer.value,
//     style: MapStyle.OUTDOOR,  // Alterado para Satélite 
//     center: [initialState.lng, initialState.lat],
//     zoom: initialState.zoom
//   }));

//   usinas.value.forEach((usina) => procurarLocal(usina));
// });

onMounted(async () => {
  config.apiKey = 'IIHRnngOE9Csi4hREWUJ';  

  const initialState = { 
    lng: -47.20619897861493, 
    lat: -22.87629069748016, 
    zoom: 11.3,
    pitch: 60, // inclinação vertical
    bearing: -17.8 // rotação horizontal (ângulo de visão)
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

  // 🔹 Carregar o GeoJSON do limite de Hortolândia  

try {
    const response = await fetch('/geojson/export.geojson'); // Carregar o GeoJSON
    const geojson = await response.json();

    map.value.on('load', () => { 

      // Criar um polígono gigante cobrindo todo o mundo
      let worldPolygon = [
        [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90] // Mundo inteiro
      ];

      // Filtrar apenas os polígonos da cidade (removendo pontos e linhas)
      const cityPolygons = geojson.features
        .filter(feature => feature.geometry.type === "Polygon")
        .map(feature => feature.geometry.coordinates[0]); // Pegamos apenas o primeiro conjunto de coordenadas
   
      // Criar um único polígono com buracos (o fundo será branco, e Hortolândia será um 'buraco' nesse polígono)
      const maskFeature = turf.polygon([worldPolygon, ...cityPolygons]); 

      // Adicionar a máscara ao mapa
      map.value.addSource('mask-source', {
        type: 'geojson',
        data: maskFeature
      });

      map.value.addLayer({
        id: 'outside-hortolandia',
        type: 'fill',
        source: 'mask-source',
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': 0.57      // Deixa mais transparente (0 = totalmente transparente, 1 = opaco)
        }
      });

      // Adicionar camada da cidade para manter os contornos visíveis
      map.value.addSource('hortolandia-area', {
        type: 'geojson',
        data: geojson
      });

      map.value.addLayer({
        id: 'hortolandia-border',
        type: 'line',
        source: 'hortolandia-area',
        paint: {
          'line-color': '#5D87FF',
          'line-width': 2
        }
      });

    });
  } catch (error) {
    console.error("Erro ao carregar o GeoJSON:", error);
  }






});


onUnmounted(() => {
  map.value?.remove();
});
</script>

 <!-- APENAS <template> e <style> — o <script setup> permanece intacto -->

<template>
  <div class="map-wrap">
    <div class="map" ref="mapContainer"></div>

    <!-- ═══════════════════════════════════════════════
         DIALOG DA USINA
    ═══════════════════════════════════════════════ -->
    <v-row justify="center">
      <v-dialog v-model="dialogUsina" width="600" content-class="usina-dialog">
        <div class="ud-shell">

          <!-- ── HEADER ─────────────────────────────────────── -->
          <div class="ud-header">
            <!-- grade decorativa de fundo -->
            <div class="ud-header-grid"></div>

            <!-- badge de secretaria -->
            <div
              class="ud-sec-badge"
              :style="{ background: alterarColor(usinaSelecionada?.secretaria) + '22',
                        borderColor: alterarColor(usinaSelecionada?.secretaria),
                        color: alterarColor(usinaSelecionada?.secretaria) }"
            >
              <span class="ud-sec-dot"
                :style="{ background: alterarColor(usinaSelecionada?.secretaria) }"
              ></span>
              {{
                usinaSelecionada?.secretaria === 'E' ? 'Educação' :
                usinaSelecionada?.secretaria === 'S' ? 'Saúde' : 'Outros'
              }}
            </div>

            <!-- nome -->
            <h2 class="ud-nome">{{ usinaSelecionada?.nome }}</h2>

            <!-- potência -->
            <div class="ud-potencia-row">
              <span class="ud-potencia-icon">⚡</span>
              <span class="ud-potencia-val">{{ usinaSelecionada?.potencia }}</span>
              <span class="ud-potencia-unit">kWp</span>
              <span class="ud-potencia-label">· Potência instalada</span>
            </div>

            <!-- fechar -->
            <button class="ud-close" @click="dialogUsina = false">✕</button>
          </div>

          <!-- ── CARROSSEL ───────────────────────────────────── -->
          <div class="ud-carousel-wrap">
            <v-carousel hide-delimiters height="220" show-arrows="hover">
              <v-carousel-item
                v-for="(imagem, index) in imagensSelecionada"
                :key="index"
                :src="imagem.link"
                cover
              />
            </v-carousel>
            <!-- overlay gradiente na parte inferior -->
            <div class="ud-carousel-fade"></div>
          </div>

          <!-- ── TOGGLE GERAL / MENSAL ───────────────────────── -->
          <div class="ud-body">
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

            <!-- ── SELETOR DE MÊS ─────────────────────────── -->
            <transition name="ud-fade">
              <div v-if="modoVisualizacao === 'mensal'" class="ud-month-nav">
                <button class="ud-arrow-btn" @click="mesAnterior">
                  <span>‹</span>
                </button>
                <div class="ud-month-label">
                  <span class="ud-month-text">{{ mesAnoLabel }}</span>
                </div>
                <button class="ud-arrow-btn" @click="proximoMes">
                  <span>›</span>
                </button>
              </div>
            </transition>

            <!-- ── CARDS ──────────────────────────────────── -->
            <transition name="ud-slide" mode="out-in">
              <div :key="modoVisualizacao + mesAnoLabel">

                <!-- LOADING -->
                <div v-if="loadingMes" class="ud-loading-grid">
                  <div class="ud-skeleton" v-for="n in 2" :key="n"></div>
                </div>

                <!-- CONTEÚDO -->
                <template v-else>
                  <!-- LINHA 1: gerado + injetado -->
                  <div class="ud-cards-row">
                    <div class="ud-card ud-card-primary">
                      <div class="ud-card-glow" style="background: #00e5ff33"></div>
                      <span class="ud-card-icon">↑</span>
                      <span class="ud-card-label">Energia Gerada</span>
                      <span class="ud-card-val">
                        {{ geradoExibido.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }}
                      </span>
                      <span class="ud-card-unit">kWh</span>
                    </div>

                    <div class="ud-card ud-card-secondary">
                      <div class="ud-card-glow" style="background: #13deb933"></div>
                      <span class="ud-card-icon">⇢</span>
                      <span class="ud-card-label">Energia Injetada</span>
                      <span class="ud-card-val">
                        {{ injetadoExibido.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }}
                      </span>
                      <span class="ud-card-unit">kWh</span>
                    </div>
                  </div>

                  <!-- LINHA 2: só no modo geral -->
                  <div v-if="modoVisualizacao === 'geral'" class="ud-cards-row ud-cards-row-3">
                    <div class="ud-card ud-card-sm">
                      <div class="ud-card-glow" style="background: #ffae1f22"></div>
                      <span class="ud-card-icon-sm">☀</span>
                      <span class="ud-card-label">Placas</span>
                      <span class="ud-card-val-sm">{{ usinaSelecionada?.qtdPlaca }}</span>
                    </div>

                    <div class="ud-card ud-card-sm">
                      <div class="ud-card-glow" style="background: #13deb922"></div>
                      <span class="ud-card-icon-sm">♻</span>
                      <span class="ud-card-label">CO₂ Evitado</span>
                      <span class="ud-card-val-sm">{{ co2Ton.toFixed(2) }}</span>
                      <span class="ud-card-unit-sm">ton</span>
                    </div>

                    <div class="ud-card ud-card-sm">
                      <div class="ud-card-glow" style="background: #13deb918"></div>
                      <span class="ud-card-icon-sm">🌳</span>
                      <span class="ud-card-label">Equiv. Árvores</span>
                      <span class="ud-card-val-sm">{{ arvores.toLocaleString('pt-BR') }}</span>
                    </div>
                  </div>
                </template>

              </div>
            </transition>
          </div>
          <!-- ── fim ud-body ── -->

        </div>
      </v-dialog>
    </v-row>
    <!-- ── fim dialog ── -->

  </div>
</template>


<style scoped>
/* ════════════════════════════════════════════════
   MAP WRAP
════════════════════════════════════════════════ */
.map-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}
.map {
  position: absolute;
  width: 100%;
  height: 100%;
}

/* ════════════════════════════════════════════════
   DIALOG SHELL
════════════════════════════════════════════════ */
:deep(.usina-dialog) {
  border-radius: 20px !important;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.06) !important;
}

.ud-shell {
  background: #0b0f1a;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
  color: #e8edf5;
}

/* ════════════════════════════════════════════════
   HEADER
════════════════════════════════════════════════ */
.ud-header {
  position: relative;
  padding: 28px 24px 22px;
  background: linear-gradient(145deg, #0d1628 0%, #111827 60%, #0a1020 100%);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
}

/* grade de pontos decorativa */
.ud-header-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(0,180,255,0.08) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
}

/* badge secretaria */
.ud-sec-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid;
  margin-bottom: 10px;
}

.ud-sec-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* nome da usina */
.ud-nome {
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-bottom: 10px;
  max-width: calc(100% - 40px); /* espaço pro botão fechar */
}

/* linha de potência */
.ud-potencia-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.ud-potencia-icon { font-size: 14px; }

.ud-potencia-val {
  font-size: 20px;
  font-weight: 700;
  color: #00e5ff;
}

.ud-potencia-unit {
  font-size: 12px;
  color: rgba(0,229,255,0.65);
  font-weight: 600;
}

.ud-potencia-label {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  margin-left: 4px;
}

/* botão fechar */
.ud-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  line-height: 1;
}

.ud-close:hover {
  background: rgba(255,255,255,0.14);
  color: #fff;
}

/* ════════════════════════════════════════════════
   CARROSSEL
════════════════════════════════════════════════ */
.ud-carousel-wrap {
  position: relative;
}

.ud-carousel-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(to bottom, transparent, #0b0f1a);
  pointer-events: none;
  z-index: 1;
}

/* ════════════════════════════════════════════════
   BODY
════════════════════════════════════════════════ */
.ud-body {
  padding: 20px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── TOGGLE ─────────────────────────────────── */
.ud-toggle-row {
  display: flex;
  justify-content: center;
}

.ud-toggle {
  display: flex;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 4px;
  gap: 4px;
}

.ud-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 22px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: all 0.2s;
}

.ud-toggle-btn:hover {
  color: rgba(255,255,255,0.7);
}

.ud-toggle-active {
  background: linear-gradient(135deg, #0047cc, #0091ff) !important;
  color: #fff !important;
  box-shadow: 0 4px 14px rgba(0,71,204,0.4);
}

.ud-toggle-icon {
  font-size: 14px;
  opacity: 0.8;
}

/* ── SELETOR DE MÊS ─────────────────────────── */
.ud-month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.ud-arrow-btn {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.7);
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  line-height: 1;
}

.ud-arrow-btn:hover {
  background: rgba(0,145,255,0.2);
  border-color: rgba(0,145,255,0.5);
  color: #00e5ff;
  box-shadow: 0 0 12px rgba(0,145,255,0.25);
}

.ud-month-label {
  min-width: 160px;
  text-align: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 8px 16px;
}

.ud-month-text {
  font-size: 13px;
  font-weight: 700;
  color: #e8edf5;
  text-transform: capitalize;
  letter-spacing: 0.04em;
}

/* ── CARDS PRINCIPAIS ───────────────────────── */
.ud-cards-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.ud-cards-row-3 {
  grid-template-columns: 1fr 1fr 1fr;
  margin-top: 4px;
}

.ud-card {
  position: relative;
  border-radius: 16px;
  padding: 18px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.07);
  transition: transform 0.2s, box-shadow 0.2s;
}

.ud-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
}

.ud-card-glow {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  filter: blur(24px);
  pointer-events: none;
}

.ud-card-primary {
  background: linear-gradient(145deg, #0d1e3a, #0b1628);
}

.ud-card-secondary {
  background: linear-gradient(145deg, #0a1e18, #091510);
}

.ud-card-sm {
  background: linear-gradient(145deg, #111827, #0d1525);
  padding: 14px 12px 12px;
}

.ud-card-icon {
  font-size: 18px;
  color: #00e5ff;
  margin-bottom: 2px;
}

.ud-card-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.38);
}

.ud-card-val {
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.ud-card-unit {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.35);
}

/* cards pequenos */
.ud-card-icon-sm {
  font-size: 20px;
  margin-bottom: 2px;
}

.ud-card-val-sm {
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.ud-card-unit-sm {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  font-weight: 600;
}

/* ── SKELETON ───────────────────────────────── */
.ud-loading-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.ud-skeleton {
  height: 100px;
  border-radius: 16px;
  background: linear-gradient(90deg, #1a2035 25%, #1e2a42 50%, #1a2035 75%);
  background-size: 200% 100%;
  animation: ud-shimmer 1.5s infinite;
}

@keyframes ud-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ════════════════════════════════════════════════
   TRANSITIONS
════════════════════════════════════════════════ */
.ud-fade-enter-active,
.ud-fade-leave-active { transition: all 0.2s ease; }
.ud-fade-enter-from   { opacity: 0; transform: translateY(-6px); }
.ud-fade-leave-to     { opacity: 0; transform: translateY(-6px); }

.ud-slide-enter-active,
.ud-slide-leave-active { transition: all 0.25s ease; }
.ud-slide-enter-from   { opacity: 0; transform: translateY(8px); }
.ud-slide-leave-to     { opacity: 0; transform: translateY(-8px); }

/* ════════════════════════════════════════════════
   RESPONSIVIDADE
════════════════════════════════════════════════ */
@media (max-width: 500px) {
  .ud-nome       { font-size: 17px; }
  .ud-cards-row-3 { grid-template-columns: 1fr 1fr; }
  .ud-toggle-btn  { padding: 7px 14px; font-size: 12px; }
}
</style>