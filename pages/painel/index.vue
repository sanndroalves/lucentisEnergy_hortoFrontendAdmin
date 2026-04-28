<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useHead } from '@vueuse/head'

useHead({ title: 'Painel Central • Lucentis' })
definePageMeta({ layout: 'blank' })

const API         = 'https://api.lucentis.com.br/solarman/plants/'
const INTERVAL_MS = 6 * 60 * 1000   // 6 minutos

const plants     = ref([])
const loading    = ref(true)
const error      = ref(null)
const filtro     = ref('all')
const countdown  = ref(INTERVAL_MS / 1000)   // segundos até próxima atualização
const lastFetch  = ref(null)
const refreshing = ref(false)                 // pulso visual na atualização silenciosa

let intervalId  = null
let countdownId = null

// ── fetch ──────────────────────────────────────────────────────
async function fetchPlants(silent = false) {
  if (silent) refreshing.value = true
  else loading.value = true
  error.value = null
  try {
    const res = await fetch(API)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    plants.value = await res.json()
    lastFetch.value = new Date()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value   = false
    refreshing.value = false
    resetCountdown()
  }
}

function resetCountdown() {
  countdown.value = INTERVAL_MS / 1000
}

function startTimers() {
  // countdown a cada segundo
  countdownId = setInterval(() => {
    if (countdown.value > 0) countdown.value--
  }, 1000)

  // fetch a cada 6 minutos
  intervalId = setInterval(() => {
    fetchPlants(true)
  }, INTERVAL_MS)
}

onMounted(() => {
  fetchPlants(false)
  startTimers()
})

onUnmounted(() => {
  clearInterval(intervalId)
  clearInterval(countdownId)
})

// ── formatters ─────────────────────────────────────────────────
const isNormal   = (s) => s === 'NORMAL'
const statusColor = (s) => isNormal(s) ? '#13deb9' : '#ff4d6d'
const statusLabel = (s) => isNormal(s) ? 'ON' : 'OFF'

const cardBorder = (s) =>
  isNormal(s) ? 'rgba(255,255,255,0.07)' : 'rgba(255,77,109,0.30)'

const cardBg = (s) =>
  isNormal(s)
    ? 'linear-gradient(145deg,#0d1628,#111827)'
    : 'linear-gradient(145deg,#1c0a11,#230d16)'

const cardGlow = (s) =>
  isNormal(s) ? 'rgba(19,222,185,0.13)' : 'rgba(255,77,109,0.22)'

const R    = 28
const CIRC = 2 * Math.PI * R

const ringOffset = (power_w, cap) => {
  const pct = Math.min((power_w / 1000) / cap, 1)
  return CIRC * (1 - pct)
}
const ringPct = (power_w, cap) =>
  Math.round(Math.min((power_w / 1000) / cap, 1) * 100)

const shortName = (n) => n.replace(/^UFV\s*[-–]\s*/i, '')

