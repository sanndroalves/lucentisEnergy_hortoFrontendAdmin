<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import { useMapaEnergia } from '~/composables/useMapaEnergia';
import { useReferenciaAtual } from '~/composables/useReferenciaAtual';
import { useEnergyFormat } from '~/composables/useEnergyFormat';

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
const lChecklists  = computed(() => checklists.value ?? []);

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

const { totalGerado, totalInjetado, totalPlacas, totalInvestido } =
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
const brlK = (v) => { const n = num(v); return n >= 1e6 ? `${numero(n / 1e6, 1)}mi` : n >= 1e3 ? `${numero(n / 1e3, 0)}k` : numero(n, 0); };
const mwhNum = (kwh) => { const m = num(kwh) / 1000; return numero(m, m >= 100 ? 0 : 1); };
const mwh = (kwh) => `${mwhNum(kwh)} MWh`;
const pctTxt = (v, casas = 1) => (v == null || !isFinite(v) ? '—' : `${numero(v, casas)}%`);
const doze = () => Array.from({ length: 12 }, () => 0);
const alturas = (arr, max) => arr.map(v => (max > 0 ? Math.max(4, Math.round((v / max) * 100)) : 4));
const alt = (v, max) => `${max > 0 ? Math.max(v > 0 ? 2 : 0, (v / max) * 100) : 0}%`;

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
const anoGraf = ref(anoVigente);

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
// custo evitado do mês = economia injetada (TUSD+TE) + autoconsumo das usinas;
// soma de todos os meses até o mês de referência ÷ total investido.
const TARIFA_BT = 0.88;
const MT_TARIFAS = { TUSD_ponta: 1.66642019, TE_ponta: 0.57222160, TUSD_forap: 0.14734841, TE_forap: 0.34908095 };
const TARIFA_MT = ((MT_TARIFAS.TUSD_forap + MT_TARIFAS.TE_forap) + (MT_TARIFAS.TUSD_ponta + MT_TARIFAS.TE_ponta)) / 2;
const tarifaUsina = (u) => ((u.tensao || '').toUpperCase() === 'BT' ? TARIFA_BT : TARIFA_MT);
const economiaAteRef = computed(() => {
  const gera = new Map();
  lGeracoes.value.forEach(g => { const k = `${g.idGeradora}|${g.ano}|${g.mes}`; if (!gera.has(k)) gera.set(k, num(g.geracao)); });
  const inje = new Map();
  lInjecoes.value.forEach(r => { const k = `${r.idGeradora}|${r.ano}|${r.mes}`; inje.set(k, (inje.get(k) || 0) + num(r.injetadoFPonta) + num(r.injetadoPonta)); });
  const eco = new Map();
  lRelatorios.value.forEach(r => { const k = `${r.ano}|${r.mes}`; eco.set(k, (eco.get(k) || 0) + num(r.valorInjTUSD) + num(r.valorInjTE)); });
  const normais = lUsinas.value.filter(u => u.id !== 19 && u.id !== 20);
  const excecao = lUsinas.value.filter(u => u.id === 19 || u.id === 20);
  const chaves = new Set([...lGeracoes.value.map(g => `${g.ano}|${g.mes}`), ...lInjecoes.value.map(r => `${r.ano}|${r.mes}`)]);
  let total = 0;
  chaves.forEach(ch => {
    const [ano, mes] = ch.split('|').map(Number);
    if (!(ano < refAno.value || (ano === refAno.value && mes <= refMes.value))) return;
    let auto = 0;
    normais.forEach(u => {
      const k = `${u.id}|${ano}|${mes}`;
      auto += Math.max(0, (gera.get(k) || 0) - (inje.get(k) || 0)) * tarifaUsina(u);
    });
    excecao.forEach(u => { auto += Math.max(0, gera.get(`${u.id}|${ano}|${mes}`) || 0) * tarifaUsina(u); });
    total += Number((auto + (eco.get(ch) || 0)).toFixed(2));
  });
  return total;
});
const paybackPct = computed(() => (totalInvestido > 0 ? (economiaAteRef.value / totalInvestido) * 100 : null));

