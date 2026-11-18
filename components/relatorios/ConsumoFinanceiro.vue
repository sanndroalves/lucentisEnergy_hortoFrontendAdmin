<script setup>
// Relatório FINANCEIRO (R$) das contas — parte "Dados R$" da aba Consumo.
//
// Para o ano escolhido e o ano anterior (ex.: 2026 × 2025), mês a mês:
//   - valor das contas (consumoReais), consumo (consumokWh)
//   - energia compensada em kWh (enerInjTE; se vazio, enerInjTUSD — TE e TUSD
//     são a MESMA energia cobrada em duas parcelas, então não se somam em kWh)
//   - energia compensada em R$ (|valorInjTE| + |valorInjTUSD|)
// e indicadores para julgar se a compensação está acontecendo de verdade:
//   - % do consumo compensado, economia (compensado ÷ conta sem a compensação),
//     tarifa paga por kWh, valor do crédito por kWh, meses sem compensação.
//
// Comparação justa: as variações (Δ%) usam só os pares UC×mês que têm fatura
// nos DOIS anos. Assim uma UC nova, ou um mês de 2026 que ainda não fechou,
// não fazem a conta "subir" ou "cair" artificialmente. Os totais brutos
// continuam visíveis, com a quantidade de faturas de cada ano.
import { ref, computed } from 'vue';
import { API_BASE_URL } from '~/base/link';
import { MESES, MESES_CURTO, ANOS_REL, DOZE, SECRETARIAS, secretariaTxt, nf, esperarPintura, exportarPDF, gerandoPDF } from '~/composables/useRelatorios';

const OPCOES_SEC = [{ v: 'T', txt: 'Todas', desc: 'Todas as secretarias', c: 'var(--tx)' }, ...SECRETARIAS];
const nomeSec = (v) => (v === 'T' ? 'Todas as secretarias' : secretariaTxt(v));
const TOLERANCIA = 10; // ± % para considerar "na média"

const secretaria = ref('');
const ano = ref(new Date().getFullYear());
const carregando = ref(false);
const erro = ref('');
const dados = ref(null); // { sec, ano, unidades, relA, relB }
const resultado = ref(null);

const metrica = ref('conta');
const busca = ref('');
const filtroUc = ref('todas');
const ordem = ref('delta');

// aceita número, "1234.56" ou "1.234,56"
const num = (v) => {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const gerar = async () => {
  if (!secretaria.value || carregando.value) return;
  carregando.value = true;
  erro.value = '';
  await esperarPintura();
  try {
    const a = Number(ano.value), s = secretaria.value;
    const cats = s === 'T' ? SECRETARIAS.map(x => x.v) : [s];
    const [listas, rA, rB] = await Promise.all([
      Promise.all(cats.map(c => $fetch(`${API_BASE_URL}/unidadecompensacao?categoria=${c}`))),
      $fetch(`${API_BASE_URL}/relatoriocompensacao?ano=${a}`),
      $fetch(`${API_BASE_URL}/relatoriocompensacao?ano=${a - 1}`),
    ]);
    const vistos = new Set();
    const unidades = listas.flat().filter(x => x && (x.status === 'L' || x.status === 'D') && !vistos.has(x.id) && vistos.add(x.id));
    await esperarPintura();
    dados.value = {
      sec: s, ano: a, unidades,
      relA: (rA ?? []).filter(x => Number(x.ano) === a),
      relB: (rB ?? []).filter(x => Number(x.ano) === a - 1),
    };
  } catch (e) {
    console.error(e);
    erro.value = 'Não foi possível gerar o relatório. Verifique a conexão com o servidor e tente de novo.';
  }
  carregando.value = false;
};

// ─── Cálculos ───
const vazio = () => ({ conta: 0, kwh: 0, compR: 0, compK: 0, n: 0, semComp: 0 });
const somar = (t, f) => { t.conta += f.conta; t.kwh += f.kwh; t.compR += f.compR; t.compK += f.compK; t.n++; if (f.semComp) t.semComp++; return t; };
const fatura = (r) => {
  const compR = Math.abs(num(r.valorInjTE)) + Math.abs(num(r.valorInjTUSD));
  const compK = Math.abs(num(r.enerInjTE)) || Math.abs(num(r.enerInjTUSD));
  const kwh = num(r.consumokWh);
  return { conta: num(r.consumoReais), kwh, compR, compK, semComp: kwh > 0 && compR === 0 && compK === 0 };
};
const pct = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : null);
const div = (a, b) => (b ? a / b : null);
// indicadores derivados de um total
const ind = (t) => ({
  ...t,
  pctComp: div(t.compK, t.kwh) == null ? null : div(t.compK, t.kwh) * 100, // % do consumo compensado
  economia: div(t.compR, t.conta + t.compR) == null ? null : div(t.compR, t.conta + t.compR) * 100, // quanto a conta seria maior sem GD
  semGD: t.conta + t.compR, // custo estimado sem a compensação
  tarifa: div(t.conta, t.kwh), // R$ pago por kWh consumido
  credito: div(t.compR, t.compK), // R$ abatido por kWh compensado
});
const situacao = (d) => (d == null ? 'none' : d > TOLERANCIA ? 'up' : d < -TOLERANCIA ? 'down' : 'avg');