const fmtTime = (iso) => {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

const fmtCountdown = computed(() => {
  const m = Math.floor(countdown.value / 60)
  const s = countdown.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

// ── summary ────────────────────────────────────────────────────
const totalOnline = computed(() => plants.value.filter(p => isNormal(p.status)).length)
const totalPower  = computed(() => plants.value.reduce((a, p) => a + p.generation_power / 1000, 0))
const totalMonth  = computed(() => plants.value.reduce((a, p) => a + p.generation_month, 0))

// ── lista filtrada ─────────────────────────────────────────────
const filtered = computed(() => {
  if (filtro.value === 'NORMAL')  return plants.value.filter(p =>  isNormal(p.status))
  if (filtro.value === 'offline') return plants.value.filter(p => !isNormal(p.status))
  return plants.value
})
</script>

<template>
  <div class="pc-root">

    <!-- ══════════════════════════════════
         TOPBAR
    ══════════════════════════════════ -->
    <header class="topbar">
      <div class="topbar-grid"></div>
      <div class="topbar-inner">

        <!-- esquerda: ícone + título -->
        <div class="topbar-left">
          <div class="solar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="#00e5ff"/>
              <g stroke="#00e5ff" stroke-width="1.5" stroke-linecap="round">
                <line x1="12" y1="2"  x2="12" y2="5"/>  <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="2"  y1="12" x2="5"  y2="12"/> <line x1="19" y1="12" x2="22" y2="12"/>
                <line x1="4.9" y1="4.9"  x2="7"    y2="7"/>    <line x1="17"   y1="17"   x2="19.1" y2="19.1"/>
                <line x1="4.9" y1="19.1" x2="7"    y2="17"/>   <line x1="17"   y1="7"    x2="19.1" y2="4.9"/>
              </g>
            </svg>
          </div>
          <div class="title-wrap">
            <span class="eyebrow">Hortolândia · Solar</span>
            <span class="main-title">PAINEL CENTRAL</span>
          </div>
        </div>

        <!-- centro: filtros inline -->
        <div class="filter-bar" v-if="!loading && !error">
          <button class="filter-btn" :class="{ active: filtro==='all' }"     @click="filtro='all'">Todas</button>
          <button class="filter-btn f-on"  :class="{ active: filtro==='NORMAL' }"  @click="filtro='NORMAL'">Online</button>
          <button class="filter-btn f-off" :class="{ active: filtro==='offline' }" @click="filtro='offline'">Offline</button>
        </div>

        <!-- direita: summary + countdown -->
        <div class="topbar-right" v-if="!loading && !error">
          <div class="sum-pill">
            <span class="sum-v">{{ plants.length }}</span>
            <span class="sum-l">usinas</span>
          </div>
          <div class="sum-pill">
            <span class="sum-v" style="color:#13deb9">{{ totalOnline }}</span>
            <span class="sum-l">online</span>
          </div>
          <div class="sum-pill">
            <span class="sum-v">{{ totalPower.toFixed(0) }}</span>
            <span class="sum-l">kW</span>
          </div>
          <div class="sum-pill">
            <span class="sum-v">{{ (totalMonth/1000).toFixed(1) }}</span>
            <span class="sum-l">MWh/mês</span>
          </div>

          <!-- countdown -->
          <div class="countdown-wrap" :class="{ refreshing }" @click="fetchPlants(true)" title="Clique para atualizar agora">
            <svg width="22" height="22" viewBox="0 0 22 22">
              <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(0,229,255,0.15)" stroke-width="2"/>
              <circle
                cx="11" cy="11" r="9"
                fill="none"
                stroke="#00e5ff"
                stroke-width="2"
                stroke-linecap="round"
                stroke-dasharray="56.5"
                :stroke-dashoffset="56.5 * (1 - countdown / (INTERVAL_MS/1000))"
                transform="rotate(-90 11 11)"
                style="transition:stroke-dashoffset 1s linear"
              />
            </svg>
            <span class="countdown-txt">{{ fmtCountdown }}</span>
          </div>
        </div>

        <div class="live-dot"></div>
      </div>
    </header>

    <!-- ══════════════════════════════════
         CONTEÚDO PRINCIPAL (sem scroll)
    ══════════════════════════════════ -->
    <main class="main-area">

      <!-- SKELETON -->
      <div v-if="loading" class="grid">
        <div v-for="n in 17" :key="n" class="sk-card"></div>
      </div>

      <!-- ERRO -->
      <div v-else-if="error" class="state-box">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#ff4d6d" stroke-width="1.5"/>
          <path d="M12 8v4M12 16h.01" stroke="#ff4d6d" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="state-label">Erro ao carregar dados</span>
        <span class="state-sub">{{ error }}</span>
        <button class="retry-btn" @click="fetchPlants(false)">Tentar novamente</button>
      </div>

      <!-- GRID DE CARDS -->
      <div v-else class="grid">
        <div
          v-for="p in filtered"
          :key="p.id"
          class="card"
          :class="{ 'card-offline': !isNormal(p.status) }"
          :style="{ background: cardBg(p.status), borderColor: cardBorder(p.status) }"
        >
          <!-- efeitos de fundo -->
          <div class="card-glow" :style="{ background: cardGlow(p.status) }"></div>
          <div class="card-scan"></div>

          <!-- linha: status + capacidade -->
          <div class="c-row">
            <div class="c-status">
              <div
                class="pip"
                :class="{ 'pip-off': !isNormal(p.status) }"
                :style="{ background: statusColor(p.status) }"
              ></div>
              <span class="pip-label" :style="{ color: statusColor(p.status) }">
                {{ statusLabel(p.status) }}
              </span>
            </div>
            <span class="cap-text">{{ p.installed_capacity }}kWp</span>
          </div>

          <!-- anel SVG compacto -->
          <div class="ring-wrap">
            <div class="ring-box">
              <svg class="ring-svg" viewBox="0 0 64 64">
                <circle class="ring-track" cx="32" cy="32" :r="R"/>
                <circle
                  class="ring-fill"
                  cx="32" cy="32" :r="R"
                  :stroke="statusColor(p.status)"
                  :stroke-dasharray="CIRC"
                  :stroke-dashoffset="ringOffset(p.generation_power, p.installed_capacity)"
                  :style="{ filter: `drop-shadow(0 0 3px ${statusColor(p.status)}88)` }"
                />
              </svg>
              <div class="ring-center">
                <span class="ring-val">{{ (p.generation_power/1000).toFixed(1) }}</span>
                <span class="ring-unit">kW</span>
                <span class="ring-pct" :style="{ color: statusColor(p.status) }">{{ ringPct(p.generation_power, p.installed_capacity) }}%</span>
              </div>
            </div>
          </div>

          <!-- nome da usina -->
          <div class="c-name">{{ shortName(p.name) }}</div>

          <!-- timestamp -->
          <div class="c-time">{{ fmtTime(p.last_update) }}</div>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════
   ROOT — tudo em 100dvh, sem scroll externo
══════════════════════════════════════════ */
.pc-root {
  /* display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden; */
  background: #080e1c;
  color: #e8edf5;
  /* font-family: 'DM Sans', 'Segoe UI', sans-serif; */
}

/* ══════════════════════════════════════════
   TOPBAR — altura fixa e compacta
══════════════════════════════════════════ */
.topbar {
  position: relative;
  flex-shrink: 0;
  background: rgba(8,14,28,0.97);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0,229,255,0.14);
  padding: 7px 14px;
  z-index: 10;
}

.topbar-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(0,229,255,0.05) 1px, transparent 1px);
  background-size: 18px 18px;
  pointer-events: none;
}

