<script setup>
// Relatório de CONSUMO por secretaria e ano.
//
// Correções em relação à versão antiga (pages/relatorios):
//  - Os alertas de consumo irregular eram contados como efeito colateral da
//    pintura das células (getBG), então só apareciam depois de abrir a Vista
//    Anual. Agora são calculados direto dos dados, assim que o relatório é gerado.
//  - "Gerar relatório" travava a tela: a página buscava TODOS os relatórios do
//    sistema e cada célula fazia várias buscas lineares na lista. Agora busca só
//    o ano escolhido e o anterior (para comparar janeiro com dezembro), mostra um
//    estado de carregamento e indexa tudo uma vez só.
//  - Clicar num mês do gráfico de alertas mostra quais UCs estão em alerta.
// A regra de comparação e as faixas de cor são as mesmas de antes.
import { ref, computed } from 'vue';
import { API_BASE_URL } from '~/base/link';
import { MESES, MESES_CURTO, ANOS_REL, DOZE, SECRETARIAS, secretariaTxt, nf, esperarPintura, exportarPDF, gerandoPDF } from '~/composables/useRelatorios';

const secretaria = ref('');
const ano = ref(new Date().getFullYear());
const carregando = ref(false);
const erro = ref('');
const dados = ref(null); // { sec, ano, unidades, rel, dezAnt }

const vista = ref('mensal');
const mes = ref(1);
const mesAlerta = ref(null);
const busca = ref('');
const resultado = ref(null);

const gerar = async () => {
  if (!secretaria.value || carregando.value) return;
  carregando.value = true;
  erro.value = '';
  mesAlerta.value = null;
  await esperarPintura();
  try {
    const a = Number(ano.value), s = secretaria.value;
    const [u, r, ra] = await Promise.all([
      $fetch(`${API_BASE_URL}/unidadecompensacao?categoria=${s}`),
      $fetch(`${API_BASE_URL}/relatoriocompensacao?ano=${a}`),
      $fetch(`${API_BASE_URL}/relatoriocompensacao?ano=${a - 1}`),
    ]);
    const unidades = (u ?? []).filter(x => x.status === 'L' || x.status === 'D');
    const rel = (r ?? []).filter(x => Number(x.ano) === a);
    const dezAnt = (ra ?? []).filter(x => Number(x.ano) === a - 1 && Number(x.mes) === 12);
    await esperarPintura();
    dados.value = { sec: s, ano: a, unidades, rel, dezAnt };
    // abre no último mês do ano que tem fatura
    const ids = new Set(unidades.map(x => x.id));
    const meses = rel.filter(x => ids.has(x.idUnidadeCompensa)).map(x => Number(x.mes));
    mes.value = meses.length ? Math.max(...meses) : 1;
  } catch (e) {
    console.error(e);
    erro.value = 'Não foi possível gerar o relatório. Verifique a conexão com o servidor e tente de novo.';
  }
  carregando.value = false;
};

