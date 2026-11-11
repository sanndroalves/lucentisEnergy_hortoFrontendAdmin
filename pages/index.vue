<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import { useMapaEnergia } from '~/composables/useMapaEnergia';
import { useReferenciaAtual } from '~/composables/useReferenciaAtual';
import { useEnergyFormat } from '~/composables/useEnergyFormat';
import { useClimaHoje } from '~/composables/useClimaHoje';

useHead({
  title: 'Início',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&display=swap' },
  ],
});
definePageMeta({ middleware: 'sidebase-auth', layout: 'blank' });

// ─── Dados (mesmos endpoints da tela antiga e dos widgets que ela usava) ───
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
const MR = computed(() => `${String(refMes.value).padStart(2, '0')}/${refAno.value}`);

// ─── Indicadores do mapa (total gerado/injetado, placas, investimento) ───
const {
  totalGerado, totalInjetado, totalCompensaSoma, totalPlacas, totalInvestido,
  somarEconomiaPorMesAno, calcularCustoAutoconsumoMes,
} = useMapaEnergia({ usinas, unidades, geracoes, injecoes, compensa: relatorios });

const { numero } = useEnergyFormat();

// ─── Formatação ───
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_LONGO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_LETRA = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const brlCurto = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e6) return `R$ ${numero(n / 1e6, 1)} mi`;
  if (Math.abs(n) >= 1e3) return `R$ ${numero(n / 1e3, 0)} mil`;
  return `R$ ${numero(n, 0)}`;
};
const mwhNum = (kwh) => { const m = (Number(kwh) || 0) / 1000; return numero(m, m >= 100 ? 0 : 1); };
const mwh = (kwh) => `${mwhNum(kwh)} MWh`;
const doze = () => Array.from({ length: 12 }, () => 0);
const alturas = (arr, max) => arr.map(v => (max > 0 ? Math.max(4, Math.round((v / max) * 100)) : 4));

// ─── Geração projetada × real (lógica do RelatorioGeracao / AnaliseGeracao) ───
const projPorMes = computed(() => {
  const a = doze();
  lProjecoes.value.filter(i => i.ano == refAno.value).forEach(i => { a[i.mes - 1] += parseInt(i.projecao) || 0; });
  return a;
});
const realPorMes = computed(() => {
  const a = doze();
  lGeracoes.value.filter(i => i.ano == refAno.value).forEach(i => { a[i.mes - 1] += parseInt(i.geracao) || 0; });
  return a;
});
const projMesRef = computed(() => projPorMes.value[refMes.value - 1]);
const realMesRef = computed(() => realPorMes.value[refMes.value - 1]);
const eficiencia = computed(() => (projMesRef.value > 0 ? `${numero((realMesRef.value / projMesRef.value) * 100, 1)}%` : '—'));
const geracaoBarras = computed(() => {
  const max = Math.max(...projPorMes.value, ...realPorMes.value);
  return { real: alturas(realPorMes.value, max), proj: alturas(projPorMes.value, max) };
});

// ─── Economia compensada (lógica do GeracaoDinheiro: valorInjTUSD + valorInjTE) ───
const economiaPorMes = computed(() => {
  const a = doze();
  lRelatorios.value.filter(r => r.ano == refAno.value).forEach(r => {
    a[r.mes - 1] += (parseInt(r.valorInjTUSD) || 0) + (parseInt(r.valorInjTE) || 0);
  });
  return a;
});
const economiaAno = computed(() => economiaPorMes.value.reduce((s, v) => s + v, 0));
const economiaBarras = computed(() => alturas(economiaPorMes.value, Math.max(...economiaPorMes.value)));
const melhorMes = computed(() => {
  const v = economiaPorMes.value;
  const i = v.indexOf(Math.max(...v));
  return v[i] > 0 ? `${MESES_LONGO[i]} · ${brlCurto(v[i])}` : '—';
});
// injeção + autoconsumo (custo evitado), somado mês a mês até o mês de referência
const economiaGeradaAno = computed(() => {
  let t = 0;
  for (let m = 1; m <= refMes.value; m++) t += somarEconomiaPorMesAno(refAno.value, m) + calcularCustoAutoconsumoMes(refAno.value, m);
  return t;
});
const faturasCompensadas = computed(() =>
  lRelatorios.value.filter(r => r.ano == refAno.value && ((Number(r.valorInjTUSD) || 0) + (Number(r.valorInjTE) || 0)) > 0).length,
);
const payback = computed(() => (totalInvestido > 0 ? `${numero((totalCompensaSoma.value / totalInvestido) * 100, 0)}%` : '—'));