.topbar-inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.topbar-left   { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.topbar-right  { display: flex; align-items: center; gap: 6px; margin-left: auto; flex-shrink: 0; }

.solar-icon {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: rgba(0,229,255,0.1);
  border: 1px solid rgba(0,229,255,0.25);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  animation: iconPulse 3s ease-in-out infinite;
}
@keyframes iconPulse {
  0%,100%{ box-shadow: 0 0 0 0 rgba(0,229,255,0); }
  50%    { box-shadow: 0 0 0 4px rgba(0,229,255,0.1); }
}

.title-wrap { display: flex; flex-direction: column; gap: 0; }
.eyebrow    { font-size: 8px; font-weight: 700; letter-spacing: 0.14em; color: rgba(0,229,255,0.5); text-transform: uppercase; }
.main-title { font-size: 14px; font-weight: 800; color: #fff; letter-spacing: 0.05em; text-shadow: 0 0 14px rgba(0,229,255,0.22); line-height: 1; }

.live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #13deb9; flex-shrink: 0;
  animation: liveDot 2s ease-in-out infinite;
}
@keyframes liveDot {
  0%  { box-shadow: 0 0 0 0   rgba(19,222,185,0.7); }
  70% { box-shadow: 0 0 0 6px rgba(19,222,185,0); }
  100%{ box-shadow: 0 0 0 0   rgba(19,222,185,0); }
}

/* ── filtros inline na topbar ── */
.filter-bar { display: flex; gap: 4px; }

.filter-btn {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: rgba(232,237,245,0.4); cursor: pointer; transition: all 0.15s;
}
.filter-btn:hover { background: rgba(255,255,255,0.06); color: #e8edf5; }
.filter-btn.active { background: rgba(0,229,255,0.1); border-color: rgba(0,229,255,0.35); color: #00e5ff; }
.filter-btn.f-on.active  { background: rgba(19,222,185,0.1); border-color: rgba(19,222,185,0.35); color: #13deb9; }
.filter-btn.f-off.active { background: rgba(255,77,109,0.1);  border-color: rgba(255,77,109,0.35);  color: #ff4d6d; }

/* ── summary pills ── */
.sum-pill {
  display: flex; flex-direction: column; align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px; padding: 3px 8px;
}
.sum-v { font-size: 13px; font-weight: 800; color: #fff; line-height: 1; }
.sum-l { font-size: 8px; color: rgba(232,237,245,0.3); font-weight: 600; letter-spacing: 0.06em; }

/* ── countdown ── */
.countdown-wrap {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; border-radius: 50%;
  transition: opacity 0.2s;
}
.countdown-wrap:hover { opacity: 0.75; }

.countdown-txt {
  position: absolute;
  font-size: 7px; font-weight: 700; color: rgba(0,229,255,0.7);
  letter-spacing: 0.02em;
}

/* pulso ao atualizar silenciosamente */
.countdown-wrap.refreshing {
  animation: cdRefresh 0.6s ease;
}
@keyframes cdRefresh {
  0%,100%{ transform: scale(1); }
  50%    { transform: scale(1.3); opacity: 0.6; }
}

/* ══════════════════════════════════════════
   MAIN AREA — ocupa o resto de 100dvh
══════════════════════════════════════════ */
.main-area {
  flex: 1;
  overflow: hidden;           /* sem scroll */
  padding: 8px 12px 8px;
  display: flex;
  flex-direction: column;
}

/* ══════════════════════════════════════════
   GRID — usa todo o espaço disponível
══════════════════════════════════════════ */
.grid {
  flex: 1;
  display: grid;
  /* 17 usinas → 5 colunas mobile-up, ajusta com minmax */
  grid-template-columns: repeat(5, minmax(0,1fr));
  grid-template-rows: repeat(4, minmax(0,1fr));
  gap: 6px;
  overflow: hidden;
}

/* em telas mais largas, 6 colunas */
@media (min-width: 700px) {
  .grid { grid-template-columns: repeat(6, minmax(0,1fr)); grid-template-rows: repeat(3, minmax(0,1fr)); }
}
@media (min-width: 1100px) {
  .grid { grid-template-columns: repeat(9, minmax(0,1fr)); grid-template-rows: repeat(2, minmax(0,1fr)); }
}

/* ══════════════════════════════════════════
   CARD — muito compacto, sem scroll interno
══════════════════════════════════════════ */
.card {
  border: 1px solid;
  border-radius: 12px;
  padding: 7px 6px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  position: relative;
  overflow: hidden;
  min-width: 0;
  transition: border-color 0.2s, transform 0.15s;
}

.card:hover { transform: translateY(-2px); }

.card-offline { animation: offlineShake 0.4s ease 0.3s both; }
@keyframes offlineShake {
  0%,100%{ transform: translateX(0); }
  25%    { transform: translateX(-2px); }
  75%    { transform: translateX(2px); }
}

.card-glow {
  position: absolute; top: -20px; right: -20px;
  width: 60px; height: 60px; border-radius: 50%;
  filter: blur(20px); pointer-events: none;
}

.card-scan {
  position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0,229,255,0.04), transparent);
  pointer-events: none;
}
.card:hover .card-scan { animation: scanLine 1s linear; }
@keyframes scanLine { 0%{ left:-60% } 100%{ left:120% } }

/* status row */
.c-row {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; gap: 2px;
}
.c-status { display: flex; align-items: center; gap: 3px; }

.pip {
  width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
  animation: pipOn 2s ease-in-out infinite;
}
@keyframes pipOn {
  0%,100%{ box-shadow: 0 0 0 0   rgba(19,222,185,0.6); }
  50%    { box-shadow: 0 0 0 4px rgba(19,222,185,0); }
}
.pip-off { animation: pipOff 1.1s ease-in-out infinite !important; }
@keyframes pipOff {
  0%,100%{ opacity:1;   box-shadow: 0 0 0 0   rgba(255,77,109,0.7); }
  50%    { opacity:0.4; box-shadow: 0 0 0 4px rgba(255,77,109,0); }
}

.pip-label { font-size: 7px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.cap-text  { font-size: 7px; color: rgba(232,237,245,0.28); font-weight: 600; }

/* anel SVG */
.ring-wrap { display: flex; justify-content: center; }
.ring-box  { position: relative; width: 56px; height: 56px; flex-shrink: 0; }

.ring-svg  { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-track { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 6; stroke-linecap: round; }
.ring-fill  {
  fill: none; stroke-width: 6; stroke-linecap: round;
  transition: stroke-dashoffset 1.3s cubic-bezier(0.34,1.1,0.64,1);
}

.ring-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0;
}
.ring-val  { font-size: 11px; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -0.02em; }
.ring-unit { font-size: 7px;  font-weight: 600; color: rgba(232,237,245,0.4); letter-spacing: 0.04em; }
.ring-pct  { font-size: 7px;  font-weight: 700; }

/* nome e timestamp */
.c-name {
  font-size: 9px; font-weight: 700; color: #e8edf5;
  line-height: 1.2; text-align: center; letter-spacing: -0.01em;
  width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.c-time { font-size: 7px; color: rgba(232,237,245,0.2); text-align: center; }

/* ══════════════════════════════════════════
   SKELETON
══════════════════════════════════════════ */
.sk-card {
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.04);
  background: linear-gradient(90deg, #0d1628 25%, #111f35 50%, #0d1628 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  0%  { background-position: 200% 0; }
  100%{ background-position: -200% 0; }
}

/* ══════════════════════════════════════════
   ERRO
══════════════════════════════════════════ */
.state-box {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; text-align: center;
}
.state-label { font-size: 11px; color: rgba(232,237,245,0.4); letter-spacing: 0.06em; text-transform: uppercase; }
.state-sub   { font-size: 10px; color: rgba(255,77,109,0.6); }
.retry-btn {
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 6px 16px; border-radius: 20px;
  background: rgba(0,229,255,0.1); border: 1px solid rgba(0,229,255,0.3); color: #00e5ff;
  cursor: pointer; transition: all 0.15s;
}
.retry-btn:hover { background: rgba(0,229,255,0.18); }
</style>