// ─── Usinas ───
const usinasLigadas    = computed(() => lUsinas.value.filter(u => u.status === 'L').length);
const usinasDesligadas = computed(() => lUsinas.value.filter(u => u.status === 'D').length);
const usinasManutencao = computed(() => lUsinas.value.filter(u => u.status === 'M').length);
const potenciaKwp = computed(() => lUsinas.value.reduce((s, u) => s + (parseFloat(u.potencia) || 0), 0));
const potenciaTxt = computed(() => (potenciaKwp.value >= 1000 ? `${numero(potenciaKwp.value / 1000, 2)} MWp` : `${numero(potenciaKwp.value, 0)} kWp`));
const nomeUsina = (id) => lUsinas.value.find(u => u.id == id)?.nome ?? `Usina #${id}`;

// ─── Monitoramento (regra do Irregular: 3+ meses abaixo da projeção) ───
const STATUS_CHECK = { O: 'Ótimo', B: 'Bom', R: 'Ruim', Q: 'Quebrado', M: 'Manutenção' };
function statusChecklist(idUsina) {
  const hoje = new Date();
  const doMes = lChecklists.value.filter(c => {
    if (c.idUsina != idUsina) return false;
    const d = new Date(c.data);
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });
  if (!doMes[0]) return { txt: 'Sem checklist', cor: 'var(--mut)' };
  const cont = { 'Ótimo': 0, 'Bom': 0 };
  [doMes[0].sitPlaca, doMes[0].sitInversor, doMes[0].sitRoteador].forEach(s => { const d = STATUS_CHECK[s]; if (d in cont) cont[d]++; });
  if (cont['Ótimo'] === 3 || (cont['Ótimo'] === 2 && cont['Bom'] === 1)) return { txt: 'Ótimo', cor: 'var(--green)' };
  if (cont['Bom'] === 3 || (cont['Bom'] === 2 && cont['Ótimo'] === 1)) return { txt: 'Bom', cor: 'var(--teal)' };
  return { txt: 'Verificar', cor: 'var(--orange)' };
}
const projPorUsinaMes = computed(() => {
  const m = {};
  lProjecoes.value.forEach(p => { const k = `${p.idGeradora}-${p.ano}-${p.mes}`; m[k] = (m[k] || 0) + (parseInt(p.projecao) || 0); });
  return m;
});
const alertas = computed(() => {
  const chave = (a, m) => a * 12 + (m - 1);
  const fim = chave(refAno.value, refMes.value);
  const ini = fim - 11;
  const abaixo = {};
  lGeracoes.value.forEach(g => {
    const k = chave(g.ano, g.mes);
    if (k < ini || k > fim) return;
    const p = projPorUsinaMes.value[`${g.idGeradora}-${g.ano}-${g.mes}`];
    if (p && (parseInt(g.geracao) || 0) < p) abaixo[g.idGeradora] = (abaixo[g.idGeradora] || 0) + 1;
  });
  return Object.entries(abaixo)
    .filter(([, qtd]) => qtd >= 3)
    .map(([id, qtd]) => ({ id, nome: nomeUsina(id), qtd, status: statusChecklist(id) }))
    .sort((a, b) => b.qtd - a.qtd);
});

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

