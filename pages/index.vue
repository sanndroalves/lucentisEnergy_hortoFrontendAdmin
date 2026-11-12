<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import { useMapaEnergia } from '~/composables/useMapaEnergia';
import { useReferenciaAtual } from '~/composables/useReferenciaAtual';
import { useEnergyFormat } from '~/composables/useEnergyFormat';
import { useAlertasUsinas } from '~/composables/useAlertasUsinas';
import { usePaybackConclusivo } from '~/composables/usePaybackConclusivo';

useHead({
  title: 'Início',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&display=swap' },
  ],
});
definePageMeta({ middleware: 'sidebase-auth', layout: 'blank' });

// ─── Dados ───
const [
  { data: usinas },
  { data: unidades },
  { data: relatorios },
  { data: manutencoes },
  { data: geracoes },
  { data: injecoes },
  { data: projecoes },
  { data: checklists },
] = await Promise.all([
  useFetch(`${API_BASE_URL}/usina/`),
  useFetch(`${API_BASE_URL}/unidadecompensacao`),
  useFetch(`${API_BASE_URL}/relatoriocompensacao/`),
  useFetch(`${API_BASE_URL}/manutencao/`),
  useFetch(`${API_BASE_URL}/relatoriogeracao/`),
  useFetch(`${API_BASE_URL}/relatoriousina/`),
  useFetch(`${API_BASE_URL}/projecaogeracao`),
  useFetch(`${API_BASE_URL}/checklist/`),
]);

const lUsinas      = computed(() => usinas.value ?? []);
const lUnidades    = computed(() => unidades.value ?? []);
const lRelatorios  = computed(() => relatorios.value ?? []);
const lManutencoes = computed(() => manutencoes.value ?? []);
const lGeracoes    = computed(() => geracoes.value ?? []);
const lInjecoes    = computed(() => injecoes.value ?? []);
const lProjecoes   = computed(() => projecoes.value ?? []);

// ─── Contagens da tela antiga (filtros preservados como estavam) ───
const valorIluminacao         = computed(() => lUnidades.value.filter(i => i.secretaria == 'I' || i.secretaria == 'P'));
const valoresPredios          = computed(() => lUnidades.value.filter(i => i.secretaria == 'E' || i.secretaria == 'S' || i.secretaria == 'O' && i.status == 'L'));
const valoresUnidadesCompensa = computed(() => lUnidades.value.filter(i => i.status == 'L'));

// ─── Mês de referência = último mês com geração real registrada ───
const { referencia } = useReferenciaAtual(geracoes);
const refAno = computed(() => referencia.value.ano);
const refMes = computed(() => referencia.value.mes);
const mmaaaa = (r) => `${String(r.mes).padStart(2, '0')}/${r.ano}`;
const MR = computed(() => mmaaaa(referencia.value));

const { totalGerado, totalInjetado, totalPlacas } =
  useMapaEnergia({ usinas, unidades, geracoes, injecoes, compensa: relatorios });

const { numero, moeda } = useEnergyFormat();

// ─── Formatação ───
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_LONGO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const num = (v) => Number(v) || 0;
const brlCurto = (v) => {
  const n = num(v);
  if (Math.abs(n) >= 1e6) return `R$ ${numero(n / 1e6, 1)} mi`;
  if (Math.abs(n) >= 1e3) return `R$ ${numero(n / 1e3, 0)} mil`;
  return `R$ ${numero(n, 0)}`;
};
const mwhNum = (kwh) => { const m = num(kwh) / 1000; return numero(m, m >= 100 ? 0 : 1); };
const mwh = (kwh) => `${mwhNum(kwh)} MWh`;
const pctTxt = (v, casas = 1) => (v == null || !isFinite(v) ? '—' : `${numero(v, casas)}%`);
const doze = () => Array.from({ length: 12 }, () => 0);
const alturas = (arr, max) => arr.map(v => (max > 0 ? Math.max(4, Math.round((v / max) * 100)) : 4));