// ─── Índices e cálculo de cada célula (unidade × mês) ───
const grade = computed(() => {
  const d = dados.value;
  if (!d) return null;
  const doAno = new Map(), dez = new Map();
  d.rel.forEach(r => { const k = `${r.idUnidadeCompensa}|${Number(r.mes)}`; if (!doAno.has(k)) doAno.set(k, r); });
  d.dezAnt.forEach(r => { if (!dez.has(r.idUnidadeCompensa)) dez.set(r.idUnidadeCompensa, r); });

  const linhas = d.unidades.map(un => {
    const meses = DOZE.map(m => {
      const rel = doAno.get(`${un.id}|${m}`);
      if (!rel) return null;
      const ant = m === 1 ? dez.get(un.id) : doAno.get(`${un.id}|${m - 1}`);
      const ca = rel.consumoReais, cm = ant?.consumoReais;
      let status = 'none', dif = null, nivel = 0;
      if (cm != null) {
        // mesma regra de antes: compara a parte inteira dos valores em R$
        status = parseInt(ca) > parseInt(cm) ? 'err' : parseInt(ca) < parseInt(cm) ? 'ok' : 'neu';
        dif = Math.abs(Number((Number(ca) - Number(cm)).toFixed(2)));
        if (status === 'err') {
          const f = Math.abs(Number(ca) - Number(cm));
          nivel = f >= 800 ? 4 : f >= 500 ? 3 : f >= 300 ? 2 : f > 150 ? 1 : 0;
        }
      }
      return { mes: m, kwh: rel.consumokWh, reais: rel.consumoReais, anterior: cm ?? null, status, dif, nivel };
    });
    return { un, meses };
  });

  const alertasMes = DOZE.map(m => ({
    mes: m,
    ucs: linhas.filter(l => l.meses[m - 1]?.nivel === 4).map(l => ({ un: l.un, c: l.meses[m - 1] })).sort((a, b) => b.c.dif - a.c.dif),
  }));
  const comDado = linhas.flatMap(l => l.meses.filter(Boolean));
  return {
    linhas,
    alertasMes,
    maxAlerta: Math.max(1, ...alertasMes.map(a => a.ucs.length)),
    kwh: comDado.reduce((s, c) => s + Number(c.kwh || 0), 0),
    reais: comDado.reduce((s, c) => s + Number(c.reais || 0), 0),
    alertas: alertasMes.reduce((s, a) => s + a.ucs.length, 0),
  };
});

const STATUS = {
  err: { txt: '↑ Maior', c: 'var(--red)' },
  ok: { txt: '↓ Menor', c: 'var(--green)' },
  neu: { txt: '→ Igual', c: 'var(--mut)' },
  none: { txt: 'Sem anterior', c: 'var(--mut)' },
};
const corAlerta = (n) => (n === 0 ? 'var(--green)' : n <= 2 ? 'var(--orange)' : 'var(--red)');

const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const linhasFiltradas = computed(() => {
  const q = normalizar(busca.value.trim());
  const l = grade.value?.linhas ?? [];
  return q ? l.filter(x => normalizar(x.un.nome).includes(q) || String(x.un.uc).includes(q)) : l;
});
const linhasMes = computed(() => linhasFiltradas.value.filter(l => l.meses[mes.value - 1]));

const navMes = (d) => { mes.value = ((mes.value - 1 + d + 12) % 12) + 1; };
const abrirAlerta = (m) => { mesAlerta.value = mesAlerta.value === m ? null : m; };
const verNaTabela = (m) => { mes.value = m; vista.value = 'mensal'; busca.value = ''; };

const exportar = () => exportarPDF(resultado.value, `consumo-${secretariaTxt(dados.value?.sec).toLowerCase()}-${dados.value?.ano}`);
</script>

