<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useHead } from '@vueuse/head'

useHead({ title: 'Painel Central • Lucentis' })
definePageMeta({ layout: 'blank' })

const API         = 'https://api.lucentis.com.br/solarman/plants/'
const INTERVAL_MS = 6 * 60 * 1000

const plants     = ref([])
const loading    = ref(true)
const error      = ref(null)
const filtro     = ref('all')
const countdown  = ref(INTERVAL_MS / 1000)
const refreshing = ref(false)

let intervalId  = null
let countdownId = null

async function fetchPlants(silent = false) {
  if (silent) refreshing.value = true
  else        loading.value    = true
  error.value = null
  try {
    const res = await fetch(API)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    plants.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value    = false
    refreshing.value = false
    countdown.value  = INTERVAL_MS / 1000
  }
}

function startTimers() {
  countdownId = setInterval(() => {
    if (countdown.value > 0) countdown.value--
  }, 1000)
  intervalId = setInterval(() => fetchPlants(true), INTERVAL_MS)
}

onMounted(() => { fetchPlants(false); startTimers() })
onUnmounted(() => { clearInterval(intervalId); clearInterval(countdownId) })

const isNormal    = (s) => s === 'NORMAL'
const statusColor = (s) => isNormal(s) ? '#13deb9' : '#ff4d6d'
const statusLabel = (s) => isNormal(s) ? 'ON' : 'OFF'
const cardBorder  = (s) => isNormal(s) ? 'rgba(255,255,255,0.07)' : 'rgba(255,77,109,0.30)'
const cardBg      = (s) => isNormal(s)
  ? 'linear-gradient(145deg,#0d1628,#111827)'
  : 'linear-gradient(145deg,#1c0a11,#230d16)'
const cardGlow = (s) => isNormal(s) ? 'rgba(19,222,185,0.13)' : 'rgba(255,77,109,0.22)'

const R    = 28
const CIRC = 2 * Math.PI * R

const ringOffset = (pw, cap) => CIRC * (1 - Math.min((pw / 1000) / cap, 1))
const ringPct    = (pw, cap) => Math.round(Math.min((pw / 1000) / cap, 1) * 100)
const shortName  = (n) => n.replace(/^UFV\s*[-\u2013]\s*/i, '')

