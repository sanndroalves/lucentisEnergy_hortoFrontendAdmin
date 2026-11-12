<script setup>
// Painel central — tela de monitoramento ao vivo (pensada para TV / tela cheia,
// layout "blank", sem dock). Dados das usinas vêm do Solarman pela API.
//
// Correções em relação à versão anterior:
//  • status: só "NORMAL" contava como ligado; PARTIAL_OFFLINE e status em outros
//    idiomas (ex.: "离线") caíam como OFF. Agora: on / parcial / off.
//  • usina offline mostrava a potência da última leitura (às vezes de ontem) e
//    ela entrava no "kW agora". Agora offline não soma e aparece como última leitura.
//  • last_update nulo virava "31/12 21:00" (data de 1970).
//  • grade fixa 5×4: com mais de 20 usinas os cards eram cortados.
//  • contador e atualização automática eram dois timers separados e saíam de
//    sincronia depois de um "atualizar agora".
//  • erro numa atualização automática apagava a tela inteira; agora mantém os
//    últimos dados e mostra um aviso.
//  • URL da API fixa; agora usa a mesma base do resto do sistema.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';

useHead({ title: 'Painel Central • Lucentis' });
definePageMeta({ layout: 'blank' });

const API = `${String(API_BASE_URL).replace(/\/+$/, '')}/solarman/plants/`;
const INTERVALO = 6 * 60; // segundos

const plants = ref([]);
const carregando = ref(true);
const erro = ref(null);          // erro sem dados para mostrar
const erroAtualizar = ref(null); // erro numa atualização (dados antigos continuam)
const atualizando = ref(false);
const ultimaBusca = ref(null);
const filtro = ref('all');
const restante = ref(INTERVALO);
const agora = ref(Date.now());

async function buscar(silencioso = false) {
  if (atualizando.value) return;
  atualizando.value = true;
  if (!silencioso) carregando.value = true;
  try {
    const r = await $fetch(API);
    plants.value = Array.isArray(r) ? r : [];
    erro.value = null; erroAtualizar.value = null;
    ultimaBusca.value = Date.now();
  } catch (e) {
    const msg = e?.data?.error || e?.message || 'Falha de conexão';
    if (plants.value.length) erroAtualizar.value = msg; else erro.value = msg;
  } finally {
    carregando.value = false; atualizando.value = false; restante.value = INTERVALO;
  }
}

// um único relógio: conta o tempo, atualiza "há X min" e dispara a busca
let tick = 0;
function relogio() {
  agora.value = Date.now();
  if (restante.value > 0) restante.value--;
  else if (!atualizando.value) buscar(true);
}
// voltou para a aba depois de muito tempo: atualiza na hora
function aoVoltar() { if (!document.hidden && ultimaBusca.value && Date.now() - ultimaBusca.value > INTERVALO * 1000) buscar(true); }

// ── grade que se ajusta à quantidade de usinas e ao tamanho da tela ──
const tela = ref({ w: 1920, h: 1080 });
const medir = () => { tela.value = { w: innerWidth, h: innerHeight }; };

onMounted(() => {
  medir(); buscar(false);
  tick = setInterval(relogio, 1000);
  addEventListener('resize', medir);
  document.addEventListener('visibilitychange', aoVoltar);
});
onBeforeUnmount(() => {
  clearInterval(tick);
  removeEventListener('resize', medir);
  document.removeEventListener('visibilitychange', aoVoltar);
});

// ── normalização ──
const estado = (s) => {
  const v = String(s ?? '').toUpperCase();
  if (v === 'NORMAL') return 'on';
  if (v.includes('PARTIAL')) return 'parcial';
  return 'off';
};
const EST = {
  on: { txt: 'Online', c: 'var(--green)' },
  parcial: { txt: 'Parcial', c: 'var(--orange)' },
  off: { txt: 'Offline', c: 'var(--red)' },
};
const nomeCurto = (n) => String(n ?? 'Sem nome').replace(/^UFV\s*[-–]\s*/i, '').replace(/^PMH\s+/i, '');
const ATRASO_MIN = 60; // online mas sem leitura há mais de 1 h