// séries mensais de um ano
const somaMensal = (lista, ano, fn) => {
  const a = doze();
  lista.forEach(i => { if (i.ano == ano && i.mes >= 1 && i.mes <= 12) a[i.mes - 1] += fn(i); });
  return a;
};
const projMes = (ano) => somaMensal(lProjecoes.value, ano, i => parseInt(i.projecao) || 0);
const realMes = (ano) => somaMensal(lGeracoes.value, ano, i => parseInt(i.geracao) || 0);
const ecoMes  = (ano) => somaMensal(lRelatorios.value, ano, r => num(r.valorInjTUSD) + num(r.valorInjTE));

// ─── Anos selecionáveis (sempre abre no ano vigente) ───
const ANOS = [2023, 2024, 2025, 2026, 2027, 2028];
const anoVigente = new Date().getFullYear();
const anoEco  = ref(anoVigente);

// ─── Geração projetada × real no mês de referência ───
const projPorMes = computed(() => projMes(refAno.value));
const realPorMes = computed(() => realMes(refAno.value));
const projMesRef = computed(() => projPorMes.value[refMes.value - 1]);
const realMesRef = computed(() => realPorMes.value[refMes.value - 1]);
const eficiencia = computed(() => (projMesRef.value > 0 ? pctTxt((realMesRef.value / projMesRef.value) * 100) : '—'));
const geracaoBarras = computed(() => {
  const max = Math.max(...projPorMes.value, ...realPorMes.value);
  return { real: alturas(realPorMes.value, max), proj: alturas(projPorMes.value, max) };
});

// ─── Card Economia compensada (valorInjTUSD + valorInjTE), por ano ───
const economiaPorMes = computed(() => ecoMes(anoEco.value));
const economiaAno    = computed(() => economiaPorMes.value.reduce((s, v) => s + v, 0));
const economiaBarras = computed(() => alturas(economiaPorMes.value, Math.max(...economiaPorMes.value)));
const melhorMes = computed(() => {
  const v = economiaPorMes.value;
  const i = v.indexOf(Math.max(...v));
  return v[i] > 0 ? `${MESES_LONGO[i]} · ${brlCurto(v[i])}` : '—';
});
const faturasCompensadas = computed(() =>
  lRelatorios.value.filter(r => r.ano == anoEco.value && (num(r.valorInjTUSD) + num(r.valorInjTE)) > 0).length,
);
const ecoHover = ref(-1);

// ─── Compensação do mês vigente (último mês com fatura compensada) ───
const refComp = computed(() => {
  let best = null;
  lRelatorios.value.forEach(r => {
    const tem = num(r.valorInjTUSD) + num(r.valorInjTE) + num(r.enerInjTUSD) + num(r.enerInjTE);
    if (!tem || !r.ano || !r.mes) return;
    const a = Number(r.ano), m = Number(r.mes);
    if (!best || a > best.ano || (a === best.ano && m > best.mes)) best = { ano: a, mes: m };
  });
  return best ?? referencia.value;
});
const MRC = computed(() => mmaaaa(refComp.value));
const compMesRef = computed(() => {
  const { ano, mes } = refComp.value;
  return lRelatorios.value
    .filter(r => r.ano == ano && r.mes == mes)
    .reduce((acc, r) => ({
      valor: acc.valor + num(r.valorInjTUSD) + num(r.valorInjTE),
      energia: acc.energia + num(r.enerInjTUSD) + num(r.enerInjTE),
    }), { valor: 0, energia: 0 });
});

// ─── Payback acumulado (mesma regra do relatório Conclusivo) ───
const { economiaAteRef, paybackPct, totalInvestido } =
  usePaybackConclusivo({ usinas, geracoes, injecoes, relatorios, referencia });

// ─── Usinas ───
const usinasLigadas    = computed(() => lUsinas.value.filter(u => u.status === 'L').length);
const usinasDesligadas = computed(() => lUsinas.value.filter(u => u.status === 'D').length);
const usinasManutencao = computed(() => lUsinas.value.filter(u => u.status === 'M').length);
const potenciaKwp = computed(() => lUsinas.value.reduce((s, u) => s + (parseFloat(u.potencia) || 0), 0));
const potenciaTxt = computed(() => (potenciaKwp.value >= 1000 ? `${numero(potenciaKwp.value / 1000, 2)} MWp` : `${numero(potenciaKwp.value, 0)} kWp`));

