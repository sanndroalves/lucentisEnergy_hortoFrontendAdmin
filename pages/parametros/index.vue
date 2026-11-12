<script setup>
// Gerenciamento › Parâmetros — tarifa da concessionária (R$/kWh) por período.
// BT: um valor por período. MT: TUSD/TE ponta e fora ponta (cálculo usa a média).
// Estes valores alimentam o custo evitado e o payback do relatório Conclusivo,
// da Início e dos Gráficos (composables/useTarifas.ts). Mês sem período
// cadastrado usa a tarifa padrão.
import { ref, computed } from 'vue';
import { useHead } from '@vueuse/head';
import { useTarifas, TARIFA_PADRAO, mediaMT, chaveData, chaveMes } from '~/composables/useTarifas';
import { MESES } from '~/composables/useRelatorios';

useHead({ title: 'Parâmetros' });
definePageMeta({ middleware: 'sidebase-auth' });

const { lista, status, erro, carregarTarifas, TARIFA_URL, periodoTarifa, tarifaKwh, componentesMT } = useTarifas();
const carregando = computed(() => status.value === 'carregando' || status.value === 'idle');

const hoje = new Date();
const anoHoje = hoje.getFullYear(), mesHoje = hoje.getMonth() + 1;

// ── formatação ──
const rs = (v, casas = 4) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: 8 });
const mesAno = (iso) => { if (!iso) return 'sem fim'; const [y, m] = iso.split('-').map(Number); return `${MESES[m - 1].slice(0, 3)}/${y}`; };
const n = (v) => Number(v) || 0;
const mediaDe = (p) => mediaMT({ tusdPonta: n(p.tusdPonta), tePonta: n(p.tePonta), tusdForaPonta: n(p.tusdForaPonta), teForaPonta: n(p.teForaPonta) });
const valorDe = (p) => (p.tensao === 'BT' ? n(p.valor) : mediaDe(p));

// ── vigentes neste mês ──
const vigente = computed(() => {
  void lista.value;
  return {
    BT: { p: periodoTarifa('BT', anoHoje, mesHoje), v: tarifaKwh('BT', anoHoje, mesHoje) },
    MT: { p: periodoTarifa('MT', anoHoje, mesHoje), v: tarifaKwh('MT', anoHoje, mesHoje), c: componentesMT(anoHoje, mesHoje) },
  };
});

// ── períodos por tensão, com as lacunas entre eles ──
const linhasDe = (tensao) => {
  const ps = lista.value.filter(p => p.tensao === tensao).sort((a, b) => chaveData(a.inicio) - chaveData(b.inicio));
  const out = [];
  ps.forEach((p, i) => {
    const prox = ps[i + 1];
    out.push({ tipo: 'p', p, atual: p === vigente.value[tensao].p });
    if (prox && p.fim && chaveData(prox.inicio) - chaveData(p.fim) > 1) {
      const de = chaveData(p.fim) + 1, ate = chaveData(prox.inicio) - 1;
      const txt = (k) => `${MESES[k % 12].slice(0, 3)}/${Math.floor(k / 12)}`;
      out.push({ tipo: 'lacuna', txt: de === ate ? txt(de) : `${txt(de)} a ${txt(ate)}` });
    }
  });
  return out.reverse(); // mais recente primeiro
};
const GRUPOS = computed(() => [
  { t: 'BT', txt: 'Baixa tensão', sub: 'Um valor de R$/kWh por período', c: 'var(--teal)', linhas: linhasDe('BT') },
  { t: 'MT', txt: 'Média tensão', sub: 'TUSD e TE de ponta e fora ponta; o cálculo usa a média', c: 'var(--purple)', linhas: linhasDe('MT') },
]);

// ── dialog novo / editar ──
const dlg = ref(false);
const editando = ref(null);
const vazio = (t = 'BT') => ({ tensao: t, inicio: '', fim: '', semFim: false, valor: '', tusdPonta: '', tePonta: '', tusdForaPonta: '', teForaPonta: '', observacao: '' });
const f = ref(vazio());
const msg = ref(null);
const salvando = ref(false);