const usinas = computed(() => plants.value.map((p) => {
  const est = estado(p.status);
  const kw = Number(p.generation_power || 0) / 1000;
  const cap = Number(p.installed_capacity || 0);
  const ts = p.last_update ? new Date(p.last_update).getTime() : null;
  const minutos = ts ? Math.max(0, Math.round((agora.value - ts) / 60000)) : null;
  const ativa = est !== 'off';
  return {
    id: p.id, nome: nomeCurto(p.name), nomeCompleto: p.name, endereco: p.address,
    est, cap, kw, ativa,
    pct: ativa && cap ? Math.min(kw / cap, 1) : 0,
    mes: Number(p.generation_month || 0),
    ts, minutos,
    atrasada: ativa && minutos != null && minutos > ATRASO_MIN,
  };
}).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));

const resumo = computed(() => {
  const r = { total: 0, on: 0, parcial: 0, off: 0, kw: 0, cap: 0, mes: 0 };
  for (const u of usinas.value) {
    r.total++; r[u.est]++; r.cap += u.cap; r.mes += u.mes;
    if (u.ativa) r.kw += u.kw;
  }
  return r;
});

const filtradas = computed(() => (filtro.value === 'all' ? usinas.value : usinas.value.filter(u => u.est === filtro.value)));

const colunas = computed(() => {
  const n = Math.max(filtradas.value.length, 1);
  if (tela.value.w <= 640) return 2;
  // card mais ou menos quadrado: busca o nº de colunas que melhor ocupa a área livre
  const W = tela.value.w - 24, H = tela.value.h - 120;
  let melhor = 1, nota = -1;
  for (let c = 1; c <= Math.min(n, 10); c++) {
    const l = Math.ceil(n / c);
    const lado = Math.min(W / c, H / l);
    if (lado > nota) { nota = lado; melhor = c; }
  }
  return melhor;
});
const linhas = computed(() => Math.ceil(Math.max(filtradas.value.length, 1) / colunas.value));
const gradeStyle = computed(() => ({
  gridTemplateColumns: `repeat(${colunas.value}, minmax(0, 1fr))`,
  gridTemplateRows: tela.value.w <= 640 ? 'none' : `repeat(${linhas.value}, minmax(0, 1fr))`,
}));