// ─── Monitoramento (3+ meses abaixo da projeção; mesma lógica da tela Manutenções) ───
const { alertas } = useAlertasUsinas({ usinas, geracoes, projecoes, checklists });

// ─── Manutenções ───
const manut = computed(() => ({
  programadas: lManutencoes.value.filter(m => m.status === '1').length,
  andamento:   lManutencoes.value.filter(m => m.status === '2').length,
  realizadas:  lManutencoes.value.filter(m => m.status === '3').length,
}));

// ─── Caminho da energia (acumulado) ───
const grupoUnidade = computed(() => {
  const g = {};
  lUnidades.value.forEach(u => { g[u.id] = ['E', 'S', 'O'].includes(u.secretaria) ? 'p' : ['I', 'P'].includes(u.secretaria) ? 'ip' : 'o'; });
  return g;
});
const compensadoPor = (grupo) =>
  lRelatorios.value.filter(r => grupoUnidade.value[r.idUnidadeCompensa] === grupo).reduce((s, r) => s + num(r.enerInjTUSD), 0);
const compensadoPredios = computed(() => compensadoPor('p'));
const compensadoIP      = computed(() => compensadoPor('ip'));

// ─── Cards laterais ───
const abertos = ref(new Set(['usinas']));
const alternar = (id) => {
  const s = new Set(abertos.value);
  s.has(id) ? s.delete(id) : s.add(id);
  abertos.value = s;
};