const rel = computed(() => {
  const d = dados.value;
  if (!d) return null;
  const ids = new Set(d.unidades.map(u => u.id));
  const indexa = (lista) => {
    const m = new Map();
    lista.forEach(r => { if (!ids.has(r.idUnidadeCompensa)) return; const k = `${r.idUnidadeCompensa}|${Number(r.mes)}`; if (!m.has(k)) m.set(k, fatura(r)); });
    return m;
  };
  const A = indexa(d.relA), B = indexa(d.relB);

  // por mês
  const meses = DOZE.map(m => {
    const a = vazio(), b = vazio(), pa = vazio(), pb = vazio();
    d.unidades.forEach(u => {
      const fa = A.get(`${u.id}|${m}`), fb = B.get(`${u.id}|${m}`);
      if (fa) somar(a, fa);
      if (fb) somar(b, fb);
      if (fa && fb) { somar(pa, fa); somar(pb, fb); }
    });
    return { mes: m, a: ind(a), b: ind(b), pa: ind(pa), pb: ind(pb) };
  });

  // por unidade
  const unidades = d.unidades.map(u => {
    const a = vazio(), b = vazio(), pa = vazio(), pb = vazio();
    const semCompMeses = [];
    DOZE.forEach(m => {
      const fa = A.get(`${u.id}|${m}`), fb = B.get(`${u.id}|${m}`);
      if (fa) { somar(a, fa); if (fa.semComp) semCompMeses.push(m); }
      if (fb) somar(b, fb);
      if (fa && fb) { somar(pa, fa); somar(pb, fb); }
    });
    if (!a.n && !b.n) return null;
    const dConta = pct(pa.conta, pb.conta), dComp = pct(pa.compR, pb.compR), dKwh = pct(pa.kwh, pb.kwh);
    const ia = ind(a);
    const alertas = [];
    if (a.n && a.compR === 0 && a.compK === 0) alertas.push('Nenhuma compensação no ano');
    else if (semCompMeses.length) alertas.push(`Sem compensação em ${semCompMeses.map(m => MESES_CURTO[m - 1]).join(', ')}`);
    if (dConta != null && dConta > TOLERANCIA && dComp != null && dComp < -TOLERANCIA) alertas.push('Conta subiu e compensação caiu');
    if (dConta != null && dKwh != null && dConta > TOLERANCIA && dKwh <= TOLERANCIA) alertas.push('Conta subiu sem aumento de consumo');
    if (!b.n) alertas.push(`Sem faturas em ${d.ano - 1}`);
    return { u, a: ia, b: ind(b), pa: ind(pa), pb: ind(pb), dConta, dComp, dKwh, sit: situacao(dKwh), semCompMeses, alertas };
  }).filter(Boolean);

  // totais
  const totA = ind(meses.reduce((t, m) => ({ conta: t.conta + m.a.conta, kwh: t.kwh + m.a.kwh, compR: t.compR + m.a.compR, compK: t.compK + m.a.compK, n: t.n + m.a.n, semComp: t.semComp + m.a.semComp }), vazio()));
  const totB = ind(meses.reduce((t, m) => ({ conta: t.conta + m.b.conta, kwh: t.kwh + m.b.kwh, compR: t.compR + m.b.compR, compK: t.compK + m.b.compK, n: t.n + m.b.n, semComp: t.semComp + m.b.semComp }), vazio()));
  const soma = (k) => ind(meses.reduce((t, m) => ({ conta: t.conta + m[k].conta, kwh: t.kwh + m[k].kwh, compR: t.compR + m[k].compR, compK: t.compK + m[k].compK, n: t.n + m[k].n, semComp: t.semComp + m[k].semComp }), vazio()));
  const parA = soma('pa'), parB = soma('pb');
  const mesesA = meses.filter(m => m.a.n).length, mesesB = meses.filter(m => m.b.n).length;
  const mediaB = { conta: mesesB ? totB.conta / mesesB : null, kwh: mesesB ? totB.kwh / mesesB : null, compR: mesesB ? totB.compR / mesesB : null, compK: mesesB ? totB.compK / mesesB : null };
  const mediaA = { conta: mesesA ? totA.conta / mesesA : null, kwh: mesesA ? totA.kwh / mesesA : null, compR: mesesA ? totA.compR / mesesA : null, compK: mesesA ? totA.compK / mesesA : null };

  return { meses, unidades, totA, totB, parA, parB, mesesA, mesesB, mediaA, mediaB };
});