const abrirNovo = (t) => { editando.value = null; f.value = vazio(t); msg.value = null; dlg.value = true; };
const abrirEditar = (p) => {
  editando.value = p.id; msg.value = null;
  f.value = {
    tensao: p.tensao, inicio: p.inicio.slice(0, 7), fim: p.fim ? p.fim.slice(0, 7) : '', semFim: !p.fim,
    valor: p.valor ?? '', tusdPonta: p.tusdPonta ?? '', tePonta: p.tePonta ?? '', tusdForaPonta: p.tusdForaPonta ?? '', teForaPonta: p.teForaPonta ?? '', observacao: p.observacao ?? '',
  };
  dlg.value = true;
};

const CAMPOS_MT = [
  { k: 'tusdPonta', txt: 'TUSD ponta' }, { k: 'tePonta', txt: 'TE ponta' },
  { k: 'tusdForaPonta', txt: 'TUSD fora ponta' }, { k: 'teForaPonta', txt: 'TE fora ponta' },
];
const previa = computed(() => {
  const x = f.value;
  if (x.tensao === 'BT') return x.valor === '' ? null : n(x.valor);
  return CAMPOS_MT.some(c => x[c.k] === '') ? null : mediaDe(x);
});

// mesma checagem do backend, para avisar antes de enviar
const conflito = computed(() => {
  const x = f.value;
  if (!x.inicio) return null;
  const [ai, mi] = x.inicio.split('-').map(Number);
  const ini = chaveMes(ai, mi);
  let fim = null;
  if (!x.semFim && x.fim) { const [af, mf] = x.fim.split('-').map(Number); fim = chaveMes(af, mf); }
  return lista.value.find(p => p.tensao === x.tensao && p.id !== editando.value &&
    (p.fim == null || ini <= chaveData(p.fim)) && (fim == null || chaveData(p.inicio) <= fim)) ?? null;
});

const erroApi = (e) => {
  const d = e?.data;
  if (d && typeof d === 'object') {
    const v = Object.values(d).flat();
    if (v.length) return v.join(' ');
  }
  if (e?.statusCode === 404) return 'O backend ainda não tem a tabela de parâmetros (rode a migração 0034_tarifa).';
  return 'Erro ao salvar o período.';
};

const salvar = async () => {
  const x = f.value;
  if (!x.inicio) { msg.value = { t: 'err', txt: 'Informe o mês de início.' }; return; }
  if (!x.semFim && !x.fim) { msg.value = { t: 'err', txt: 'Informe o mês final ou marque "sem data para acabar".' }; return; }
  if (!x.semFim && x.fim < x.inicio) { msg.value = { t: 'err', txt: 'O fim do período não pode ser antes do início.' }; return; }
  if (previa.value == null) { msg.value = { t: 'err', txt: x.tensao === 'BT' ? 'Informe o valor da tarifa.' : 'Preencha os quatro componentes da tarifa MT.' }; return; }
  if (conflito.value) { msg.value = { t: 'err', txt: `Este período se sobrepõe ao de ${mesAno(conflito.value.inicio)} a ${mesAno(conflito.value.fim)}.` }; return; }

  const body = {
    tensao: x.tensao, inicio: `${x.inicio}-01`, fim: x.semFim ? null : `${x.fim}-01`, observacao: x.observacao || '',
    valor: x.tensao === 'BT' ? x.valor : null,
    ...Object.fromEntries(CAMPOS_MT.map(c => [c.k, x.tensao === 'MT' ? x[c.k] : null])),
  };
  salvando.value = true;
  try {
    if (editando.value) await $fetch(`${TARIFA_URL}${editando.value}`, { method: 'PUT', body });
    else await $fetch(TARIFA_URL, { method: 'POST', body });
    await carregarTarifas(true);
    dlg.value = false;
    avisar(editando.value ? 'Período atualizado.' : 'Período cadastrado.');
  } catch (e) { console.error(e); msg.value = { t: 'err', txt: erroApi(e) }; }
  finally { salvando.value = false; }
};

