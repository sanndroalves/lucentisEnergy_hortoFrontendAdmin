<script setup>
import { API_BASE_URL } from '~/base/link';
import { Map, MapStyle, Marker, config, Popup } from '@maptiler/sdk';
import { shallowRef, ref, onMounted, onUnmounted, markRaw, computed } from 'vue';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import * as turf from '@turf/turf';

const mapContainer = shallowRef(null);
const map          = shallowRef(null);
const dialogUsina  = ref(false);
const usinaSelecionada = ref(null);
const loadingMes   = ref(false);
const modoVisualizacao = ref('geral');

const { data } = useAuth();
const isAdmin = computed(() => data.value?.username === 'admin');

// ── modo de camada do mapa: 'usinas' | 'predios' | 'ip'
const camadaAtiva  = ref('usinas');

// markers ativos no mapa (para poder remover)
const markersUsinas  = ref([]);
const markersUnidades = ref([]);

const { data: usinas }    = await useFetch(`${API_BASE_URL}/usina/`);
const { data: imagens }   = await useFetch(`${API_BASE_URL}/imagens/`);
const { data: geracoes }  = await useFetch(`${API_BASE_URL}/relatoriogeracao/`);
const { data: injecoes }  = await useFetch(`${API_BASE_URL}/relatoriousina/`);
const { data: unidades }  = await useFetch(`${API_BASE_URL}/unidadecompensacao`);

const alterarColor = (secretaria) => {
  const colorMap = { E: '#2dccfc', S: '#13DEB9', O: '#FFAE1F' };
  return colorMap[secretaria] || '#5D87FF';
};

// cor dos pontinhos de unidade por secretaria
const corUnidade = (secretaria) => {
  const map = { E: '#2dccfc', S: '#13DEB9', O: '#FFAE1F', P: '#ff8c42', I: '#ff8c42' };
  return map[secretaria] || '#8b9cb8';
};

const imagensSelecionada = ref([]);
const apiKey = ref('AIzaSyA5BEipnfIyp7WAtvZq6u21oR8oKx1Sa9Q');
const totalGerado   = ref(0);
const totalInjetado = ref(0);
const dataSelecionada = ref(new Date());

const mesAtual  = computed(() => dataSelecionada.value.getMonth() + 1);
const anoAtual  = computed(() => dataSelecionada.value.getFullYear());
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
  totalGerado.value   = geracoes.value.filter(i => i.idGeradora === id).reduce((a, i) => a + Number(i.geracao), 0);
  totalInjetado.value = injecoes.value.filter(i => i.idGeradora === id).reduce((a, i) => a + Number(i.injetadoFPonta), 0);
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

const geradoExibido   = computed(() => modoVisualizacao.value === 'geral' ? totalGerado.value   : totalGeradoMes.value);
const injetadoExibido = computed(() => modoVisualizacao.value === 'geral' ? totalInjetado.value : totalInjetadoMes.value);

const co2Total = computed(() => totalGerado.value * 0.536);
const co2Ton   = computed(() => co2Total.value / 1000);
const arvores  = computed(() => Math.round(co2Total.value / 150));

// ── DIALOG USINA ───────────────────────────────────────────────
const abrirDialogUsina = (usina) => {
  usinaSelecionada.value = usina;
  dialogUsina.value = true;
  imagensSelecionada.value = imagens.value.filter(i => i.idGeradora === usina.id);
  calcularTotais(usina.id);
};

window.abrirDialogUsina = (id) => {
  const usina = usinas.value.find(u => u.id == id);
  abrirDialogUsina(usina);
};