// ─── Diagnóstico em texto ───
const fmtPct = (v, casas = 1) => (v == null ? '—' : `${v > 0 ? '+' : ''}${nf(v, casas)}%`);
const diagnostico = computed(() => {
  const r = rel.value;
  if (!r) return [];
  const A = dados.value.ano, B = A - 1, out = [];
  const { parA, parB, totA } = r;
  if (!totA.n) return [{ t: 'warn', txt: `Nenhuma fatura encontrada em ${A} para ${nomeSec(dados.value.sec).toLowerCase()}.` }];

  // compensação acontecendo?
  if (totA.compR === 0 && totA.compK === 0) out.push({ t: 'bad', txt: `Nenhuma compensação registrada nas faturas de ${A}: os créditos não estão chegando às contas.` });
  else out.push({ t: totA.pctComp >= 50 ? 'ok' : 'warn', txt: `A compensação cobriu ${nf(totA.pctComp, 1)}% do consumo de ${A} (${nf(totA.compK)} de ${nf(totA.kwh)} kWh) e abateu R$ ${nf(totA.compR, 2)} das contas — economia de ${nf(totA.economia, 1)}% sobre o custo estimado sem a geração (R$ ${nf(totA.semGD, 2)}).` });

  if (totA.semComp) out.push({ t: 'bad', txt: `${totA.semComp} ${totA.semComp === 1 ? 'fatura teve' : 'faturas tiveram'} consumo mas nenhuma compensação em ${A}. Veja a lista de unidades abaixo.` });

  if (parB.n) {
    const dc = pct(parA.conta, parB.conta), dk = pct(parA.kwh, parB.kwh), dr = pct(parA.compR, parB.compR), dck = pct(parA.compK, parB.compK);
    out.push({ t: dc > TOLERANCIA ? 'bad' : dc < -TOLERANCIA ? 'ok' : 'neu', txt: `Nos mesmos meses e unidades (${parA.n} faturas), o valor das contas ${dc > 0 ? 'subiu' : 'caiu'} ${nf(Math.abs(dc), 1)}% em relação a ${B} (R$ ${nf(parB.conta, 2)} → R$ ${nf(parA.conta, 2)}).` });
    out.push({ t: Math.abs(dk) <= TOLERANCIA ? 'neu' : dk > 0 ? 'warn' : 'ok', txt: Math.abs(dk) <= TOLERANCIA ? `O consumo está na média de ${B} (${fmtPct(dk)}).` : `O consumo ${dk > 0 ? 'aumentou' : 'diminuiu'} ${nf(Math.abs(dk), 1)}% em relação a ${B}.` });
    if (dr != null) out.push({ t: dr < -TOLERANCIA ? 'bad' : dr > TOLERANCIA ? 'ok' : 'neu', txt: `A compensação em R$ ${dr >= 0 ? 'cresceu' : 'caiu'} ${nf(Math.abs(dr), 1)}% (${fmtPct(dck)} em kWh) frente a ${B}.` });
    if (dc > TOLERANCIA && dk <= TOLERANCIA) out.push({ t: 'warn', txt: `As contas subiram mais que o consumo: indício de reajuste de tarifa, bandeira ou de compensação menor. Tarifa paga: R$ ${nf(parB.tarifa, 4)} → R$ ${nf(parA.tarifa, 4)} por kWh.` });
    if (parA.credito != null && parB.credito != null) {
      const dcr = pct(parA.credito, parB.credito);
      if (Math.abs(dcr) > 5) out.push({ t: dcr > 0 ? 'ok' : 'warn', txt: `Cada kWh compensado abateu R$ ${nf(parA.credito, 4)} em ${A}, contra R$ ${nf(parB.credito, 4)} em ${B} (${fmtPct(dcr)}).` });
    }
  } else {
    out.push({ t: 'warn', txt: `Não há faturas de ${B} das mesmas unidades para comparar.` });
  }
  const mesesSem = r.meses.filter(m => m.a.n && m.a.compR === 0).map(m => MESES_CURTO[m.mes - 1]);
  if (mesesSem.length) out.push({ t: 'bad', txt: `Meses sem nenhuma compensação somando todas as unidades: ${mesesSem.join(', ')}.` });
  return out;
});

// ─── Gráfico mensal ───
const METRICAS = [
  { v: 'conta', txt: 'Contas (R$)', fmt: (v) => `R$ ${nf(v, 2)}`, c: 'var(--orange)' },
  { v: 'compR', txt: 'Compensado (R$)', fmt: (v) => `R$ ${nf(v, 2)}`, c: 'var(--green)' },
  { v: 'kwh', txt: 'Consumo (kWh)', fmt: (v) => `${nf(v)} kWh`, c: 'var(--teal)' },
  { v: 'compK', txt: 'Compensado (kWh)', fmt: (v) => `${nf(v)} kWh`, c: 'var(--purple)' },
];
const metAtual = computed(() => METRICAS.find(x => x.v === metrica.value));
const grafico = computed(() => {
  const r = rel.value;
  if (!r) return null;
  const k = metrica.value;
  const max = Math.max(1, ...r.meses.flatMap(m => [m.a[k], m.b[k]]));
  const media = r.mediaB[k];
  return {
    max,
    media: media == null ? null : (media / max) * 100,
    cols: r.meses.map(m => ({ mes: m.mes, a: m.a[k], b: m.b[k], ha: (m.a[k] / max) * 100, hb: (m.b[k] / max) * 100, d: pct(m.pa[k], m.pb[k]), temA: m.a.n > 0 })),
  };
});