// ─── Modal de análise ───
const modal = ref(false);
const corEfic = (p) => (p == null ? 'var(--mut)' : p >= 90 ? 'var(--green)' : p >= 70 ? 'var(--orange)' : 'var(--red)');
const rotuloEfic = (p) => (p == null ? 'Sem projeção' : p >= 90 ? 'Excelente' : p >= 70 ? 'Bom' : 'Abaixo');
const analise = computed(() => {
  const ano = anoGraf.value;
  const proj = projMes(ano), real = realMes(ano), eco = ecoMes(ano);
  const cp = doze(), ci = doze(), co = doze();
  lRelatorios.value.forEach(r => {
    if (r.ano != ano || r.mes < 1 || r.mes > 12) return;
    const e = num(r.enerInjTUSD) + num(r.enerInjTE);
    const g = grupoUnidade.value[r.idUnidadeCompensa] ?? 'o';
    (g === 'p' ? cp : g === 'ip' ? ci : co)[r.mes - 1] += e;
  });

  const meses = MESES_CURTO.map((m, i) => {
    const efic = proj[i] > 0 && real[i] > 0 ? (real[i] / proj[i]) * 100 : null;
    return { i, m, proj: proj[i], real: real[i], efic, delta: efic != null ? efic - 100 : null, eco: eco[i], cp: cp[i], ci: ci[i], co: co[i], comp: cp[i] + ci[i] + co[i] };
  });
  const comDado = meses.filter(x => x.real > 0);
  const realTot = comDado.reduce((s, x) => s + x.real, 0);
  const projComDado = comDado.reduce((s, x) => s + x.proj, 0);
  const projTot = proj.reduce((s, v) => s + v, 0);
  const comEfic = meses.filter(x => x.efic != null);
  const melhorG = comEfic.length ? comEfic.reduce((a, b) => (b.efic > a.efic ? b : a)) : null;
  const piorG = comEfic.length ? comEfic.reduce((a, b) => (b.efic < a.efic ? b : a)) : null;
  const abaixo = comEfic.filter(x => x.efic < 100).length;

  const comEco = meses.filter(x => x.eco > 0);
  const ecoTot = comEco.reduce((s, x) => s + x.eco, 0);
  const melhorE = comEco.length ? comEco.reduce((a, b) => (b.eco > a.eco ? b : a)) : null;
  const piorE = comEco.length ? comEco.reduce((a, b) => (b.eco < a.eco ? b : a)) : null;

  const compTot = meses.reduce((s, x) => s + x.comp, 0);
  const cpTot = cp.reduce((s, v) => s + v, 0), ciTot = ci.reduce((s, v) => s + v, 0), coTot = co.reduce((s, v) => s + v, 0);

  // desempenho por usina no ano
  const porUsina = {};
  lGeracoes.value.forEach(g => {
    if (g.ano != ano) return;
    const u = (porUsina[g.idGeradora] ??= { real: 0, proj: 0, meses: 0, abaixo: 0 });
    const r = parseInt(g.geracao) || 0, p = projPorUsinaMes.value[`${g.idGeradora}-${g.ano}-${g.mes}`] || 0;
    u.real += r;
    if (r > 0) { u.meses++; u.proj += p; if (p && r < p) u.abaixo++; }
  });
  const usinasRank = Object.entries(porUsina)
    .map(([id, u]) => ({ id, nome: nomeUsina(id), ...u, part: realTot > 0 ? (u.real / realTot) * 100 : 0, efic: u.proj > 0 ? (u.real / u.proj) * 100 : null }))
    .sort((a, b) => b.real - a.real);

  return {
    meses, realTot, projTot, projComDado, ecoTot, compTot, cpTot, ciTot, coTot,
    efic: projComDado > 0 ? (realTot / projComDado) * 100 : null,
    nMeses: comDado.length, melhorG, piorG, abaixo, nEfic: comEfic.length,
    ecoMedia: comEco.length ? ecoTot / comEco.length : 0, melhorE, piorE,
    maxGer: Math.max(1, ...proj, ...real),
    maxEco: Math.max(1, ...eco),
    maxComp: Math.max(1, ...meses.map(x => x.comp)),
    usinasRank, maxUsina: Math.max(1, ...usinasRank.map(u => u.real)),
  };
});
const porAno = computed(() => {
  const por = {};
  lGeracoes.value.forEach(g => { if (g.ano) por[g.ano] = (por[g.ano] || 0) + (parseInt(g.geracao) || 0); });
  const anos = Object.keys(por).sort();
  const max = Math.max(1, ...Object.values(por));
  return anos.map((a, i) => {
    const ant = i > 0 ? por[anos[i - 1]] : null;
    return { ano: a, v: por[a], h: alt(por[a], max), yoy: ant ? ((por[a] - ant) / ant) * 100 : null };
  });
});
const tipLado = (i) => (i < 2 ? 'l' : i > 9 ? 'r' : '');

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
function teclado(e) {
  if (e.key === 'Escape') modal.value = false;
}