// ── GEOCODE helper ─────────────────────────────────────────────
const geocodeEndereco = async (endereco) => {
  const fmt = endereco.replace(/ /g, '_');
  const { data } = await useFetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${fmt}&key=${apiKey.value}`
  );
  const r = data.value?.results?.[0]?.geometry?.location;
  return r ? [r.lng, r.lat] : null;
};

// ── MARKER DE USINA ────────────────────────────────────────────
const criarMarkerUsina = (usinaInfo, lnglat) => {
  const cor      = alterarColor(usinaInfo.secretaria);
  const secLabel = usinaInfo.secretaria === 'E' ? 'Educação'
                 : usinaInfo.secretaria === 'S' ? 'Saúde' : 'Outros';

  const popupHTML = `
    <style>
      .pp-wrap{font-family:'DM Sans','Segoe UI',sans-serif;background:#0b0f1a;border:1px solid ${cor}44;border-radius:14px;padding:14px 14px 12px;min-width:180px;max-width:210px;position:relative;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04)}
      .pp-grid{position:absolute;inset:0;background-image:radial-gradient(circle,${cor}18 1px,transparent 1px);background-size:16px 16px;pointer-events:none}
      .pp-glow{position:absolute;top:-30px;right:-30px;width:90px;height:90px;border-radius:50%;background:${cor}22;filter:blur(24px);pointer-events:none}
      .pp-badge{display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:${cor}18;border:1px solid ${cor}55;color:${cor};padding:3px 9px;border-radius:20px;margin-bottom:8px}
      .pp-dot{width:5px;height:5px;border-radius:50%;background:${cor}}
      .pp-nome{font-size:14px;font-weight:800;color:#fff;letter-spacing:-.01em;line-height:1.2;margin-bottom:10px}
      .pp-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:8px 0;background:linear-gradient(135deg,${cor}22,${cor}11);border:1px solid ${cor}55;border-radius:9px;color:${cor};font-size:11px;font-weight:700;letter-spacing:.08em;cursor:pointer;transition:background .15s,box-shadow .15s}
      .pp-btn:hover{background:${cor}33;box-shadow:0 0 14px ${cor}44}
    </style>
    <div class="pp-wrap">
      <div class="pp-grid"></div><div class="pp-glow"></div>
      <div class="pp-badge"><div class="pp-dot"></div>${secLabel}</div>
      <div class="pp-nome">${usinaInfo.nome}</div>
      <button class="pp-btn" onclick="window.abrirDialogUsina('${usinaInfo.id}')">VER DETALHES →</button>
    </div>`;

  const el = document.createElement('div');
  el.innerHTML = `
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow-${usinaInfo.id}">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ellipse cx="16" cy="38" rx="6" ry="2" fill="rgba(0,0,0,.3)"/>
      <path d="M16 2C9.37 2 4 7.37 4 14C4 22 16 36 16 36C16 36 28 22 28 14C28 7.37 22.63 2 16 2Z"
        fill="#0b0f1a" stroke="${cor}" stroke-width="1.5" filter="url(#glow-${usinaInfo.id})"/>
      <circle cx="16" cy="14" r="7" fill="${cor}22" stroke="${cor}" stroke-width="1"/>
      <circle cx="16" cy="14" r="3.5" fill="${cor}"/>
      <circle cx="14.5" cy="12.5" r="1" fill="rgba(255,255,255,.55)"/>
    </svg>`;
  el.style.cssText = `cursor:pointer;filter:drop-shadow(0 4px 8px ${cor}66)`;

  const m = new Marker({ element: el })
    .setLngLat(lnglat)
    .setPopup(new Popup({ offset: 20, className: 'tech-popup' }).setHTML(popupHTML))
    .addTo(map.value);

  return m;
};

// ── MARKER DE UNIDADE (pontinho) ───────────────────────────────
const criarMarkerUnidade = (unidade, lnglat) => {
  const cor = corUnidade(unidade.secretaria);

  const popupHTML = `
    <style>
      .pu-wrap{font-family:'DM Sans','Segoe UI',sans-serif;background:#0b0f1a;border:1px solid ${cor}55;border-radius:12px;padding:12px 14px;min-width:160px;max-width:200px;position:relative;overflow:hidden;box-shadow:0 10px 32px rgba(0,0,0,.6)}
      .pu-grid{position:absolute;inset:0;background-image:radial-gradient(circle,${cor}12 1px,transparent 1px);background-size:14px 14px;pointer-events:none}
      .pu-uc{font-size:9px;font-weight:700;letter-spacing:.12em;color:${cor};text-transform:uppercase;margin-bottom:5px;opacity:.85}
      .pu-nome{font-size:13px;font-weight:700;color:#fff;line-height:1.3}
    </style>
    <div class="pu-wrap">
      <div class="pu-grid"></div>
      <div class="pu-uc">UC · ${unidade.uc ?? '—'}</div>
      <div class="pu-nome">${unidade.nome ?? unidade.nomeUnidade ?? '—'}</div>
    </div>`;

  // pontinho SVG pequeno com pulso
  const el = document.createElement('div');
  el.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="8" fill="${cor}18" stroke="${cor}" stroke-width="1"/>
      <circle cx="9" cy="9" r="4" fill="${cor}" />
      <circle cx="7.5" cy="7.5" r="1.2" fill="rgba(255,255,255,.5)"/>
    </svg>`;
  el.style.cssText = `
    cursor:pointer;
    filter:drop-shadow(0 0 5px ${cor}99);
    animation:pu-pulse-${unidade.id} 2.4s ease-in-out infinite;`;

  // injetar keyframe de pulso isolado por ID para evitar conflito
  if (!document.getElementById(`kf-pu-${unidade.id}`)) {
    const s = document.createElement('style');
    s.id = `kf-pu-${unidade.id}`;
    s.textContent = `
      @keyframes pu-pulse-${unidade.id} {
        0%,100%{ filter:drop-shadow(0 0 4px ${cor}88); }
        50%    { filter:drop-shadow(0 0 10px ${cor}cc); }
      }`;
    document.head.appendChild(s);
  }

  const m = new Marker({ element: el })
    .setLngLat(lnglat)
    .setPopup(new Popup({ offset: 14, className: 'tech-popup' }).setHTML(popupHTML))
    .addTo(map.value);

  return m;
};

// ── REMOVER CAMADA ─────────────────────────────────────────────
const removerMarkers = (lista) => {
  lista.forEach(m => m.remove());
  lista.length = 0;
};

// ── CARREGAR UNIDADES NO MAPA ──────────────────────────────────
const carregarUnidades = async (tipo) => {
  removerMarkers(markersUnidades.value);

  // filtra por tipo: predios = E/S/O, ip = P/I
  const lista = (unidades.value ?? []).filter(u => {
    if (tipo === 'predios') return ['E', 'S', 'O'].includes(u.secretaria);
    if (tipo === 'ip')      return ['P', 'I'].includes(u.secretaria);
    return false;
  });

  // geocodifica e plota em paralelo (com limite para não estourar quota)
  const lote = 8; // processa N por vez
  for (let i = 0; i < lista.length; i += lote) {
    const grupo = lista.slice(i, i + lote);
    await Promise.all(grupo.map(async (u) => {
      try {
        const endereco = u.endereco ?? u.logradouro ?? u.nome ?? '';
        if (!endereco) return;
        const lnglat = await geocodeEndereco(endereco + ', Hortolândia SP');
        if (!lnglat) return;
        const m = criarMarkerUnidade(u, lnglat);
        markersUnidades.value.push(m);
      } catch {}
    }));
  }
};

// ── ALTERNAR CAMADA ────────────────────────────────────────────
const alterarCamada = async (nova) => {
  if (nova === camadaAtiva.value) return;
  camadaAtiva.value = nova;

  if (nova === 'usinas') {
    // reexibe markers de usinas, remove unidades
    removerMarkers(markersUnidades.value);
    markersUsinas.value.forEach(m => m.addTo(map.value));
  } else {
    // esconde usinas, carrega unidades
    markersUsinas.value.forEach(m => m.remove());
    await carregarUnidades(nova);
  }
};

// ── PROCURAR USINA ─────────────────────────────────────────────
const procurarLocal = async (usinaInfo) => {
  const lnglat = await geocodeEndereco(usinaInfo.endereco);
  if (!lnglat) return;
  const m = criarMarkerUsina(usinaInfo, lnglat);
  markersUsinas.value.push(m);
  return m;
};

// ── MOUNTED ────────────────────────────────────────────────────
onMounted(async () => {
  config.apiKey = 'IIHRnngOE9Csi4hREWUJ';

  map.value = markRaw(new Map({
    container: mapContainer.value,
    style: MapStyle.OUTDOOR,
    center: [-47.20619897861493, -22.87629069748016],
    zoom: 11.3, pitch: 60, bearing: -17.8,
  }));

  // plota usinas
  await Promise.all(usinas.value.map(u => procurarLocal(u)));

  // borda GeoJSON
  try {
    const response = await fetch('/geojson/export.geojson');
    const geojson  = await response.json();
    map.value.on('load', () => {
      const worldPolygon = [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]];
      const cityPolygons = geojson.features
        .filter(f => f.geometry.type === 'Polygon')
        .map(f => f.geometry.coordinates[0]);
      const mask = turf.polygon([worldPolygon, ...cityPolygons]);

      map.value.addSource('mask-source', { type: 'geojson', data: mask });
      map.value.addLayer({ id: 'outside-hortolandia', type: 'fill', source: 'mask-source',
        paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.57 } });
      map.value.addSource('hortolandia-area', { type: 'geojson', data: geojson });
      map.value.addLayer({ id: 'hortolandia-border', type: 'line', source: 'hortolandia-area',
        paint: { 'line-color': '#5D87FF', 'line-width': 2 } });
    });
  } catch (e) { console.error('GeoJSON:', e); }
});

onUnmounted(() => { map.value?.remove(); });
</script>

<template>
  <div class="map-wrap">
    <div class="map" ref="mapContainer"></div>

    <!-- ═══════════════════════════════════════════════
         LAYER SWITCHER — floating bottom-left
    ═══════════════════════════════════════════════ -->
    <div v-if="isAdmin" class="layer-switcher">
      <div class="layer-label">
        <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="none" stroke="#00e5ff" stroke-width="1.2"/><circle cx="6" cy="6" r="2" fill="#00e5ff"/></svg>
        CAMADA
      </div>
      <div class="layer-btns">
        <button
          class="layer-btn"
          :class="{ 'layer-btn-active': camadaAtiva === 'usinas' }"
          @click="alterarCamada('usinas')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C7.37 2 4 5.37 4 10C4 16 12 22 12 22C12 22 20 16 20 10C20 5.37 16.63 2 12 2Z"
              :fill="camadaAtiva === 'usinas' ? '#00e5ff' : 'none'"
              :stroke="camadaAtiva === 'usinas' ? '#00e5ff' : 'rgba(255,255,255,0.4)'"
              stroke-width="1.5"/>
          </svg>
          Usinas
        </button>

        <button
          class="layer-btn"
          :class="{ 'layer-btn-active layer-btn-predios': camadaAtiva === 'predios' }"
          @click="alterarCamada('predios')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="8" width="18" height="13" rx="1.5"
              :fill="camadaAtiva === 'predios' ? '#2dccfc' : 'none'"
              :stroke="camadaAtiva === 'predios' ? '#2dccfc' : 'rgba(255,255,255,0.4)'"
              stroke-width="1.5"/>
            <path d="M8 21V13h8v8" :stroke="camadaAtiva === 'predios' ? '#0b0f1a' : 'rgba(255,255,255,0.4)'" stroke-width="1.2"/>
            <path d="M12 3L3 8h18L12 3Z"
              :fill="camadaAtiva === 'predios' ? '#2dccfc' : 'none'"
              :stroke="camadaAtiva === 'predios' ? '#2dccfc' : 'rgba(255,255,255,0.4)'"
              stroke-width="1.5"/>
          </svg>
          Prédios
        </button>

        <button
          class="layer-btn"
          :class="{ 'layer-btn-active layer-btn-ip': camadaAtiva === 'ip' }"
          @click="alterarCamada('ip')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9"
              :fill="camadaAtiva === 'ip' ? '#ff8c42' : 'none'"
              :stroke="camadaAtiva === 'ip' ? '#ff8c42' : 'rgba(255,255,255,0.4)'"
              stroke-width="1.5"/>
            <path d="M12 7v5l3 3"
              :stroke="camadaAtiva === 'ip' ? '#0b0f1a' : 'rgba(255,255,255,0.4)'"
              stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          IP
        </button>
      </div>

      <!-- indicador de loading ao trocar camada -->
      <transition name="fade-indicator">
        <div v-if="camadaAtiva !== 'usinas' && markersUnidades.length === 0" class="layer-loading">
          <div class="layer-loading-dot"></div>
          <span>Carregando unidades…</span>
        </div>
      </transition>
    </div>

    <!-- ═══════════════════════════════════════════════
         DIALOG DA USINA
    ═══════════════════════════════════════════════ -->
    <v-row justify="center">
      <v-dialog v-model="dialogUsina" width="520" content-class="usina-dialog">
        <div class="ud-shell">

          <!-- ── HEADER ──────────────────────────────── -->
          <div class="ud-header">
            <div class="ud-header-grid"></div>
            <div class="ud-header-top">
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
            <h2 class="ud-nome">{{ usinaSelecionada?.nome }}</h2>
            <div class="ud-potencia-row">
              <span class="ud-potencia-icon">⚡</span>
              <span class="ud-potencia-val">{{ usinaSelecionada?.potencia }}</span>
              <span class="ud-potencia-unit">kWp</span>
              <span class="ud-potencia-label">· Potência instalada</span>
            </div>
          </div>

          <!-- ── CARROSSEL ───────────────────────────── -->
          <div class="ud-carousel-wrap">
            <v-carousel hide-delimiters height="160" show-arrows="hover">
              <v-carousel-item
                v-for="(imagem, index) in imagensSelecionada"
                :key="index" :src="imagem.link" cover
              />
            </v-carousel>
            <div class="ud-carousel-fade"></div>
          </div>

          <!-- ── BODY ───────────────────────────────── -->
          <div class="ud-body">
            <div class="ud-toggle-row">
              <div class="ud-toggle">
                <button class="ud-toggle-btn" :class="{ 'ud-toggle-active': modoVisualizacao === 'geral' }" @click="modoVisualizacao = 'geral'">
                  <span class="ud-toggle-icon">◈</span> Geral
                </button>
                <button class="ud-toggle-btn" :class="{ 'ud-toggle-active': modoVisualizacao === 'mensal' }" @click="modoVisualizacao = 'mensal'">
                  <span class="ud-toggle-icon">◷</span> Mensal
                </button>
              </div>
            </div>

            <transition name="ud-fade">
              <div v-if="modoVisualizacao === 'mensal'" class="ud-month-nav">
                <button class="ud-arrow-btn" @click="mesAnterior">‹</button>
                <div class="ud-month-label">
                  <span class="ud-month-text">{{ mesAnoLabel }}</span>
                </div>
                <button class="ud-arrow-btn" @click="proximoMes">›</button>
              </div>
            </transition>

            <transition name="ud-slide" mode="out-in">
              <div :key="modoVisualizacao + mesAnoLabel">
                <div v-if="loadingMes" class="ud-loading-grid">
                  <div class="ud-skeleton" v-for="n in 2" :key="n"></div>
                </div>
                <template v-else>
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

/* popup transparente */
:global(.tech-popup .maplibregl-popup-content),
:global(.tech-popup .mapboxgl-popup-content) {
  background: transparent !important; padding: 0 !important;
  box-shadow: none !important; border-radius: 14px !important;
}
:global(.tech-popup .maplibregl-popup-tip),
:global(.tech-popup .mapboxgl-popup-tip) { display: none !important; }

/* ═══════════════════════════════════════════
   LAYER SWITCHER
═══════════════════════════════════════════ */
.layer-switcher {
  position: absolute;
  bottom: 52px;          /* acima do pull-tab do index */
  left: 14px;
  z-index: 20;
  background: rgba(8, 14, 28, 0.90);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(0, 229, 255, 0.18);
  border-radius: 16px;
  padding: 10px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04);
  min-width: 130px;
}

