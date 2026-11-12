<script setup>
// Relatório GERAL (todas as usinas) por ano. Mesma lógica da versão antiga:
// projeção, geração real, injetado (relatoriousina), saldo e compensado
// (enerInjTUSD) por mês; status = compensado do mês × injetado do mês anterior.
// Os dados carregam em segundo plano (useLazyFetch) e o relatório aparece
// assim que chegam; trocar o ano é instantâneo.
import { ref, computed } from 'vue';
import { API_BASE_URL } from '~/base/link';
import { MESES, MESES_CURTO, ANOS_REL, DOZE, nf, exportarPDF, gerandoPDF } from '~/composables/useRelatorios';

const { data: projecao, pending: p1 } = useLazyFetch(`${API_BASE_URL}/projecaogeracao`);
const { data: realData, pending: p2 } = useLazyFetch(`${API_BASE_URL}/relatoriogeracao`);
const { data: injetadoD, pending: p3 } = useLazyFetch(`${API_BASE_URL}/relatoriousina`);
const { data: compensadoD, pending: p4 } = useLazyFetch(`${API_BASE_URL}/relatoriocompensacao`);
const carregando = computed(() => p1.value || p2.value || p3.value || p4.value);

const ano = ref(new Date().getFullYear());
const vista = ref('mensal');
const mes = ref(new Date().getMonth() + 1);
const resultado = ref(null);

const somarPorMes = (lista, a, fn) => {
  const r = {};
  (lista ?? []).forEach(i => { if (Number(i.ano) === a) r[i.mes] = parseFloat(((r[i.mes] || 0) + fn(i)).toFixed(2)); });
  return r;
};
const injetado = (i) => Number(i.injetadoPonta || 0) + Number(i.injetadoFPonta || 0);

const g = computed(() => {
  const a = Number(ano.value);
  const projecaoM = somarPorMes(projecao.value, a, i => Number(i.projecao || 0));
  const real = somarPorMes(realData.value, a, i => Number(i.geracao || 0));
  const inj = somarPorMes(injetadoD.value, a, injetado);
  const injAnt = somarPorMes(injetadoD.value, a - 1, injetado);
  const comp = somarPorMes(compensadoD.value, a, i => Number(i.enerInjTUSD || 0));
  const saldo = somarPorMes(compensadoD.value, a, i => Number(i.saldoEnergia || 0));
  const soma = (o) => Object.values(o).reduce((s, v) => s + v, 0);
  const meses = DOZE.map(m => {
    const c = comp[m] ?? 0;
    const iAnt = m === 1 ? (injAnt[12] ?? 0) : (inj[m - 1] ?? 0);
    return {
      m,
      proj: projecaoM[m], real: real[m], inj: inj[m], saldo: saldo[m], comp: comp[m],
      status: c > iAnt ? 'ok' : c < iAnt ? 'err' : 'neu',
      credito: Math.abs(parseInt(c - iAnt)),
      efic: projecaoM[m] > 0 && real[m] > 0 ? (real[m] / projecaoM[m]) * 100 : null,
    };
  });
  return {
    meses,
    totProj: soma(projecaoM), totReal: soma(real), totInj: soma(inj), totComp: soma(comp),
    max: Math.max(1, ...meses.flatMap(x => [x.proj ?? 0, x.real ?? 0])),
    temDado: Object.keys(projecaoM).length > 0 || Object.keys(real).length > 0,
  };
});
const mm = computed(() => g.value.meses[mes.value - 1]);

const STATUS = {
  ok: { txt: '↑ Maior', c: 'var(--green)' },
  err: { txt: '↓ Menor', c: 'var(--red)' },
  neu: { txt: '→ Igual', c: 'var(--mut)' },
};
const corEfic = (p) => (p == null ? 'var(--teal)' : p >= 90 ? 'var(--green)' : p >= 70 ? 'var(--orange)' : 'var(--red)');
const alt = (v) => `${v ? Math.max(2, (v / g.value.max) * 100) : 0}%`;
const tipLado = (i) => (i < 2 ? 'l' : i > 9 ? 'r' : '');
const num = (v, casas = 0) => (v == null ? '—' : nf(v, casas));
const navMes = (d) => { mes.value = ((mes.value - 1 + d + 12) % 12) + 1; };
const dataAtual = new Date().toLocaleDateString('pt-BR');

const exportar = () => exportarPDF(resultado.value, `geral-${vista.value}-${ano.value}`);
</script>