// ── formatação ──
const nf = (v, c = 0) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const haQuanto = (min) => {
  if (min == null) return 'sem leitura';
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  const d = Math.floor(min / 1440);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
};
const dataHora = (ts) => (ts ? new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Sem leitura registrada');
const contador = computed(() => `${Math.floor(restante.value / 60)}:${String(restante.value % 60).padStart(2, '0')}`);
const hora = computed(() => new Date(agora.value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
const dia = computed(() => new Date(agora.value).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }));

const R = 30, CIRC = 2 * Math.PI * R;
const FILTROS = [
  { v: 'all', txt: 'Usinas', k: 'total', c: 'var(--teal)' },
  { v: 'on', txt: 'Online', k: 'on', c: 'var(--green)' },
  { v: 'parcial', txt: 'Parcial', k: 'parcial', c: 'var(--orange)' },
  { v: 'off', txt: 'Offline', k: 'off', c: 'var(--red)' },
];
</script>

<template>
  <div class="lx-page pn">
    <!-- ── Topo ── -->
    <header class="pn-top">
      <NuxtLink to="/" class="pn-marca" aria-label="Ir para o Início">
        <LxNebulosa class="pn-neb" :particulas="20" :velocidade="0.7" />
        <img src="https://i.imgur.com/qZ92wWu.png" alt="LUCENTIS">
      </NuxtLink>
      <div class="pn-tit">
        <span class="pn-eyebrow"><i class="pn-live"></i>Ao vivo · Hortolândia</span>
        <h1>Painel <span class="grad">central</span></h1>
      </div>

      <nav class="pn-filtros" aria-label="Filtrar usinas por status">
        <button v-for="f in FILTROS" :key="f.v" class="pn-f" :class="{ on: filtro === f.v }" :style="{ '--c': f.c }" :aria-pressed="filtro === f.v"
          :disabled="carregando" @click="filtro = f.v">
          <b>{{ carregando ? '…' : resumo[f.k] }}</b><span>{{ f.txt }}</span>
        </button>
      </nav>

      <div class="pn-kpis">
        <div class="pn-kpi" style="--c:var(--teal)"><b>{{ carregando ? '…' : nf(resumo.kw) }}<small>kW</small></b><span>potência agora</span></div>
        <div class="pn-kpi" style="--c:var(--purple)"><b>{{ carregando ? '…' : nf(resumo.mes / 1000, 1) }}<small>MWh</small></b><span>gerado no mês</span></div>
      </div>

      <div class="pn-relogio">
        <button class="pn-cd" :class="{ girando: atualizando }" :disabled="atualizando" title="Atualizar agora" aria-label="Atualizar agora" @click="buscar(true)">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="17" class="pn-cd-tr" />
            <circle cx="20" cy="20" r="17" class="pn-cd-fi" :stroke-dasharray="106.8" :stroke-dashoffset="106.8 * (1 - restante / INTERVALO)" />
          </svg>
          <span>{{ atualizando ? '↻' : contador }}</span>
        </button>
        <div class="pn-hora"><b>{{ hora }}</b><span>{{ dia }}</span></div>
      </div>
    </header>

    <div v-if="erroAtualizar" class="pn-aviso" role="status">
      Não foi possível atualizar ({{ erroAtualizar }}). Mostrando os dados de {{ dataHora(ultimaBusca) }}.
      <button @click="buscar(true)">Tentar de novo</button>
    </div>

    <!-- ── Conteúdo ── -->
    <main class="pn-main">
      <div v-if="carregando" class="pn-grade" :style="{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gridTemplateRows: tela.w <= 640 ? 'none' : 'repeat(4, minmax(0, 1fr))' }">
        <div v-for="n in 20" :key="n" class="lx-skel pn-sk"></div>
      </div>

      <div v-else-if="erro" class="pn-erro">
        <span class="pn-erro-ic">!</span>
        <b>Não foi possível carregar as usinas</b>
        <span>{{ erro }}</span>
        <button class="lx-btn" style="--c1:var(--teal);--c2:var(--purple)" @click="buscar(false)">Tentar novamente</button>
      </div>

      <p v-else-if="!filtradas.length" class="pn-vazio">Nenhuma usina {{ filtro === 'off' ? 'offline' : filtro === 'parcial' ? 'com falha parcial' : 'online' }} agora.</p>

      <div v-else class="pn-grade" :style="gradeStyle">
        <article v-for="u in filtradas" :key="u.id" class="pn-card" :class="u.est" :style="{ '--c': EST[u.est].c }" :title="u.nomeCompleto + (u.endereco ? '\n' + u.endereco : '')">
          <header class="pn-c-hd">
            <span class="pn-st"><i></i>{{ EST[u.est].txt }}</span>
            <span class="pn-cap">{{ nf(u.cap) }} kWp</span>
          </header>

          <div class="pn-anel">
            <svg viewBox="0 0 72 72" aria-hidden="true">
              <circle cx="36" cy="36" :r="R" class="pn-anel-tr" />
              <circle cx="36" cy="36" :r="R" class="pn-anel-fi" :stroke-dasharray="CIRC" :stroke-dashoffset="CIRC * (1 - u.pct)" />
            </svg>
            <div class="pn-anel-tx">
              <template v-if="u.ativa">
                <b>{{ nf(u.kw, u.kw < 100 ? 1 : 0) }}</b><small>kW</small><em>{{ Math.round(u.pct * 100) }}%</em>
              </template>
              <template v-else>
                <b class="off">OFF</b><small>sem geração</small>
              </template>
            </div>
          </div>

          <div class="pn-c-nome">{{ u.nome }}</div>
          <footer class="pn-c-ft">
            <span class="pn-mes">{{ nf(u.mes) }} kWh no mês</span>
            <span class="pn-ts" :class="{ atraso: u.atrasada || !u.ativa }">{{ u.ativa ? '' : 'última leitura ' }}{{ haQuanto(u.minutos) }}</span>
          </footer>
        </article>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* raiz: tela cheia sem rolagem no desktop; rola no celular */
.pn {
  height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background-color: var(--bg);
  background-image:
    radial-gradient(circle at 15% 0%, rgba(34, 197, 224, .14), transparent 40%),
    radial-gradient(circle at 90% 100%, rgba(168, 85, 247, .16), transparent 45%),
    linear-gradient(rgba(255, 255, 255, .025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, .025) 1px, transparent 1px);
  background-size: auto, auto, 44px 44px, 44px 44px;
}

/* ── Topo ── */
.pn-top {
  display: flex; align-items: center; gap: 18px; padding: 10px 16px; flex-wrap: wrap;
  border-bottom: 1px solid var(--line2); background: rgba(6, 10, 26, .6); backdrop-filter: blur(14px);
}
.pn-marca { position: relative; display: block; line-height: 0; isolation: isolate; flex: none; }
.pn-neb { position: absolute; left: 50%; top: 50%; width: 240%; height: 300%; transform: translate(-50%, -50%); z-index: -1; opacity: .8; }
.pn-marca img { position: relative; height: 40px; filter: drop-shadow(0 1px 4px rgba(3, 6, 15, .8)); }
.pn-marca:focus-visible { outline: 2px solid #fff; outline-offset: 3px; border-radius: 8px; }
.pn-tit { display: flex; flex-direction: column; gap: 2px; flex: none; }
.pn-tit h1 { font-size: 20px; font-weight: 700; letter-spacing: -.01em; line-height: 1.1; }
.pn-tit .grad { background: linear-gradient(90deg, var(--teal), var(--purple)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.pn-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--mut); }
.pn-live { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: pnLive 2s ease-in-out infinite; }
@keyframes pnLive { 0% { box-shadow: 0 0 0 0 rgba(52, 211, 122, .7); } 70% { box-shadow: 0 0 0 7px rgba(52, 211, 122, 0); } 100% { box-shadow: 0 0 0 0 rgba(52, 211, 122, 0); } }

.pn-filtros { display: flex; gap: 6px; margin-left: auto; }
.pn-f {
  all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; align-items: center; min-width: 74px; padding: 6px 12px;
  border-radius: 14px; border: 1px solid var(--line2); background: var(--card2); transition: border-color .2s, background .2s, box-shadow .2s;
}
.pn-f b { font-size: 21px; font-weight: 700; line-height: 1.05; color: var(--c); }
.pn-f span { font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--mut); }
.pn-f:hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.pn-f.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); box-shadow: 0 0 22px -8px var(--c); }
.pn-f:focus-visible { outline: 2px solid #fff; }
.pn-f:disabled { cursor: default; }

.pn-kpis { display: flex; gap: 6px; }
.pn-kpi { display: flex; flex-direction: column; padding: 6px 14px; border-radius: 14px; border: 1px solid var(--line2); background: var(--card2); position: relative; overflow: hidden; }
.pn-kpi::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: var(--c); box-shadow: 0 0 10px var(--c); }
.pn-kpi b { font-size: 21px; font-weight: 700; line-height: 1.05; font-variant-numeric: tabular-nums; }
.pn-kpi b small { font-size: 11px; font-weight: 500; color: var(--c); margin-left: 4px; }
.pn-kpi span { font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--mut); }

