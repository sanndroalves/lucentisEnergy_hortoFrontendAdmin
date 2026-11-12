<script setup>
// UCs Públicas — página única para todas as unidades consumidoras da prefeitura
// (Educação, Saúde, Outros, Iluminação pública e Praças). Antes eram duas
// páginas (/predios e /iluminacao) com os mesmos serviços; /iluminacao agora
// redireciona para cá já filtrada.
import { ref, computed, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import { MESES, MESES_CURTO, nf } from '~/composables/useRelatorios';

useHead({ title: 'UCs Públicas' });
definePageMeta({ middleware: 'sidebase-auth' });

// ── catálogos ────────────────────────────────────────────────
const SECS = [
  { v: 'E', txt: 'Educação', desc: 'Escolas e CEIs', c: 'var(--green)', ic: '✎' },
  { v: 'S', txt: 'Saúde', desc: 'UBS e postos', c: 'var(--teal)', ic: '✚' },
  { v: 'O', txt: 'Outros', desc: 'Órgãos municipais', c: 'var(--orange)', ic: '⌂' },
  { v: 'I', txt: 'Iluminação', desc: 'Iluminação pública', c: 'var(--red)', ic: '✦' },
  { v: 'P', txt: 'Praças', desc: 'Espaços públicos', c: 'var(--purple)', ic: '❀' },
];
const STATUS = [
  { v: 'L', txt: 'Ligados', um: 'Ligado', c: 'var(--green)' },
  { v: 'D', txt: 'Desligados', um: 'Desligado', c: 'var(--red)' },
  { v: 'M', txt: 'Manutenção', um: 'Manutenção', c: 'var(--orange)' },
];
const secDe = (v) => SECS.find(s => s.v === v) ?? { v, txt: 'Desconhecida', c: 'var(--mut)' };
const statusDe = (v) => STATUS.find(s => s.v === v) ?? { v, um: 'Desconhecido', c: 'var(--mut)' };
const ANOS_FORM = [2028, 2027, 2026, 2025, 2024, 2023];

// ── dados (não bloqueiam a abertura da página) ───────────────
const { data: unidadesRaw, pending: carregando, refresh: recarregarUnidades } = useLazyFetch(`${API_BASE_URL}/unidadecompensacao/`, { key: 'ucs-unidades', default: () => [] });
const { data: usinasRaw } = useLazyFetch(`${API_BASE_URL}/usina/`, { key: 'ucs-usinas', default: () => [] });
const { data: porcentagensRaw, refresh: recarregarPorcentagens } = useLazyFetch(`${API_BASE_URL}/porcentagem/`, { key: 'ucs-porcentagens', default: () => [] });

const unidades = computed(() => unidadesRaw.value ?? []);
const usinas = computed(() => usinasRaw.value ?? []);
const usinaPorId = computed(() => new Map(usinas.value.map(u => [u.id, u])));

// ── resumo ────────────────────────────────────────────────────
const resumo = computed(() => {
  const r = { total: 0, sec: {}, status: {}, tensao: { BT: 0, MT: 0 } };
  SECS.forEach(s => { r.sec[s.v] = 0; });
  STATUS.forEach(s => { r.status[s.v] = { total: 0, sec: Object.fromEntries(SECS.map(x => [x.v, 0])) }; });
  for (const u of unidades.value) {
    r.total++;
    if (u.secretaria in r.sec) r.sec[u.secretaria]++;
    const st = r.status[u.status];
    if (st) { st.total++; if (u.secretaria in st.sec) st.sec[u.secretaria]++; }
    if (u.tensao === 'BT' || u.tensao === 'MT') r.tensao[u.tensao]++;
  }
  return r;
});

// ── filtros ───────────────────────────────────────────────────
// ?sec=E ou ?sec=IP (vindo do antigo /iluminacao) já abre filtrado
const router = useRouter();
const secDaUrl = () => new Set(String(router.currentRoute.value.query.sec ?? '').split('').filter(c => SECS.some(s => s.v === c)));
const fSec = ref(secDaUrl());
watch(() => router.currentRoute.value.query.sec, () => { fSec.value = secDaUrl(); });
const fStatus = ref('');
const fTensao = ref('');
const busca = ref('');

const alternarSec = (v) => { const s = new Set(fSec.value); s.has(v) ? s.delete(v) : s.add(v); fSec.value = s; };
const limparFiltros = () => { fSec.value = new Set(); fStatus.value = ''; fTensao.value = ''; busca.value = ''; };
const temFiltro = computed(() => fSec.value.size || fStatus.value || fTensao.value || busca.value.trim());

const sem = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const filtradas = computed(() => {
  const q = sem(busca.value.trim());
  return unidades.value.filter(u =>
    (!fSec.value.size || fSec.value.has(u.secretaria)) &&
    (!fStatus.value || u.status === fStatus.value) &&
    (!fTensao.value || u.tensao === fTensao.value) &&
    (!q || sem(u.uc).includes(q) || sem(u.nome).includes(q) || sem(u.endereco).includes(q)),
  ).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
});

// paginação simples (são ~460 unidades)
const POR_PAG = 40;
const pagina = ref(1);
const totalPags = computed(() => Math.max(1, Math.ceil(filtradas.value.length / POR_PAG)));
const visiveis = computed(() => filtradas.value.slice((pagina.value - 1) * POR_PAG, pagina.value * POR_PAG));
watch([fSec, fStatus, fTensao, busca], () => { pagina.value = 1; });

// ── aviso rápido ──────────────────────────────────────────────
const toast = ref(null);
let toastT = 0;
const avisar = (txt, erro = false) => { toast.value = { txt, erro }; clearTimeout(toastT); toastT = setTimeout(() => { toast.value = null; }, 3500); };

// ── unidade atual dos dialogs ─────────────────────────────────
const atual = ref(null);

// ── porcentagens (geradoras) ──────────────────────────────────
const dlgPorc = ref(false);
const porcDaUnidade = computed(() => (porcentagensRaw.value ?? []).filter(p => p.idUnidadeCompensa === atual.value?.id));
const porcAtivas = computed(() => porcDaUnidade.value.filter(p => !p.data_fim));
const porcHist = computed(() => porcDaUnidade.value.filter(p => p.data_fim).sort((a, b) => String(b.data_fim).localeCompare(String(a.data_fim))));
const somaAtivas = computed(() => porcAtivas.value.reduce((t, p) => t + Number(p.porcentagem || 0), 0));
const formatarData = (d) => { if (!d) return ''; const [y, m] = String(d).split('-'); return `${m}/${y}`; };
const abrirPorc = (u) => { atual.value = u; dlgPorc.value = true; };
const excluirPorc = async (id) => {
  if (!confirm('Remover esta porcentagem?')) return;
  try { await $fetch(`${API_BASE_URL}/porcentagem/${id}`, { method: 'DELETE' }); await recarregarPorcentagens(); avisar('Porcentagem removida.'); }
  catch (e) { console.error(e); avisar('Erro ao remover a porcentagem.', true); }
};

const dlgGeradora = ref(false);
const fGer = ref({ usina: '', porcentagem: '' });
const msgGer = ref(null);
const salvandoGer = ref(false);
const abrirGeradora = (u) => { atual.value = u; fGer.value = { usina: '', porcentagem: '' }; msgGer.value = null; dlgGeradora.value = true; };
const salvarGeradora = async () => {
  if (!fGer.value.usina || !fGer.value.porcentagem) { msgGer.value = { t: 'err', txt: 'Preencha a usina e a porcentagem.' }; return; }
  salvandoGer.value = true;
  try {
    await $fetch(`${API_BASE_URL}/porcentagem/`, { method: 'POST', body: { idUnidadeCompensa: atual.value.id, idGeradora: fGer.value.usina, porcentagem: fGer.value.porcentagem } });
    await recarregarPorcentagens();
    msgGer.value = { t: 'ok', txt: 'Geradora adicionada com sucesso.' };
    fGer.value = { usina: '', porcentagem: '' };
  } catch (e) { console.error(e); msgGer.value = { t: 'err', txt: 'Erro ao enviar a geradora.' }; }
  finally { salvandoGer.value = false; }
};

// ── nova / editar unidade ─────────────────────────────────────
const dlgUnidade = ref(false);
const editando = ref(null); // id da unidade em edição; null = nova
const vazio = () => ({ uc: '', nome: '', dataInicio: '', mediaConsumo: '', valorKWH: '', endereco: '', cep: '', secretaria: '', status: '', tensao: 'BT' });
const fUni = ref(vazio());
const msgUni = ref(null);
const salvandoUni = ref(false);
const abrirNova = () => { editando.value = null; fUni.value = vazio(); msgUni.value = null; dlgUnidade.value = true; };
const abrirEditar = (u) => {
  editando.value = u.id; msgUni.value = null;
  fUni.value = { uc: u.uc, nome: u.nome, dataInicio: u.dataInicio, mediaConsumo: u.mediaConsumo, valorKWH: u.valorKWH, endereco: u.endereco, cep: u.cep, secretaria: u.secretaria, status: u.status, tensao: u.tensao || 'BT' };
  dlgUnidade.value = true;
};
const salvarUnidade = async () => {
  const f = fUni.value;
  const obrig = ['uc', 'nome', 'dataInicio', 'mediaConsumo', 'valorKWH', 'endereco', 'cep', 'secretaria', 'status'];
  if (obrig.some(k => f[k] === '' || f[k] == null)) { msgUni.value = { t: 'err', txt: 'Preencha todos os campos.' }; return; }
  salvandoUni.value = true;
  try {
    const body = { ...f };
    if (editando.value) await $fetch(`${API_BASE_URL}/unidadecompensacao/${editando.value}`, { method: 'PUT', body });
    else await $fetch(`${API_BASE_URL}/unidadecompensacao/`, { method: 'POST', body });
    await recarregarUnidades();
    if (editando.value) { msgUni.value = { t: 'ok', txt: 'Unidade editada com sucesso.' }; }
    else { msgUni.value = { t: 'ok', txt: 'Unidade adicionada com sucesso.' }; fUni.value = vazio(); }
  } catch (e) { console.error(e); msgUni.value = { t: 'err', txt: editando.value ? 'Erro ao editar a unidade.' : 'Erro ao adicionar a unidade.' }; }
  finally { salvandoUni.value = false; }
};

// ── excluir unidade ───────────────────────────────────────────
const dlgExcluir = ref(false);
const excluindo = ref(false);
const abrirExcluir = (u) => { atual.value = u; dlgExcluir.value = true; };
const excluirUnidade = async () => {
  excluindo.value = true;
  try { await $fetch(`${API_BASE_URL}/unidadecompensacao/${atual.value.id}`, { method: 'DELETE' }); await recarregarUnidades(); dlgExcluir.value = false; avisar('Unidade excluída.'); }
  catch (e) { console.error(e); avisar('Erro ao excluir a unidade.', true); }
  finally { excluindo.value = false; }
};

// ── relatórios da unidade (separados por ano) ─────────────────
const dlgRelatorios = ref(false);
const relatorios = ref([]);
const carregandoRel = ref(false);
const anoRel = ref(null);
const buscarRelatorios = async () => {
  carregandoRel.value = true;
  try {
    const r = await $fetch(`${API_BASE_URL}/relatoriocompensacao/`, { query: { idUnidadeCompensa: atual.value.id } });
    relatorios.value = (r ?? []).filter(x => x.idUnidadeCompensa === atual.value.id);
  } catch (e) { console.error(e); relatorios.value = []; avisar('Erro ao carregar os relatórios.', true); }
  finally { carregandoRel.value = false; }
};
const anosRel = computed(() => {
  const m = new Map();
  relatorios.value.forEach(r => m.set(r.ano, (m.get(r.ano) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[0] - a[0]).map(([ano, qtd]) => ({ ano, qtd }));
});
// grade de 12 meses do ano escolhido
const mesesRel = computed(() => {
  const doAno = relatorios.value.filter(r => r.ano === anoRel.value);
  return MESES.map((nome, i) => ({ mes: i + 1, nome, rel: doAno.find(r => r.mes === i + 1) ?? null }));
});
const abrirRelatorios = async (u) => {
  atual.value = u; relatorios.value = []; anoRel.value = null; dlgRelatorios.value = true;
  await buscarRelatorios();
  anoRel.value = anosRel.value[0]?.ano ?? new Date().getFullYear();
};
const excluirRelatorio = async (r) => {
  if (!confirm(`Excluir o relatório de ${MESES[r.mes - 1]}/${r.ano}?`)) return;
  try { await $fetch(`${API_BASE_URL}/relatoriocompensacao/${r.id}`, { method: 'DELETE' }); await buscarRelatorios(); avisar('Relatório excluído.'); }
  catch (e) { console.error(e); avisar('Erro ao excluir o relatório.', true); }
};

// ── novo / editar relatório ───────────────────────────────────
const dlgRel = ref(false);
const relEditando = ref(null); // id do relatório em edição; null = novo
const relVazio = () => ({ mes: '', ano: '', consumokWh: '', consumoReais: '', enerInjTUSD: '', valorInjTUSD: '', enerInjTE: '', valorInjTE: '' });
const fRel = ref(relVazio());
const msgRel = ref(null);
const salvandoRel = ref(false);
const CAMPOS_REL = [
  { k: 'consumokWh', txt: 'Consumo (kWh)', ph: '0' },
  { k: 'consumoReais', txt: 'Consumo (R$)', ph: '0,00' },
  { k: 'enerInjTUSD', txt: 'Ener. inj. TUSD (kWh)', ph: '0' },
  { k: 'valorInjTUSD', txt: 'Valor TUSD (R$)', ph: '0,00' },
  { k: 'enerInjTE', txt: 'Ener. inj. TE (kWh)', ph: '0' },
  { k: 'valorInjTE', txt: 'Valor TE (R$)', ph: '0,00' },
];
const abrirNovoRel = (u, mes = '', ano = '') => {
  if (u) atual.value = u;
  relEditando.value = null; fRel.value = { ...relVazio(), mes, ano }; msgRel.value = null; dlgRel.value = true;
};
const abrirEditarRel = (r) => {
  relEditando.value = r.id; msgRel.value = null;
  fRel.value = { mes: r.mes, ano: r.ano, consumokWh: r.consumokWh, consumoReais: r.consumoReais, enerInjTUSD: r.enerInjTUSD, valorInjTUSD: r.valorInjTUSD, enerInjTE: r.enerInjTE, valorInjTE: r.valorInjTE };
  dlgRel.value = true;
};
const salvarRel = async () => {
  const f = fRel.value;
  if (['mes', 'ano', ...CAMPOS_REL.map(c => c.k)].some(k => f[k] === '' || f[k] == null)) { msgRel.value = { t: 'err', txt: 'Preencha todos os campos.' }; return; }
  salvandoRel.value = true;
  try {
    if (relEditando.value) {
      const { mes, ano, ...resto } = f;
      await $fetch(`${API_BASE_URL}/relatoriocompensacao/${relEditando.value}`, { method: 'PUT', body: { mes, ano, ...resto } });
      msgRel.value = { t: 'ok', txt: 'Relatório editado com sucesso.' };
    } else {
      const existe = await $fetch(`${API_BASE_URL}/relatoriocompensacao/`, { query: { idUnidadeCompensa: atual.value.id, mes: f.mes, ano: f.ano } });
      if ((existe ?? []).some(r => r.idUnidadeCompensa === atual.value.id && r.mes === Number(f.mes) && r.ano === Number(f.ano))) {
        msgRel.value = { t: 'err', txt: `${MESES[f.mes - 1]}/${f.ano} já tem relatório lançado.` }; return;
      }
      await $fetch(`${API_BASE_URL}/relatoriocompensacao/`, { method: 'POST', body: { idUnidadeCompensa: atual.value.id, ...f } });
      msgRel.value = { t: 'ok', txt: 'Relatório enviado com sucesso.' };
    }
    if (dlgRelatorios.value) await buscarRelatorios();
  } catch (e) { console.error(e); msgRel.value = { t: 'err', txt: 'Erro ao salvar o relatório.' }; }
  finally { salvandoRel.value = false; }
};
</script>

<template>
  <div class="lx-page">
    <!-- Cabeçalho -->
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span><b>UCs Públicas</b>
        </nav>
        <h1 class="lx-title">Unidades <span class="grad">públicas</span></h1>
        <p class="lx-sub">Prédios, iluminação pública e praças da prefeitura em um só lugar</p>
      </div>
      <div class="lx-head-actions">
        <button class="lx-btn" style="--c1:var(--green);--c2:var(--teal)" @click="abrirNova">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova unidade
        </button>
      </div>
    </header>

    <!-- Secretarias (clicáveis: filtram a lista) -->
    <section class="uc-secs" aria-label="Unidades por secretaria">
      <button v-for="s in SECS" :key="s.v" class="uc-sec" :class="{ on: fSec.has(s.v) }" :style="{ '--c': s.c }" :aria-pressed="fSec.has(s.v)" @click="alternarSec(s.v)">
        <span class="uc-sec-ic">{{ s.ic }}</span>
        <span class="uc-sec-tx"><small>{{ s.txt }}</small><b>{{ carregando ? '…' : resumo.sec[s.v] }}</b><em>{{ s.desc }}</em></span>
      </button>
    </section>

    <!-- Status por secretaria + tensão -->
    <section class="uc-sts">
      <button v-for="st in STATUS" :key="st.v" class="uc-st" :class="{ on: fStatus === st.v }" :style="{ '--c': st.c }" :aria-pressed="fStatus === st.v"
        @click="fStatus = fStatus === st.v ? '' : st.v">
        <div class="uc-st-hd"><span><i></i>{{ st.txt }}</span><b>{{ carregando ? '…' : resumo.status[st.v].total }}</b></div>
        <div class="uc-st-bar">
          <i v-for="s in SECS" :key="s.v" :style="{ flex: resumo.status[st.v].sec[s.v], background: s.c }" :title="`${s.txt}: ${resumo.status[st.v].sec[s.v]}`"></i>
        </div>
        <div class="uc-st-sec">
          <span v-for="s in SECS" :key="s.v" :class="{ zero: !resumo.status[st.v].sec[s.v] }" :style="{ '--s': s.c }"><i></i>{{ s.txt }} <b>{{ resumo.status[st.v].sec[s.v] }}</b></span>
        </div>
      </button>

      <div class="uc-st uc-tensao">
        <div class="uc-st-hd"><span><i style="background:var(--teal);box-shadow:0 0 8px var(--teal)"></i>Tensão</span><b>{{ carregando ? '…' : resumo.total }}</b></div>
        <div class="uc-ten">
          <button v-for="t in ['BT', 'MT']" :key="t" :class="{ on: fTensao === t }" :aria-pressed="fTensao === t" @click="fTensao = fTensao === t ? '' : t">
            <small>{{ t === 'BT' ? 'Baixa tensão' : 'Média tensão' }}</small><b>{{ carregando ? '…' : resumo.tensao[t] }}</b><em>{{ t }}</em>
          </button>
        </div>
      </div>
    </section>

    <!-- Lista -->
    <section class="lx-panel">
      <div class="lx-panel-hd">
        <div>
          <h3><span class="lx-ic" style="--c:var(--green)">☰</span>Unidades consumidoras</h3>
          <p>{{ carregando ? 'Carregando…' : `${filtradas.length} de ${resumo.total} unidades` }}</p>
        </div>
      </div>

      <div class="uc-filtros">
        <label class="lx-search uc-busca">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="busca" class="lx-input" type="search" placeholder="Buscar por UC, nome ou endereço" aria-label="Buscar por UC, nome ou endereço" />
        </label>
        <div class="lx-seg" role="group" aria-label="Tensão">
          <button :class="{ on: !fTensao }" @click="fTensao = ''">Todas</button>
          <button :class="{ on: fTensao === 'BT' }" @click="fTensao = 'BT'">BT</button>
          <button :class="{ on: fTensao === 'MT' }" @click="fTensao = 'MT'">MT</button>
        </div>
        <div class="lx-seg" role="group" aria-label="Status">
          <button :class="{ on: !fStatus }" @click="fStatus = ''">Todos</button>
          <button v-for="st in STATUS" :key="st.v" :class="{ on: fStatus === st.v }" :style="{ '--c': st.c }" @click="fStatus = st.v">{{ st.um }}</button>
        </div>
        <button v-if="temFiltro" class="lx-btn-ghost sm" @click="limparFiltros">Limpar filtros</button>
      </div>
      <div v-if="fSec.size" class="uc-ativos">
        <span>Secretarias:</span>
        <button v-for="v in fSec" :key="v" class="lx-pill" :style="{ '--c': secDe(v).c }" @click="alternarSec(v)">{{ secDe(v).txt }} ×</button>
      </div>

      <div v-if="carregando && !unidades.length" class="lx-loading"><span class="lx-spin"></span><b>Carregando unidades…</b></div>
      <template v-else>
        <div class="lx-tbl-wrap">
          <table class="lx-tbl uc-tbl">
            <thead>
              <tr><th>UC</th><th>Nome / endereço</th><th class="c">Secretaria</th><th class="c">Tensão</th><th class="c">Status</th><th class="c">Geradoras</th><th class="c">Ações</th></tr>
            </thead>
            <tbody>
              <tr v-for="u in visiveis" :key="u.id">
                <td class="lx-mono">{{ u.uc }}</td>
                <td class="uc-nome"><b>{{ u.nome }}</b><small v-if="u.endereco">{{ u.endereco }}</small></td>
                <td class="c"><span class="lx-pill" :style="{ '--c': secDe(u.secretaria).c }">{{ secDe(u.secretaria).txt }}</span></td>
                <td class="c"><span class="uc-ten-pill" :class="{ mt: u.tensao === 'MT' }">{{ u.tensao || '—' }}</span></td>
                <td class="c"><span class="lx-pill" :style="{ '--c': statusDe(u.status).c }"><i></i>{{ statusDe(u.status).um }}</span></td>
                <td class="c">
                  <button v-if="u.status === 'L'" class="lx-icon-btn uc-ib" style="--c:var(--teal)" title="Ver porcentagens" @click="abrirPorc(u)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
                  </button>
                  <span v-else class="uc-off">off</span>
                </td>
                <td class="c">
                  <div class="uc-acoes">
                    <button class="lx-icon-btn uc-ib" style="--c:var(--green)" title="Novo relatório" @click="abrirNovoRel(u)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <button class="lx-icon-btn uc-ib" style="--c:var(--teal)" title="Editar relatórios" @click="abrirRelatorios(u)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </button>
                    <button v-if="u.status === 'L'" class="lx-icon-btn uc-ib" style="--c:var(--orange)" title="Adicionar geradora" @click="abrirGeradora(u)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    </button>
                    <button class="lx-icon-btn uc-ib" style="--c:var(--purple)" title="Editar unidade" @click="abrirEditar(u)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="lx-icon-btn uc-ib" style="--c:var(--red)" title="Excluir unidade" @click="abrirExcluir(u)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!visiveis.length"><td colspan="7" class="lx-empty">Nenhuma unidade encontrada com esses filtros.</td></tr>
            </tbody>
          </table>
        </div>
        <div v-if="totalPags > 1" class="uc-pag">
          <button class="lx-icon-btn" :disabled="pagina === 1" aria-label="Página anterior" @click="pagina--">‹</button>
          <span>Página <b>{{ pagina }}</b> de {{ totalPags }}</span>
          <button class="lx-icon-btn" :disabled="pagina === totalPags" aria-label="Próxima página" @click="pagina++">›</button>
        </div>
      </template>
    </section>

    <!-- ═══ Dialog: porcentagens ═══ -->
    <LxDialog v-model="dlgPorc" titulo="Porcentagens da unidade" :subtitulo="atual ? `${atual.uc} · ${atual.nome}` : ''" icone="%" cor="var(--teal)" :largura="580">
      <div class="uc-dlg-sec">
        <div class="uc-dlg-sec-hd"><b>Ativas</b><span class="lx-pill" style="--c:var(--teal)">{{ nf(somaAtivas, 2) }}% no total</span></div>
        <div v-for="p in porcAtivas" :key="p.id" class="uc-porc">
          <span class="uc-porc-us"><b>{{ usinaPorId.get(p.idGeradora)?.nome ?? `Usina ${p.idGeradora}` }}</b><small>UC {{ usinaPorId.get(p.idGeradora)?.uc ?? '—' }} · desde {{ formatarData(p.data_inicio) }}</small></span>
          <b class="uc-porc-v">{{ p.porcentagem }}%</b>
          <button class="lx-icon-btn uc-ib" style="--c:var(--red)" title="Remover" @click="excluirPorc(p.id)">×</button>
        </div>
        <p v-if="!porcAtivas.length" class="lx-empty">Nenhuma porcentagem ativa.</p>
      </div>
      <div class="uc-dlg-sec">
        <div class="uc-dlg-sec-hd"><b>Histórico</b></div>
        <div v-for="p in porcHist" :key="p.id" class="uc-porc hist">
          <span class="uc-porc-us"><b>{{ usinaPorId.get(p.idGeradora)?.nome ?? `Usina ${p.idGeradora}` }}</b><small>{{ formatarData(p.data_inicio) }} → {{ formatarData(p.data_fim) }}</small></span>
          <b class="uc-porc-v">{{ p.porcentagem }}%</b>
        </div>
        <p v-if="!porcHist.length" class="lx-empty">Sem histórico.</p>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="abrirGeradora(atual); dlgPorc = false">+ Adicionar geradora</button>
        <span class="sp"></span>
        <button class="lx-btn-ghost" @click="dlgPorc = false">Fechar</button>
      </template>
    </LxDialog>

    <!-- ═══ Dialog: adicionar geradora ═══ -->
    <LxDialog v-model="dlgGeradora" titulo="Adicionar geradora" :subtitulo="atual ? `${atual.uc} · ${atual.nome}` : ''" icone="⚡" cor="var(--orange)" :largura="520">
      <div v-if="msgGer" class="lx-alert" :class="msgGer.t">{{ msgGer.txt }}</div>
      <div class="lx-form">
        <div class="lx-field full"><label for="uc-ger-us">Usina</label>
          <select id="uc-ger-us" v-model="fGer.usina" class="lx-input">
            <option disabled value="">Selecione a usina…</option>
            <option v-for="u in usinas" :key="u.id" :value="u.id">{{ u.uc }} — {{ u.nome }}</option>
          </select>
        </div>
        <div class="lx-field full"><label for="uc-ger-p">Porcentagem (%)</label><input id="uc-ger-p" v-model="fGer.porcentagem" type="number" class="lx-input" placeholder="0" /></div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dlgGeradora = false">Fechar</button>
        <button class="lx-btn" style="--c1:var(--orange);--c2:var(--red)" :disabled="salvandoGer" @click="salvarGeradora">{{ salvandoGer ? 'Salvando…' : 'Salvar' }}</button>
      </template>
    </LxDialog>

    <!-- ═══ Dialog: nova / editar unidade ═══ -->
    <LxDialog v-model="dlgUnidade" :titulo="editando ? 'Editar unidade' : 'Nova unidade'" :subtitulo="editando ? `${fUni.uc} · ${fUni.nome}` : 'Cadastro de unidade consumidora'" :icone="editando ? '✎' : '+'" :cor="editando ? 'var(--purple)' : 'var(--green)'" :largura="720">
      <div v-if="msgUni" class="lx-alert" :class="msgUni.t">{{ msgUni.txt }}</div>
      <div class="lx-form">
        <div class="lx-field"><label>UC</label><input v-model="fUni.uc" type="number" class="lx-input" placeholder="Número da UC" /></div>
        <div class="lx-field"><label>Nome</label><input v-model="fUni.nome" class="lx-input" placeholder="Nome da unidade" /></div>
        <div class="lx-field"><label>Data início</label><input v-model="fUni.dataInicio" type="date" class="lx-input" /></div>
        <div class="lx-field"><label>Consumo médio (kWh)</label><input v-model="fUni.mediaConsumo" type="number" class="lx-input" placeholder="0" /></div>
        <div class="lx-field"><label>Valor kWh (R$)</label><input v-model="fUni.valorKWH" type="number" class="lx-input" placeholder="0,00" /></div>
        <div class="lx-field"><label>CEP</label><input v-model="fUni.cep" type="number" class="lx-input" placeholder="CEP" /></div>
        <div class="lx-field full"><label>Endereço</label><input v-model="fUni.endereco" class="lx-input" placeholder="Endereço completo" /></div>
        <div class="lx-field full"><label>Secretaria</label>
          <div class="lx-seg"><button v-for="s in SECS" :key="s.v" type="button" :class="{ on: fUni.secretaria === s.v }" :style="{ '--c': s.c }" @click="fUni.secretaria = s.v">{{ s.txt }}</button></div>
        </div>
        <div class="lx-field"><label>Status</label>
          <div class="lx-seg"><button v-for="st in STATUS" :key="st.v" type="button" :class="{ on: fUni.status === st.v }" :style="{ '--c': st.c }" @click="fUni.status = st.v">{{ st.um }}</button></div>
        </div>
        <div class="lx-field"><label>Tensão</label>
          <div class="lx-seg"><button v-for="t in ['BT', 'MT']" :key="t" type="button" :class="{ on: fUni.tensao === t }" @click="fUni.tensao = t">{{ t }}</button></div>
        </div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dlgUnidade = false">Fechar</button>
        <button class="lx-btn" :style="editando ? '--c1:var(--purple);--c2:var(--teal)' : '--c1:var(--green);--c2:var(--teal)'" :disabled="salvandoUni" @click="salvarUnidade">
          {{ salvandoUni ? 'Salvando…' : editando ? 'Salvar edição' : 'Adicionar' }}
        </button>
      </template>
    </LxDialog>

    <!-- ═══ Dialog: excluir unidade ═══ -->
    <LxDialog v-model="dlgExcluir" titulo="Excluir unidade" icone="!" cor="var(--red)" :largura="440">
      <p class="uc-excl">Tem certeza que deseja excluir esta unidade? Essa ação não pode ser desfeita.</p>
      <div v-if="atual" class="lx-dl">
        <div><span>UC</span><b>{{ atual.uc }}</b></div>
        <div><span>Nome</span><b>{{ atual.nome }}</b></div>
        <div><span>Secretaria</span><b>{{ secDe(atual.secretaria).txt }}</b></div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dlgExcluir = false">Cancelar</button>
        <button class="lx-btn danger" :disabled="excluindo" @click="excluirUnidade">{{ excluindo ? 'Excluindo…' : 'Confirmar exclusão' }}</button>
      </template>
    </LxDialog>

    <!-- ═══ Dialog: relatórios por ano ═══ -->
    <LxDialog v-model="dlgRelatorios" titulo="Relatórios da unidade" :subtitulo="atual ? `${atual.uc} · ${atual.nome}` : ''" icone="▤" cor="var(--teal)" :largura="820">
      <div v-if="carregandoRel && !relatorios.length" class="lx-loading"><span class="lx-spin"></span><b>Carregando relatórios…</b></div>
      <template v-else>
        <div class="uc-anos">
          <button v-for="a in anosRel" :key="a.ano" class="uc-ano" :class="{ on: anoRel === a.ano }" @click="anoRel = a.ano">
            {{ a.ano }}<small>{{ a.qtd }}/12</small>
          </button>
          <p v-if="!anosRel.length" class="uc-sem">Nenhum relatório lançado para esta unidade.</p>
        </div>
        <div v-if="anoRel" class="uc-meses">
          <article v-for="m in mesesRel" :key="m.mes" class="uc-mes" :class="{ vazio: !m.rel }">
            <header><b>{{ m.nome }}</b><span class="lx-mono">{{ MESES_CURTO[m.mes - 1] }}/{{ anoRel }}</span></header>
            <template v-if="m.rel">
              <div class="uc-mes-v"><span>Consumo</span><b>{{ nf(m.rel.consumokWh) }} kWh</b></div>
              <div class="uc-mes-v"><span>Valor</span><b>R$ {{ nf(m.rel.consumoReais, 2) }}</b></div>
              <div class="uc-mes-v"><span>Inj. TE</span><b>{{ nf(m.rel.enerInjTE) }} kWh</b></div>
              <div class="uc-mes-ac">
                <button class="lx-btn-ghost sm" style="--c:var(--purple)" @click="abrirEditarRel(m.rel)">Editar</button>
                <button class="lx-icon-btn uc-ib" style="--c:var(--red)" title="Excluir relatório" @click="excluirRelatorio(m.rel)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                </button>
              </div>
            </template>
            <button v-else class="uc-mes-add" @click="abrirNovoRel(null, m.mes, anoRel)">+ Lançar</button>
          </article>
        </div>
      </template>
      <template #rodape>
        <button class="lx-btn-ghost" style="--c:var(--green)" @click="abrirNovoRel(null)">+ Novo relatório</button>
        <span class="sp"></span>
        <button class="lx-btn-ghost" @click="dlgRelatorios = false">Fechar</button>
      </template>
    </LxDialog>

    <!-- ═══ Dialog: novo / editar relatório ═══ -->
    <LxDialog v-model="dlgRel" :titulo="relEditando ? `Editar relatório · ${MESES[fRel.mes - 1] ?? ''}/${fRel.ano}` : 'Novo relatório mensal'" :subtitulo="atual ? `${atual.uc} · ${atual.nome}` : ''"
      :icone="relEditando ? '✎' : '+'" :cor="relEditando ? 'var(--purple)' : 'var(--green)'" :largura="640">
      <div v-if="msgRel" class="lx-alert" :class="msgRel.t">{{ msgRel.txt }}</div>
      <div class="lx-form">
        <div class="lx-field"><label>Mês</label>
          <select v-model="fRel.mes" class="lx-input" :disabled="!!relEditando">
            <option disabled value="">Mês</option>
            <option v-for="(m, i) in MESES" :key="m" :value="i + 1">{{ m }}</option>
          </select>
        </div>
        <div class="lx-field"><label>Ano</label>
          <select v-model="fRel.ano" class="lx-input" :disabled="!!relEditando">
            <option disabled value="">Ano</option>
            <option v-for="a in ANOS_FORM" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div v-for="c in CAMPOS_REL" :key="c.k" class="lx-field"><label>{{ c.txt }}</label><input v-model="fRel[c.k]" type="number" step="0.01" class="lx-input" :placeholder="c.ph" /></div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dlgRel = false">Fechar</button>
        <button class="lx-btn" :style="relEditando ? '--c1:var(--purple);--c2:var(--teal)' : '--c1:var(--green);--c2:var(--teal)'" :disabled="salvandoRel" @click="salvarRel">
          {{ salvandoRel ? 'Salvando…' : relEditando ? 'Salvar edição' : 'Salvar' }}
        </button>
      </template>
    </LxDialog>

    <!-- aviso -->
    <Transition name="uc-toast">
      <div v-if="toast" class="uc-toast" :class="{ err: toast.erro }" role="status" @click="toast = null">{{ toast.txt }}</div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Secretarias ── */
.uc-secs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
.uc-sec {
  all: unset; box-sizing: border-box; cursor: pointer; position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 18px; background: var(--card); border: 1px solid var(--line); backdrop-filter: blur(10px);
  transition: transform .2s, border-color .2s, box-shadow .2s, background .2s;
}
.uc-sec::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: var(--c); box-shadow: 0 0 14px var(--c); }
.uc-sec:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.uc-sec.on { border-color: var(--c); box-shadow: 0 0 34px -14px var(--c); background: linear-gradient(135deg, color-mix(in srgb, var(--c) 16%, transparent), var(--card) 70%); }
.uc-sec:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.uc-sec-ic { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex: none; font-size: 16px; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.uc-sec-tx { display: flex; flex-direction: column; min-width: 0; }
.uc-sec-tx small { font-size: 11.5px; color: var(--mut); }
.uc-sec-tx b { font-size: 24px; font-weight: 700; line-height: 1.15; color: var(--c); }
.uc-sec-tx em { font-style: normal; font-size: 11px; color: var(--mut); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Status + tensão ── */
.uc-sts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, .9fr); gap: 12px; margin-bottom: 18px; }
.uc-st {
  all: unset; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: 18px; cursor: pointer;
  background: var(--card); border: 1px solid var(--line); backdrop-filter: blur(10px); transition: border-color .2s, box-shadow .2s;
}
button.uc-st:hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.uc-st.on { border-color: var(--c); box-shadow: 0 0 30px -14px var(--c); }
.uc-st:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.uc-st-hd { display: flex; align-items: center; justify-content: space-between; }
.uc-st-hd span { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--tx); }
.uc-st-hd span i { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }
.uc-st-hd b { font-size: 24px; font-weight: 700; color: var(--c); line-height: 1; }
.uc-st-bar { display: flex; height: 6px; border-radius: 99px; overflow: hidden; gap: 2px; background: rgba(255, 255, 255, .05); }
.uc-st-bar i { min-width: 0; }
.uc-st-sec { display: flex; flex-wrap: wrap; gap: 4px 10px; }
.uc-st-sec span { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--mut); }
.uc-st-sec span i { width: 6px; height: 6px; border-radius: 2px; background: var(--s); }
.uc-st-sec span b { color: var(--tx); font-weight: 600; }
.uc-st-sec span.zero { opacity: .45; }
.uc-tensao { cursor: default; --c: var(--teal); }
.uc-ten { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex: 1; }
.uc-ten button {
  all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 12px;
  background: rgba(255, 255, 255, .03); border: 1px solid var(--line2); transition: border-color .2s, background .2s;
}
.uc-ten button:hover { border-color: rgba(34, 197, 224, .45); }
.uc-ten button.on { border-color: var(--teal); background: rgba(34, 197, 224, .1); }
.uc-ten button:focus-visible { outline: 2px solid #fff; }
.uc-ten small { font-size: 10.5px; color: var(--mut); }
.uc-ten b { font-size: 20px; font-weight: 700; line-height: 1.1; }
.uc-ten em { font-style: normal; font: 600 10.5px var(--mono); color: var(--teal); }

/* ── Lista ── */
.uc-filtros { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.uc-busca { flex: 1 1 280px; }
.uc-ativos { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11.5px; color: var(--mut); margin-bottom: 10px; }
.uc-ativos .lx-pill { cursor: pointer; font-family: var(--font); }
.uc-nome { min-width: 220px; }
.uc-nome b { display: block; font-weight: 500; }
.uc-nome small { display: block; font-size: 11px; color: var(--mut); margin-top: 2px; max-width: 380px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uc-ten-pill { font: 600 11px var(--mono); padding: 3px 8px; border-radius: 8px; color: var(--teal); background: rgba(34, 197, 224, .12); }
.uc-ten-pill.mt { color: var(--purple); background: rgba(168, 85, 247, .14); }
.uc-off { font-size: 11px; color: var(--mut); }
.uc-acoes { display: inline-flex; gap: 4px; }
.uc-ib { --c: var(--teal); width: 30px; height: 30px; border-radius: 9px; color: var(--c); }
.uc-ib svg { width: 14px; height: 14px; }
.uc-ib:hover { background: color-mix(in srgb, var(--c) 16%, transparent); }
.uc-pag { display: flex; align-items: center; justify-content: center; gap: 12px; padding-top: 14px; font-size: 12.5px; color: var(--mut); }
.uc-pag b { color: var(--tx); }

/* ── Dialogs ── */
.uc-dlg-sec + .uc-dlg-sec { margin-top: 16px; }
.uc-dlg-sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
.uc-porc { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 12px; background: var(--card2); border: 1px solid var(--line2); margin-bottom: 6px; }
.uc-porc.hist { opacity: .7; }
.uc-porc-us { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.uc-porc-us b { font-size: 13px; font-weight: 500; }
.uc-porc-us small { font-size: 11px; color: var(--mut); }
.uc-porc-v { font: 600 14px var(--mono); color: var(--teal); }
.uc-excl { margin: 0 0 12px; font-size: 13px; color: var(--mut); }

.uc-anos { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.uc-ano {
  all: unset; cursor: pointer; display: inline-flex; align-items: baseline; gap: 6px; padding: 7px 14px; border-radius: 12px; font: 600 13px var(--font);
  border: 1px solid var(--line); color: var(--mut); background: rgba(255, 255, 255, .04); transition: background .2s, color .2s, border-color .2s;
}
.uc-ano small { font: 500 10.5px var(--mono); opacity: .8; }
.uc-ano:hover { color: var(--tx); }
.uc-ano.on { color: #06101a; background: var(--teal); border-color: transparent; box-shadow: 0 0 18px -4px var(--teal); }
.uc-ano:focus-visible { outline: 2px solid #fff; }
.uc-sem { margin: 0; font-size: 13px; color: var(--mut); }
.uc-meses { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
.uc-mes { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 14px; background: var(--card2); border: 1px solid var(--line); }
.uc-mes header { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; margin-bottom: 2px; }
.uc-mes header b { font-size: 13px; font-weight: 600; }
.uc-mes header .lx-mono { font-size: 10.5px; }
.uc-mes.vazio { border-style: dashed; background: transparent; }
.uc-mes.vazio header b { color: var(--mut); }
.uc-mes-v { display: flex; justify-content: space-between; gap: 6px; font-size: 11.5px; }
.uc-mes-v span { color: var(--mut); }
.uc-mes-v b { font-family: var(--mono); font-weight: 500; font-size: 11.5px; }
.uc-mes-ac { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 4px; padding-top: 8px; border-top: 1px dashed var(--line2); }
.uc-mes-add { all: unset; cursor: pointer; margin-top: auto; text-align: center; padding: 8px; border-radius: 10px; font-size: 12px; font-weight: 600; color: var(--green); background: rgba(52, 211, 122, .08); }
.uc-mes-add:hover { background: rgba(52, 211, 122, .16); }
.uc-mes-add:focus-visible { outline: 2px solid #fff; }

/* ── Aviso ── */
.uc-toast {
  position: fixed; left: 50%; bottom: 110px; transform: translateX(-50%); z-index: 3000; cursor: pointer; padding: 11px 18px; border-radius: 14px;
  font-size: 13px; font-weight: 500; color: var(--tx); background: var(--bg2); border: 1px solid rgba(52, 211, 122, .45);
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, .7), 0 0 30px -12px var(--green);
}
.uc-toast.err { border-color: rgba(255, 95, 109, .5); box-shadow: 0 10px 40px -10px rgba(0, 0, 0, .7), 0 0 30px -12px var(--red); }
.uc-toast-enter-active, .uc-toast-leave-active { transition: opacity .25s, transform .25s; }
.uc-toast-enter-from, .uc-toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }

@media (max-width: 1200px) { .uc-sts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 1000px) { .uc-secs { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 640px) { .uc-secs, .uc-sts { grid-template-columns: 1fr 1fr; } .uc-sec-tx em { display: none; } }
@media (max-width: 420px) { .uc-sts { grid-template-columns: 1fr; } }
</style>