const excluir = async (p) => {
  if (!confirm(`Excluir a tarifa ${p.tensao} de ${mesAno(p.inicio)} a ${mesAno(p.fim)}? Os meses desse período passam a usar a tarifa padrão.`)) return;
  try { await $fetch(`${TARIFA_URL}${p.id}`, { method: 'DELETE' }); await carregarTarifas(true); avisar('Período excluído.'); }
  catch (e) { console.error(e); avisar('Erro ao excluir o período.', true); }
};

const toast = ref(null);
let tT = 0;
const avisar = (txt, err = false) => { toast.value = { txt, err }; clearTimeout(tT); tT = setTimeout(() => { toast.value = null; }, 3500); };
</script>

<template>
  <div class="lx-page">
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span><span>Gerenciamento</span><span class="sep">›</span><b>Parâmetros</b>
        </nav>
        <h1 class="lx-title">Parâmetros <span class="grad">tarifários</span></h1>
        <p class="lx-sub">Tarifa da concessionária (R$/kWh) por período · usada no custo evitado e no payback</p>
      </div>
      <div class="lx-head-actions">
        <button class="lx-btn-ghost" style="--c:var(--teal)" @click="abrirNovo('BT')">+ Período BT</button>
        <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" @click="abrirNovo('MT')">+ Período MT</button>
      </div>
    </header>

    <div v-if="status === 'erro'" class="lx-alert warn">
      Não foi possível carregar os parâmetros: {{ erro }} Enquanto isso, os cálculos usam a tarifa padrão.
      <button class="lx-btn-ghost sm" style="margin-left:auto" @click="carregarTarifas(true)">Tentar de novo</button>
    </div>

    <!-- Vigentes agora -->
    <section class="pr-vig">
      <article class="pr-v" style="--c:var(--teal);--c2:var(--green)">
        <span class="pr-v-lb">BT · vigente em {{ MESES[mesHoje - 1] }}/{{ anoHoje }}</span>
        <b v-if="!carregando">R$ {{ rs(vigente.BT.v) }}<small>/kWh</small></b>
        <span v-else class="lx-skel pr-sk"></span>
        <span class="pr-v-per">
          <template v-if="vigente.BT.p">Período {{ mesAno(vigente.BT.p.inicio) }} → {{ mesAno(vigente.BT.p.fim) }}</template>
          <template v-else><span class="lx-pill" style="--c:var(--orange)"><i></i>Tarifa padrão</span> nenhum período cobre este mês</template>
        </span>
      </article>
      <article class="pr-v" style="--c:var(--purple);--c2:var(--teal)">
        <span class="pr-v-lb">MT · média vigente em {{ MESES[mesHoje - 1] }}/{{ anoHoje }}</span>
        <b v-if="!carregando">R$ {{ rs(vigente.MT.v) }}<small>/kWh</small></b>
        <span v-else class="lx-skel pr-sk"></span>
        <div class="pr-mt">
          <span>TUSD p <b>{{ rs(vigente.MT.c.tusdPonta) }}</b></span>
          <span>TE p <b>{{ rs(vigente.MT.c.tePonta) }}</b></span>
          <span>TUSD fp <b>{{ rs(vigente.MT.c.tusdForaPonta) }}</b></span>
          <span>TE fp <b>{{ rs(vigente.MT.c.teForaPonta) }}</b></span>
        </div>
        <span class="pr-v-per">
          <template v-if="vigente.MT.p">Período {{ mesAno(vigente.MT.p.inicio) }} → {{ mesAno(vigente.MT.p.fim) }}</template>
          <template v-else><span class="lx-pill" style="--c:var(--orange)"><i></i>Tarifa padrão</span> nenhum período cobre este mês</template>
        </span>
      </article>
      <article class="pr-info">
        <b>Onde estes valores entram</b>
        <ul>
          <li><span style="--c:var(--orange)"></span>Relatório Conclusivo: custo evitado do autoconsumo, economia acumulada e payback</li>
          <li><span style="--c:var(--green)"></span>Início e Gráficos: payback acumulado</li>
          <li><span style="--c:var(--teal)"></span>Cada mês usa a tarifa do período que o contém</li>
          <li><span style="--c:var(--mut)"></span>Mês sem período: padrão BT R$ {{ rs(TARIFA_PADRAO.BT, 2) }} · MT R$ {{ rs(mediaMT(TARIFA_PADRAO.MT)) }}</li>
        </ul>
      </article>
    </section>

    <!-- Períodos -->
    <div class="lx-grid g2">
      <section v-for="g in GRUPOS" :key="g.t" class="lx-panel accent" :style="{ '--c': g.c }">
        <div class="lx-panel-hd">
          <div>
            <h3><span class="lx-ic" :style="{ '--c': g.c }">{{ g.t }}</span>{{ g.txt }}</h3>
            <p>{{ g.sub }}</p>
          </div>
          <button class="lx-btn-ghost sm" :style="{ '--c': g.c }" @click="abrirNovo(g.t)">+ Novo período</button>
        </div>

        <div v-if="carregando" class="lx-loading"><span class="lx-spin"></span><b>Carregando períodos…</b></div>
        <div v-else-if="!g.linhas.length" class="pr-vazio">
          Nenhum período cadastrado. Todos os meses usam a tarifa padrão
          (R$ {{ g.t === 'BT' ? rs(TARIFA_PADRAO.BT, 2) : rs(mediaMT(TARIFA_PADRAO.MT)) }}/kWh).
        </div>
        <ol v-else class="pr-tl">
          <template v-for="(l, i) in g.linhas" :key="l.tipo === 'p' ? l.p.id : 'gap' + i">
            <li v-if="l.tipo === 'p'" class="pr-item" :class="{ atual: l.atual }">
              <span class="pr-dot"></span>
              <div class="pr-item-c">
                <div class="pr-item-hd">
                  <b>{{ mesAno(l.p.inicio) }} → {{ mesAno(l.p.fim) }}</b>
                  <span v-if="l.atual" class="lx-pill" :style="{ '--c': g.c }"><i></i>vigente</span>
                </div>
                <div class="pr-item-v">R$ {{ rs(valorDe(l.p)) }}<small>/kWh{{ g.t === 'MT' ? ' (média)' : '' }}</small></div>
                <div v-if="g.t === 'MT'" class="pr-mt">
                  <span>TUSD p <b>{{ rs(l.p.tusdPonta) }}</b></span>
                  <span>TE p <b>{{ rs(l.p.tePonta) }}</b></span>
                  <span>TUSD fp <b>{{ rs(l.p.tusdForaPonta) }}</b></span>
                  <span>TE fp <b>{{ rs(l.p.teForaPonta) }}</b></span>
                </div>
                <p v-if="l.p.observacao" class="pr-obs">{{ l.p.observacao }}</p>
              </div>
              <div class="pr-item-ac">
                <button class="lx-icon-btn pr-ib" style="--c:var(--purple)" title="Editar período" @click="abrirEditar(l.p)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="lx-icon-btn pr-ib" style="--c:var(--red)" title="Excluir período" @click="excluir(l.p)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                </button>
              </div>
            </li>
            <li v-else class="pr-gap"><span class="pr-dot"></span>Sem período em {{ l.txt }} · usa a tarifa padrão</li>
          </template>
        </ol>
      </section>
    </div>

    <!-- Dialog período -->
    <LxDialog v-model="dlg" :titulo="editando ? 'Editar período' : 'Novo período tarifário'" :subtitulo="f.tensao === 'BT' ? 'Baixa tensão' : 'Média tensão'"
      :icone="f.tensao" :cor="f.tensao === 'BT' ? 'var(--teal)' : 'var(--purple)'" :largura="620">
      <div v-if="msg" class="lx-alert" :class="msg.t">{{ msg.txt }}</div>
      <div v-else-if="conflito" class="lx-alert warn">Este período se sobrepõe ao de {{ mesAno(conflito.inicio) }} a {{ mesAno(conflito.fim) }}. Ajuste as datas antes de salvar.</div>
      <div class="lx-form">
        <div class="lx-field full"><label>Tensão</label>
          <div class="lx-seg" :class="{ disabled: !!editando }">
            <button type="button" :class="{ on: f.tensao === 'BT' }" style="--c:var(--teal)" @click="f.tensao = 'BT'">BT · baixa tensão</button>
            <button type="button" :class="{ on: f.tensao === 'MT' }" style="--c:var(--purple)" @click="f.tensao = 'MT'">MT · média tensão</button>
          </div>
        </div>
        <div class="lx-field"><label for="pr-ini">Início (mês)</label><input id="pr-ini" v-model="f.inicio" type="month" class="lx-input" /></div>
        <div class="lx-field"><label for="pr-fim">Fim (mês, inclusivo)</label><input id="pr-fim" v-model="f.fim" type="month" class="lx-input" :disabled="f.semFim" /></div>
        <label class="pr-check full"><input v-model="f.semFim" type="checkbox" /> Sem data para acabar (vale até cadastrar o próximo)</label>

        <div v-if="f.tensao === 'BT'" class="lx-field full"><label for="pr-v">Tarifa BT (R$/kWh)</label><input id="pr-v" v-model="f.valor" type="number" step="0.00000001" min="0" class="lx-input" placeholder="ex: 0,87" /></div>
        <template v-else>
          <div v-for="c in CAMPOS_MT" :key="c.k" class="lx-field"><label>{{ c.txt }} (R$/kWh)</label><input v-model="f[c.k]" type="number" step="0.00000001" min="0" class="lx-input" placeholder="0,00000000" /></div>
        </template>

        <div class="lx-field full"><label for="pr-obs">Observação (opcional)</label><input id="pr-obs" v-model="f.observacao" maxlength="200" class="lx-input" placeholder="ex: reajuste anual CPFL" /></div>
      </div>
      <div class="pr-previa" :style="{ '--c': f.tensao === 'BT' ? 'var(--teal)' : 'var(--purple)' }">
        <span>Tarifa usada nos cálculos{{ f.tensao === 'MT' ? ' (média)' : '' }}</span>
        <b>{{ previa == null ? '—' : `R$ ${rs(previa)}/kWh` }}</b>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dlg = false">Cancelar</button>
        <button class="lx-btn" :style="f.tensao === 'BT' ? '--c1:var(--teal);--c2:var(--green)' : '--c1:var(--purple);--c2:var(--teal)'" :disabled="salvando" @click="salvar">
          {{ salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar período' }}
        </button>
      </template>
    </LxDialog>

    <Transition name="pr-toast">
      <div v-if="toast" class="pr-toast" :class="{ err: toast.err }" role="status" @click="toast = null">{{ toast.txt }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.pr-vig { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 14px; margin-bottom: 18px; }
.pr-v {
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 8px; padding: 20px; border-radius: 22px;
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--c) 24%, transparent), transparent 60%), var(--card);
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); box-shadow: 0 0 44px -20px var(--c);
}
.pr-v::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, var(--c), var(--c2)); box-shadow: 0 0 14px var(--c); }
.pr-v-lb { font-size: 11.5px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--mut); }
.pr-v > b { font: 600 clamp(26px, 2.8vw, 34px) var(--mono); letter-spacing: -.02em; line-height: 1.05; }
.pr-v > b small { font: 500 13px var(--font); color: var(--c); margin-left: 4px; }
.pr-v-per { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; color: var(--mut); }
.pr-sk { height: 36px; width: 70%; }
.pr-mt { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; font-size: 11.5px; color: var(--mut); }
.pr-mt b { font: 500 11.5px var(--mono); color: var(--tx); margin-left: 4px; }