.pn-relogio { display: flex; align-items: center; gap: 12px; }
.pn-cd { all: unset; cursor: pointer; position: relative; width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; }
.pn-cd svg { position: absolute; inset: 0; transform: rotate(-90deg); }
.pn-cd-tr { fill: none; stroke: rgba(34, 197, 224, .15); stroke-width: 3; }
.pn-cd-fi { fill: none; stroke: var(--teal); stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 1s linear; filter: drop-shadow(0 0 3px var(--teal)); }
.pn-cd span { font: 600 9.5px var(--mono); color: var(--teal); }
.pn-cd.girando span { font-size: 15px; animation: lxSpin .8s linear infinite; }
.pn-cd:hover { background: rgba(34, 197, 224, .08); }
.pn-cd:focus-visible { outline: 2px solid #fff; }
.pn-hora { display: flex; flex-direction: column; align-items: flex-end; }
.pn-hora b { font: 600 20px var(--mono); line-height: 1.1; }
.pn-hora span { font-size: 10.5px; color: var(--mut); text-transform: capitalize; }

.pn-aviso { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 7px 16px; font-size: 12.5px; color: var(--tx); background: rgba(255, 161, 46, .12); border-bottom: 1px solid rgba(255, 161, 46, .35); }
.pn-aviso button { all: unset; cursor: pointer; font-weight: 600; color: var(--orange); text-decoration: underline; }

/* ── Grade ── */
.pn-main { flex: 1; min-height: 0; padding: 12px; display: flex; flex-direction: column; }
.pn-grade { flex: 1; min-height: 0; display: grid; gap: 10px; }
.pn-sk { border-radius: 18px; min-height: 120px; }

.pn-card {
  position: relative; overflow: hidden; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 4px;
  padding: 10px 12px; border-radius: 18px; background: var(--card); border: 1px solid var(--line2); backdrop-filter: blur(10px);
  transition: transform .2s, border-color .2s, box-shadow .2s;
}
.pn-card::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: var(--c); box-shadow: 0 0 12px var(--c); opacity: .75; }
.pn-card::after { content: ""; position: absolute; right: -30px; top: -30px; width: 100px; height: 100px; border-radius: 50%; background: var(--c); opacity: .1; filter: blur(30px); pointer-events: none; }
.pn-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 0 30px -14px var(--c); }
.pn-card.off { background: linear-gradient(160deg, rgba(255, 107, 74, .09), var(--card2) 60%); border-color: rgba(255, 107, 74, .3); }
.pn-card.parcial { border-color: rgba(255, 161, 46, .3); }