// ─── Usinas ───
const usinasLigadas    = computed(() => lUsinas.value.filter(u => u.status === 'L').length);
const usinasDesligadas = computed(() => lUsinas.value.filter(u => u.status === 'D').length);
const usinasManutencao = computed(() => lUsinas.value.filter(u => u.status === 'M').length);
const potenciaKwp = computed(() => lUsinas.value.reduce((s, u) => s + (parseFloat(u.potencia) || 0), 0));
const potenciaTxt = computed(() => (potenciaKwp.value >= 1000 ? `${numero(potenciaKwp.value / 1000, 2)} MWp` : `${numero(potenciaKwp.value, 0)} kWp`));

// ─── Monitoramento (regra do Irregular: 3+ meses abaixo da projeção) ───
// Janela: 12 meses terminando no mês de referência. Status do Checklist do
// mês corrente, mesma classificação da página /checklist.
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
const alertas = computed(() => {
  const chave = (a, m) => a * 12 + (m - 1);
  const fim = chave(refAno.value, refMes.value);
  const ini = fim - 11;
  const proj = {};
  lProjecoes.value.forEach(p => { proj[`${p.idGeradora}-${p.ano}-${p.mes}`] = (proj[`${p.idGeradora}-${p.ano}-${p.mes}`] || 0) + (parseInt(p.projecao) || 0); });
  const abaixo = {};
  lGeracoes.value.forEach(g => {
    const k = chave(g.ano, g.mes);
    if (k < ini || k > fim) return;
    const p = proj[`${g.idGeradora}-${g.ano}-${g.mes}`];
    if (p && (parseInt(g.geracao) || 0) < p) abaixo[g.idGeradora] = (abaixo[g.idGeradora] || 0) + 1;
  });
  return Object.entries(abaixo)
    .filter(([, qtd]) => qtd >= 3)
    .map(([id, qtd]) => {
      const u = lUsinas.value.find(x => x.id == id);
      return { id, nome: u?.nome ?? `Usina #${id}`, qtd, status: statusChecklist(id) };
    })
    .sort((a, b) => b.qtd - a.qtd);
});

// ─── Manutenções (status 1 programada · 2 em andamento · 3 realizada) ───
const manut = computed(() => ({
  programadas: lManutencoes.value.filter(m => m.status === '1').length,
  andamento:   lManutencoes.value.filter(m => m.status === '2').length,
  realizadas:  lManutencoes.value.filter(m => m.status === '3').length,
}));

// ─── Caminho da energia (acumulado) ───
const compensadoPor = (siglas) => {
  const ids = new Set(lUnidades.value.filter(u => siglas.includes(u.secretaria)).map(u => u.id));
  return lRelatorios.value.filter(r => ids.has(r.idUnidadeCompensa)).reduce((s, r) => s + (Number(r.enerInjTUSD) || 0), 0);
};
const compensadoPredios = computed(() => compensadoPor(['E', 'S', 'O']));
const compensadoIP      = computed(() => compensadoPor(['I', 'P']));

// ─── Cards laterais (abre/fecha) ───
const abertos = ref(new Set(['usinas']));
const alternar = (id) => {
  const s = new Set(abertos.value);
  s.has(id) ? s.delete(id) : s.add(id);
  abertos.value = s;
};

