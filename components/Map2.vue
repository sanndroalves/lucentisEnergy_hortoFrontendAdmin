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

<template>
  <div class="map-wrap">
    <div class="map" ref="mapContainer"></div>
    
      <!-- Dialog para mostrar detalhes da usina -->
      <v-row justify="center">
        <v-dialog v-model="dialogUsina" width="800">
    <v-card>

      <v-card-title class="title">
        {{ usinaSelecionada?.nome }}
      </v-card-title>

      <v-col cols="12" style="padding-top: 7px;">
        <p><strong>Potência:</strong> {{ usinaSelecionada?.potencia }} kWp</p>
      </v-col>

      <v-row> 
        <v-col cols="12" class="text-center" style="padding-top: 0px; padding-bottom: 0px;"> 
            <v-carousel hide-delimiters height="300" width="300"> 
              <v-carousel-item v-for="(imagem, index) in imagensSelecionada" :key="index" :src="imagem.link" contain height="400" >
              </v-carousel-item> 
            </v-carousel> 
          </v-col>
        </v-row>


      <!-- TOGGLE -->
      <v-row justify="center" class="mt-2">
        <v-btn style="margin-right: 20px;" :color="modoVisualizacao==='geral'?'primary':''" @click="modoVisualizacao='geral'">Geral</v-btn>
        <v-btn :color="modoVisualizacao==='mensal'?'primary':''" @click="modoVisualizacao='mensal'">Mensal</v-btn>
      </v-row>

      <!-- MÊS -->
      <v-row v-if="modoVisualizacao==='mensal'" justify="center" class="mt-5 mb-2">
        <v-btn icon @click="mesAnterior">◀</v-btn>
        <span class="mx-3">{{ mesAnoLabel }}</span>
        <v-btn icon @click="proximoMes">▶</v-btn>
      </v-row>

      <v-card-text>
        <transition name="fade-slide" mode="out-in">
          <div :key="modoVisualizacao + mesAnoLabel">

            <!-- LOADING -->
            <v-row v-if="loadingMes">
              <v-col cols="6"><v-skeleton-loader type="card"/></v-col>
              <v-col cols="6"><v-skeleton-loader type="card"/></v-col>

              <v-col cols="4"><v-skeleton-loader type="card"/></v-col>
              <v-col cols="4"><v-skeleton-loader type="card"/></v-col>
              <v-col cols="4"><v-skeleton-loader type="card"/></v-col>
            </v-row>

            <!-- CONTEÚDO -->
            <template v-else>

              <!-- 🔝 LINHA 1 -->
              <v-row>
                <v-col cols="12" sm="6">
                  <v-card class="pa-3 text-center">
                    <h5>Gerado</h5>
                    <strong>{{ geradoExibido.toLocaleString('pt-BR') }} kWh</strong>
                  </v-card>
                </v-col>

                <v-col cols="12" sm="6">
                  <v-card class="pa-3 text-center">
                    <h5>Injetado</h5>
                    <strong>{{ injetadoExibido.toLocaleString('pt-BR') }}</strong>
                  </v-card>
                </v-col>
              </v-row>

              <!-- 🔽 LINHA 2 (SÓ NO GERAL) -->
              <v-row v-if="modoVisualizacao === 'geral'" class="mt-4">

                <v-col cols="12" sm="6" md="4">
                  <v-card class="pa-3 text-center">
                    <h5>Placas</h5>
                    <strong>{{ usinaSelecionada?.qtdPlaca }}</strong>
                  </v-card>
                </v-col>

                <v-col cols="12" sm="6" md="4">
                  <v-card class="pa-3 text-center">
                    <h5>CO₂ evitado</h5>
                    <strong>{{ co2Ton.toFixed(2) }} ton</strong>
                  </v-card>
                </v-col>

                <v-col cols="12" sm="6" md="4">
                  <v-card class="pa-3 text-center">
                    <h5>Árvores</h5>
                    <strong>🌳 {{ arvores }}</strong>
                  </v-card>
                </v-col>

              </v-row>

            </template>

          </div>
        </transition>
        

      </v-card-text>
    </v-card>
  </v-dialog>
      </v-row>

  </div>
</template>


<style scoped>
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

.title {
  background: linear-gradient(to bottom, #4d7fff, #1e73be);
  color: white;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.v-card {
  margin-bottom: 8px;
}
</style>