// ─── Tabela por unidade ───
const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FILTROS = [
  { v: 'todas', txt: 'Todas' },
  { v: 'alerta', txt: 'Com alerta' },
  { v: 'semcomp', txt: 'Sem compensação' },
  { v: 'subiu', txt: 'Conta subiu' },
  { v: 'caiu', txt: 'Conta caiu' },
];
const contagem = computed(() => {
  const l = rel.value?.unidades ?? [];
  return {
    todas: l.length,
    alerta: l.filter(x => x.alertas.length).length,
    semcomp: l.filter(x => x.semCompMeses.length || (x.a.n && !x.a.compR)).length,
    subiu: l.filter(x => x.dConta > TOLERANCIA).length,
    caiu: l.filter(x => x.dConta < -TOLERANCIA).length,
  };
});
const unidadesFiltradas = computed(() => {
  let l = rel.value?.unidades ?? [];
  const q = normalizar(busca.value.trim());
  if (q) l = l.filter(x => normalizar(x.u.nome).includes(q) || String(x.u.uc).includes(q));
  if (filtroUc.value === 'alerta') l = l.filter(x => x.alertas.length);
  if (filtroUc.value === 'semcomp') l = l.filter(x => x.semCompMeses.length || (x.a.n && !x.a.compR));
  if (filtroUc.value === 'subiu') l = l.filter(x => x.dConta > TOLERANCIA);
  if (filtroUc.value === 'caiu') l = l.filter(x => x.dConta < -TOLERANCIA);
  const ord = {
    delta: (x, y) => (y.dConta ?? -Infinity) - (x.dConta ?? -Infinity),
    conta: (x, y) => y.a.conta - x.a.conta,
    comp: (x, y) => (x.a.pctComp ?? -1) - (y.a.pctComp ?? -1),
    nome: (x, y) => String(x.u.nome).localeCompare(String(y.u.nome)),
  }[ordem.value];
  return [...l].sort(ord);
});

const SIT = {
  up: { txt: '↑ Acima', c: 'var(--red)' },
  down: { txt: '↓ Abaixo', c: 'var(--green)' },
  avg: { txt: '→ Na média', c: 'var(--teal)' },
  none: { txt: 'Sem base', c: 'var(--mut)' },
};
// cor do Δ: para conta/consumo subir é ruim; para compensação subir é bom
const corDelta = (d, bomSubir = false) => (d == null || Math.abs(d) <= TOLERANCIA ? 'var(--mut)' : (d > 0) === bomSubir ? 'var(--green)' : 'var(--red)');
const corDiag = { ok: 'var(--green)', bad: 'var(--red)', warn: 'var(--orange)', neu: 'var(--teal)' };
const icDiag = { ok: '✓', bad: '!', warn: '⚠', neu: 'i' };

const exportar = () => exportarPDF(resultado.value, `consumo-financeiro-${nomeSec(dados.value?.sec).toLowerCase()}-${dados.value?.ano}`);
</script>