// ─── Modal de gráficos ───
const modal = ref(false);
const graficoMeses = computed(() => {
  const max = Math.max(1, ...projPorMes.value, ...realPorMes.value);
  return MESES_LETRA.map((m, i) => ({
    x: 14 + i * 28, m,
    hp: (projPorMes.value[i] / max) * 150,
    hr: (realPorMes.value[i] / max) * 150,
  }));
});
const CORES = ['#ffa12e', '#22c5e0', '#34d37a', '#a855f7', '#ff6b4a'];
const participacao = computed(() => {
  const por = {};
  lGeracoes.value.filter(g => g.ano == refAno.value).forEach(g => { por[g.idGeradora] = (por[g.idGeradora] || 0) + (parseInt(g.geracao) || 0); });
  const total = Object.values(por).reduce((s, v) => s + v, 0);
  if (!total) return [];
  const lista = Object.entries(por)
    .map(([id, v]) => ({ nome: lUsinas.value.find(u => u.id == id)?.nome ?? `Usina #${id}`, v }))
    .sort((a, b) => b.v - a.v);
  const top = lista.slice(0, 4);
  const resto = lista.slice(4).reduce((s, x) => s + x.v, 0);
  if (resto > 0) top.push({ nome: 'Demais', v: resto });
  let acc = 0;
  return top.map((x, i) => {
    const pct = (x.v / total) * 100;
    const a0 = (acc / 100) * 2 * Math.PI - Math.PI / 2;
    acc += pct;
    const a1 = (acc / 100) * 2 * Math.PI - Math.PI / 2;
    const p = (a) => `${(80 * Math.cos(a)).toFixed(2)} ${(80 * Math.sin(a)).toFixed(2)}`;
    return {
      nome: x.nome.length > 18 ? x.nome.slice(0, 17) + '…' : x.nome,
      pct: numero(pct, 0), cor: CORES[i], cheio: pct >= 99.99,
      d: `M${p(a0)} A80 80 0 ${pct > 50 ? 1 : 0} 1 ${p(a1)}`,
    };
  });
});
const porAno = computed(() => {
  const por = {};
  lGeracoes.value.forEach(g => { if (g.ano) por[g.ano] = (por[g.ano] || 0) + (parseInt(g.geracao) || 0); });
  const anos = Object.keys(por).sort();
  const max = Math.max(1, ...Object.values(por));
  const passo = anos.length > 1 ? 300 / (anos.length - 1) : 0;
  const pts = anos.map((a, i) => ({ ano: a, x: 30 + i * passo, y: 150 - (por[a] / max) * 120, v: mwh(por[a]) }));
  return { pts, d: pts.length ? 'M' + pts.map(p => `${p.x} ${p.y}`).join(' L') : '' };
});

// ─── Dock de navegação (mesmos grupos do menu lateral) ───
const NAV = [
  { n: 'Início', i: '◉', a: '--teal', b: '--green', s: [] },
  { n: 'Fotovoltaico', i: '☀', a: '--orange', b: '--red', s: [['Usinas', '/usinas/'], ['Manutenções', '/manutencoes/'], ['Checklist', '/checklist/'], ['Gráficos', '/graficos/']] },
  { n: 'Gerenciamento', i: '▦', a: '--purple', b: '--teal', s: [['Relatórios', '/relatorios/'], ['Lista de Rateio', '/lista/'], ['Dados', '/dados/']] },
  { n: 'UCs Públicas', i: '✦', a: '--green', b: '--teal', s: [['Iluminação', '/iluminacao/'], ['Prédios', '/predios/']] },
];
const navAtual = ref(-1);
const clicarNav = (k) => { navAtual.value = !NAV[k].s.length || navAtual.value === k ? -1 : k; };
const ir = (rota) => { navAtual.value = -1; navigateTo(rota); };