.layer-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgba(0, 229, 255, 0.55);
  text-transform: uppercase;
}

.layer-btns {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layer-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.42);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: all 0.18s;
  width: 100%;
  text-align: left;
}
.layer-btn:hover {
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.75);
}

/* ativo — usinas */
.layer-btn-active {
  background: rgba(0, 229, 255, 0.1) !important;
  border-color: rgba(0, 229, 255, 0.35) !important;
  color: #00e5ff !important;
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.12);
}

/* ativo — prédios */
.layer-btn-predios.layer-btn-active {
  background: rgba(45, 204, 252, 0.1) !important;
  border-color: rgba(45, 204, 252, 0.35) !important;
  color: #2dccfc !important;
  box-shadow: 0 0 12px rgba(45, 204, 252, 0.12);
}

/* ativo — IP */
.layer-btn-ip.layer-btn-active {
  background: rgba(255, 140, 66, 0.1) !important;
  border-color: rgba(255, 140, 66, 0.35) !important;
  color: #ff8c42 !important;
  box-shadow: 0 0 12px rgba(255, 140, 66, 0.12);
}

/* loading indicator */
.layer-loading {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  color: rgba(255,255,255,0.35);
  padding: 2px 2px 0;
}
.layer-loading-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #00e5ff;
  animation: ld-blink 1s ease-in-out infinite;
}
@keyframes ld-blink {
  0%,100% { opacity: 1; transform: scale(1); }
  50%     { opacity: 0.3; transform: scale(0.7); }
}