<template>
  <div class="cf">
    <!-- Filtros -->
    <section class="lx-panel lx-mb">
      <div class="lx-filtros">
        <div class="lx-field">
          <label>Secretaria</label>
          <div class="lx-seg" role="radiogroup" aria-label="Secretaria">
            <button v-for="s in OPCOES_SEC" :key="s.v" role="radio" :aria-checked="secretaria === s.v" :title="s.desc"
              :class="{ on: secretaria === s.v }" :style="{ '--c': s.c }" @click="secretaria = s.v">{{ s.txt }}</button>
          </div>
        </div>
        <div class="lx-field">
          <label>Ano</label>
          <div class="lx-anos" style="--c:var(--orange)" role="group" aria-label="Ano">
            <button v-for="a in ANOS_REL" :key="a" class="lx-ano" :class="{ on: ano === a }" :aria-pressed="ano === a" @click="ano = a">{{ a }}</button>
          </div>
        </div>
        <button class="lx-btn" style="--c1:var(--orange);--c2:var(--green)" :disabled="!secretaria || carregando" @click="gerar">
          <span v-if="carregando" class="lx-spin" aria-hidden="true"></span>
          <span v-else aria-hidden="true">R$</span>
          {{ carregando ? 'Gerando…' : 'Gerar relatório' }}
        </button>
      </div>
      <p v-if="!secretaria" class="cf-dica">Escolha a secretaria e o ano. O relatório compara com o ano anterior ({{ ano - 1 }}).</p>
    </section>

    <div v-if="erro" class="lx-alert err">{{ erro }}</div>

    <section v-if="carregando" class="lx-panel" style="--c:var(--orange)" aria-busy="true">
      <div class="cf-skel"><div v-for="i in 4" :key="i" class="lx-skel"></div></div>
      <div class="lx-loading" role="status">
        <span class="lx-spin"></span>
        <b>Gerando relatório financeiro</b>
        <span>Buscando as faturas de {{ nomeSec(secretaria) }} em {{ ano }} e {{ ano - 1 }}…</span>
      </div>
    </section>

    <Transition name="lx-fade">
      <div v-if="rel && !carregando" ref="resultado">
        <div class="cf-hd">
          <div>
            <span class="lx-pill" style="--c:var(--orange)"><i></i>{{ nomeSec(dados.sec) }}</span>
            <h2>Dados R$ · {{ dados.ano }} <small>× {{ dados.ano - 1 }}</small></h2>
          </div>
          <button class="lx-btn-ghost sm no-pdf" :disabled="gerandoPDF" @click="exportar">
            <span v-if="gerandoPDF" class="lx-spin"></span>
            {{ gerandoPDF ? 'Gerando PDF…' : 'Exportar PDF' }}
          </button>
        </div>

        <!-- KPIs -->
        <section class="lx-kpis">
          <div class="lx-kpi" style="--c:var(--orange)"><span class="ico">$</span><span>Valor das contas</span><b>R$ {{ nf(rel.totA.conta, 2) }}</b>
            <small>{{ dados.ano - 1 }}: R$ {{ nf(rel.totB.conta, 2) }} · <em :style="{ color: corDelta(pct(rel.parA.conta, rel.parB.conta)) }">{{ fmtPct(pct(rel.parA.conta, rel.parB.conta)) }}</em></small></div>
          <div class="lx-kpi" style="--c:var(--green)"><span class="ico">↓</span><span>Compensado (R$)</span><b>R$ {{ nf(rel.totA.compR, 2) }}</b>
            <small>{{ dados.ano - 1 }}: R$ {{ nf(rel.totB.compR, 2) }} · <em :style="{ color: corDelta(pct(rel.parA.compR, rel.parB.compR), true) }">{{ fmtPct(pct(rel.parA.compR, rel.parB.compR)) }}</em></small></div>
          <div class="lx-kpi" style="--c:var(--purple)"><span class="ico">⚡</span><span>Compensado (kWh)</span><b>{{ nf(rel.totA.compK) }}</b>
            <small>{{ dados.ano - 1 }}: {{ nf(rel.totB.compK) }} · <em :style="{ color: corDelta(pct(rel.parA.compK, rel.parB.compK), true) }">{{ fmtPct(pct(rel.parA.compK, rel.parB.compK)) }}</em></small></div>
          <div class="lx-kpi" style="--c:var(--teal)"><span class="ico">⌂</span><span>Consumo (kWh)</span><b>{{ nf(rel.totA.kwh) }}</b>
            <small>{{ dados.ano - 1 }}: {{ nf(rel.totB.kwh) }} · <em :style="{ color: corDelta(pct(rel.parA.kwh, rel.parB.kwh)) }">{{ fmtPct(pct(rel.parA.kwh, rel.parB.kwh)) }}</em></small></div>
        </section>
        <section class="lx-kpis">
          <div class="lx-kpi" style="--c:var(--green)"><span>Consumo compensado</span><b>{{ rel.totA.pctComp == null ? '—' : nf(rel.totA.pctComp, 1) + '%' }}</b>
            <small>{{ dados.ano - 1 }}: {{ rel.totB.pctComp == null ? '—' : nf(rel.totB.pctComp, 1) + '%' }} · kWh compensado ÷ consumido</small></div>
          <div class="lx-kpi" style="--c:var(--green)"><span>Economia nas contas</span><b>{{ rel.totA.economia == null ? '—' : nf(rel.totA.economia, 1) + '%' }}</b>
            <small>sem a geração: R$ {{ nf(rel.totA.semGD, 2) }}</small></div>
          <div class="lx-kpi" style="--c:var(--orange)"><span>Tarifa paga</span><b>{{ rel.totA.tarifa == null ? '—' : 'R$ ' + nf(rel.totA.tarifa, 4) }}</b>
            <small>por kWh · {{ dados.ano - 1 }}: {{ rel.totB.tarifa == null ? '—' : 'R$ ' + nf(rel.totB.tarifa, 4) }}</small></div>
          <div class="lx-kpi" style="--c:var(--purple)"><span>Crédito por kWh</span><b>{{ rel.totA.credito == null ? '—' : 'R$ ' + nf(rel.totA.credito, 4) }}</b>
            <small>R$ abatido por kWh compensado · {{ dados.ano - 1 }}: {{ rel.totB.credito == null ? '—' : 'R$ ' + nf(rel.totB.credito, 4) }}</small></div>
        </section>
        <p class="cf-nota">Totais: {{ rel.totA.n }} faturas em {{ dados.ano }} ({{ rel.mesesA }} meses) e {{ rel.totB.n }} em {{ dados.ano - 1 }} ({{ rel.mesesB }} meses).
          As variações (%) comparam só as mesmas unidades nos mesmos meses ({{ rel.parA.n }} pares), para não distorcer com meses em aberto ou UCs novas.</p>

        <!-- Diagnóstico -->
        <section class="lx-panel lx-mb">
          <div class="lx-panel-hd"><div><h3><span class="lx-ic" style="--c:var(--orange)">✓</span>Diagnóstico</h3><p>A compensação está chegando às contas?</p></div></div>
          <ul class="cf-diag">
            <li v-for="(x, i) in diagnostico" :key="i" :style="{ '--c': corDiag[x.t] }"><i>{{ icDiag[x.t] }}</i><span>{{ x.txt }}</span></li>
          </ul>
        </section>

        <!-- Gráfico -->
        <section class="lx-panel lx-mb">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" :style="{ '--c': metAtual.c }">▮</span>Mês a mês · {{ dados.ano }} × {{ dados.ano - 1 }}</h3>
              <p>Barra clara: {{ dados.ano - 1 }}. Barra forte: {{ dados.ano }}. Linha tracejada: média mensal de {{ dados.ano - 1 }}.</p>
            </div>
            <div class="lx-seg no-pdf" role="radiogroup" aria-label="Métrica do gráfico">
              <button v-for="m in METRICAS" :key="m.v" role="radio" :aria-checked="metrica === m.v" :class="{ on: metrica === m.v }" :style="{ '--c': m.c }" @click="metrica = m.v">{{ m.txt }}</button>
            </div>
          </div>
          <div class="cf-chart" :style="{ '--c': metAtual.c }">
            <div v-if="grafico.media != null" class="cf-media" :style="{ bottom: `calc(20px + (100% - 38px) * ${grafico.media / 100})` }"><span>média {{ dados.ano - 1 }}: {{ metAtual.fmt(rel.mediaB[metrica]) }}</span></div>
            <div v-for="c in grafico.cols" :key="c.mes" class="cf-col" :title="`${MESES[c.mes - 1]}\n${dados.ano}: ${metAtual.fmt(c.a)}\n${dados.ano - 1}: ${metAtual.fmt(c.b)}`">
              <span class="cf-d" :style="{ color: corDelta(c.d, metrica === 'compR' || metrica === 'compK') }">{{ c.temA ? fmtPct(c.d, 0) : '' }}</span>
              <div class="cf-bars">
                <i class="b" :style="{ height: c.hb + '%' }"></i>
                <i class="a" :style="{ height: c.ha + '%' }"></i>
              </div>
              <span class="cf-lab">{{ MESES_CURTO[c.mes - 1] }}</span>
            </div>
          </div>
        </section>

        <!-- Tabela mensal -->
        <section class="lx-panel lx-mb">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--teal)">▦</span>Tabela mensal</h3>
              <p>Δ% = mesmas unidades no mesmo mês de {{ dados.ano - 1 }}. "Situação do consumo": na média se a variação de kWh ficar entre ±{{ TOLERANCIA }}%.</p>
            </div>
          </div>
          <div class="lx-tbl-wrap">
            <table class="lx-tbl cf-tbl">
              <thead>
                <tr class="grp">
                  <th rowspan="2">Mês</th>
                  <th colspan="3" class="c">Contas (R$)</th>
                  <th colspan="3" class="c">Compensado (R$)</th>
                  <th colspan="3" class="c">Consumo (kWh)</th>
                  <th colspan="2" class="c">Compensado (kWh)</th>
                  <th rowspan="2" class="r">% comp.</th>
                  <th rowspan="2" class="r">Economia</th>
                  <th rowspan="2" class="c">Situação do consumo</th>
                  <th rowspan="2" class="c">Faturas</th>
                </tr>
                <tr>
                  <th class="r">{{ dados.ano }}</th><th class="r">{{ dados.ano - 1 }}</th><th class="r">Δ%</th>
                  <th class="r">{{ dados.ano }}</th><th class="r">{{ dados.ano - 1 }}</th><th class="r">Δ%</th>
                  <th class="r">{{ dados.ano }}</th><th class="r">{{ dados.ano - 1 }}</th><th class="r">Δ%</th>
                  <th class="r">{{ dados.ano }}</th><th class="r">{{ dados.ano - 1 }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in rel.meses" :key="m.mes" :class="{ off: !m.a.n && !m.b.n, semcomp: m.a.n && !m.a.compR }">
                  <td class="b">{{ MESES[m.mes - 1] }}</td>
                  <td class="r b">{{ m.a.n ? nf(m.a.conta, 2) : '—' }}</td>
                  <td class="r mut">{{ m.b.n ? nf(m.b.conta, 2) : '—' }}</td>
                  <td class="r b" :style="{ color: corDelta(pct(m.pa.conta, m.pb.conta)) }">{{ fmtPct(pct(m.pa.conta, m.pb.conta)) }}</td>
                  <td class="r b">{{ m.a.n ? nf(m.a.compR, 2) : '—' }}</td>
                  <td class="r mut">{{ m.b.n ? nf(m.b.compR, 2) : '—' }}</td>
                  <td class="r b" :style="{ color: corDelta(pct(m.pa.compR, m.pb.compR), true) }">{{ fmtPct(pct(m.pa.compR, m.pb.compR)) }}</td>
                  <td class="r b">{{ m.a.n ? nf(m.a.kwh) : '—' }}</td>
                  <td class="r mut">{{ m.b.n ? nf(m.b.kwh) : '—' }}</td>
                  <td class="r b" :style="{ color: corDelta(pct(m.pa.kwh, m.pb.kwh)) }">{{ fmtPct(pct(m.pa.kwh, m.pb.kwh)) }}</td>
                  <td class="r b">{{ m.a.n ? nf(m.a.compK) : '—' }}</td>
                  <td class="r mut">{{ m.b.n ? nf(m.b.compK) : '—' }}</td>
                  <td class="r">{{ m.a.pctComp == null ? '—' : nf(m.a.pctComp, 1) + '%' }}</td>
                  <td class="r">{{ m.a.economia == null ? '—' : nf(m.a.economia, 1) + '%' }}</td>
                  <td class="c"><span v-if="m.a.n" class="lx-pill" :style="{ '--c': SIT[situacao(pct(m.pa.kwh, m.pb.kwh))].c }">{{ SIT[situacao(pct(m.pa.kwh, m.pb.kwh))].txt }}</span></td>
                  <td class="c mut">{{ m.a.n }} / {{ m.b.n }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td class="b">Total</td>
                  <td class="r b">{{ nf(rel.totA.conta, 2) }}</td><td class="r mut">{{ nf(rel.totB.conta, 2) }}</td>
                  <td class="r b" :style="{ color: corDelta(pct(rel.parA.conta, rel.parB.conta)) }">{{ fmtPct(pct(rel.parA.conta, rel.parB.conta)) }}</td>
                  <td class="r b">{{ nf(rel.totA.compR, 2) }}</td><td class="r mut">{{ nf(rel.totB.compR, 2) }}</td>
                  <td class="r b" :style="{ color: corDelta(pct(rel.parA.compR, rel.parB.compR), true) }">{{ fmtPct(pct(rel.parA.compR, rel.parB.compR)) }}</td>
                  <td class="r b">{{ nf(rel.totA.kwh) }}</td><td class="r mut">{{ nf(rel.totB.kwh) }}</td>
                  <td class="r b" :style="{ color: corDelta(pct(rel.parA.kwh, rel.parB.kwh)) }">{{ fmtPct(pct(rel.parA.kwh, rel.parB.kwh)) }}</td>
                  <td class="r b">{{ nf(rel.totA.compK) }}</td><td class="r mut">{{ nf(rel.totB.compK) }}</td>
                  <td class="r b">{{ rel.totA.pctComp == null ? '—' : nf(rel.totA.pctComp, 1) + '%' }}</td>
                  <td class="r b">{{ rel.totA.economia == null ? '—' : nf(rel.totA.economia, 1) + '%' }}</td>
                  <td class="c"><span class="lx-pill" :style="{ '--c': SIT[situacao(pct(rel.parA.kwh, rel.parB.kwh))].c }">{{ SIT[situacao(pct(rel.parA.kwh, rel.parB.kwh))].txt }}</span></td>
                  <td class="c mut">{{ rel.totA.n }} / {{ rel.totB.n }}</td>
                </tr>
                <tr class="mut">
                  <td>Média mensal</td>
                  <td class="r">{{ nf(rel.mediaA.conta, 2) }}</td><td class="r">{{ nf(rel.mediaB.conta, 2) }}</td>
                  <td class="r" :style="{ color: corDelta(pct(rel.mediaA.conta, rel.mediaB.conta)) }">{{ fmtPct(pct(rel.mediaA.conta, rel.mediaB.conta)) }}</td>
                  <td class="r">{{ nf(rel.mediaA.compR, 2) }}</td><td class="r">{{ nf(rel.mediaB.compR, 2) }}</td>
                  <td class="r" :style="{ color: corDelta(pct(rel.mediaA.compR, rel.mediaB.compR), true) }">{{ fmtPct(pct(rel.mediaA.compR, rel.mediaB.compR)) }}</td>
                  <td class="r">{{ nf(rel.mediaA.kwh) }}</td><td class="r">{{ nf(rel.mediaB.kwh) }}</td>
                  <td class="r" :style="{ color: corDelta(pct(rel.mediaA.kwh, rel.mediaB.kwh)) }">{{ fmtPct(pct(rel.mediaA.kwh, rel.mediaB.kwh)) }}</td>
                  <td class="r">{{ nf(rel.mediaA.compK) }}</td><td class="r">{{ nf(rel.mediaB.compK) }}</td>
                  <td colspan="4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p class="cf-nota">Linha avermelhada: mês com faturas mas sem nenhum valor compensado. Faturas = quantidade em {{ dados.ano }} / {{ dados.ano - 1 }}.</p>
        </section>

        <!-- Por unidade -->
        <section class="lx-panel">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--purple)">⌂</span>Por unidade</h3>
              <p>Totais de {{ dados.ano }}; Δ% sobre os meses que a unidade tem fatura nos dois anos.</p>
            </div>
            <div class="cf-tools no-pdf">
              <label class="lx-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input v-model="busca" class="lx-input" type="search" placeholder="Buscar UC ou nome" aria-label="Buscar unidade">
              </label>
              <select v-model="ordem" class="lx-input cf-ord" aria-label="Ordenar">
                <option value="delta">Maior aumento da conta</option>
                <option value="conta">Maior valor de conta</option>
                <option value="comp">Menor % compensado</option>
                <option value="nome">Nome</option>
              </select>
            </div>
          </div>
          <div class="lx-seg cf-filtros no-pdf" role="radiogroup" aria-label="Filtrar unidades">
            <button v-for="f in FILTROS" :key="f.v" role="radio" :aria-checked="filtroUc === f.v" :class="{ on: filtroUc === f.v }" style="--c:var(--purple)" @click="filtroUc = f.v">{{ f.txt }} <small>{{ contagem[f.v] }}</small></button>
          </div>
          <p v-if="!unidadesFiltradas.length" class="lx-empty">Nenhuma unidade nesse filtro.</p>
          <div v-else class="lx-tbl-wrap">
            <table class="lx-tbl cf-tbl">
              <thead>
                <tr>
                  <th>UC</th><th>Unidade</th>
                  <th class="r">Contas {{ dados.ano }}</th><th class="r">Δ% conta</th>
                  <th class="r">Compensado R$</th><th class="r">Δ% comp.</th>
                  <th class="r">Consumo kWh</th><th class="r">Comp. kWh</th>
                  <th class="r">% comp.</th><th class="c">Consumo</th><th>Alertas</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="x in unidadesFiltradas" :key="x.u.id">
                  <td class="lx-mono">{{ x.u.uc }}</td>
                  <td class="cf-nome">{{ x.u.nome }}<small>{{ x.a.n }} faturas em {{ dados.ano }} · {{ x.b.n }} em {{ dados.ano - 1 }}</small></td>
                  <td class="r b">{{ nf(x.a.conta, 2) }}</td>
                  <td class="r b" :style="{ color: corDelta(x.dConta) }">{{ fmtPct(x.dConta) }}</td>
                  <td class="r">{{ nf(x.a.compR, 2) }}</td>
                  <td class="r b" :style="{ color: corDelta(x.dComp, true) }">{{ fmtPct(x.dComp) }}</td>
                  <td class="r">{{ nf(x.a.kwh) }}</td>
                  <td class="r">{{ nf(x.a.compK) }}</td>
                  <td class="r b" :style="{ color: x.a.pctComp == null ? 'var(--mut)' : x.a.pctComp === 0 ? 'var(--red)' : 'inherit' }">{{ x.a.pctComp == null ? '—' : nf(x.a.pctComp, 1) + '%' }}</td>
                  <td class="c"><span class="lx-pill" :style="{ '--c': SIT[x.sit].c }">{{ SIT[x.sit].txt }}</span></td>
                  <td class="cf-al"><span v-for="(al, i) in x.alertas" :key="i">{{ al }}</span><span v-if="!x.alertas.length" class="ok">—</span></td>
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
.cf-dica { font-size: 12px; color: var(--mut); margin-top: 12px; }
.cf-skel { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.cf-skel .lx-skel { height: 86px; }
.cf-hd { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.cf-hd h2 { font-size: 20px; font-weight: 700; margin-top: 8px; }
.cf-hd h2 small { font-size: 14px; color: var(--mut); font-weight: 500; }
.lx-kpi em { font-style: normal; font-weight: 700; }
.lx-kpis + .lx-kpis { margin-top: -6px; }
.cf-nota { font-size: 11.5px; color: var(--mut); margin: -6px 0 18px; line-height: 1.5; }
.lx-panel .cf-nota { margin: 10px 0 0; }

/* diagnóstico */
.cf-diag { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.cf-diag li { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; font-size: 13px; line-height: 1.5;
  background: color-mix(in srgb, var(--c) 8%, transparent); border-left: 3px solid var(--c); }
.cf-diag i { flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-style: normal; font-weight: 700; font-size: 12px;
  color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); }

/* gráfico */
.cf-chart { position: relative; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px; height: 230px; }
.cf-col { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
.cf-d { font-size: 10.5px; font-weight: 700; height: 14px; line-height: 14px; white-space: nowrap; }
.cf-bars { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 3px; }
.cf-bars i { width: 38%; max-width: 22px; border-radius: 5px 5px 2px 2px; transition: height .4s ease; min-height: 2px; }
.cf-bars .b { background: color-mix(in srgb, var(--c) 30%, transparent); }
.cf-bars .a { background: var(--c); box-shadow: 0 0 14px -4px var(--c); }
.cf-lab { font-size: 11px; line-height: 16px; height: 16px; color: var(--mut); }
.cf-media { position: absolute; left: 0; right: 0; border-top: 1.5px dashed color-mix(in srgb, var(--tx) 45%, transparent); pointer-events: none; z-index: 1; }
.cf-media span { position: absolute; right: 0; top: -17px; font-size: 10px; color: var(--mut); background: var(--bg2); padding: 0 4px; border-radius: 4px; }

/* tabelas */
.cf-tbl th.c, .cf-tbl td.c { text-align: center; }
.cf-tbl .grp th { border-bottom: none; }
.cf-tbl td { white-space: nowrap; }
.cf-tbl .b { font-weight: 700; }
.cf-tbl .mut { color: var(--mut); }
.cf-tbl tr.off td { opacity: .45; }
.cf-tbl tr.semcomp td { background: rgba(255, 107, 74, .08); }
.cf-tbl tfoot td { border-top: 1px solid var(--line); }
.cf-nome { font-weight: 600; min-width: 200px; white-space: normal !important; }
.cf-nome small { display: block; font-size: 10.5px; font-weight: 400; color: var(--mut); }
.cf-al { white-space: normal !important; min-width: 180px; }
.cf-al span { display: block; font-size: 11px; color: var(--red); line-height: 1.4; }
.cf-al span.ok { color: var(--mut); }
.cf-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cf-ord { width: auto; }
.cf-filtros { margin-bottom: 12px; flex-wrap: wrap; }
.cf-filtros small { opacity: .7; margin-left: 4px; }
.lx-pdf .cf-media span { background: #fff; }
@media (max-width: 760px) {
  .cf-chart { height: 180px; gap: 2px; }
  .cf-d { font-size: 9px; }
  .cf-tools, .cf-tools .lx-search { width: 100%; }
}
</style>