// ─── Clima de hoje e previsão de geração ───
const clima = useClimaHoje();
const pushAberto = ref(false);
const gaugeW = ref(0);
let pushTimer;
const NIVEL = {
  alta:  { lv: 'Ótima',    c: '--green' },
  media: { lv: 'Moderada', c: '--orange' },
  baixa: { lv: 'Baixa',    c: '--red' },
};
const climaInfo = computed(() => {
  const p = clima.previsao.value;
  const n = NIVEL[clima.nivel.value] ?? { lv: '—', c: '--mut' };
  const rad = clima.radiacaoKwh.value;
  // estimativa: potência instalada (kWp) × horas de sol pleno × PR 0,75
  const estimado = rad != null ? (potenciaKwp.value * rad * 0.75) / 1000 : null;
  return {
    ...n,
    icone: clima.tempo.value.icone,
    titulo: p ? `${clima.tempo.value.texto}${p.tMax != null ? `, ${numero(p.tMax, 0)} °C` : ''}` : '',
    chuva: p?.chuvaPct,
    w: rad != null ? Math.min(100, Math.round((rad / 7.2) * 100)) : 0,
    rad: rad != null ? numero(rad, 1) : '—',
    estimado: estimado != null ? numero(estimado, 1) : '—',
  };
});
function mostrarClima() {
  pushAberto.value = true;
  gaugeW.value = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => { gaugeW.value = climaInfo.value.w; }));
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushAberto.value = false; }, 11000);
}
const alternarClima = () => (pushAberto.value ? (pushAberto.value = false) : mostrarClima());

// ─── Nebulosa animada (canvas) ───
const orb = ref(null);
let raf = 0, S = 520, ctx = null, timerInicial;
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
  if (e.key === 'Escape') { modal.value = false; navAtual.value = -1; }
}

onMounted(() => {
  ctx = orb.value.getContext('2d');
  parado = matchMedia('(prefers-reduced-motion:reduce)').matches;
  ajustar();
  addEventListener('resize', ajustar);
  addEventListener('keydown', teclado);
  raf = requestAnimationFrame(desenhar);
  clima.carregar();
  timerInicial = setTimeout(mostrarClima, 1500);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  removeEventListener('resize', ajustar);
  removeEventListener('keydown', teclado);
  clearTimeout(pushTimer);
  clearTimeout(timerInicial);
});
</script>