.fade-indicator-enter-active, .fade-indicator-leave-active { transition: opacity 0.3s; }
.fade-indicator-enter-from, .fade-indicator-leave-to       { opacity: 0; }

/* ═══════════════════════════════════════════
   DIALOG SHELL
═══════════════════════════════════════════ */
:deep(.usina-dialog) {
  border-radius: 20px !important; overflow: hidden;
  box-shadow: 0 24px 80px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.05) !important;
  max-height: 92dvh !important;
}
.ud-shell {
  background: #0b0f1a; border-radius: 20px;
  overflow-y: auto; max-height: 92dvh;
  display: flex; flex-direction: column;
  font-family: 'DM Sans','Segoe UI',sans-serif; color: #e8edf5;
}

/* ── Header ── */
.ud-header {
  position: relative; padding: 16px 16px 14px;
  background: linear-gradient(145deg,#0d1628,#111827 60%,#0a1020);
  border-bottom: 1px solid rgba(255,255,255,.06); overflow: hidden; flex-shrink: 0;
}
.ud-header-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(circle,rgba(0,180,255,.07) 1px,transparent 1px);
  background-size: 20px 20px; pointer-events: none;
}
.ud-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ud-sec-badge  { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; border: 1px solid; }
.ud-sec-dot    { width: 5px; height: 5px; border-radius: 50%; }
.ud-nome       { font-size: 17px; font-weight: 800; color: #fff; line-height: 1.2; letter-spacing: -.02em; margin-bottom: 6px; }
.ud-potencia-row { display: flex; align-items: baseline; gap: 4px; }
.ud-potencia-icon { font-size: 12px; }
.ud-potencia-val  { font-size: 16px; font-weight: 700; color: #00e5ff; }
.ud-potencia-unit { font-size: 11px; color: rgba(0,229,255,.65); font-weight: 600; }
.ud-potencia-label{ font-size: 10px; color: rgba(255,255,255,.3); margin-left: 3px; }
.ud-close { width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); color: rgba(255,255,255,.5); font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0; }
.ud-close:hover { background: rgba(255,255,255,.14); color: #fff; }

/* ── Carrossel ── */
.ud-carousel-wrap { position: relative; flex-shrink: 0; }
.ud-carousel-fade { position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(to bottom,transparent,#0b0f1a); pointer-events: none; z-index: 1; }

/* ── Body ── */
.ud-body { padding: 12px 14px 16px; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; }

.ud-toggle-row { display: flex; justify-content: center; }
.ud-toggle { display: flex; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 3px; gap: 3px; }
.ud-toggle-btn { display: flex; align-items: center; gap: 5px; padding: 7px 18px; border-radius: 9px; border: none; background: transparent; color: rgba(255,255,255,.38); font-size: 12px; font-weight: 600; cursor: pointer; letter-spacing: .03em; transition: all .2s; }
.ud-toggle-btn:hover { color: rgba(255,255,255,.7); }
.ud-toggle-active { background: linear-gradient(135deg,#0047cc,#0091ff) !important; color: #fff !important; box-shadow: 0 3px 12px rgba(0,71,204,.4); }
.ud-toggle-icon { font-size: 13px; opacity: .8; }

.ud-month-nav { display: flex; align-items: center; justify-content: center; gap: 10px; }
.ud-arrow-btn { width: 34px; height: 34px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: rgba(255,255,255,.7); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.ud-arrow-btn:hover { background: rgba(0,145,255,.2); border-color: rgba(0,145,255,.5); color: #00e5ff; box-shadow: 0 0 10px rgba(0,145,255,.2); }
.ud-month-label { min-width: 140px; text-align: center; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 9px; padding: 6px 14px; }
.ud-month-text  { font-size: 12px; font-weight: 700; color: #e8edf5; text-transform: capitalize; letter-spacing: .04em; }

.ud-cards-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ud-cards-row-3 { grid-template-columns: 1fr 1fr 1fr; margin-top: 6px; gap: 6px; }

.ud-card { position: relative; border-radius: 13px; padding: 13px 12px 11px; display: flex; flex-direction: column; gap: 3px; overflow: hidden; border: 1px solid rgba(255,255,255,.07); transition: transform .2s,box-shadow .2s; }
.ud-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.3); }
.ud-card-glow { position: absolute; top: -18px; right: -18px; width: 70px; height: 70px; border-radius: 50%; filter: blur(20px); pointer-events: none; }
.ud-card-primary   { background: linear-gradient(145deg,#0d1e3a,#0b1628); }
.ud-card-secondary { background: linear-gradient(145deg,#0a1e18,#091510); }
.ud-card-sm        { background: linear-gradient(145deg,#111827,#0d1525); padding: 11px 10px 10px; }
.ud-card-icon    { font-size: 16px; color: #00e5ff; margin-bottom: 1px; }
.ud-card-label   { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.35); }
.ud-card-val     { font-size: 22px; font-weight: 800; color: #fff; line-height: 1.1; letter-spacing: -.02em; }
.ud-card-unit    { font-size: 10px; font-weight: 600; color: rgba(255,255,255,.32); }
.ud-card-icon-sm { font-size: 17px; margin-bottom: 1px; }
.ud-card-val-sm  { font-size: 18px; font-weight: 800; color: #fff; letter-spacing: -.02em; line-height: 1.1; }
.ud-card-unit-sm { font-size: 10px; color: rgba(255,255,255,.32); font-weight: 600; }

.ud-loading-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ud-skeleton { height: 80px; border-radius: 13px; background: linear-gradient(90deg,#1a2035 25%,#1e2a42 50%,#1a2035 75%); background-size: 200% 100%; animation: ud-shimmer 1.5s infinite; }
@keyframes ud-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* ── Transitions ── */
.ud-fade-enter-active,.ud-fade-leave-active{transition:all .2s ease}
.ud-fade-enter-from,.ud-fade-leave-to{opacity:0;transform:translateY(-5px)}
.ud-slide-enter-active,.ud-slide-leave-active{transition:all .22s ease}
.ud-slide-enter-from{opacity:0;transform:translateY(7px)}
.ud-slide-leave-to{opacity:0;transform:translateY(-7px)}

/* ── Mobile ── */
@media(max-width:500px){
  .ud-nome{font-size:14px}
  .ud-potencia-val{font-size:14px}
  .ud-cards-row-3{grid-template-columns:1fr 1fr}
  .ud-toggle-btn{padding:6px 12px;font-size:11px}
  .ud-card-val{font-size:18px}
  .ud-card-val-sm{font-size:15px}
  .layer-switcher{bottom:44px;left:10px}
}
</style>