<template>
  <div>
    <section class="lx-panel lx-mb">
      <div class="lx-filtros">
        <div class="lx-field">
          <label>Ano</label>
          <div class="lx-anos" style="--c:var(--purple)" role="group" aria-label="Ano">
            <button v-for="a in ANOS_REL" :key="a" class="lx-ano" :class="{ on: ano === a }" :aria-pressed="ano === a" @click="ano = a">{{ a }}</button>
          </div>
        </div>
        <div class="lx-field">
          <label>Visualização</label>
          <div class="lx-seg" role="group" aria-label="Visualização">
            <button :class="{ on: vista === 'mensal' }" style="--c:var(--purple)" @click="vista = 'mensal'">Vista mensal</button>
            <button :class="{ on: vista === 'anual' }" style="--c:var(--purple)" @click="vista = 'anual'">Vista anual</button>
          </div>
        </div>
        <button class="lx-btn-ghost" :disabled="carregando || gerandoPDF" @click="exportar">
          <span v-if="gerandoPDF" class="lx-spin"></span>
          <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {{ gerandoPDF ? 'Gerando PDF…' : 'Exportar PDF (' + vista + ')' }}
        </button>
      </div>
    </section>

    <section v-if="carregando" class="lx-panel" style="--c:var(--purple)" aria-busy="true">
      <div class="lx-loading" role="status"><span class="lx-spin"></span><b>Carregando dados de todas as usinas</b><span>Projeção, geração, injeção e compensação…</span></div>
    </section>

    <Transition name="lx-fade">
      <div v-if="!carregando" ref="resultado">
        <div class="rg-hd">
          <div>
            <span class="lx-pill" style="--c:var(--purple)"><i></i>Todas as usinas</span>
            <h2>Geral · {{ ano }}</h2>
          </div>
          <span class="rg-data">Gerado em {{ dataAtual }}</span>
        </div>

        <p v-if="!g.temDado" class="lx-panel lx-empty">Sem projeção ou geração registrada em {{ ano }}.</p>

        <template v-else>
          <section class="lx-kpis">
            <div class="lx-kpi" style="--c:var(--orange)"><span class="ico">◎</span><span>Projetado</span><b>{{ nf(g.totProj) }}</b><small>kWh no ano</small></div>
            <div class="lx-kpi" style="--c:var(--teal)"><span class="ico">☀</span><span>Real</span><b>{{ nf(g.totReal) }}</b><small>kWh no ano</small></div>
            <div class="lx-kpi" style="--c:var(--purple)"><span class="ico">⇢</span><span>Injetado</span><b>{{ nf(g.totInj) }}</b><small>kWh no ano</small></div>
            <div class="lx-kpi" style="--c:var(--green)"><span class="ico">▦</span><span>Compensado</span><b>{{ nf(g.totComp) }}</b><small>kWh no ano (TUSD)</small></div>
          </section>

          <!-- Vista mensal -->
          <section v-if="vista === 'mensal'" class="lx-panel">
            <div class="lx-panel-hd">
              <h3><span class="lx-ic" style="--c:var(--purple)">◷</span>Resumo do mês</h3>
              <div class="lx-mnav">
                <button class="lx-icon-btn no-pdf" style="--c:var(--purple)" aria-label="Mês anterior" @click="navMes(-1)">‹</button>
                <span>{{ MESES[mes - 1].toUpperCase() }} {{ ano }}</span>
                <button class="lx-icon-btn no-pdf" style="--c:var(--purple)" aria-label="Próximo mês" @click="navMes(1)">›</button>
              </div>
            </div>
            <div class="rg-cards">
              <div class="rg-c" style="--c:var(--orange)"><span>Projetada</span><b>{{ num(mm.proj, 2) }}</b><small>kWh</small></div>
              <div class="rg-c" style="--c:var(--teal)"><span>Real</span><b>{{ num(mm.real, 2) }}</b><small>kWh</small></div>
              <div class="rg-c" style="--c:var(--purple)"><span>Injetado</span><b>{{ num(mm.inj, 2) }}</b><small>kWh</small></div>
              <div class="rg-c" style="--c:var(--mut)"><span>Saldo</span><b>{{ num(mm.saldo, 2) }}</b><small>kWh</small></div>
              <div class="rg-c" style="--c:var(--green)"><span>Compensado</span><b>{{ num(mm.comp, 2) }}</b><small>kWh</small></div>
              <div class="rg-c" :style="{ '--c': STATUS[mm.status].c }"><span>Status</span><b><span class="lx-pill" :style="{ '--c': STATUS[mm.status].c }">{{ STATUS[mm.status].txt }}</span></b><small>compensado × injetado do mês anterior</small></div>
              <div class="rg-c" style="--c:var(--mut)"><span>Crédito comp./inj.</span><b>{{ nf(mm.credito) }}</b><small>kWh</small></div>
            </div>
          </section>

          <!-- Vista anual -->
          <template v-else>
            <section class="lx-panel lx-mb">
              <div class="lx-panel-hd">
                <h3><span class="lx-ic" style="--c:var(--teal)">⚡</span>Projetada × real por mês (kWh)</h3>
                <div class="lx-leg"><span><i class="lp"></i>Projetada</span><span><i style="background:var(--teal)"></i>Real</span></div>
              </div>
              <div class="lx-bc">
                <div v-for="(x, i) in g.meses" :key="x.m" class="lx-bcol" tabindex="0">
                  <span class="lx-bv">{{ x.real ? nf(x.real / 1000, 0) + 'k' : '' }}</span>
                  <div class="lx-bbars">
                    <i class="lx-b-proj" :style="{ height: alt(x.proj) }"></i>
                    <i class="lx-b-real" :style="{ height: alt(x.real), background: corEfic(x.efic) }"></i>
                  </div>
                  <span class="lx-bl">{{ MESES_CURTO[i] }}</span>
                  <div class="lx-btip" :class="tipLado(i)">
                    <strong>{{ MESES[i] }}/{{ ano }}</strong>
                    <div><span>Projetada</span><b>{{ num(x.proj, 2) }} kWh</b></div>
                    <div><span>Real</span><b>{{ num(x.real, 2) }} kWh</b></div>
                    <div><span>Eficiência</span><b :style="{ color: corEfic(x.efic) }">{{ x.efic == null ? '—' : nf(x.efic, 1) + '%' }}</b></div>
                  </div>
                </div>
              </div>
            </section>
            <section class="lx-panel">
              <div class="lx-panel-hd"><h3><span class="lx-ic" style="--c:var(--purple)">▦</span>Indicadores por mês (kWh)</h3></div>
              <div class="lx-tbl-wrap">
                <table class="lx-tbl rg-tbl">
                  <thead><tr><th>Indicador</th><th v-for="m in DOZE" :key="m" class="r">{{ MESES_CURTO[m - 1] }}</th></tr></thead>
                  <tbody>
                    <tr><td style="color:var(--orange)">Projetada</td><td v-for="x in g.meses" :key="x.m" class="r">{{ x.proj == null ? '—' : nf(x.proj) }}</td></tr>
                    <tr><td style="color:var(--teal)">Real</td><td v-for="x in g.meses" :key="x.m" class="r">{{ x.real == null ? '—' : nf(x.real) }}</td></tr>
                    <tr><td style="color:var(--purple)">Injetado</td><td v-for="x in g.meses" :key="x.m" class="r">{{ x.inj == null ? '—' : nf(x.inj) }}</td></tr>
                    <tr><td>Saldo energia</td><td v-for="x in g.meses" :key="x.m" class="r">{{ x.saldo == null ? '—' : nf(x.saldo) }}</td></tr>
                    <tr><td style="color:var(--green)">Compensado</td><td v-for="x in g.meses" :key="x.m" class="r">{{ x.comp == null ? '—' : nf(x.comp) }}</td></tr>
                    <tr><td>Status</td><td v-for="x in g.meses" :key="x.m" class="r" :style="{ color: STATUS[x.status].c }">{{ STATUS[x.status].txt.slice(0, 1) }}</td></tr>
                    <tr><td>Crédito comp./inj.</td><td v-for="x in g.meses" :key="x.m" class="r">{{ nf(x.credito) }}</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.rg-hd { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.rg-hd h2 { font-size: 20px; font-weight: 700; margin-top: 8px; }
.rg-data { font-size: 11.5px; color: var(--mut); }
.rg-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.rg-c { background: var(--card2); border: 1px solid var(--line); border-left: 3px solid var(--c); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 3px; }
.rg-c > span { font-size: 11.5px; color: var(--mut); }
.rg-c > b { font-size: 20px; font-weight: 700; }
.rg-c > small { font-size: 10.5px; color: var(--mut); }
.lx-leg i.lp { border: 1px dashed var(--orange); }
.rg-tbl { white-space: nowrap; }
.rg-tbl td:first-child { font-weight: 600; }
</style>
