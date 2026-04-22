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

const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);
const { data: imagens } = await useFetch(`${API_BASE_URL}/imagens/`);
const { data: geracoes } = await useFetch(`${API_BASE_URL}/relatoriogeracao/`);
const { data: injecoes } = await useFetch(`${API_BASE_URL}/relatoriousina/`);

const imagensSelecionada = ref()
const apiKey = ref("AIzaSyA5BEipnfIyp7WAtvZq6u21oR8oKx1Sa9Q");

const alterarColor = (secretaria) => {
  const colorMap = {
    E: "#5D87FF",
    S: "#13DEB9",
    O: "#FFAE1F",
  };
  return colorMap[secretaria] || "#5D87FF";
};

const totalGerado = ref(0)
const totalInjetado = ref(0)
const totalCompensado = ref(0)

const abrirDialogUsina = (usina) => {
  usinaSelecionada.value = usina;
  dialogUsina.value = true;
  imagensSelecionada.value = imagens.value.filter(item => item.idGeradora === usina.id) 

  const geraUsinaIndi = geracoes.value.filter(item => item.idGeradora === usinaSelecionada.value.id)
  const injeUsinaIndi = injecoes.value.filter(item => item.idGeradora === usinaSelecionada.value.id)

  totalGerado.value = 0
  geraUsinaIndi.forEach(item =>{
    totalGerado.value += Number(item.geracao)
  })

  totalInjetado.value = 0
  injeUsinaIndi.forEach(item =>{
    totalInjetado.value += Number(item.injetadoFPonta)
  }) 

  totalCompensado.value = (Number(totalGerado.value) * 0.72)
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


  const marker = new Marker({ color: '#5D87FF' })
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
      <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
        <span class="text-h5">{{ usinaSelecionada?.nome }}</span>
      </v-card-title>
          <v-col cols="12" style="padding-top: 7px;">
              <p><strong>Potência:</strong> {{ usinaSelecionada?.potencia }} kWp</p> 
            </v-col> 
      <v-card-text style="padding: 0px;">
        <v-container style="padding-top: 0px; margin-top: 0px;">
  
          <v-row>
            <v-col cols="12" class="text-center" style="padding-top: 0px; padding-bottom: 0px;">
            <v-carousel hide-delimiters height="300" width="300">
              <v-carousel-item v-for="(imagem, index) in imagensSelecionada" :key="index" :src="imagem.link" contain height="400"
              ></v-carousel-item>
            </v-carousel>   
            </v-col>

            <v-col cols="12" sm="6" md="4">
              <v-card class="pa-3 text-center" elevation="3">
                <p class="text-h6 font-weight-bold">Gerado</p>
                <!-- <p style="font-size: 10px;">Geral</p> -->
                <p class="text-h5 text-primary">{{ totalGerado || '0' }} kWh</p>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="4">
              <v-card class="pa-3 text-center" elevation="3">
                <p class="text-h6 font-weight-bold">Injetado</p>
                <!-- <p style="font-size: 10px;">Geral</p> -->
                <p class="text-h5 text-success">{{ totalInjetado || '0' }}</p>
              </v-card>
            </v-col>

            <v-col cols="12" sm="12" md="4">
              <v-card class="pa-3 text-center" elevation="3">
                <p class="text-h6 font-weight-bold">Quant. Placas</p>
                <!-- <p style="font-size: 10px;">Geral</p> -->
                <p class="text-h5 text-warning">{{ usinaSelecionada?.qtdPlaca || '0' }}</p>
              </v-card>
            </v-col>

            <!-- <v-col cols="12" sm="12" md="4">
              <v-card class="pa-3 text-center" elevation="3">
                <p class="text-h6 font-weight-bold">Compensado</p>
                <p style="font-size: 10px;">tarifa média</p>
                <p class="text-h5 text-warning">R$ {{ totalCompensado || '0' }}</p>
              </v-card>
            </v-col> -->
          </v-row>
 
        </v-container>
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
</style>