.pr-info { padding: 18px 20px; border-radius: 22px; background: var(--card2); border: 1px dashed var(--line); font-size: 12.5px; }
.pr-info b { display: block; font-size: 13.5px; font-weight: 600; margin-bottom: 10px; }
.pr-info ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; color: var(--mut); line-height: 1.45; }
.pr-info li { display: flex; gap: 9px; }
.pr-info li span { width: 7px; height: 7px; border-radius: 50%; background: var(--c); margin-top: 6px; flex: none; }

.pr-vazio { padding: 22px 12px; text-align: center; font-size: 13px; color: var(--mut); }
.pr-tl { list-style: none; margin: 0; padding: 0 0 0 6px; position: relative; }
.pr-tl::before { content: ""; position: absolute; left: 11px; top: 10px; bottom: 10px; width: 2px; background: var(--line2); }
.pr-item, .pr-gap { position: relative; display: flex; gap: 14px; padding: 10px 0 10px 26px; }
.pr-dot { position: absolute; left: 0; top: 16px; width: 12px; height: 12px; border-radius: 50%; background: var(--bg2); border: 2px solid var(--line); }
.pr-item.atual .pr-dot { border-color: var(--c); background: var(--c); box-shadow: 0 0 12px var(--c); }
.pr-item-c { flex: 1; min-width: 0; padding: 12px 14px; border-radius: 14px; background: var(--card2); border: 1px solid var(--line2); }
.pr-item.atual .pr-item-c { border-color: color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 7%, transparent); }
.pr-item-hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pr-item-hd b { font-size: 13px; font-weight: 600; }
.pr-item-v { font: 600 18px var(--mono); margin: 6px 0 4px; }
.pr-item-v small { font: 500 11.5px var(--font); color: var(--mut); margin-left: 4px; }
.pr-obs { margin: 6px 0 0; font-size: 11.5px; color: var(--mut); }
.pr-item-ac { display: flex; flex-direction: column; gap: 4px; padding-top: 10px; }
.pr-ib { --c: var(--teal); width: 30px; height: 30px; border-radius: 9px; color: var(--c); }
.pr-ib svg { width: 14px; height: 14px; }
.pr-ib:hover { background: color-mix(in srgb, var(--c) 16%, transparent); }
.pr-gap { font-size: 12px; color: var(--orange); align-items: center; }
.pr-gap .pr-dot { top: 50%; transform: translateY(-50%); border-style: dashed; border-color: var(--orange); }