<template>
  <div class="rc">
    <!-- Filtros -->
    <section class="lx-panel lx-mb">
      <div class="lx-filtros">
        <div class="lx-field">
          <label>Secretaria</label>
          <div class="lx-seg" role="radiogroup" aria-label="Secretaria">
            <button v-for="s in SECRETARIAS" :key="s.v" role="radio" :aria-checked="secretaria === s.v" :title="s.desc"
              :class="{ on: secretaria === s.v }" :style="{ '--c': s.c }" @click="secretaria = s.v">{{ s.txt }}</button>
          </div>
        </div>
        <div class="lx-field">
          <label>Ano</label>
          <div class="lx-anos" style="--c:var(--green)" role="group" aria-label="Ano">
            <button v-for="a in ANOS_REL" :key="a" class="lx-ano" :class="{ on: ano === a }" :aria-pressed="ano === a" @click="ano = a">{{ a }}</button>
          </div>
        </div>
        <button class="lx-btn" style="--c1:var(--green);--c2:var(--teal)" :disabled="!secretaria || carregando" @click="gerar">
          <span v-if="carregando" class="lx-spin" aria-hidden="true"></span>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          {{ carregando ? 'Gerando…' : 'Gerar relatório' }}
        </button>
      </div>
      <p v-if="!secretaria" class="rc-dica">Escolha a secretaria e o ano para gerar o relatório.</p>
    </section>

    <div v-if="erro" class="lx-alert err">{{ erro }}</div>

    <!-- Carregando -->
    <section v-if="carregando" class="lx-panel" style="--c:var(--green)" aria-busy="true">
      <div class="rc-skel-kpis"><div v-for="i in 4" :key="i" class="lx-skel"></div></div>
      <div class="lx-loading" role="status">
        <span class="lx-spin"></span>
        <b>Gerando relatório de consumo</b>
        <span>Buscando as faturas de {{ secretariaTxt(secretaria) }} em {{ ano }} e {{ ano - 1 }}…</span>
      </div>
    </section>

    <!-- Resultado -->
    <Transition name="lx-fade">
      <div v-if="grade && !carregando" ref="resultado">
        <div class="rc-hd">
          <div>
            <span class="lx-pill" style="--c:var(--green)"><i></i>{{ secretariaTxt(dados.sec) }}</span>
            <h2>Consumo · {{ dados.ano }}</h2>
          </div>
          <button class="lx-btn-ghost sm no-pdf" :disabled="gerandoPDF" @click="exportar">
            <span v-if="gerandoPDF" class="lx-spin"></span>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {{ gerandoPDF ? 'Gerando PDF…' : 'Exportar PDF' }}
          </button>
        </div>

        <section class="lx-kpis">
          <div class="lx-kpi" style="--c:var(--green)"><span class="ico">⚡</span><span>Consumo total</span><b>{{ nf(grade.kwh) }}</b><small>kWh no ano</small></div>
          <div class="lx-kpi" style="--c:var(--orange)"><span class="ico">$</span><span>Custo total</span><b>R$ {{ nf(grade.reais) }}</b><small>gasto no ano</small></div>
          <div class="lx-kpi" :style="{ '--c': grade.alertas ? 'var(--red)' : 'var(--green)' }"><span class="ico">!</span><span>Alertas</span><b>{{ grade.alertas }}</b><small>aumentos acima de R$ 800 no mês</small></div>
          <div class="lx-kpi" style="--c:var(--purple)"><span class="ico">▦</span><span>Unidades</span><b>{{ grade.linhas.length }}</b><small>ligadas ou desligadas</small></div>
        </section>

        <!-- Alertas por mês -->
        <section class="lx-panel lx-mb">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--red)">!</span>Alertas de consumo irregular por mês</h3>
              <p>Unidades cujo valor da conta subiu R$ 800 ou mais em relação ao mês anterior. Clique num mês para ver as UCs.</p>
            </div>
          </div>
          <div class="rc-alertas" role="group" aria-label="Alertas por mês">
            <button v-for="a in grade.alertasMes" :key="a.mes" class="rc-acol" :class="{ on: mesAlerta === a.mes, zero: !a.ucs.length }"
              :aria-pressed="mesAlerta === a.mes" :aria-label="`${MESES[a.mes - 1]}: ${a.ucs.length} alertas`" :disabled="!a.ucs.length"
              @click="abrirAlerta(a.mes)">
              <span class="rc-anum" :style="{ color: corAlerta(a.ucs.length) }">{{ a.ucs.length }}</span>
              <span class="rc-abar"><i :style="{ height: a.ucs.length ? Math.max(8, (a.ucs.length / grade.maxAlerta) * 100) + '%' : '3px', background: corAlerta(a.ucs.length) }"></i></span>
              <span class="rc-alab">{{ MESES_CURTO[a.mes - 1] }}</span>
            </button>
          </div>

          <Transition name="lx-fade">
            <div v-if="mesAlerta" class="rc-adet">
              <div class="rc-adet-hd">
                <strong>{{ MESES[mesAlerta - 1] }} de {{ dados.ano }} · {{ grade.alertasMes[mesAlerta - 1].ucs.length }} {{ grade.alertasMes[mesAlerta - 1].ucs.length === 1 ? 'UC em alerta' : 'UCs em alerta' }}</strong>
                <div class="rc-adet-acts no-pdf">
                  <button class="lx-btn-ghost sm" @click="verNaTabela(mesAlerta)">Ver o mês na tabela</button>
                  <button class="lx-dlg-x" aria-label="Fechar" @click="mesAlerta = null">×</button>
                </div>
              </div>
              <div class="lx-tbl-wrap">
                <table class="lx-tbl">
                  <thead><tr><th>UC</th><th>Unidade</th><th class="r">{{ mesAlerta === 1 ? `Dez/${dados.ano - 1}` : MESES_CURTO[mesAlerta - 2] }} (R$)</th><th class="r">{{ MESES_CURTO[mesAlerta - 1] }} (R$)</th><th class="r">Aumento (R$)</th><th class="r">Consumo (kWh)</th></tr></thead>
                  <tbody>
                    <tr v-for="x in grade.alertasMes[mesAlerta - 1].ucs" :key="x.un.id">
                      <td class="lx-mono">{{ x.un.uc }}</td>
                      <td class="rc-nome">{{ x.un.nome }}</td>
                      <td class="r">{{ nf(x.c.anterior, 2) }}</td>
                      <td class="r">{{ nf(x.c.reais, 2) }}</td>
                      <td class="r rc-up">+ {{ nf(x.c.dif, 2) }}</td>
                      <td class="r">{{ nf(x.c.kwh, 2) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Transition>
        </section>

        <!-- Dados por unidade -->
        <section class="lx-panel">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--green)">▦</span>Dados por unidade</h3>
              <p>Comparação com o mês anterior. Fundo da célula: aumento de R$ 150, 300, 500 e 800+.</p>
            </div>
            <div class="rc-tools no-pdf">
              <label class="lx-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input v-model="busca" class="lx-input" type="search" placeholder="Buscar UC ou nome" aria-label="Buscar unidade">
              </label>
              <div class="lx-seg" role="group" aria-label="Visualização">
                <button :class="{ on: vista === 'mensal' }" style="--c:var(--green)" @click="vista = 'mensal'">Vista mensal</button>
                <button :class="{ on: vista === 'anual' }" style="--c:var(--green)" @click="vista = 'anual'">Vista anual</button>
              </div>
            </div>
          </div>

          <!-- Vista mensal -->
          <template v-if="vista === 'mensal'">
            <div class="rc-mnav-row">
              <div class="lx-mnav">
                <button class="lx-icon-btn no-pdf" aria-label="Mês anterior" @click="navMes(-1)">‹</button>
                <span>{{ MESES[mes - 1].toUpperCase() }} {{ dados.ano }}</span>
                <button class="lx-icon-btn no-pdf" aria-label="Próximo mês" @click="navMes(1)">›</button>
              </div>
              <span class="rc-leg"><i class="n1"></i>150+<i class="n2"></i>300+<i class="n3"></i>500+<i class="n4"></i>800+</span>
            </div>
            <p v-if="!linhasMes.length" class="lx-empty">Nenhuma fatura em {{ MESES[mes - 1].toLowerCase() }} de {{ dados.ano }}.</p>
            <div v-else class="lx-tbl-wrap">
              <table class="lx-tbl">
                <thead><tr><th>UC</th><th>Nome</th><th class="r">kWh</th><th class="r">R$</th><th class="c">Status</th><th class="r">Dif. (R$)</th></tr></thead>
                <tbody>
                  <tr v-for="l in linhasMes" :key="l.un.id">
                    <td class="lx-mono">{{ l.un.uc }}</td>
                    <td class="rc-nome">{{ l.un.nome }}</td>
                    <td class="r b" :class="'n' + l.meses[mes - 1].nivel">{{ nf(l.meses[mes - 1].kwh, 2) }}</td>
                    <td class="r b" :class="'n' + l.meses[mes - 1].nivel">{{ nf(l.meses[mes - 1].reais, 2) }}</td>
                    <td class="c"><span class="lx-pill" :style="{ '--c': STATUS[l.meses[mes - 1].status].c }">{{ STATUS[l.meses[mes - 1].status].txt }}</span></td>
                    <td class="r b" :style="{ color: STATUS[l.meses[mes - 1].status].c }">{{ l.meses[mes - 1].dif == null ? '—' : nf(l.meses[mes - 1].dif, 2) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- Vista anual -->
          <div v-else class="lx-tbl-wrap rc-anual">
            <table class="lx-tbl">
              <thead>
                <tr>
                  <th class="rc-stk">UC</th><th class="rc-stk2">Nome</th>
                  <th v-for="m in DOZE" :key="m" class="c">{{ MESES_CURTO[m - 1] }}<small>kWh · R$</small></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in linhasFiltradas" :key="l.un.id">
                  <td class="lx-mono rc-stk">{{ l.un.uc }}</td>
                  <td class="rc-nome rc-stk2">{{ l.un.nome }}</td>
                  <td v-for="(c, i) in l.meses" :key="i" class="rc-cel" :class="c ? 'n' + c.nivel : ''">
                    <template v-if="c">
                      <b>{{ nf(c.kwh) }}</b>
                      <span>R$ {{ nf(c.reais, 2) }}</span>
                      <em :style="{ color: STATUS[c.status].c }">{{ c.status === 'none' ? '—' : STATUS[c.status].txt.slice(0, 1) + ' ' + nf(c.dif, 2) }}</em>
                    </template>
                    <span v-else class="rc-vazio">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.rc-dica { font-size: 12px; color: var(--mut); margin-top: 12px; }
.rc-skel-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.rc-skel-kpis .lx-skel { height: 86px; }
.rc-hd { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.rc-hd h2 { font-size: 20px; font-weight: 700; margin-top: 8px; }

/* gráfico de alertas */
.rc-alertas { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px; height: 170px; }
.rc-acol {
  all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 6px 2px; border-radius: 12px; border: 1px solid transparent; transition: background .2s, border-color .2s;
}
.rc-acol:hover { background: rgba(255, 255, 255, .05); }
.rc-acol.on { background: rgba(255, 107, 74, .1); border-color: rgba(255, 107, 74, .5); }
.rc-acol.zero { cursor: default; }
.rc-acol.zero:hover { background: none; }
.rc-acol:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.rc-anum { font-size: 13px; font-weight: 700; }
.rc-abar { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.rc-abar i { width: 60%; max-width: 40px; border-radius: 6px 6px 2px 2px; transition: height .4s ease; box-shadow: 0 0 16px -4px currentColor; }
.rc-alab { font-size: 11px; color: var(--mut); }
.rc-acol.on .rc-alab { color: var(--tx); font-weight: 700; }
.rc-adet { margin-top: 14px; border: 1px solid rgba(255, 107, 74, .35); border-radius: 16px; padding: 12px 14px; background: rgba(255, 107, 74, .05); }
.rc-adet-hd { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.rc-adet-hd strong { font-size: 13.5px; }
.rc-adet-acts { display: flex; align-items: center; gap: 6px; }
.rc-up { color: var(--red); font-weight: 700; }

/* tabela */
.rc-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rc-mnav-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.rc-leg { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--mut); }
.rc-leg i { width: 14px; height: 10px; border-radius: 3px; display: inline-block; margin-left: 6px; }
.rc-nome { font-weight: 600; min-width: 180px; }
.b { font-weight: 700; }
.n1 { background: rgba(255, 200, 60, .10); }
.n2 { background: rgba(255, 161, 46, .18); }
.n3 { background: rgba(255, 120, 60, .26); }
.n4 { background: rgba(255, 80, 60, .38); }
.rc-anual .lx-tbl th small { display: block; font-size: 9.5px; font-weight: 400; opacity: .8; }
.rc-anual .lx-tbl td { padding: 6px 8px; }
.rc-cel { min-width: 96px; text-align: right; border-left: 1px dashed var(--line2); }
.rc-cel b { display: block; font-size: 12px; }
.rc-cel span { display: block; font-size: 11px; color: var(--mut); }
.rc-cel em { display: block; font-style: normal; font-size: 10.5px; font-weight: 600; }
.rc-vazio { color: var(--mut); opacity: .5; text-align: center; }
.rc-stk { position: sticky; left: 0; z-index: 1; background: var(--bg2); }
.rc-stk2 { position: sticky; left: 92px; z-index: 1; background: var(--bg2); }
.lx-pdf .rc-stk, .lx-pdf .rc-stk2 { position: static; background: #fff; }
@media (max-width: 760px) {
  .rc-alertas { height: 140px; gap: 2px; }
  .rc-tools, .rc-tools .lx-search { width: 100%; }
  .rc-stk2 { position: static; }
}
</style>