.pn-c-hd { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.pn-st { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--c); }
.pn-st i { width: 7px; height: 7px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }
.pn-card.off .pn-st i { animation: pnPisca 1.2s ease-in-out infinite; }
@keyframes pnPisca { 50% { opacity: .3; } }
.pn-cap { font: 500 10.5px var(--mono); color: var(--mut); }

.pn-anel { position: relative; flex: 1 1 auto; min-height: 56px; aspect-ratio: 1; max-height: 118px; max-width: 100%; }
.pn-anel svg { width: 100%; height: 100%; transform: rotate(-90deg); display: block; }
.pn-anel-tr { fill: none; stroke: rgba(255, 255, 255, .07); stroke-width: 6; }
.pn-anel-fi { fill: none; stroke: var(--c); stroke-width: 6; stroke-linecap: round; filter: drop-shadow(0 0 4px var(--c)); transition: stroke-dashoffset 1.2s cubic-bezier(.34, 1.1, .64, 1); }
.pn-anel-tx { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.05; }
.pn-anel-tx b { font-size: clamp(13px, 1.4vw, 21px); font-weight: 700; font-variant-numeric: tabular-nums; }
.pn-anel-tx b.off { color: var(--red); letter-spacing: .06em; }
.pn-anel-tx small { font-size: 10px; color: var(--mut); }
.pn-anel-tx em { font-style: normal; font: 600 10px var(--mono); color: var(--c); margin-top: 1px; }

.pn-c-nome { width: 100%; text-align: center; font-size: clamp(11.5px, 1vw, 14px); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pn-c-ft { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 1px; }
.pn-mes { font: 500 10.5px var(--mono); color: var(--mut); }
.pn-ts { font-size: 10px; color: var(--mut); opacity: .8; }
.pn-ts.atraso { color: var(--orange); opacity: 1; }
.pn-card.off .pn-ts.atraso { color: var(--red); }

/* ── Estados ── */
.pn-erro { margin: auto; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: var(--mut); font-size: 12.5px; }
.pn-erro b { color: var(--tx); font-size: 15px; font-weight: 600; }
.pn-erro-ic { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 20px; color: var(--red); background: rgba(255, 107, 74, .12); border: 1px solid rgba(255, 107, 74, .4); }
.pn-vazio { margin: auto; color: var(--mut); font-size: 14px; }

/* ── Telas menores ── */
@media (max-width: 1280px) { .pn-kpis { display: none; } }
@media (max-width: 900px) {
  .pn-top { gap: 12px; }
  .pn-filtros { order: 5; width: 100%; margin-left: 0; }
  .pn-f { flex: 1; min-width: 0; }
  .pn-relogio { margin-left: auto; }
}
@media (max-width: 640px) {
  .pn { height: auto; min-height: 100dvh; overflow: visible; }
  .pn-main { flex: none; }
  .pn-hora span { display: none; }
  .pn-kpis { display: flex; order: 6; width: 100%; }
  .pn-kpi { flex: 1; }
  .pn-card { min-height: 190px; }
  .pn-anel { flex: none; width: 90px; }
  .pn-sk { min-height: 190px; }
}
@media (prefers-reduced-motion: reduce) { .pn *, .pn *::before { animation: none !important; transition: none !important; } }
</style>
