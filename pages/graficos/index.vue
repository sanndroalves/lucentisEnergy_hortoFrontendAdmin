<script setup>
// Análise de dados (antigo modal "Ver gráficos" da tela Início).
// Os dados chegam com useLazyFetch: a página aparece na hora e cada bloco
// mostra "Carregando…" até as listas chegarem.
import { ref, computed } from 'vue';
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import { useReferenciaAtual } from '~/composables/useReferenciaAtual';
import { usePaybackConclusivo } from '~/composables/usePaybackConclusivo';
import { useEnergyFormat } from '~/composables/useEnergyFormat';

useHead({ title: 'Gráficos' });
definePageMeta({ middleware: 'sidebase-auth' });

const { data: usinas, pending: p1 } = useLazyFetch(`${API_BASE_URL}/usina/`);
const { data: unidades, pending: p2 } = useLazyFetch(`${API_BASE_URL}/unidadecompensacao`);
const { data: relatorios, pending: p3 } = useLazyFetch(`${API_BASE_URL}/relatoriocompensacao/`);
const { data: geracoes, pending: p4 } = useLazyFetch(`${API_BASE_URL}/relatoriogeracao/`);
const { data: injecoes, pending: p5 } = useLazyFetch(`${API_BASE_URL}/relatoriousina/`);
const { data: projecoes, pending: p6 } = useLazyFetch(`${API_BASE_URL}/projecaogeracao`);
const carregando = computed(() => p1.value || p2.value || p3.value || p4.value || p5.value || p6.value);

const lUsinas     = computed(() => usinas.value ?? []);
const lUnidades   = computed(() => unidades.value ?? []);
const lRelatorios = computed(() => relatorios.value ?? []);
const lGeracoes   = computed(() => geracoes.value ?? []);
const lProjecoes  = computed(() => projecoes.value ?? []);

const { referencia } = useReferenciaAtual(geracoes);
const MR = computed(() => `${String(referencia.value.mes).padStart(2, '0')}/${referencia.value.ano}`);
const { economiaAteRef, paybackPct } = usePaybackConclusivo({ usinas, geracoes, injecoes, relatorios, referencia });

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
const alt = (v, max) => `${max > 0 ? Math.max(v > 0 ? 2 : 0, (v / max) * 100) : 0}%`;
const tipLado = (i) => (i < 2 ? 'l' : i > 9 ? 'r' : '');
const corEfic = (p) => (p == null ? 'var(--mut)' : p >= 90 ? 'var(--green)' : p >= 70 ? 'var(--orange)' : 'var(--red)');
const rotuloEfic = (p) => (p == null ? 'Sem projeção' : p >= 90 ? 'Excelente' : p >= 70 ? 'Bom' : 'Abaixo');

const somaMensal = (lista, ano, fn) => {
  const a = doze();
  lista.forEach(i => { if (i.ano == ano && i.mes >= 1 && i.mes <= 12) a[i.mes - 1] += fn(i); });
  return a;
};
const projMes = (ano) => somaMensal(lProjecoes.value, ano, i => parseInt(i.projecao) || 0);
const realMes = (ano) => somaMensal(lGeracoes.value, ano, i => parseInt(i.geracao) || 0);
const ecoMes  = (ano) => somaMensal(lRelatorios.value, ano, r => num(r.valorInjTUSD) + num(r.valorInjTE));

const ANOS = [2023, 2024, 2025, 2026, 2027, 2028];
const anoGraf = ref(new Date().getFullYear());

const nomeUsina = (id) => lUsinas.value.find(u => u.id == id)?.nome ?? `Usina #${id}`;
const grupoUnidade = computed(() => {
  const g = {};
  lUnidades.value.forEach(u => { g[u.id] = ['E', 'S', 'O'].includes(u.secretaria) ? 'p' : ['I', 'P'].includes(u.secretaria) ? 'ip' : 'o'; });
  return g;
});
const projPorUsinaMes = computed(() => {
  const m = {};
  lProjecoes.value.forEach(p => { const k = `${p.idGeradora}-${p.ano}-${p.mes}`; m[k] = (m[k] || 0) + (parseInt(p.projecao) || 0); });
  return m;
});

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
</script>