onMounted(() => {
  ctx = orb.value.getContext('2d');
  parado = matchMedia('(prefers-reduced-motion:reduce)').matches;
  ajustar();
  addEventListener('resize', ajustar);
  addEventListener('keydown', teclado);
  raf = requestAnimationFrame(desenhar);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  removeEventListener('resize', ajustar);
  removeEventListener('keydown', teclado);
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
            <button class="btn" style="--c1:var(--purple);--c2:var(--teal)" @click="anoGraf = anoVigente; modal = true">Ver gráficos</button>
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

    <!-- ══════════ Modal de análise ══════════ -->
    <div class="modal" :class="{ on: modal }" role="dialog" aria-modal="true" aria-label="Análise de dados" @click.self="modal = false">
      <div class="panel">
        <button class="x" aria-label="Fechar" @click="modal = false">×</button>
        <div class="phd">
          <div>
            <strong class="ptit">Análise de dados · {{ anoGraf }}</strong>
            <p class="psub">Passe o mouse sobre as barras para ver os valores de cada mês.</p>
          </div>
          <div class="anos" role="group" aria-label="Ano da análise">
            <button v-for="a in ANOS" :key="a" class="ano" :class="{ on: anoGraf === a }" @click="anoGraf = a">{{ a }}</button>
          </div>
        </div>

        <!-- Indicadores do ano -->
        <div class="stats">
          <div class="st" style="--c:var(--teal)"><span>Geração real</span><b>{{ mwh(analise.realTot) }}</b><small>{{ analise.nMeses }} {{ analise.nMeses === 1 ? 'mês' : 'meses' }} com dado</small></div>
          <div class="st" style="--c:var(--orange)"><span>Projeção (meses com dado)</span><b>{{ mwh(analise.projComDado) }}</b><small>ano inteiro: {{ mwh(analise.projTot) }}</small></div>
          <div class="st" :style="{ '--c': corEfic(analise.efic) }"><span>Eficiência acumulada</span><b>{{ pctTxt(analise.efic) }}</b><small>{{ analise.abaixo }} de {{ analise.nEfic }} meses abaixo da projeção</small></div>
          <div class="st" style="--c:var(--green)"><span>Economia compensada</span><b>{{ brlCurto(analise.ecoTot) }}</b><small>média {{ brlCurto(analise.ecoMedia) }}/mês</small></div>
          <div class="st" style="--c:var(--purple)"><span>Energia compensada</span><b>{{ mwh(analise.compTot) }}</b><small>TUSD + TE</small></div>
          <div class="st" style="--c:var(--red)"><span>Payback acumulado</span><b>{{ pctTxt(paybackPct, 2) }}</b><small>até {{ MR }} · {{ brlCurto(economiaAteRef) }}</small></div>
        </div>

        <div class="charts">
          <!-- 1. Geração projetada × real -->
          <div class="ch wide">
            <div class="chh">
              <h3>Geração projetada × real, por mês (MWh)</h3>
              <div class="leg"><span><i class="lp"></i>Projetada</span><span><i style="background:var(--teal)"></i>Real</span></div>
            </div>
            <div class="bc">
              <div v-for="x in analise.meses" :key="x.i" class="bcol" tabindex="0">
                <span class="bv">{{ x.real ? mwhNum(x.real) : '' }}</span>
                <div class="bbars">
                  <i class="b-proj" :style="{ height: alt(x.proj, analise.maxGer) }"></i>
                  <i class="b-real" :style="{ height: alt(x.real, analise.maxGer), background: x.efic != null ? corEfic(x.efic) : 'var(--teal)' }"></i>
                </div>
                <span class="bl">{{ x.m }}</span>
                <div class="btip" :class="tipLado(x.i)">
                  <strong>{{ MESES_LONGO[x.i] }}/{{ anoGraf }}</strong>
                  <div><span>Projetada</span><b>{{ mwh(x.proj) }}</b></div>
                  <div><span>Real</span><b>{{ mwh(x.real) }}</b></div>
                  <div><span>Eficiência</span><b :style="{ color: corEfic(x.efic) }">{{ pctTxt(x.efic) }}</b></div>
                </div>
              </div>
            </div>
            <p class="insight">
              <template v-if="analise.melhorG">
                Melhor mês: <b>{{ MESES_LONGO[analise.melhorG.i] }}</b> ({{ pctTxt(analise.melhorG.efic) }}) ·
                Pior mês: <b>{{ MESES_LONGO[analise.piorG.i] }}</b> ({{ pctTxt(analise.piorG.efic) }}) ·
                Barra real colorida pela eficiência: <b style="color:var(--green)">≥ 90%</b>, <b style="color:var(--orange)">70–90%</b>, <b style="color:var(--red)">&lt; 70%</b>
              </template>
              <template v-else>Sem geração registrada em {{ anoGraf }}.</template>
            </p>
            <div class="tblwrap">
              <table class="tbl">
                <thead><tr><th>Mês</th><th>Projetada</th><th>Real</th><th>Desvio</th><th>Eficiência</th><th>Economia</th><th>Compensado</th></tr></thead>
                <tbody>
                  <tr v-for="x in analise.meses" :key="x.i" :class="{ vazio: !x.real && !x.eco }">
                    <td>{{ MESES_CURTO[x.i] }}</td>
                    <td>{{ mwh(x.proj) }}</td>
                    <td>{{ mwh(x.real) }}</td>
                    <td :style="{ color: x.delta == null ? 'var(--mut)' : x.delta >= 0 ? 'var(--green)' : 'var(--red)' }">{{ x.delta == null ? '—' : (x.delta >= 0 ? '+' : '') + numero(x.delta, 1) + '%' }}</td>
                    <td><span class="tag" :style="{ color: corEfic(x.efic) }">{{ pctTxt(x.efic) }}</span></td>
                    <td>{{ brlCurto(x.eco) }}</td>
                    <td>{{ mwh(x.comp) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr><td>Total</td><td>{{ mwh(analise.projTot) }}</td><td>{{ mwh(analise.realTot) }}</td><td></td><td><span class="tag" :style="{ color: corEfic(analise.efic) }">{{ pctTxt(analise.efic) }}</span></td><td>{{ brlCurto(analise.ecoTot) }}</td><td>{{ mwh(analise.compTot) }}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- 2. Economia compensada -->
          <div class="ch">
            <div class="chh"><h3>Economia compensada por mês (R$)</h3></div>
            <div class="bc">
              <div v-for="x in analise.meses" :key="x.i" class="bcol" tabindex="0">
                <span class="bv">{{ x.eco ? brlK(x.eco) : '' }}</span>
                <div class="bbars"><i class="b-one" style="--c:var(--green)" :style="{ height: alt(x.eco, analise.maxEco) }"></i></div>
                <span class="bl">{{ x.m[0] }}</span>
                <div class="btip" :class="tipLado(x.i)">
                  <strong>{{ MESES_LONGO[x.i] }}/{{ anoGraf }}</strong>
                  <div><span>Economia</span><b>{{ moeda(x.eco) }}</b></div>
                  <div v-if="analise.ecoTot"><span>% do ano</span><b>{{ pctTxt((x.eco / analise.ecoTot) * 100) }}</b></div>
                </div>
              </div>
            </div>
            <div class="foot">
              <div><span>Total</span><b>{{ moeda(analise.ecoTot) }}</b></div>
              <div><span>Média mensal</span><b>{{ moeda(analise.ecoMedia) }}</b></div>
              <div><span>Melhor mês</span><b>{{ analise.melhorE ? `${MESES_CURTO[analise.melhorE.i]} · ${brlCurto(analise.melhorE.eco)}` : '—' }}</b></div>
              <div><span>Pior mês</span><b>{{ analise.piorE ? `${MESES_CURTO[analise.piorE.i]} · ${brlCurto(analise.piorE.eco)}` : '—' }}</b></div>
            </div>
          </div>

          <!-- 3. Energia compensada por destino -->
          <div class="ch">
            <div class="chh">
              <h3>Energia compensada por mês (MWh)</h3>
              <div class="leg"><span><i style="background:var(--green)"></i>Prédios</span><span><i style="background:var(--purple)"></i>IP</span><span v-if="analise.coTot"><i style="background:var(--mut)"></i>Outras</span></div>
            </div>
            <div class="bc">
              <div v-for="x in analise.meses" :key="x.i" class="bcol" tabindex="0">
                <span class="bv">{{ x.comp ? mwhNum(x.comp) : '' }}</span>
                <div class="bbars">
                  <div class="stack" :style="{ height: alt(x.comp, analise.maxComp) }">
                    <i :style="{ flex: x.cp, background: 'var(--green)' }"></i>
                    <i :style="{ flex: x.ci, background: 'var(--purple)' }"></i>
                    <i :style="{ flex: x.co, background: 'var(--mut)' }"></i>
                  </div>
                </div>
                <span class="bl">{{ x.m[0] }}</span>
                <div class="btip" :class="tipLado(x.i)">
                  <strong>{{ MESES_LONGO[x.i] }}/{{ anoGraf }}</strong>
                  <div><span>Prédios</span><b>{{ mwh(x.cp) }}</b></div>
                  <div><span>IP</span><b>{{ mwh(x.ci) }}</b></div>
                  <div v-if="x.co"><span>Outras</span><b>{{ mwh(x.co) }}</b></div>
                  <div><span>Total</span><b>{{ mwh(x.comp) }}</b></div>
                </div>
              </div>
            </div>
            <div class="foot">
              <div><span>Total</span><b>{{ mwh(analise.compTot) }}</b></div>
              <div><span>Prédios</span><b>{{ mwh(analise.cpTot) }} · {{ pctTxt(analise.compTot ? (analise.cpTot / analise.compTot) * 100 : null, 0) }}</b></div>
              <div><span>Iluminação</span><b>{{ mwh(analise.ciTot) }} · {{ pctTxt(analise.compTot ? (analise.ciTot / analise.compTot) * 100 : null, 0) }}</b></div>
              <div v-if="analise.coTot"><span>Outras</span><b>{{ mwh(analise.coTot) }}</b></div>
            </div>
          </div>

          <!-- 4. Desempenho por usina -->
          <div class="ch wide">
            <div class="chh">
              <h3>Desempenho por usina em {{ anoGraf }}</h3>
              <span class="psub">Eficiência = real ÷ projeção, só nos meses com geração registrada</span>
            </div>
            <div v-if="analise.usinasRank.length" class="ur">
              <div class="urh"><span>#</span><span>Usina</span><span>Geração real</span><span>Participação</span><span>Eficiência</span><span>Meses abaixo</span></div>
              <div v-for="(u, k) in analise.usinasRank" :key="u.id" class="urr">
                <span class="urk">{{ k + 1 }}</span>
                <span class="urn" :title="u.nome">{{ u.nome }}</span>
                <span class="urb"><i :style="{ width: alt(u.real, analise.maxUsina), background: corEfic(u.efic) }"></i><b>{{ mwh(u.real) }}</b></span>
                <span>{{ pctTxt(u.part) }}</span>
                <span><span class="tag" :style="{ color: corEfic(u.efic) }">{{ pctTxt(u.efic) }} · {{ rotuloEfic(u.efic) }}</span></span>
                <span :style="{ color: u.abaixo >= 3 ? 'var(--red)' : 'var(--mut)' }">{{ u.abaixo }} de {{ u.meses }}</span>
              </div>
            </div>
            <p v-else class="insight">Sem geração registrada em {{ anoGraf }}.</p>
          </div>

          <!-- 5. Geração por ano -->
          <div class="ch wide">
            <div class="chh"><h3>Geração total por ano (MWh) e variação anual</h3></div>
            <div class="bc anual">
              <div v-for="p in porAno" :key="p.ano" class="bcol" tabindex="0" :class="{ cur: p.ano == anoGraf }">
                <span class="bv">{{ mwhNum(p.v) }}</span>
                <div class="bbars"><i class="b-one" style="--c:var(--green)" :style="{ height: p.h }"></i></div>
                <span class="bl">{{ p.ano }}</span>
                <span class="yoy" :style="{ color: p.yoy == null ? 'var(--mut)' : p.yoy >= 0 ? 'var(--green)' : 'var(--red)' }">{{ p.yoy == null ? '—' : (p.yoy >= 0 ? '▲ ' : '▼ ') + numero(Math.abs(p.yoy), 1) + '%' }}</span>
              </div>
            </div>
            <p class="insight">O ano em andamento é parcial: a variação compara com o ano anterior completo.</p>
          </div>
        </div>
      </div>
    </div>

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
.btn:focus-visible,.hd:focus-visible,.x:focus-visible,.ano:focus-visible{outline:2px solid #fff;outline-offset:3px}
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

/* ── Modal de análise ── */
.modal{position:fixed;inset:0;background:rgba(3,6,18,.8);backdrop-filter:blur(8px);display:none;place-items:center;padding:16px;z-index:1010}
.modal.on{display:grid}
.panel{background:var(--bg2);border:1px solid var(--line);border-radius:24px;width:min(1180px,100%);max-height:92vh;overflow:auto;padding:22px;position:relative}
.x{position:absolute;right:14px;top:10px;background:none;border:0;color:var(--tx);font-size:26px;cursor:pointer}
.phd{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;padding-right:30px}
.phd .anos{--c:var(--purple)}
.ptit{font-size:19px;font-weight:700}
.psub{font-size:12px;color:var(--mut);margin-top:3px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-top:16px}
.st{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;border-top:2px solid var(--c);display:flex;flex-direction:column;gap:3px}
.st span{font-size:11.5px;color:var(--mut)}
.st b{font-size:20px;font-weight:700;color:var(--c)}
.st small{font-size:11px;color:var(--mut)}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px;margin-top:16px}
.ch{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;min-width:0}
.ch.wide{grid-column:1/-1}
.chh{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.ch h3{font-size:14px;font-weight:600}
.leg{display:flex;gap:14px;font-size:11.5px;color:var(--mut)}
.leg span{display:flex;align-items:center;gap:6px}
.leg i{width:10px;height:10px;border-radius:3px;display:inline-block}
.leg i.lp{border:1px dashed var(--orange)}
.bc{display:flex;align-items:stretch;gap:6px;height:220px;padding-top:4px}
.bc.anual{height:200px;max-width:720px}
.bcol{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;position:relative;border-radius:8px;outline:none;padding:0 1px}
.bcol:hover,.bcol:focus-visible,.bcol.cur{background:rgba(255,255,255,.05)}
.bv{font-size:10.5px;color:var(--tx);height:16px;white-space:nowrap;font-weight:600}
.bbars{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:2px}
.stack{display:flex;flex-direction:column-reverse;gap:1px;width:64%;max-width:56px}
.stack i{width:100%;min-height:0;border-radius:2px}
.stack i:last-child{border-radius:4px 4px 2px 2px}
.b-proj{width:42%;border:1px dashed var(--orange);border-bottom:0;border-radius:4px 4px 0 0;background:rgba(255,161,46,.08)}
.b-real{width:42%;border-radius:4px 4px 0 0}
.b-one{width:64%;max-width:56px;border-radius:5px 5px 0 0;background:linear-gradient(var(--c),color-mix(in srgb,var(--c) 35%,transparent))}
.bl{font-size:10.5px;color:var(--mut);margin-top:5px}
.yoy{font-size:10.5px;font-weight:600;margin-top:2px}
.btip{position:absolute;bottom:calc(100% - 10px);left:50%;transform:translate(-50%,6px);min-width:160px;background:#0b1030;border:1px solid var(--line);border-radius:12px;padding:9px 11px;font-size:11.5px;display:grid;gap:4px;opacity:0;pointer-events:none;transition:.18s;z-index:5;box-shadow:0 12px 30px -10px #000}
.btip.l{left:0;transform:translate(0,6px)}
.btip.r{left:auto;right:0;transform:translate(0,6px)}
.bcol:hover .btip,.bcol:focus-visible .btip{opacity:1;transform:translate(-50%,0)}
.bcol:hover .btip.l,.bcol:focus-visible .btip.l,.bcol:hover .btip.r,.bcol:focus-visible .btip.r{transform:translate(0,0)}
.btip strong{font-size:12px;margin-bottom:2px}
.btip div{display:flex;justify-content:space-between;gap:12px;color:var(--mut)}
.btip b{color:var(--tx);white-space:nowrap}
.insight{font-size:12px;color:var(--mut);margin-top:10px;line-height:1.6}
.insight b{color:var(--tx)}
.foot{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:12px}
.foot div{display:flex;flex-direction:column;gap:2px;background:rgba(255,255,255,.035);border-radius:10px;padding:8px 10px}
.foot span{font-size:11px;color:var(--mut)}
.foot b{font-size:13px}
.tblwrap{overflow-x:auto;margin-top:12px}
.tbl{width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap}
.tbl th{text-align:right;font-weight:600;color:var(--mut);font-size:11px;padding:7px 10px;border-bottom:1px solid var(--line)}
.tbl td{text-align:right;padding:6px 10px;border-bottom:1px dashed rgba(255,255,255,.07)}
.tbl th:first-child,.tbl td:first-child{text-align:left}
.tbl tbody tr:hover{background:rgba(255,255,255,.04)}
.tbl tr.vazio td{color:rgba(154,167,204,.5)}
.tbl tfoot td{font-weight:700;border-top:1px solid var(--line);border-bottom:0}
.ur{display:grid;font-size:12px;overflow-x:auto}
.urh,.urr{display:grid;grid-template-columns:28px minmax(140px,1.4fr) minmax(160px,2fr) 90px 150px 90px;gap:10px;align-items:center;padding:7px 4px;min-width:700px}
.urh{color:var(--mut);font-size:11px;border-bottom:1px solid var(--line)}
.urr{border-bottom:1px dashed rgba(255,255,255,.07)}
.urr:hover{background:rgba(255,255,255,.04)}
.urk{color:var(--mut)}
.urn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.urb{display:flex;align-items:center;gap:8px}
.urb i{height:10px;border-radius:5px;flex:none;min-width:2px}
.urb b{white-space:nowrap;font-weight:600}

@media(max-width:1000px){.stage{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.center{grid-column:1/-1;order:-1;position:static}}
@media(max-width:640px){
  .lx main{padding:18px 16px 120px}
  .stage{grid-template-columns:minmax(0,1fr)}.badge img{height:72px}
  .panel{padding:16px}
  .bc{gap:2px}.bv{font-size:9px}
}
@media(prefers-reduced-motion:reduce){.lx *{animation:none!important;transition:none!important}}
</style>