<template>
  <div class="lx">
    <main>
      <header class="top">
        <div class="badge"><img src="https://i.imgur.com/gHxwN0V.png" alt="LUCENTIS"></div>
        <p>Início · visão geral da operação solar</p>
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
              <div><strong>Economia compensada</strong><b>{{ brlCurto(economiaAno) }}</b><em>em {{ refAno }}</em></div>
              <span class="chev">▾</span>
            </button>
            <div class="dd"><div><div class="in">
              <div class="sp"><i v-for="(h, i) in economiaBarras" :key="i" :style="{ height: h + '%', animationDelay: i * 60 + 'ms' }" :title="`${MESES_CURTO[i]}: ${brlCurto(economiaPorMes[i])}`"></i></div>
              <div class="row"><span>Melhor mês</span><b>{{ melhorMes }}</b></div>
              <div class="row"><span>Economia compensada (injeção)</span><b>{{ brlCurto(economiaAno) }}</b></div>
              <div class="row"><span>Economia gerada (injeção + autoconsumo)</span><b>{{ brlCurto(economiaGeradaAno) }}</b></div>
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
                  <i :style="{ height: h + '%', animationDelay: i * 60 + 'ms' }" :title="`${MESES_CURTO[i]}: ${mwh(realPorMes[i])}`"></i>
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
            <button class="btn" style="--c1:var(--purple);--c2:var(--teal)" @click="modal = true">Ver gráficos</button>
          </div>
          <div class="kpis">
            <div class="kpi" style="--c:var(--green)"><b>{{ brlCurto(economiaAno) }}</b><span>economia compensada em {{ refAno }}</span></div>
            <div class="kpi" style="--c:var(--orange)"><b>{{ mwh(realMesRef) }}</b><span>gerados no mês ({{ MR }})</span></div>
            <div class="kpi" style="--c:var(--purple)"><b>{{ payback }}</b><span>payback acumulado</span></div>
          </div>
        </div>

        <!-- ── Coluna direita ── -->
        <div class="col">
          <div class="card" :class="{ open: abertos.has('monitor') }" :style="{ '--c': alertas.length ? 'var(--red)' : 'var(--green)' }">
            <button class="hd" :aria-expanded="abertos.has('monitor')" @click="alternar('monitor')">
              <span class="ic">!</span>
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

    <!-- ── Modal de gráficos ── -->
    <div class="modal" :class="{ on: modal }" role="dialog" aria-modal="true" aria-label="Gráficos" @click.self="modal = false">
      <div class="panel">
        <button class="x" aria-label="Fechar" @click="modal = false">×</button>
        <strong style="font-size:18px">Gráficos do sistema · {{ refAno }}</strong>
        <div class="charts">
          <div class="ch">
            <h3>Geração projetada e real, por mês</h3>
            <svg viewBox="0 0 360 190">
              <g v-for="g in graficoMeses" :key="g.x">
                <rect :x="g.x" :y="160 - g.hp" width="10" :height="g.hp" fill="none" stroke="#ffa12e" rx="2" />
                <rect :x="g.x + 11" :y="160 - g.hr" width="10" :height="g.hr" fill="#22c5e0" rx="2" />
                <text :x="g.x + 10" y="178" fill="#9aa7cc" font-size="10" text-anchor="middle">{{ g.m }}</text>
              </g>
            </svg>
            <div class="leg"><span><i style="border:1px solid #ffa12e"></i>Projetada</span><span><i style="background:#22c5e0"></i>Real</span></div>
          </div>
          <div class="ch">
            <h3>Participação de cada usina na geração</h3>
            <svg viewBox="0 0 360 190">
              <g transform="translate(95,95)">
                <template v-for="u in participacao" :key="u.nome">
                  <circle v-if="u.cheio" r="80" :stroke="u.cor" stroke-width="26" fill="none" />
                  <path v-else :d="u.d" :stroke="u.cor" stroke-width="26" fill="none" />
                </template>
              </g>
              <g v-for="(u, i) in participacao" :key="'l' + i">
                <rect x="200" :y="40 + i * 26" width="12" height="12" rx="3" :fill="u.cor" />
                <text x="220" :y="51 + i * 26" fill="#eef2ff" font-size="11">{{ u.nome }} · {{ u.pct }}%</text>
              </g>
              <text v-if="!participacao.length" x="180" y="95" fill="#9aa7cc" font-size="12" text-anchor="middle">Sem geração registrada em {{ refAno }}</text>
            </svg>
          </div>
          <div class="ch" style="grid-column:1/-1">
            <h3>Geração total por ano</h3>
            <svg viewBox="0 0 360 180">
              <path :d="porAno.d" stroke="#34d37a" stroke-width="3" fill="none" />
              <g v-for="p in porAno.pts" :key="p.ano">
                <circle :cx="p.x" :cy="p.y" r="5" fill="#34d37a"><title>{{ p.ano }}: {{ p.v }}</title></circle>
                <text :x="p.x" y="172" fill="#9aa7cc" font-size="10" text-anchor="middle">{{ p.ano }}</text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Dock de navegação ── -->
    <nav class="dock" aria-label="Blocos do sistema">
      <button v-for="(n, k) in NAV" :key="n.n" class="nv" :class="{ on: k === 0 || navAtual === k }"
        :style="{ '--c1': `var(${n.a})`, '--c2': `var(${n.b})` }" @click="clicarNav(k)">
        <span class="rg"><b>{{ n.i }}</b></span><span class="lb">{{ n.n }}</span>
      </button>
    </nav>
    <div class="fly" :class="{ on: navAtual > 0 }" :style="navAtual > 0 ? { '--c1': `var(${NAV[navAtual].a})`, '--c2': `var(${NAV[navAtual].b})` } : {}">
      <template v-if="navAtual > 0">
        <strong>{{ NAV[navAtual].n }}</strong>
        <button v-for="s in NAV[navAtual].s" :key="s[1]" class="chip" @click="ir(s[1])">{{ s[0] }}</button>
        <div style="margin-top:8px">
          <button class="btn" :style="{ '--c1': `var(${NAV[navAtual].a})`, '--c2': `var(${NAV[navAtual].b})` }" @click="ir(NAV[navAtual].s[0][1])">Entrar em {{ NAV[navAtual].n }}</button>
        </div>
      </template>
    </div>

    <!-- ── Perfil + clima ── -->
    <div class="perfil"><LayoutFullVerticalHeaderProfileDD /></div>
    <button class="bell" aria-label="Clima de hoje e previsão de geração" :style="{ '--pc': `var(${climaInfo.c})` }" @click="alternarClima">🔔<i></i></button>
    <div class="push" :class="{ on: pushAberto }" role="status" :style="{ '--pc': `var(${climaInfo.c})` }">
      <div class="ph">
        <span>{{ clima.carregando.value ? '⏳' : clima.erro.value ? '⚠️' : climaInfo.icone }}</span>
        <strong v-if="clima.carregando.value">Carregando clima de hoje…</strong>
        <strong v-else-if="clima.erro.value">Não foi possível carregar o clima agora</strong>
        <strong v-else>Clima de hoje: {{ climaInfo.titulo }}</strong>
        <button class="pc" aria-label="Fechar aviso" @click="pushAberto = false">×</button>
      </div>
      <template v-if="!clima.carregando.value && !clima.erro.value">
        <div class="pl">Previsão de geração: <b>{{ climaInfo.lv }}</b><template v-if="climaInfo.chuva != null"> · chuva {{ climaInfo.chuva }}%</template></div>
        <div class="gz"><i :style="{ '--w': gaugeW + '%' }"></i></div>
        <div class="pf">Radiação solar prevista: {{ climaInfo.rad }} kWh/m² · geração estimada hoje: {{ climaInfo.estimado }} MWh</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.lx {
  --bg:#060a1a;--bg2:#0d1330;--card:rgba(255,255,255,.055);--line:rgba(255,255,255,.14);--tx:#eef2ff;--mut:#9aa7cc;
  --teal:#22c5e0;--green:#34d37a;--orange:#ffa12e;--purple:#a855f7;--red:#ff6b4a;
  color-scheme:dark;background:var(--bg);color:var(--tx);font-family:'Sora',system-ui,-apple-system,'Segoe UI',sans-serif;
  min-height:100vh;overflow-x:hidden;
  padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);
  background-image:radial-gradient(circle at 20% 10%,rgba(34,197,224,.13),transparent 40%),radial-gradient(circle at 85% 80%,rgba(168,85,247,.16),transparent 45%),linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
  background-size:auto,auto,44px 44px,44px 44px;background-attachment:fixed;
}
.lx *{box-sizing:border-box;margin:0}
main{max-width:1380px;margin:0 auto;padding:18px 18px 120px}
.top{display:flex;flex-direction:column;align-items:center;gap:6px;margin-bottom:4px}
.badge{padding:2px 10px}
.badge img{height:96px;display:block;filter:drop-shadow(0 0 18px rgba(34,197,224,.5)) drop-shadow(0 0 46px rgba(168,85,247,.4))}
.top p{color:var(--mut);font-size:13px;letter-spacing:.02em}
.stage{display:grid;grid-template-columns:1fr minmax(300px,520px) 1fr;gap:22px;align-items:start;margin-top:10px}
.col{display:flex;flex-direction:column;gap:14px}
.center{display:flex;flex-direction:column;align-items:center;gap:14px;position:sticky;top:10px}
.orbwrap{position:relative;width:min(100%,520px);aspect-ratio:1}
.orb{width:100%;height:100%;display:block;-webkit-mask-image:radial-gradient(circle,#000 52%,transparent 71%);mask-image:radial-gradient(circle,#000 52%,transparent 71%)}
.orbtx{position:absolute;inset:0;display:grid;place-content:center;text-align:center;pointer-events:none;text-shadow:0 2px 24px rgba(0,0,0,.6)}
.orbtx small{font-size:13px;color:#dfe7ff}
.orbtx b{font-size:clamp(40px,7vw,64px);font-weight:700;line-height:1.05}
.orbtx span{font-size:14px;color:#fff;margin-top:4px}
.btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:-34px;position:relative}
.btn{font:600 14px 'Sora',system-ui,sans-serif;color:#fff;border:0;cursor:pointer;padding:12px 20px;border-radius:999px;background:linear-gradient(120deg,var(--c1),var(--c2));box-shadow:0 8px 28px -8px var(--c1);transition:transform .2s,box-shadow .2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 12px 34px -6px var(--c2)}
.btn:focus-visible,.hd:focus-visible,.x:focus-visible{outline:2px solid #fff;outline-offset:3px}
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
.row b{color:var(--tx);font-weight:600;text-align:right}
.qtd{font-size:11px;opacity:.8}
.tag{font-size:11.5px;padding:2px 9px;border-radius:99px;background:rgba(255,255,255,.08);white-space:nowrap}
.sp{display:flex;align-items:flex-end;gap:4px;height:56px}
.sp i{flex:1;background:linear-gradient(var(--c),transparent);border-radius:4px 4px 0 0;min-height:4px;animation:grow .9s ease both;transform-origin:bottom}
.sp i.p{background:none;border:1px solid var(--c);border-bottom:0;animation:none}
@keyframes grow{from{transform:scaleY(0)}}
.flow{margin-top:22px;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:14px 10px 8px;backdrop-filter:blur(10px)}
.flow h2{font-size:14px;font-weight:600;padding:0 12px 4px}
.flow svg{width:100%;height:auto;display:block}
.flow text{fill:var(--tx);font:600 13px 'Sora',system-ui,sans-serif}
.flow .s{fill:var(--mut);font-weight:400;font-size:11.5px}
.note{max-width:640px;margin:18px auto 0;text-align:center;color:var(--mut);font-size:12px;line-height:1.6}
.note strong{color:var(--green)}
.modal{position:fixed;inset:0;background:rgba(3,6,18,.78);backdrop-filter:blur(8px);display:none;place-items:center;padding:16px;z-index:20}
.modal.on{display:grid}
.panel{background:var(--bg2);border:1px solid var(--line);border-radius:24px;width:min(980px,100%);max-height:92vh;overflow:auto;padding:22px;position:relative}
.x{position:absolute;right:14px;top:12px;background:none;border:0;color:var(--tx);font-size:26px;cursor:pointer}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:12px}
.ch{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px}
.ch h3{font-size:13px;font-weight:600;margin-bottom:8px}
.ch svg{width:100%;height:auto}
.leg{display:flex;gap:14px;font-size:11.5px;color:var(--mut)}
.leg span{display:flex;align-items:center;gap:6px}
.leg i{width:10px;height:10px;border-radius:3px;display:inline-block}
.dock{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));display:flex;gap:4px;padding:7px;border-radius:999px;background:rgba(10,15,40,.74);border:1px solid var(--line);backdrop-filter:blur(16px);z-index:15;box-shadow:0 16px 50px -14px #000}
.nv{all:unset;cursor:pointer;display:flex;align-items:center;gap:9px;padding:5px 16px 5px 5px;border-radius:999px;color:var(--mut);font:600 13px 'Sora',system-ui,sans-serif;transition:background .25s,color .25s;white-space:nowrap}
.nv:hover,.nv.on{background:rgba(255,255,255,.09);color:#fff}
.nv:focus-visible{outline:2px solid #fff;outline-offset:2px}
.rg{position:relative;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;flex:none}
.rg::before{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--c1),var(--c2),var(--c1));animation:spin 4s linear infinite}
.rg b{position:relative;width:31px;height:31px;border-radius:50%;background:#0b1030;display:grid;place-items:center;font-size:14px;color:#fff;font-weight:400}
.nv.on .rg{box-shadow:0 0 20px var(--c1)}
@keyframes spin{to{transform:rotate(1turn)}}
.fly{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translate(-50%,16px) scale(.96);opacity:0;pointer-events:none;background:rgba(10,15,40,.92);border:1px solid var(--c1,var(--line));border-radius:22px;padding:14px;backdrop-filter:blur(16px);box-shadow:0 0 44px -10px var(--c1,#000);transition:.3s;z-index:16;width:min(480px,calc(100vw - 24px));text-align:center}
.fly.on{transform:translate(-50%,0) scale(1);opacity:1;pointer-events:auto}
.fly strong{display:block;font-size:14px;margin-bottom:10px}
.chip{font:600 13px 'Sora',system-ui,sans-serif;border:1px solid var(--line);background:rgba(255,255,255,.07);color:#fff;border-radius:99px;padding:8px 14px;cursor:pointer;margin:3px;transition:background .2s}
.chip:hover{background:linear-gradient(120deg,var(--c1),var(--c2))}
.perfil{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));right:68px;z-index:24;width:46px;height:46px;border-radius:50%;border:1px solid var(--line);background:rgba(10,15,40,.74);backdrop-filter:blur(12px);display:grid;place-items:center}
.bell{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));right:14px;width:46px;height:46px;border-radius:50%;border:1px solid var(--line);background:rgba(10,15,40,.74);backdrop-filter:blur(12px);cursor:pointer;font-size:20px;z-index:24;color:#fff}
.bell i{position:absolute;top:6px;right:6px;width:10px;height:10px;border-radius:50%;background:var(--pc,var(--green));box-shadow:0 0 10px var(--pc,var(--green))}
.bell:focus-visible,.pc:focus-visible{outline:2px solid #fff;outline-offset:2px}
.push{position:fixed;top:calc(68px + env(safe-area-inset-top,0px));right:14px;width:min(340px,calc(100vw - 28px));background:rgba(13,19,48,.9);border:1px solid var(--pc);border-radius:20px;padding:14px;backdrop-filter:blur(16px);z-index:25;transform:translateX(125%);opacity:0;transition:transform .55s cubic-bezier(.2,.9,.3,1.15),opacity .4s;box-shadow:0 18px 50px -12px rgba(0,0,0,.75),0 0 36px -12px var(--pc)}
.push.on{transform:none;opacity:1}
.ph{display:flex;align-items:center;gap:11px}
.ph span{font-size:30px}
.ph strong{flex:1;font-size:14px;line-height:1.3}
.pc{background:none;border:0;color:var(--mut);font-size:22px;cursor:pointer}
.pl{margin:12px 0 7px;font-size:13px;color:var(--mut)}
.pl b{color:var(--pc);font-size:15px}
.gz{height:8px;background:rgba(255,255,255,.1);border-radius:9px;overflow:hidden}
.gz i{display:block;height:100%;width:var(--w);background:linear-gradient(90deg,var(--pc),rgba(255,255,255,.55));border-radius:9px;transition:width 1s ease}
.pf{margin-top:9px;font-size:12px;color:var(--mut)}
@media(max-width:1000px){.stage{grid-template-columns:1fr 1fr}.center{grid-column:1/-1;order:-1;position:static}}
@media(max-width:640px){
  main{padding:18px 16px 120px}
  .stage{grid-template-columns:1fr}.badge img{height:72px}
  .nv .lb{display:none}.nv{padding:5px}.nv.on{padding:5px 14px 5px 5px}.nv.on .lb{display:inline}
}
@media(prefers-reduced-motion:reduce){.lx *{animation:none!important;transition:none!important}}
</style>