.pr-check { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--mut); cursor: pointer; }
.pr-check input { accent-color: var(--teal); width: 15px; height: 15px; }
.pr-previa { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; padding: 12px 14px; border-radius: 14px;
  background: color-mix(in srgb, var(--c) 10%, transparent); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); font-size: 12.5px; color: var(--mut); }
.pr-previa b { font: 600 16px var(--mono); color: var(--c); }

.pr-toast {
  position: fixed; left: 50%; bottom: 110px; transform: translateX(-50%); z-index: 3000; cursor: pointer; padding: 11px 18px; border-radius: 14px;
  font-size: 13px; font-weight: 500; color: var(--tx); background: var(--bg2); border: 1px solid rgba(52, 211, 122, .45);
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, .7), 0 0 30px -12px var(--green);
}
.pr-toast.err { border-color: rgba(255, 95, 109, .5); box-shadow: 0 10px 40px -10px rgba(0, 0, 0, .7), 0 0 30px -12px var(--red); }
.pr-toast-enter-active, .pr-toast-leave-active { transition: opacity .25s, transform .25s; }
.pr-toast-enter-from, .pr-toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }

@media (max-width: 1100px) { .pr-vig { grid-template-columns: 1fr 1fr; } .pr-info { grid-column: 1 / -1; } }
@media (max-width: 640px) { .pr-vig { grid-template-columns: 1fr; } }
</style>