<template>
  <div class="lx-page gf">
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span><span>Fotovoltaico</span><span class="sep">›</span><b>Gráficos</b>
        </nav>
        <h1 class="lx-title">Análise de <span class="grad">dados</span></h1>
        <p class="lx-sub">Geração, economia e energia compensada em {{ anoGraf }}. Passe o mouse sobre as barras para ver os valores de cada mês.</p>
      </div>
      <div class="lx-head-actions">
        <div class="lx-anos" role="group" aria-label="Ano da análise" style="--c:var(--purple)">
          <button v-for="a in ANOS" :key="a" class="lx-ano" :class="{ on: anoGraf === a }" :aria-pressed="anoGraf === a" @click="anoGraf = a">{{ a }}</button>
        </div>
      </div>
    </header>

    <div v-if="carregando" class="gf-load" role="status">
      <span class="gf-spin" aria-hidden="true"></span>Carregando dados do sistema…
    </div>

    <template v-else>
      <!-- Indicadores do ano -->
      <section class="lx-kpis">
        <div class="lx-kpi" style="--c:var(--teal)"><span>Geração real</span><b>{{ mwh(analise.realTot) }}</b><small>{{ analise.nMeses }} {{ analise.nMeses === 1 ? 'mês' : 'meses' }} com dado</small></div>
        <div class="lx-kpi" style="--c:var(--orange)"><span>Projeção (meses com dado)</span><b>{{ mwh(analise.projComDado) }}</b><small>ano inteiro: {{ mwh(analise.projTot) }}</small></div>
        <div class="lx-kpi" :style="{ '--c': corEfic(analise.efic) }"><span>Eficiência acumulada</span><b>{{ pctTxt(analise.efic) }}</b><small>{{ analise.abaixo }} de {{ analise.nEfic }} meses abaixo da projeção</small></div>
        <div class="lx-kpi" style="--c:var(--green)"><span>Economia compensada</span><b>{{ brlCurto(analise.ecoTot) }}</b><small>média {{ brlCurto(analise.ecoMedia) }}/mês</small></div>
        <div class="lx-kpi" style="--c:var(--purple)"><span>Energia compensada</span><b>{{ mwh(analise.compTot) }}</b><small>TUSD + TE</small></div>
        <div class="lx-kpi" style="--c:var(--red)"><span>Payback acumulado</span><b>{{ pctTxt(paybackPct, 2) }}</b><small>até {{ MR }} · {{ brlCurto(economiaAteRef) }}</small></div>
      </section>

      <div class="charts">
        <!-- 1. Geração projetada × real -->
        <section class="lx-panel wide">
          <div class="chh">
            <h3>Geração projetada × real, por mês (MWh)</h3>
            <div class="lx-leg"><span><i class="lp"></i>Projetada</span><span><i style="background:var(--teal)"></i>Real</span></div>
          </div>
          <div class="lx-bc">
            <div v-for="x in analise.meses" :key="x.i" class="lx-bcol" tabindex="0">
              <span class="lx-bv">{{ x.real ? mwhNum(x.real) : '' }}</span>
              <div class="lx-bbars">
                <i class="lx-b-proj" :style="{ height: alt(x.proj, analise.maxGer) }"></i>
                <i class="lx-b-real" :style="{ height: alt(x.real, analise.maxGer), background: x.efic != null ? corEfic(x.efic) : 'var(--teal)' }"></i>
              </div>
              <span class="lx-bl">{{ x.m }}</span>
              <div class="lx-btip" :class="tipLado(x.i)">
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
          <div class="lx-tbl-wrap">
            <table class="lx-tbl gf-tbl">
              <thead><tr><th>Mês</th><th class="r">Projetada</th><th class="r">Real</th><th class="r">Desvio</th><th class="r">Eficiência</th><th class="r">Economia</th><th class="r">Compensado</th></tr></thead>
              <tbody>
                <tr v-for="x in analise.meses" :key="x.i" :class="{ vazio: !x.real && !x.eco }">
                  <td>{{ MESES_CURTO[x.i] }}</td>
                  <td class="r">{{ mwh(x.proj) }}</td>
                  <td class="r">{{ mwh(x.real) }}</td>
                  <td class="r" :style="{ color: x.delta == null ? 'var(--mut)' : x.delta >= 0 ? 'var(--green)' : 'var(--red)' }">{{ x.delta == null ? '—' : (x.delta >= 0 ? '+' : '') + numero(x.delta, 1) + '%' }}</td>
                  <td class="r"><span class="tag" :style="{ color: corEfic(x.efic) }">{{ pctTxt(x.efic) }}</span></td>
                  <td class="r">{{ brlCurto(x.eco) }}</td>
                  <td class="r">{{ mwh(x.comp) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr><td>Total</td><td class="r">{{ mwh(analise.projTot) }}</td><td class="r">{{ mwh(analise.realTot) }}</td><td></td><td class="r"><span class="tag" :style="{ color: corEfic(analise.efic) }">{{ pctTxt(analise.efic) }}</span></td><td class="r">{{ brlCurto(analise.ecoTot) }}</td><td class="r">{{ mwh(analise.compTot) }}</td></tr>
              </tfoot>
            </table>
          </div>
        </section>

        <!-- 2. Economia compensada -->
        <section class="lx-panel">
          <div class="chh"><h3>Economia compensada por mês (R$)</h3></div>
          <div class="lx-bc">
            <div v-for="x in analise.meses" :key="x.i" class="lx-bcol" tabindex="0">
              <span class="lx-bv">{{ x.eco ? brlK(x.eco) : '' }}</span>
              <div class="lx-bbars"><i class="lx-b-one" style="--c:var(--green)" :style="{ height: alt(x.eco, analise.maxEco) }"></i></div>
              <span class="lx-bl">{{ x.m[0] }}</span>
              <div class="lx-btip" :class="tipLado(x.i)">
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
        </section>

        <!-- 3. Energia compensada por destino -->
        <section class="lx-panel">
          <div class="chh">
            <h3>Energia compensada por mês (MWh)</h3>
            <div class="lx-leg"><span><i style="background:var(--green)"></i>Prédios</span><span><i style="background:var(--purple)"></i>IP</span><span v-if="analise.coTot"><i style="background:var(--mut)"></i>Outras</span></div>
          </div>
          <div class="lx-bc">
            <div v-for="x in analise.meses" :key="x.i" class="lx-bcol" tabindex="0">
              <span class="lx-bv">{{ x.comp ? mwhNum(x.comp) : '' }}</span>
              <div class="lx-bbars">
                <div class="stack" :style="{ height: alt(x.comp, analise.maxComp) }">
                  <i :style="{ flex: x.cp, background: 'var(--green)' }"></i>
                  <i :style="{ flex: x.ci, background: 'var(--purple)' }"></i>
                  <i :style="{ flex: x.co, background: 'var(--mut)' }"></i>
                </div>
              </div>
              <span class="lx-bl">{{ x.m[0] }}</span>
              <div class="lx-btip" :class="tipLado(x.i)">
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
        </section>

        <!-- 4. Desempenho por usina -->
        <section class="lx-panel wide">
          <div class="chh">
            <h3>Desempenho por usina em {{ anoGraf }}</h3>
            <span class="psub">Eficiência = real ÷ projeção, só nos meses com geração registrada</span>
          </div>
          <div v-if="analise.usinasRank.length" class="ur">
            <div class="urh"><span>#</span><span>Usina</span><span>Geração real</span><span>Participação</span><span>Eficiência</span><span>Meses abaixo</span></div>
            <div v-for="(u, k) in analise.usinasRank" :key="u.id" class="urr">
              <span class="urk">{{ k + 1 }}</span>
              <NuxtLink :to="`/usinas/${u.id}`" class="urn" :title="u.nome">{{ u.nome }}</NuxtLink>
              <span class="urb"><i :style="{ width: alt(u.real, analise.maxUsina), background: corEfic(u.efic) }"></i><b>{{ mwh(u.real) }}</b></span>
              <span>{{ pctTxt(u.part) }}</span>
              <span><span class="tag" :style="{ color: corEfic(u.efic) }">{{ pctTxt(u.efic) }} · {{ rotuloEfic(u.efic) }}</span></span>
              <span :style="{ color: u.abaixo >= 3 ? 'var(--red)' : 'var(--mut)' }">{{ u.abaixo }} de {{ u.meses }}</span>
            </div>
          </div>
          <p v-else class="lx-empty">Sem geração registrada em {{ anoGraf }}.</p>
        </section>

        <!-- 5. Geração por ano -->
        <section class="lx-panel wide">
          <div class="chh"><h3>Geração total por ano (MWh) e variação anual</h3></div>
          <div class="lx-bc anual">
            <div v-for="p in porAno" :key="p.ano" class="lx-bcol" tabindex="0" :class="{ cur: p.ano == anoGraf }">
              <span class="lx-bv">{{ mwhNum(p.v) }}</span>
              <div class="lx-bbars"><i class="lx-b-one" style="--c:var(--green)" :style="{ height: p.h }"></i></div>
              <span class="lx-bl">{{ p.ano }}</span>
              <span class="yoy" :style="{ color: p.yoy == null ? 'var(--mut)' : p.yoy >= 0 ? 'var(--green)' : 'var(--red)' }">{{ p.yoy == null ? '—' : (p.yoy >= 0 ? '▲ ' : '▼ ') + numero(Math.abs(p.yoy), 1) + '%' }}</span>
            </div>
          </div>
          <p class="insight">O ano em andamento é parcial: a variação compara com o ano anterior completo.</p>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.gf-load { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 60px 16px; color: var(--mut); font-size: 13px; }
.gf-spin { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--teal); animation: gfSpin .8s linear infinite; }
@keyframes gfSpin { to { transform: rotate(1turn); } }
.lx-kpis { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
.lx-kpi b { font-size: 20px; }
.charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 16px; }
.wide { grid-column: 1 / -1; }
.chh { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.chh h3 { font-size: 14px; font-weight: 600; }
.psub { font-size: 12px; color: var(--mut); }
.lx-leg i.lp { border: 1px dashed var(--orange); }
.lx-bc { height: 220px; }
.lx-bc.anual { height: 200px; max-width: 720px; }
.lx-bcol.cur { background: rgba(255, 255, 255, .05); }
.stack { display: flex; flex-direction: column-reverse; gap: 1px; width: 64%; max-width: 56px; }
.stack i { width: 100%; min-height: 0; border-radius: 2px; }
.stack i:last-child { border-radius: 4px 4px 2px 2px; }
.yoy { font-size: 10.5px; font-weight: 600; margin-top: 2px; }
.insight { font-size: 12px; color: var(--mut); margin-top: 10px; line-height: 1.6; }
.insight b { color: var(--tx); }
.foot { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 12px; }
.foot div { display: flex; flex-direction: column; gap: 2px; background: rgba(255, 255, 255, .035); border-radius: 10px; padding: 8px 10px; }
.foot span { font-size: 11px; color: var(--mut); }
.foot b { font-size: 13px; }
.gf-tbl { margin-top: 12px; white-space: nowrap; }
.gf-tbl tr.vazio td { color: rgba(154, 167, 204, .5); }
.tag { font-size: 11.5px; padding: 2px 9px; border-radius: 99px; background: rgba(255, 255, 255, .08); white-space: nowrap; }
.ur { display: grid; font-size: 12px; overflow-x: auto; }
.urh, .urr { display: grid; grid-template-columns: 28px minmax(140px, 1.4fr) minmax(160px, 2fr) 90px 150px 90px; gap: 10px; align-items: center; padding: 7px 4px; min-width: 700px; }
.urh { color: var(--mut); font-size: 11px; border-bottom: 1px solid var(--line); }
.urr { border-bottom: 1px dashed rgba(255, 255, 255, .07); }
.urr:hover { background: rgba(255, 255, 255, .04); }
.urk { color: var(--mut); }
.urn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: var(--tx); text-decoration: none; }
.urn:hover { color: var(--teal); }
.urb { display: flex; align-items: center; gap: 8px; }
.urb i { height: 10px; border-radius: 5px; flex: none; min-width: 2px; }
.urb b { white-space: nowrap; font-weight: 600; }
@media (max-width: 640px) { .lx-bc { gap: 2px; } .lx-bv { font-size: 9px; } }
</style>