const fmtTime = (iso) => {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

const fmtCountdown = computed(() => {
  const m = Math.floor(countdown.value / 60)
  const s = countdown.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

const totalOnline = computed(() => plants.value.filter(p => isNormal(p.status)).length)
const totalPower  = computed(() => plants.value.reduce((a, p) => a + p.generation_power / 1000, 0))
const totalMonth  = computed(() => plants.value.reduce((a, p) => a + p.generation_month, 0))

const filtered = computed(() => {
  if (filtro.value === 'NORMAL')  return plants.value.filter(p =>  isNormal(p.status))
  if (filtro.value === 'offline') return plants.value.filter(p => !isNormal(p.status))
  return plants.value
})

// mobile menu dropdown
const mobileMenuOpen = ref(false)
const toggleMobileMenu = () => { mobileMenuOpen.value = !mobileMenuOpen.value }
const setFiltroMobile = (f) => { filtro.value = f; mobileMenuOpen.value = false }
</script>

<template>
  <div class="pc-root">

    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar-grid"></div>
      <div class="topbar-inner">

        <!-- ── esquerda: ícone + título ── -->
        <div class="topbar-left">
          <div class="solar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="#00e5ff"/>
              <g stroke="#00e5ff" stroke-width="1.5" stroke-linecap="round">
                <line x1="12" y1="2"  x2="12" y2="5"/>   <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="2"  y1="12" x2="5"  y2="12"/>  <line x1="19" y1="12" x2="22" y2="12"/>
                <line x1="4.9" y1="4.9"  x2="7"    y2="7"/>  <line x1="17" y1="17"  x2="19.1" y2="19.1"/>
                <line x1="4.9" y1="19.1" x2="7"    y2="17"/> <line x1="17" y1="7"   x2="19.1" y2="4.9"/>
              </g>
            </svg>
          </div>
          <div class="title-wrap">
            <span class="eyebrow">Lucentis · Hortolândia</span>
            <span class="main-title">PAINEL CENTRAL</span>
          </div>
        </div>

        <!-- ── DESKTOP: filtros inline ── -->
        <div v-if="!loading && !error" class="filter-bar hide-mobile">
          <button class="filter-btn"       :class="{ active: filtro==='all' }"     @click="filtro='all'">Todas</button>
          <button class="filter-btn f-on"  :class="{ active: filtro==='NORMAL' }"  @click="filtro='NORMAL'">Online</button>
          <button class="filter-btn f-off" :class="{ active: filtro==='offline' }" @click="filtro='offline'">Offline</button>
        </div>

        <!-- ── DESKTOP: stats + countdown ── -->
        <div v-if="!loading && !error" class="topbar-right hide-mobile">
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
          <div class="countdown-wrap" :class="{ refreshing }" @click="fetchPlants(true)" title="Clique para atualizar agora">
            <svg width="28" height="28" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(0,229,255,0.15)" stroke-width="2"/>
              <circle cx="12" cy="12" r="10" fill="none" stroke="#00e5ff" stroke-width="2" stroke-linecap="round"
                :stroke-dasharray="62.8"
                :stroke-dashoffset="62.8 * (1 - countdown / (INTERVAL_MS / 1000))"
                transform="rotate(-90 12 12)"
                style="transition:stroke-dashoffset 1s linear"/>
            </svg>
            <span class="countdown-txt">{{ fmtCountdown }}</span>
          </div>
        </div>

        <!-- ── MOBILE: botão menu hamburguer ── -->
        <button
          v-if="!loading && !error"
          class="mobile-menu-btn show-mobile"
          :class="{ open: mobileMenuOpen }"
          @click="toggleMobileMenu"
          aria-label="Menu"
        >
          <span></span><span></span><span></span>
        </button>

        <div class="live-dot"></div>
      </div>

      <!-- ── MOBILE: dropdown com tudo ── -->
      <transition name="dropdown">
        <div v-if="mobileMenuOpen && !loading && !error" class="mobile-dropdown">

          <!-- stats em grid 2x2 -->
          <div class="mob-stats">
            <div class="mob-stat-card">
              <span class="mob-stat-v">{{ plants.length }}</span>
              <span class="mob-stat-l">usinas</span>
            </div>
            <div class="mob-stat-card">
              <span class="mob-stat-v" style="color:#13deb9">{{ totalOnline }}</span>
              <span class="mob-stat-l">online</span>
            </div>
            <div class="mob-stat-card">
              <span class="mob-stat-v">{{ totalPower.toFixed(0) }}</span>
              <span class="mob-stat-l">kW atual</span>
            </div>
            <div class="mob-stat-card">
              <span class="mob-stat-v">{{ (totalMonth/1000).toFixed(1) }}</span>
              <span class="mob-stat-l">MWh/mês</span>
            </div>
          </div>

          <!-- divisor -->
          <div class="mob-divider"></div>

          <!-- filtros -->
          <div class="mob-filters">
            <button class="mob-filter-btn"      :class="{ active: filtro==='all' }"     @click="setFiltroMobile('all')">Todas</button>
            <button class="mob-filter-btn f-on" :class="{ active: filtro==='NORMAL' }"  @click="setFiltroMobile('NORMAL')">Online</button>
            <button class="mob-filter-btn f-off":class="{ active: filtro==='offline' }" @click="setFiltroMobile('offline')">Offline</button>
          </div>

          <!-- countdown + atualizar -->
          <div class="mob-countdown-row">
            <div class="countdown-wrap" :class="{ refreshing }" @click="fetchPlants(true); mobileMenuOpen=false">
              <svg width="28" height="28" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(0,229,255,0.15)" stroke-width="2"/>
                <circle cx="12" cy="12" r="10" fill="none" stroke="#00e5ff" stroke-width="2" stroke-linecap="round"
                  :stroke-dasharray="62.8"
                  :stroke-dashoffset="62.8 * (1 - countdown / (INTERVAL_MS / 1000))"
                  transform="rotate(-90 12 12)"
                  style="transition:stroke-dashoffset 1s linear"/>
              </svg>
              <span class="countdown-txt">{{ fmtCountdown }}</span>
            </div>
            <span class="mob-cd-label">Próxima atualização — clique para forçar</span>
          </div>

        </div>
      </transition>
    </header>

    <!-- CONTEÚDO -->
    <main class="main-area">

      <!-- Skeleton -->
      <div v-if="loading" class="grid">
        <div v-for="n in 17" :key="n" class="sk-card"></div>
      </div>

      <!-- Erro -->
      <div v-else-if="error" class="state-box">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#ff4d6d" stroke-width="1.5"/>
          <path d="M12 8v4M12 16h.01" stroke="#ff4d6d" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="state-label">Erro ao carregar dados</span>
        <span class="state-sub">{{ error }}</span>
        <button class="retry-btn" @click="fetchPlants(false)">Tentar novamente</button>
      </div>

      <!-- Grid -->
      <div v-else class="grid">
        <div
          v-for="p in filtered"
          :key="p.id"
          class="card"
          :class="{ 'card-offline': !isNormal(p.status) }"
          :style="{ background: cardBg(p.status), borderColor: cardBorder(p.status) }"
        >
          <div class="card-glow" :style="{ background: cardGlow(p.status) }"></div>
          <div class="card-scan"></div>

          <div class="c-row">
            <div class="c-status">
              <div class="pip" :class="{ 'pip-off': !isNormal(p.status) }" :style="{ background: statusColor(p.status) }"></div>
              <span class="pip-label" :style="{ color: statusColor(p.status) }">{{ statusLabel(p.status) }}</span>
            </div>
            <span class="cap-text">{{ p.installed_capacity }}kWp</span>
          </div>

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
                <span class="ring-val">{{ (p.generation_power / 1000).toFixed(1) }}</span>
                <span class="ring-unit">kW</span>
                <span class="ring-pct" :style="{ color: statusColor(p.status) }">{{ ringPct(p.generation_power, p.installed_capacity) }}%</span>
              </div>
            </div>
          </div>

          <div class="c-name">{{ shortName(p.name) }}</div>
          <div class="c-time">{{ fmtTime(p.last_update) }}</div>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
/* ROOT — desktop: tela cheia sem scroll | mobile: scroll livre */
.pc-root {
  background: #080e1c;
  color: #e8edf5;
  font-family: 'DM Sans', 'Segoe UI', sans-serif;

  /* desktop: ocupa exatamente a viewport, sem scroll */
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

/* ── TOPBAR ── */
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(8,14,28,0.97);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(0,229,255,0.14);
  padding: 8px 16px;
}

.topbar-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(0,229,255,0.055) 1px, transparent 1px);
  background-size: 18px 18px;
  pointer-events: none;
}

.topbar-inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
}