// ─── Nebulosa animada (canvas) ───
const orb = ref(null);
let raf = 0, S = 520, ctx = null;
function ajustar() {
  const cv = orb.value; if (!cv) return;
  const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  S = r.width || 520; cv.width = cv.height = S * d; ctx.setTransform(d, 0, 0, d, 0, 0);
}
const cores = [[34, 197, 224], [52, 211, 122], [255, 161, 46], [168, 85, 247], [255, 95, 109]];
const blobs = cores.map((c, i) => ({ c, a: Math.random() * 6.28, sp: 0.25 + Math.random() * 0.35, r: 0.2 + Math.random() * 0.1, o: 0.28 + i * 0.05, ph: Math.random() * 6 }));
const parts = Array.from({ length: 70 }, () => ({ a: Math.random() * 6.28, d: 0.12 + Math.random() * 0.3, s: 0.1 + Math.random() * 0.4, z: Math.random() * 1.6 + 0.4 }));
let parado = false;
function desenhar(t) {
  t /= 1000; ctx.clearRect(0, 0, S, S); ctx.globalCompositeOperation = 'lighter';
  blobs.forEach((b, i) => {
    const x = S / 2 + Math.cos(t * b.sp + b.a) * S * b.o * 0.7, y = S / 2 + Math.sin(t * b.sp * 1.2 + b.a + b.ph) * S * b.o * 0.7, r = S * (b.r + 0.06 * Math.sin(t * 0.8 + i));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${b.c},.85)`); g.addColorStop(1, `rgba(${b.c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
  parts.forEach(p => {
    const a = p.a + t * p.s, r = S * (p.d + 0.06 * Math.sin(t + p.a));
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * Math.sin(t * 2 + p.a)})`;
    ctx.beginPath(); ctx.arc(S / 2 + Math.cos(a) * r * 1.3, S / 2 + Math.sin(a) * r * 1.3, p.z, 0, 6.283); ctx.fill();
  });
  if (!parado) raf = requestAnimationFrame(desenhar);
}

onMounted(() => {
  ctx = orb.value.getContext('2d');
  parado = matchMedia('(prefers-reduced-motion:reduce)').matches;
  ajustar();
  addEventListener('resize', ajustar);
  raf = requestAnimationFrame(desenhar);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  removeEventListener('resize', ajustar);
});
</script>

<template>
  <div class="lx">
    <main>
      <header class="top">
        <div class="badge"><img src="https://i.imgur.com/qZ92wWu.png" alt="LUCENTIS"></div>
        <p>Visão geral da operação solar</p>
      </header>

      <section class="stage">
        <!-- ── Coluna esquerda ── -->
        <div class="col">
          <div class="card" :class="{ open: abertos.has('usinas') }" style="--c:var(--orange)">
            <button class="hd" :aria-expanded="abertos.has('usinas')" @click="alternar('usinas')">
              <span class="ic">☀</span>
              <div><strong>Usinas</strong><b>{{ lUsinas.length }}</b><em>{{ usinasLigadas }} ligadas</em></div>
              <span class="chev">▾</span>
            </button>
            <div class="dd"><div><div class="in">
              <div class="row"><span>Ligadas</span><b>{{ usinasLigadas }}</b></div>
              <div class="row"><span>Desligadas</span><b>{{ usinasDesligadas }}</b></div>
              <div class="row"><span>Em manutenção</span><b>{{ usinasManutencao }}</b></div>
              <div class="row"><span>Potência instalada</span><b>{{ potenciaTxt }}</b></div>
              <div class="row"><span>Total de placas</span><b>{{ numero(totalPlacas) }}</b></div>
            </div></div></div>
          </div>

          <div class="card" :class="{ open: abertos.has('economia') }" style="--c:var(--green)">
            <button class="hd" :aria-expanded="abertos.has('economia')" @click="alternar('economia')">
              <span class="ic">$</span>
              <div><strong>Economia compensada</strong><b>{{ brlCurto(economiaAno) }}</b><em>em {{ anoEco }}</em></div>
              <span class="chev">▾</span>
            </button>
            <div class="dd"><div><div class="in">
              <div class="anos" role="group" aria-label="Ano da economia">
                <button v-for="a in ANOS" :key="a" class="ano" :class="{ on: anoEco === a }" @click="anoEco = a; ecoHover = -1">{{ a }}</button>
              </div>
              <div class="tipline">
                <template v-if="ecoHover >= 0"><span>{{ MESES_LONGO[ecoHover] }}/{{ anoEco }}</span><b>{{ moeda(economiaPorMes[ecoHover]) }}</b></template>
                <span v-else>Passe o mouse nas barras para ver cada mês</span>
              </div>
              <div class="sp hov" @mouseleave="ecoHover = -1">
                <i v-for="(h, i) in economiaBarras" :key="anoEco + '-' + i" tabindex="0"
                  :class="{ act: ecoHover === i }" :style="{ height: h + '%', animationDelay: i * 60 + 'ms' }"
                  :aria-label="`${MESES_LONGO[i]}: ${moeda(economiaPorMes[i])}`"
                  @mouseenter="ecoHover = i" @focus="ecoHover = i" @blur="ecoHover = -1"></i>
              </div>
              <div class="spx"><span v-for="(m, i) in MESES_CURTO" :key="m" :class="{ act: ecoHover === i }">{{ m[0] }}</span></div>
              <div class="row"><span>Total compensado no ano</span><b>{{ moeda(economiaAno) }}</b></div>
              <div class="row"><span>Melhor mês</span><b>{{ melhorMes }}</b></div>
              <div class="row"><span>Faturas compensadas</span><b>{{ numero(faturasCompensadas) }}</b></div>
            </div></div></div>
          </div>

          <div class="card" :class="{ open: abertos.has('geracao') }" style="--c:var(--teal)">
            <button class="hd" :aria-expanded="abertos.has('geracao')" @click="alternar('geracao')">
              <span class="ic">⚡</span>
              <div><strong>Geração: projetada e real</strong><b>{{ mwh(realMesRef) }}</b><em>mês de referência ({{ MR }})</em></div>
              <span class="chev">▾</span>
            </button>
            <div class="dd"><div><div class="in">
              <div class="sp">
                <template v-for="(h, i) in geracaoBarras.real" :key="i">
                  <i class="p" :style="{ height: geracaoBarras.proj[i] + '%' }"></i>
                  <i :style="{ height: h + '%', animationDelay: i * 60 + 'ms' }" :title="`${MESES_CURTO[i]}: ${mwh(realPorMes[i])} de ${mwh(projPorMes[i])}`"></i>
                </template>
              </div>
              <div class="row"><span>Projetada</span><b>{{ mwh(projMesRef) }}</b></div>
              <div class="row"><span>Real</span><b>{{ mwh(realMesRef) }}</b></div>
              <div class="row"><span>Eficiência</span><b>{{ eficiencia }}</b></div>
            </div></div></div>
          </div>
        </div>

        <!-- ── Centro ── -->
        <div class="center">
          <div class="orbwrap">
            <canvas ref="orb" class="orb"></canvas>
            <div class="orbtx">
              <small>Eficiência em {{ MR }}</small>
              <b>{{ eficiencia }}</b>
              <span>{{ mwhNum(realMesRef) }} de {{ mwhNum(projMesRef) }} MWh projetados</span>
            </div>
          </div>
          <div class="btns">
            <button class="btn" style="--c1:var(--orange);--c2:#ff5f6d" @click="navigateTo('/painel')">Abrir painel</button>
            <button class="btn" style="--c1:var(--teal);--c2:var(--green)" @click="navigateTo('/mapa')">Abrir mapa</button>
          </div>
          <div class="kpis">
            <div class="kpi" style="--c:var(--green)" :title="moeda(compMesRef.valor)">
              <b>{{ brlCurto(compMesRef.valor) }}</b><span>compensados no mês ({{ MRC }})</span>
            </div>
            <div class="kpi" style="--c:var(--orange)" :title="`${numero(compMesRef.energia)} kWh (TUSD + TE)`">
              <b>{{ mwh(compMesRef.energia) }}</b><span>compensados no mês ({{ MRC }})</span>
            </div>
            <div class="kpi" style="--c:var(--purple)" :title="`${moeda(economiaAteRef)} de ${moeda(totalInvestido)} investidos (até ${MR})`">
              <b>{{ pctTxt(paybackPct, 2) }}</b><span>payback acumulado</span>
            </div>
          </div>
        </div>

        <!-- ── Coluna direita ── -->
        <div class="col">
          <div class="card" :class="{ open: abertos.has('monitor') }" :style="{ '--c': alertas.length ? 'var(--red)' : 'var(--green)' }">
            <button class="hd" :aria-expanded="abertos.has('monitor')" @click="alternar('monitor')">
              <span class="ic" :class="{ alerta: alertas.length > 0 }">!</span>
              <div>
                <strong>Monitoramento de usinas</strong>
                <b>{{ alertas.length ? `${alertas.length} ${alertas.length === 1 ? 'alerta' : 'alertas'}` : 'Sem alertas' }}</b>
                <em>abaixo da projeção em 3+ meses</em>
              </div>
              <span class="chev">▾</span>
            </button>
            <div class="dd"><div><div class="in">
              <div v-for="a in alertas" :key="a.id" class="row">
                <span>{{ a.nome }} <small class="qtd">· {{ a.qtd }} meses</small></span>
                <b><span class="tag" :style="{ color: a.status.cor }">{{ a.status.txt }}</span></b>
              </div>
              <span v-if="!alertas.length">Nenhuma usina ficou abaixo da projeção em 3 ou mais meses nos últimos 12 meses.</span>
              <span>Janela: 12 meses até {{ MR }}. A etiqueta vem do Checklist de vistoria em campo deste mês.</span>
            </div></div></div>
          </div>

          <div class="card" :class="{ open: abertos.has('manut') }" style="--c:var(--purple)">
            <button class="hd" :aria-expanded="abertos.has('manut')" @click="alternar('manut')">
              <span class="ic">⚙</span>
              <div><strong>Manutenções</strong><b>{{ lManutencoes.length }}</b><em>no total</em></div>
              <span class="chev">▾</span>
            </button>
            <div class="dd"><div><div class="in">
              <div class="row"><span>Programadas</span><b>{{ manut.programadas }}</b></div>
              <div class="row"><span>Em andamento</span><b>{{ manut.andamento }}</b></div>
              <div class="row"><span>Realizadas</span><b>{{ manut.realizadas }}</b></div>
            </div></div></div>
          </div>

          <div class="card" :class="{ open: abertos.has('unidades') }" style="--c:var(--teal)">
            <button class="hd" :aria-expanded="abertos.has('unidades')" @click="alternar('unidades')">
              <span class="ic">▦</span>
              <div><strong>Unidades e contas</strong><b>{{ valoresUnidadesCompensa.length }}</b><em>compensando</em></div>
              <span class="chev">▾</span>
            </button>
            <div class="dd"><div><div class="in">
              <div class="row"><span>Prédios públicos</span><b>{{ valoresPredios.length }}</b></div>
              <div class="row"><span>Iluminação pública (IP)</span><b>{{ valorIluminacao.length }}</b></div>
              <div class="row"><span>Unidades cadastradas</span><b>{{ lUnidades.length }}</b></div>
              <div class="row"><span>Relatórios no sistema</span><b>{{ numero(lRelatorios.length) }}</b></div>
            </div></div></div>
          </div>
        </div>
      </section>

      <!-- ── Caminho da energia ── -->
      <section class="flow">
        <h2>Caminho da energia: total acumulado no sistema</h2>
        <svg viewBox="0 0 900 150" role="img" aria-label="Fluxo: usinas, rede, prédios e iluminação pública">
          <defs>
            <linearGradient id="lx-g1"><stop offset="0" stop-color="#ffa12e" /><stop offset="1" stop-color="#22c5e0" /></linearGradient>
            <linearGradient id="lx-g2"><stop offset="0" stop-color="#22c5e0" /><stop offset="1" stop-color="#34d37a" /></linearGradient>
            <linearGradient id="lx-g3"><stop offset="0" stop-color="#22c5e0" /><stop offset="1" stop-color="#a855f7" /></linearGradient>
            <filter id="lx-glow"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <path id="lx-p1" d="M120 75 L420 75" stroke="url(#lx-g1)" stroke-width="3" fill="none" opacity=".5" />
          <path id="lx-p2" d="M480 75 C560 75 580 38 680 38" stroke="url(#lx-g2)" stroke-width="3" fill="none" opacity=".5" />
          <path id="lx-p3" d="M480 75 C560 75 580 112 680 112" stroke="url(#lx-g3)" stroke-width="3" fill="none" opacity=".5" />
          <g>
            <circle v-for="(d, k) in [['lx-p1','#ffb44d',0],['lx-p1','#ffb44d',.9],['lx-p1','#ffb44d',1.8],['lx-p2','#5cf08d',.4],['lx-p2','#5cf08d',1.5],['lx-p3','#c58bff',.7],['lx-p3','#c58bff',1.9]]"
              :key="k" r="5" :fill="d[1]" filter="url(#lx-glow)">
              <animateMotion dur="2.7s" :begin="d[2] + 's'" repeatCount="indefinite"><mpath :href="'#' + d[0]" /></animateMotion>
            </circle>
          </g>
          <g filter="url(#lx-glow)">
            <circle cx="90" cy="75" r="30" fill="#ffa12e" /><circle cx="450" cy="75" r="30" fill="#22c5e0" />
            <circle cx="710" cy="38" r="26" fill="#34d37a" /><circle cx="710" cy="112" r="26" fill="#a855f7" />
          </g>
          <g text-anchor="middle">
            <text x="90" y="82" style="font-size:22px">☀</text><text x="450" y="82" style="font-size:22px">⚡</text>
            <text x="710" y="45" style="font-size:20px">▦</text><text x="710" y="119" style="font-size:20px">✦</text>
          </g>
          <text x="90" y="128" text-anchor="middle">Usinas</text><text class="s" x="90" y="144" text-anchor="middle">{{ mwh(totalGerado) }} gerados</text>
          <text x="450" y="128" text-anchor="middle">Rede</text><text class="s" x="450" y="144" text-anchor="middle">{{ mwh(totalInjetado) }} injetados</text>
          <text x="750" y="34">Prédios públicos</text><text class="s" x="750" y="51">{{ mwh(compensadoPredios) }} compensados</text>
          <text x="750" y="108">Iluminação pública</text><text class="s" x="750" y="125">{{ mwh(compensadoIP) }} compensados</text>
        </svg>
      </section>
      <p class="note">
        Mês de referência: {{ MR }} (último mês com geração registrada). Toque nos blocos para abrir os detalhes e no sino para ver o clima de hoje.
        <br>Desenvolvido por <strong>Lucentis</strong> · Hortolândia
      </p>
    </main>

    <LayoutFullMain :marca="false" />
  </div>
</template>

<style scoped>
.lx {
  --bg:#060a1a;--bg2:#0d1330;--card:rgba(255,255,255,.055);--line:rgba(255,255,255,.14);--tx:#eef2ff;--mut:#9aa7cc;
  --teal:#22c5e0;--green:#34d37a;--orange:#ffa12e;--purple:#a855f7;--red:#ff6b4a;
  color-scheme:dark;background:var(--bg);color:var(--tx);font-family:'Sora',system-ui,-apple-system,'Segoe UI',sans-serif;
  width:100%;min-height:100vh;overflow-x:hidden;
  padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);
  background-image:radial-gradient(circle at 20% 10%,rgba(34,197,224,.13),transparent 40%),radial-gradient(circle at 85% 80%,rgba(168,85,247,.16),transparent 45%),linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
  background-size:auto,auto,44px 44px,44px 44px;background-attachment:fixed;
}
.lx *{box-sizing:border-box;margin:0}
/* ".lx main" (e não só "main"): precisa vencer o reset ".lx *{margin:0}" acima,
   senão o margin auto é zerado e o bloco encosta na esquerda em telas > 1380px */
.lx main{width:100%;max-width:1380px;margin:0 auto;padding:18px 18px 120px}
.top{display:flex;flex-direction:column;align-items:center;gap:6px;margin-bottom:4px}
.badge{padding:2px 10px}
.badge img{height:96px;display:block;filter:drop-shadow(0 0 18px rgba(34,197,224,.5)) drop-shadow(0 0 46px rgba(168,85,247,.4))}
.top p{color:var(--mut);font-size:13px;letter-spacing:.02em}
/* minmax(0,1fr): as laterais nunca crescem pelo conteúdo, então o centro fica centralizado */
.stage{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,520px) minmax(0,1fr);gap:22px;align-items:start;margin-top:10px}
.col{display:flex;flex-direction:column;gap:14px;min-width:0}
.center{display:flex;flex-direction:column;align-items:center;gap:14px;position:sticky;top:10px;min-width:0}
.orbwrap{position:relative;width:min(100%,520px);aspect-ratio:1}
.orb{width:100%;height:100%;display:block;-webkit-mask-image:radial-gradient(circle,#000 52%,transparent 71%);mask-image:radial-gradient(circle,#000 52%,transparent 71%)}
.orbtx{position:absolute;inset:0;display:grid;place-content:center;text-align:center;pointer-events:none;text-shadow:0 2px 24px rgba(0,0,0,.6)}
.orbtx small{font-size:13px;color:#dfe7ff}
.orbtx b{font-size:clamp(40px,7vw,64px);font-weight:700;line-height:1.05}
.orbtx span{font-size:14px;color:#fff;margin-top:4px}
.btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:-34px;position:relative}
.btn{font:600 14px 'Sora',system-ui,sans-serif;color:#fff;border:0;cursor:pointer;padding:12px 20px;border-radius:999px;background:linear-gradient(120deg,var(--c1),var(--c2));box-shadow:0 8px 28px -8px var(--c1);transition:transform .2s,box-shadow .2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 12px 34px -6px var(--c2)}
.btn:focus-visible,.hd:focus-visible,.ano:focus-visible{outline:2px solid #fff;outline-offset:3px}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:12px 10px;text-align:center;backdrop-filter:blur(10px)}
.kpi b{display:block;font-size:clamp(17px,2.4vw,23px);color:var(--c)}
.kpi span{font-size:11.5px;color:var(--mut)}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;backdrop-filter:blur(12px);overflow:hidden;position:relative;transition:border-color .25s,box-shadow .25s}
.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--c);box-shadow:0 0 18px var(--c)}
.card.open{border-color:var(--c);box-shadow:0 0 34px -10px var(--c)}
.hd{all:unset;box-sizing:border-box;width:100%;display:flex;align-items:center;gap:12px;padding:15px 16px 15px 20px;cursor:pointer}
.ic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-size:18px;color:#fff;background:linear-gradient(135deg,var(--c),rgba(255,255,255,.12));flex:none}
.hd div{flex:1;min-width:0}
.hd strong{display:block;font-size:13px;color:var(--mut);font-weight:400}
.hd b{font-size:22px;font-weight:600}
.hd em{font-style:normal;font-size:12px;color:var(--c);margin-left:6px}
.chev{transition:transform .3s;color:var(--mut)}
.card.open .chev{transform:rotate(180deg)}
.dd{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s ease}
.card.open .dd{grid-template-rows:1fr}
.dd>div{overflow:hidden}
.in{padding:2px 18px 16px 20px;font-size:13px;color:var(--mut);display:grid;gap:9px}
.row{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed var(--line);padding-bottom:7px}
.row>span{min-width:0}
.row b{color:var(--tx);font-weight:600;text-align:right}
.qtd{font-size:11px;opacity:.8}
.tag{font-size:11.5px;padding:2px 9px;border-radius:99px;background:rgba(255,255,255,.08);white-space:nowrap}
.sp{display:flex;align-items:flex-end;gap:4px;height:56px}
.sp i{flex:1;background:linear-gradient(var(--c),transparent);border-radius:4px 4px 0 0;min-height:4px;animation:grow .9s ease both;transform-origin:bottom}
.sp i.p{background:none;border:1px solid var(--c);border-bottom:0;animation:none}
.sp.hov i{cursor:pointer;transition:filter .15s,opacity .15s;outline:none}
.sp.hov:hover i:not(.act){opacity:.45}
.sp.hov i.act{filter:brightness(1.35);box-shadow:0 0 14px -2px var(--c)}
.spx{display:flex;gap:4px;margin-top:-4px}
.spx span{flex:1;text-align:center;font-size:10px;color:var(--mut)}
.spx span.act{color:var(--c);font-weight:700}
.tipline{display:flex;justify-content:space-between;align-items:baseline;gap:8px;min-height:20px;font-size:12px}
.tipline b{color:var(--c);font-size:14px}
@keyframes grow{from{transform:scaleY(0)}}
.anos{display:flex;flex-wrap:wrap;gap:6px}
.ano{all:unset;cursor:pointer;font:600 11.5px 'Sora',system-ui,sans-serif;padding:5px 10px;border-radius:99px;border:1px solid var(--line);color:var(--mut);background:rgba(255,255,255,.04);transition:background .2s,color .2s}
.ano:hover{color:#fff;background:rgba(255,255,255,.1)}
.ano.on{color:#06101a;background:var(--c,var(--teal));border-color:transparent}
.flow{margin-top:22px;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:14px 10px 8px;backdrop-filter:blur(10px)}
.flow h2{font-size:14px;font-weight:600;padding:0 12px 4px}
.flow svg{width:100%;height:auto;display:block}
.flow text{fill:var(--tx);font:600 13px 'Sora',system-ui,sans-serif}
.flow .s{fill:var(--mut);font-weight:400;font-size:11.5px}
.note{max-width:640px;margin:18px auto 0;text-align:center;color:var(--mut);font-size:12px;line-height:1.6}
.note strong{color:var(--green)}

@media(max-width:1000px){.stage{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.center{grid-column:1/-1;order:-1;position:static}}
@media(max-width:640px){
  .lx main{padding:18px 16px 120px}
  .stage{grid-template-columns:minmax(0,1fr)}.badge img{height:72px}
}
@media(prefers-reduced-motion:reduce){.lx *{animation:none!important;transition:none!important}}
</style>