.solar-icon {
  width: 32px; height: 32px;
  border-radius: 9px;
  background: rgba(0,229,255,0.1);
  border: 1px solid rgba(0,229,255,0.25);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  animation: iconPulse 3s ease-in-out infinite;
}
@keyframes iconPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(0,229,255,0); }
  50%     { box-shadow: 0 0 0 5px rgba(0,229,255,0.1); }
}

.title-wrap { display: flex; flex-direction: column; gap: 0; }
.eyebrow    { font-size: 8px; font-weight: 700; letter-spacing: 0.14em; color: rgba(0,229,255,0.5); text-transform: uppercase; }
.main-title { font-size: 15px; font-weight: 800; color: #fff; letter-spacing: 0.05em; text-shadow: 0 0 14px rgba(0,229,255,0.22); line-height: 1; }

/* filtros */
.filter-bar { display: flex; gap: 5px; flex-shrink: 0; }

.filter-btn {
  font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 5px 13px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.09);
  background: rgba(255,255,255,0.03);
  color: rgba(232,237,245,0.4); cursor: pointer; transition: all 0.15s;
}
.filter-btn:hover { background: rgba(255,255,255,0.07); color: #e8edf5; }
.filter-btn.active         { background: rgba(0,229,255,0.1);   border-color: rgba(0,229,255,0.35);   color: #00e5ff; }
.filter-btn.f-on.active    { background: rgba(19,222,185,0.1);  border-color: rgba(19,222,185,0.35);  color: #13deb9; }
.filter-btn.f-off.active   { background: rgba(255,77,109,0.1);  border-color: rgba(255,77,109,0.35);  color: #ff4d6d; }

/* summary + countdown */
.topbar-right { display: flex; align-items: center; gap: 6px; margin-left: auto; flex-shrink: 0; }

.sum-pill {
  display: flex; flex-direction: column; align-items: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px; padding: 5px 14px;
  min-width: 52px;
}
.sum-v { font-size: 20px; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -0.02em; }
.sum-l { font-size: 9px; color: rgba(232,237,245,0.35); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 1px; }

.countdown-wrap {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; border-radius: 50%;
  transition: opacity 0.2s;
  flex-shrink: 0;
}
.countdown-wrap:hover { opacity: 0.7; }
.countdown-txt {
  position: absolute;
  font-size: 7px; font-weight: 800;
  color: rgba(0,229,255,0.8);
  letter-spacing: 0.02em;
}
.countdown-wrap.refreshing { animation: cdPulse 0.6s ease; }
@keyframes cdPulse { 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.3); opacity:0.5; } }

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

/* ── VISIBILIDADE RESPONSIVA ── */
.hide-mobile  { display: flex; }
.show-mobile  { display: none; }

/* ── BOTÃO HAMBURGER ── */
.mobile-menu-btn {
  display: flex; flex-direction: column; justify-content: center;
  gap: 4px; width: 32px; height: 32px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 6px; cursor: pointer;
  transition: all 0.15s; flex-shrink: 0;
}
.mobile-menu-btn span {
  display: block; height: 2px; border-radius: 2px;
  background: rgba(232,237,245,0.6);
  transition: all 0.25s;
}
.mobile-menu-btn.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.mobile-menu-btn.open span:nth-child(2) { opacity: 0; }
.mobile-menu-btn.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
.mobile-menu-btn:hover { background: rgba(0,229,255,0.08); border-color: rgba(0,229,255,0.2); }

/* ── DROPDOWN MOBILE ── */
.mobile-dropdown {
  margin-top: 1px;
  padding: 14px 14px 12px;
  display: flex; flex-direction: column; gap: 12px;
  background: rgba(8,14,28,0.98);
  border-top: 1px solid rgba(0,229,255,0.1);
}

.mob-stats {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.mob-stat-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 10px 14px;
  display: flex; flex-direction: column; gap: 2px;
}
.mob-stat-v { font-size: 26px; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -0.02em; }
.mob-stat-l { font-size: 10px; color: rgba(232,237,245,0.35); font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; }

.mob-divider { height: 1px; background: rgba(255,255,255,0.06); }

.mob-filters { display: flex; gap: 6px; }
.mob-filter-btn {
  flex: 1; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 8px 0; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.09);
  background: rgba(255,255,255,0.03);
  color: rgba(232,237,245,0.4); cursor: pointer; transition: all 0.15s;
}
.mob-filter-btn:hover { background: rgba(255,255,255,0.07); color: #e8edf5; }
.mob-filter-btn.active         { background: rgba(0,229,255,0.1);   border-color: rgba(0,229,255,0.35);   color: #00e5ff; }
.mob-filter-btn.f-on.active    { background: rgba(19,222,185,0.1);  border-color: rgba(19,222,185,0.35);  color: #13deb9; }
.mob-filter-btn.f-off.active   { background: rgba(255,77,109,0.1);  border-color: rgba(255,77,109,0.35);  color: #ff4d6d; }

.mob-countdown-row {
  display: flex; align-items: center; gap: 10px;
}
.mob-cd-label { font-size: 10px; color: rgba(232,237,245,0.25); }

/* ── MOBILE BREAKPOINT ── */
@media (max-width: 640px) {
  .hide-mobile { display: none !important; }
  .show-mobile { display: flex !important; }
  .topbar-inner { flex-wrap: nowrap; }
}

/* ── TRANSIÇÃO DROPDOWN ── */
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.22s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-8px); }

/* ── MAIN ── */
.main-area {
  padding: 10px 12px 12px;
  /* desktop: cresce para preencher sem gerar scroll externo */
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ── GRID ── */

/* DESKTOP: 5 colunas x 4 linhas, sem scroll, cabe em 100dvh */
.grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: 8px;
  /* ocupa todo o espaco disponivel no flex */
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* MOBILE: 2 colunas, scroll livre */
@media (max-width: 640px) {
  .pc-root {
    height: auto;
    overflow: visible;
  }
  .main-area {
    flex: none;
  }
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
    overflow: visible;
  }
  /* skeleton precisa de altura fixa pois grid-row não controla mais */
  .sk-card {
    height: 168px;
  }
  /* card sem restrição de altura no mobile */
  .card {
    height: auto;
  }
}

/* ── CARD ── */
.card {
  border: 1px solid;
  border-radius: 14px;
  padding: 10px 10px 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.15s;
  cursor: default;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.card-offline { animation: offlineShake 0.4s ease 0.3s both; }
@keyframes offlineShake {
  0%,100%{ transform:translateX(0); }
  25%    { transform:translateX(-2px); }
  75%    { transform:translateX(2px); }
}

.card-glow {
  position: absolute; top: -24px; right: -24px;
  width: 80px; height: 80px; border-radius: 50%;
  filter: blur(24px); pointer-events: none;
}
.card-scan {
  position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0,229,255,0.04), transparent);
  pointer-events: none;
}
.card:hover .card-scan { animation: scanLine 1.1s linear; }
@keyframes scanLine { 0%{ left:-60% } 100%{ left:120% } }

/* status row */
.c-row {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%;
}
.c-status { display: flex; align-items: center; gap: 4px; }

.pip {
  width: 6px; height: 6px; border-radius: 50%;
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

.pip-label { font-size: 8px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.cap-text  { font-size: 8px; color: rgba(232,237,245,0.28); font-weight: 600; letter-spacing: 0.04em; }

/* anel */
.ring-wrap { display: flex; justify-content: center; }
.ring-box  { position: relative; width: 72px; height: 72px; }

.ring-svg  { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-track {
  fill: none;
  stroke: rgba(255,255,255,0.06);
  stroke-width: 6;
  stroke-linecap: round;
}
.ring-fill {
  fill: none;
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 1.3s cubic-bezier(0.34,1.1,0.64,1);
}

.ring-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.ring-val  { font-size: 14px; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -0.02em; }
.ring-unit { font-size: 8px;  font-weight: 600; color: rgba(232,237,245,0.4); letter-spacing: 0.04em; }
.ring-pct  { font-size: 8px;  font-weight: 700; }

/* nome e timestamp */
.c-name {
  font-size: 11px; font-weight: 700; color: #e8edf5;
  line-height: 1.25; text-align: center; letter-spacing: -0.01em;
  width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  padding: 0 2px;
}
.c-time { font-size: 8px; color: rgba(232,237,245,0.22); text-align: center; }

/* ── SKELETON ── */
.sk-card {
  border-radius: 14px;
  /* altura auto no desktop (grid-row controla) | fixa no mobile */
  border: 1px solid rgba(255,255,255,0.04);
  background: linear-gradient(90deg, #0d1628 25%, #111f35 50%, #0d1628 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  0%  { background-position: 200% 0; }
  100%{ background-position: -200% 0; }
}

/* ── ERRO ── */
.state-box {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; padding: 60px 20px; text-align: center;
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