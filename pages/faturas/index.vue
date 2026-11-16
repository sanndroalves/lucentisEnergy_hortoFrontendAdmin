<script setup>
// Gerenciamento › Faturas CPFL — monitoramento da coleta automática de faturas.
//
// Backend: app `faturas` (rotas /faturas/...). A coleta roda sozinha a cada 5 dias
// (Celery Beat) e pode ser pedida aqui; o botão só ENFILEIRA (a resposta traz o id).
// Como a Cloudflare da CPFL bloqueia o Railway, quem chama a CPFL é o coletor local
// (notebook, Agendador de Tarefas a cada hora) — modo AGENTE. Por isso uma execução
// pode ficar "aguardando o coletor" até o notebook rodar.
//
// Todas as rotas exigem login (token do usuário no header Authorization).
// O topo é atualizado a cada 5 s enquanto há execução ativa (60 s sem execução).
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import { MESES } from '~/composables/useRelatorios';

useHead({ title: 'Faturas CPFL' });
definePageMeta({ middleware: 'sidebase-auth' });

const RAIZ = String(API_BASE_URL).replace(/\/+$/, '');
const BASE = `${RAIZ}/faturas/`;
const { token } = useAuth();
const hdr = () => (token.value ? { Authorization: token.value } : {});
const api = (caminho, opts = {}) => $fetch(BASE + caminho, { ...opts, headers: { ...hdr(), ...(opts.headers || {}) } });

// ── rótulos e cores ──
const ST_EX = {
  AGUARDANDO: { t: 'Aguardando', c: 'var(--mut)' }, EM_ANDAMENTO: { t: 'Em andamento', c: 'var(--teal)' },
  CONCLUIDA: { t: 'Concluída', c: 'var(--green)' }, PARCIAL: { t: 'Parcial', c: 'var(--orange)' }, ERRO: { t: 'Erro', c: 'var(--red)' },
};
const ST_UC = {
  PENDENTE: { t: 'Pendente', c: 'var(--mut)' }, EM_ANDAMENTO: { t: 'Em andamento', c: 'var(--teal)' },
  SEM_PENDENCIAS: { t: 'Sem pendências', c: 'var(--purple)' }, CONCLUIDA: { t: 'Concluída', c: 'var(--green)' },
  PARCIAL: { t: 'Parcial', c: 'var(--orange)' }, ERRO: { t: 'Erro', c: 'var(--red)' },
};
const SIT = {
  PAGA: { t: 'Paga', c: 'var(--green)' }, EM_ABERTO: { t: 'Em aberto', c: 'var(--teal)' },
  VENCIDA: { t: 'Vencida', c: 'var(--red)' }, INDETERMINADA: { t: 'Indeterminada', c: 'var(--mut)' },
};
const MOTIVO = {
  NAO_ENCONTRADA: { t: 'Não encontrada na CPFL', c: 'var(--orange)' },
  FORA_HISTORICO: { t: 'Antes do histórico da CPFL', c: 'var(--mut)' },
  UC_NAO_ENCONTRADA: { t: 'UC não localizada na CPFL', c: 'var(--red)' },
  FALHA_PROCESSAMENTO: { t: 'Falha no download/validação', c: 'var(--purple)' },
};
const EVENTO = {
  COLETADA: { t: 'Coletada', c: 'var(--green)' }, SITUACAO_ATUALIZADA: { t: 'Situação atualizada', c: 'var(--teal)' },
  NAO_ENCONTRADA: { t: 'Não encontrada', c: 'var(--orange)' }, ERRO: { t: 'Erro', c: 'var(--red)' },
  LISTAGEM: { t: 'Listagem CPFL', c: 'var(--mut)' }, SEM_PENDENCIAS: { t: 'Sem pendências', c: 'var(--purple)' },
  RELATORIO_EXISTENTE: { t: 'Relatório já existia', c: 'var(--mut)' },
};
const ERRO_TIPO = {
  AUTENTICACAO: 'Sessão CPFL expirada/inválida', BLOQUEIO_PORTAL: 'Bloqueio do portal (Cloudflare/CAPTCHA)',
  MUDANCA_INTERFACE: 'Possível mudança na API da CPFL', INDISPONIVEL: 'CPFL indisponível', UC_NAO_ENCONTRADA: 'UC não localizada na CPFL',
  CANCELADA: 'Cancelada', ABORTADA: 'Abortada (sessão/bloqueio)', INTERNO: 'Erro interno', ARMAZENAMENTO: 'Falha ao gravar o PDF (R2)',
};
const de = (mapa, k) => mapa[k] || { t: k || '—', c: 'var(--mut)' };

// ── formatação ──
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const int = (v) => Number(v || 0).toLocaleString('pt-BR');
const comp = (c) => { if (!c) return '—'; const [a, m] = String(c).split('-').map(Number); return `${MESES[m - 1].slice(0, 3)}/${a}`; };
const compAM = (a, m) => comp(`${a}-${m}`);
const data = (iso) => (iso ? new Date(String(iso).length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR') : '—');
const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const agora = ref(Date.now());
const rel = (iso) => {
  if (!iso) return '—';
  const s = Math.round((new Date(iso).getTime() - agora.value) / 1000), a = Math.abs(s);
  const t = a < 60 ? 'menos de 1 min' : a < 3600 ? `${Math.round(a / 60)} min` : a < 86400 ? `${Math.round(a / 3600)} h` : `${Math.round(a / 86400)} dia(s)`;
  return s < 0 ? `há ${t}` : `em ${t}`;
};
const dur = (a, b) => {
  if (!a) return '—';
  const s = Math.max(0, Math.round(((b ? new Date(b).getTime() : agora.value) - new Date(a).getTime()) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${m} min` : m ? `${m} min` : `${s} s`;
};
const pct = (p) => (p?.total ? Math.round((100 * p.ucs_processadas) / p.total) : 0);
const erroApi = (e, padrao) => e?.data?.error || e?.data?.detail || (e?.statusCode === 401 ? 'Sessão expirada: faça login de novo.' : padrao);

// ── toast ──
const toast = ref(null);
let tT = 0;
const avisar = (txt, err = false) => { toast.value = { txt, err }; clearTimeout(tT); tT = setTimeout(() => { toast.value = null; }, 4000); };

// ═══════════════ resumo (topo) ═══════════════
const resumo = ref(null);
const erroResumo = ref(null);
const ativa = computed(() => resumo.value?.execucao_ativa || null);
const cred = computed(() => resumo.value?.credencial || {});
const agenteModo = computed(() => cred.value.modo_coleta === 'AGENTE');

async function carregarResumo() {
  try { resumo.value = await api('resumo/'); erroResumo.value = null; }
  catch (e) { console.error(e); erroResumo.value = erroApi(e, e?.statusCode === 404 ? 'O backend ainda não tem o módulo de faturas (faça o deploy e o migrate).' : 'Falha ao carregar o resumo.'); }
}

const contatoAgente = computed(() => {
  const iso = cred.value.ultimo_contato_agente;
  if (!iso) return { t: 'nunca conectou', c: 'var(--red)' };
  const h = (agora.value - new Date(iso).getTime()) / 3600000;
  return { t: rel(iso), c: h < 2 ? 'var(--green)' : h < 26 ? 'var(--orange)' : 'var(--red)' };
});
const sessaoExpira = computed(() => {
  const iso = cred.value.refresh_expira_em;
  if (!iso) return null;
  const d = (new Date(iso).getTime() - agora.value) / 86400000;
  return { t: rel(iso), c: d < 0 ? 'var(--red)' : d < 2 ? 'var(--orange)' : 'var(--green)', vencida: d < 0 };
});

// avisos que exigem ação
const alertas = computed(() => {
  const r = resumo.value, c = cred.value, out = [];
  if (!r) return out;
  if (!c.configurada) out.push({ t: 'err', txt: 'Credencial CPFL não configurada. Cadastre o refresh_token em Admin › Credenciais CPFL.' });
  else if (!c.ativo) out.push({ t: 'warn', txt: 'A credencial CPFL está desativada: a coleta automática não roda.' });
  if (c.falhas_consecutivas > 0) out.push({ t: 'err', txt: `Falha na sessão CPFL (${c.falhas_consecutivas}x): ${c.ultimo_erro || 'sem detalhe'}. Faça login no portal Poder Público e cole o novo refresh_token no Admin.` });
  if (sessaoExpira.value?.vencida) out.push({ t: 'err', txt: 'A sessão CPFL expirou. É preciso um novo refresh_token (Admin › Credenciais CPFL).' });
  else if (sessaoExpira.value?.c === 'var(--orange)') out.push({ t: 'warn', txt: `A sessão CPFL expira ${sessaoExpira.value.t}. Rode o coletor local para renovar.` });
  if (agenteModo.value && c.configurada && contatoAgente.value.c === 'var(--red)')
    out.push({ t: 'warn', txt: `O coletor local (notebook) não fala com o Lucentis ${cred.value.ultimo_contato_agente ? contatoAgente.value.t : 'desde a instalação'}. Verifique se o notebook está ligado e a tarefa agendada ativa.` });
  if (r.armazenamento === 'LOCAL') out.push({ t: 'warn', txt: 'Os PDFs estão sendo gravados no disco do servidor (R2 não configurado). No Railway esse disco é apagado a cada deploy.' });
  return out;
});
const podeSolicitar = computed(() => resumo.value && cred.value.configurada && cred.value.ativo && !ativa.value);

// ═══════════════ abas ═══════════════
const aba = ref('execucoes');
try { const s = localStorage.getItem('lx-faturas-aba'); if (s) aba.value = s; } catch { /* sem storage */ }
watch(aba, (v) => { try { localStorage.setItem('lx-faturas-aba', v); } catch { /* sem storage */ } });
const ABAS = [
  { k: 'execucoes', t: 'Execuções', c: 'var(--purple)' },
  { k: 'faturas', t: 'Faturas', c: 'var(--teal)' },
  { k: 'ausentes', t: 'Competências ausentes', c: 'var(--orange)' },
];

// ── execuções ──
const PAG_EX = 15;
const exec = ref({ lista: [], total: 0, carregando: false, erro: null });
async function carregarExecucoes(mais = false) {
  exec.value.carregando = true;
  try {
    const r = await api(`coletas/?limit=${PAG_EX}&offset=${mais ? exec.value.lista.length : 0}`);
    exec.value.lista = mais ? [...exec.value.lista, ...r.results] : r.results;
    exec.value.total = r.count; exec.value.erro = null;
  } catch (e) { console.error(e); exec.value.erro = erroApi(e, 'Falha ao carregar as execuções.'); }
  finally { exec.value.carregando = false; }
}

// ── faturas ──
const PAG_FT = 50;
const anoAtual = new Date().getFullYear();
const ANOS = Array.from({ length: 9 }, (_, i) => anoAtual - i);
const ff = ref({ busca: '', ano: '', situacao: '' });
const fat = ref({ lista: [], total: 0, offset: 0, carregando: false, erro: null });
async function carregarFaturas(offset = 0) {
  fat.value.carregando = true;
  const q = new URLSearchParams({ limit: PAG_FT, offset });
  if (ff.value.busca.trim()) q.set('busca', ff.value.busca.trim());
  if (ff.value.ano) q.set('ano', ff.value.ano);
  if (ff.value.situacao) q.set('situacao', ff.value.situacao);
  try {
    const r = await api(`?${q}`);
    fat.value = { lista: r.results, total: r.count, offset, carregando: false, erro: null };
  } catch (e) { console.error(e); fat.value.erro = erroApi(e, 'Falha ao carregar as faturas.'); fat.value.carregando = false; }
}

// ── competências ausentes ──
const PAG_AU = 50;
const fa = ref({ busca: '', motivo: '', resolvidas: false });
const aus = ref({ lista: [], total: 0, offset: 0, carregando: false, erro: null });
const ausAberta = ref(null);
async function carregarAusentes(offset = 0) {
  aus.value.carregando = true;
  const q = new URLSearchParams({ limit: PAG_AU, offset });
  if (fa.value.busca.trim()) q.set('busca', fa.value.busca.trim());
  if (fa.value.motivo) q.set('motivo', fa.value.motivo);
  if (!fa.value.resolvidas) q.set('resolvida', 'false');
  try {
    const r = await api(`ausentes/?${q}`);
    aus.value = { lista: r.results, total: r.count, offset, carregando: false, erro: null };
  } catch (e) { console.error(e); aus.value.erro = erroApi(e, 'Falha ao carregar as competências ausentes.'); aus.value.carregando = false; }
}

let tBusca = 0;
watch(() => [ff.value.ano, ff.value.situacao], () => carregarFaturas(0));
watch(() => ff.value.busca, () => { clearTimeout(tBusca); tBusca = setTimeout(() => carregarFaturas(0), 350); });
watch(() => [fa.value.motivo, fa.value.resolvidas], () => carregarAusentes(0));
watch(() => fa.value.busca, () => { clearTimeout(tBusca); tBusca = setTimeout(() => carregarAusentes(0), 350); });

const faixa = (o, n, total) => (total ? `${o + 1}–${Math.min(o + n, total)} de ${int(total)}` : '0');

// ── PDF ──
const abrindoPdf = ref(null);
async function abrirPdf(f) {
  const w = window.open('', '_blank'); // abre já no clique (evita bloqueio de pop-up)
  abrindoPdf.value = f.id;
  try {
    const r = await api(`${f.id}/pdf/?link=1`);
    if (r?.url) { if (w) w.location.href = r.url; else window.location.href = r.url; return; }
    const blob = await api(`${f.id}/pdf/`, { responseType: 'blob' });
    const url = URL.createObjectURL(blob);
    if (w) w.location.href = url; else window.open(url, '_blank');
  } catch (e) { console.error(e); w?.close(); avisar(erroApi(e, 'Não foi possível abrir o PDF.'), true); }
  finally { abrindoPdf.value = null; }
}

// ═══════════════ detalhe da execução ═══════════════
const det = ref({ aberto: false, id: null, ex: null, carregando: false, filtro: '', busca: '', ucAberta: null });
async function abrirDetalhe(id) {
  det.value = { aberto: true, id, ex: null, carregando: true, filtro: '', busca: '', ucAberta: null };
  await carregarDetalhe();
}
async function carregarDetalhe() {
  const id = det.value.id;
  if (!id) return;
  try { const ex = await api(`coletas/${id}/`); if (det.value.id === id) det.value.ex = ex; }
  catch (e) { console.error(e); avisar(erroApi(e, 'Falha ao carregar a execução.'), true); }
  finally { det.value.carregando = false; }
}
const ucsDet = computed(() => {
  const ex = det.value.ex;
  if (!ex) return [];
  const b = det.value.busca.trim().toLowerCase();
  const ordem = { EM_ANDAMENTO: 0, ERRO: 1, PARCIAL: 2, PENDENTE: 3, CONCLUIDA: 4, SEM_PENDENCIAS: 5 };
  return ex.ucs
    .filter(u => !det.value.filtro || u.status === det.value.filtro)
    .filter(u => !b || String(u.uc).includes(b) || String(u.nome || '').toLowerCase().includes(b))
    .sort((a, z) => (ordem[a.status] ?? 9) - (ordem[z.status] ?? 9) || String(a.nome).localeCompare(String(z.nome)));
});
const ativaDet = computed(() => det.value.ex && ['AGUARDANDO', 'EM_ANDAMENTO'].includes(det.value.ex.status));

// ── cancelar ──
const cancelando = ref(false);
async function cancelar(ex) {
  if (!confirm(`Cancelar a execução #${ex.id}? O que já foi coletado fica gravado; as UCs que faltam serão tentadas na próxima coleta.`)) return;
  cancelando.value = true;
  try {
    await api(`coletas/${ex.id}/cancelar/`, { method: 'POST', body: {} });
    avisar(`Execução #${ex.id} cancelada.`);
    await Promise.all([carregarResumo(), carregarExecucoes(), det.value.id === ex.id ? carregarDetalhe() : null]);
  } catch (e) { console.error(e); avisar(erroApi(e, 'Não foi possível cancelar.'), true); }
  finally { cancelando.value = false; }
}

// ═══════════════ solicitar coleta ═══════════════
const sol = ref({ aberto: false, modo: 'todas', busca: '', sel: new Set(), enviando: false, msg: null });
const unidades = ref(null);
async function abrirSolicitar() {
  sol.value = { aberto: true, modo: 'todas', busca: '', sel: new Set(), enviando: false, msg: null };
  if (!unidades.value) {
    try { unidades.value = await $fetch(`${RAIZ}/unidadecompensacao`); }
    catch (e) { console.error(e); unidades.value = []; }
  }
}
const ucsFiltradas = computed(() => {
  const b = sol.value.busca.trim().toLowerCase();
  return (unidades.value || [])
    .filter(u => !b || String(u.uc).includes(b) || String(u.nome || '').toLowerCase().includes(b))
    .sort((a, z) => String(a.nome).localeCompare(String(z.nome)));
});
const alternar = (id) => { const s = new Set(sol.value.sel); s.has(id) ? s.delete(id) : s.add(id); sol.value.sel = s; };
const marcarVisiveis = () => { const s = new Set(sol.value.sel); ucsFiltradas.value.forEach(u => s.add(u.id)); sol.value.sel = s; };
const STATUS_UC_CAD = { L: { t: 'Ligada', c: 'var(--green)' }, D: { t: 'Desligada', c: 'var(--mut)' } };

async function solicitar() {
  const s = sol.value;
  if (s.modo === 'algumas' && !s.sel.size) { s.msg = 'Selecione pelo menos uma UC.'; return; }
  s.enviando = true; s.msg = null;
  try {
    const r = await api('coletas/', { method: 'POST', body: { unidades: s.modo === 'algumas' ? [...s.sel] : [] } });
    s.aberto = false;
    avisar(r.criada ? `Coleta #${r.id} enfileirada.` : `Já existe uma coleta em andamento (#${r.id}).`, !r.criada);
    aba.value = 'execucoes';
    await Promise.all([carregarResumo(), carregarExecucoes()]);
    abrirDetalhe(r.id);
  } catch (e) { console.error(e); s.msg = erroApi(e, 'Não foi possível solicitar a coleta.'); }
  finally { s.enviando = false; }
}

// ═══════════════ atualização automática ═══════════════
let timer = 0, relogio = 0;
const ativaAntes = ref(null);
async function tick() {
  if (!document.hidden) {
    await carregarResumo();
    const id = ativa.value?.id ?? null;
    if (ativaAntes.value && ativaAntes.value !== id) {
      // a execução terminou: atualiza listas
      carregarExecucoes(); carregarFaturas(fat.value.offset); carregarAusentes(aus.value.offset);
    } else if (id && aba.value === 'execucoes') {
      const i = exec.value.lista.findIndex(x => x.id === id);
      if (i >= 0) exec.value.lista[i] = ativa.value; else carregarExecucoes();
    }
    ativaAntes.value = id;
    if (det.value.aberto && ativaDet.value) carregarDetalhe();
  }
  timer = setTimeout(tick, ativa.value ? 5000 : 60000);
}
async function atualizarTudo() {
  await Promise.all([carregarResumo(), carregarExecucoes(), carregarFaturas(fat.value.offset), carregarAusentes(aus.value.offset)]);
}
onMounted(async () => {
  relogio = setInterval(() => { agora.value = Date.now(); }, 30000);
  await atualizarTudo();
  ativaAntes.value = ativa.value?.id ?? null;
  timer = setTimeout(tick, ativa.value ? 5000 : 60000);
});
onBeforeUnmount(() => { clearTimeout(timer); clearInterval(relogio); clearTimeout(tT); clearTimeout(tBusca); });

// ── KPIs ──
const sitR = (k) => resumo.value?.faturas?.por_situacao?.[k] || { qtd: 0, valor: 0 };
const KPIS = computed(() => {
  const f = resumo.value?.faturas;
  return [
    { t: 'Faturas coletadas', v: int(f?.total), s: f ? `${int(f.ucs_com_fatura)} de ${int(f.ucs_total)} UCs com fatura` : '', c: 'var(--purple)', i: '▤' },
    { t: 'Pagas', v: int(sitR('PAGA').qtd), s: brl(sitR('PAGA').valor), c: 'var(--green)', i: '✓', f: 'PAGA' },
    { t: 'Em aberto', v: int(sitR('EM_ABERTO').qtd), s: brl(sitR('EM_ABERTO').valor), c: 'var(--teal)', i: '◷', f: 'EM_ABERTO' },
    { t: 'Vencidas', v: int(sitR('VENCIDA').qtd), s: brl(sitR('VENCIDA').valor), c: 'var(--red)', i: '!', f: 'VENCIDA' },
    { t: 'Competências ausentes', v: int(resumo.value?.ausentes?.total), s: 'não encontradas / com falha', c: 'var(--orange)', i: '?', a: true },
  ];
});
const irKpi = (k) => {
  if (k.f) { aba.value = 'faturas'; ff.value.situacao = k.f; }
  else if (k.a) aba.value = 'ausentes';
  else { aba.value = 'faturas'; ff.value.situacao = ''; }
};
const aguardandoColetor = computed(() => {
  const a = ativa.value;
  return a && agenteModo.value && !a.progresso?.ucs_processadas && !a.progresso?.por_status?.EM_ANDAMENTO;
});
</script>

<template>
  <div class="lx-page">
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span><span>Gerenciamento</span><span class="sep">›</span><b>Faturas</b>
        </nav>
        <h1 class="lx-title">Faturas <span class="grad">CPFL</span></h1>
        <p class="lx-sub">Coleta automática das faturas pagas e em aberto · execuções, monitoramento e histórico</p>
      </div>
      <div class="lx-head-actions">
        <button class="lx-btn-ghost" style="--c:var(--teal)" @click="atualizarTudo">↻ Atualizar</button>
        <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" :disabled="!podeSolicitar"
          :title="ativa ? 'Já existe uma execução em andamento' : ''" @click="abrirSolicitar">+ Solicitar coleta</button>
      </div>
    </header>

    <div v-if="erroResumo" class="lx-alert err">
      {{ erroResumo }}
      <button class="lx-btn-ghost sm" style="margin-left:auto" @click="atualizarTudo">Tentar de novo</button>
    </div>
    <div v-for="(a, i) in alertas" :key="i" class="lx-alert" :class="a.t">{{ a.txt }}</div>

    <!-- ═══ status ═══ -->
    <section class="ft-top">
      <!-- execução ativa / última -->
      <article v-if="!resumo" class="ft-card"><span class="lx-skel ft-sk"></span><span class="lx-skel ft-sk2"></span></article>
      <article v-else-if="ativa" class="ft-card ft-live" style="--c:var(--teal);--c2:var(--purple)">
        <div class="ft-card-hd">
          <span class="ft-lb"><i class="ft-pulse"></i>Execução #{{ ativa.id }} · {{ ativa.origem === 'MANUAL' ? 'manual' : 'agendada' }}</span>
          <span class="lx-pill" :style="{ '--c': de(ST_EX, ativa.status).c }"><i></i>{{ de(ST_EX, ativa.status).t }}</span>
        </div>
        <b class="ft-big">{{ ativa.progresso.ucs_processadas }}<small> / {{ ativa.progresso.total || '—' }} UCs</small></b>
        <div class="ft-bar" role="progressbar" :aria-valuenow="pct(ativa.progresso)" aria-valuemin="0" aria-valuemax="100">
          <span :style="{ width: pct(ativa.progresso) + '%' }"></span>
        </div>
        <div class="ft-chips">
          <span v-for="(n, s) in ativa.progresso.por_status" :key="s" class="lx-pill" :style="{ '--c': de(ST_UC, s).c }">{{ de(ST_UC, s).t }} {{ n }}</span>
          <span class="lx-pill" style="--c:var(--green)">{{ ativa.progresso.faturas_ate_agora }} fatura(s) nova(s)</span>
        </div>
        <p v-if="aguardandoColetor" class="ft-note">Aguardando o coletor local: o notebook roda a cada hora (ou execute o <b>executar.bat</b>).</p>
        <p class="ft-meta">Criada {{ rel(ativa.criado_em) }}<template v-if="ativa.iniciado_em"> · rodando há {{ dur(ativa.iniciado_em) }}</template><template v-if="ativa.solicitado_por"> · {{ ativa.solicitado_por }}</template></p>
        <div class="ft-card-ac">
          <button class="lx-btn sm" style="--c1:var(--teal);--c2:var(--purple)" @click="abrirDetalhe(ativa.id)">Acompanhar</button>
          <button class="lx-btn-ghost sm danger" :disabled="cancelando" @click="cancelar(ativa)">Cancelar</button>
        </div>
      </article>
      <article v-else class="ft-card" :style="{ '--c': resumo.ultima_execucao ? de(ST_EX, resumo.ultima_execucao.status).c : 'var(--mut)', '--c2': 'var(--purple)' }">
        <div class="ft-card-hd">
          <span class="ft-lb">Última execução</span>
          <span v-if="resumo.ultima_execucao" class="lx-pill" :style="{ '--c': de(ST_EX, resumo.ultima_execucao.status).c }"><i></i>{{ de(ST_EX, resumo.ultima_execucao.status).t }}</span>
        </div>
        <template v-if="resumo.ultima_execucao">
          <b class="ft-big">#{{ resumo.ultima_execucao.id }}<small> {{ rel(resumo.ultima_execucao.finalizado_em || resumo.ultima_execucao.criado_em) }}</small></b>
          <div class="ft-chips">
            <span class="lx-pill" style="--c:var(--green)">{{ resumo.ultima_execucao.faturas_novas }} nova(s)</span>
            <span class="lx-pill" style="--c:var(--teal)">{{ resumo.ultima_execucao.faturas_atualizadas }} situação(ões) atualizada(s)</span>
            <span class="lx-pill">{{ resumo.ultima_execucao.total_ucs }} UCs</span>
          </div>
          <p v-if="resumo.ultima_execucao.erro" class="ft-note err">{{ resumo.ultima_execucao.erro }}</p>
          <p class="ft-meta">{{ resumo.ultima_execucao.origem === 'MANUAL' ? 'Manual' : 'Agendada' }} · duração {{ dur(resumo.ultima_execucao.iniciado_em, resumo.ultima_execucao.finalizado_em) }}</p>
          <div class="ft-card-ac"><button class="lx-btn-ghost sm" @click="abrirDetalhe(resumo.ultima_execucao.id)">Ver detalhes</button></div>
        </template>
        <p v-else class="ft-meta">Nenhuma coleta foi executada ainda.</p>
      </article>

      <!-- coletor e sessão -->
      <article class="ft-card" style="--c:var(--purple);--c2:var(--teal)">
        <div class="ft-card-hd">
          <span class="ft-lb">Coletor e sessão CPFL</span>
          <span v-if="resumo" class="lx-pill" :style="{ '--c': cred.configurada && cred.ativo && !cred.falhas_consecutivas ? 'var(--green)' : 'var(--red)' }">
            <i></i>{{ !cred.configurada ? 'Não configurada' : !cred.ativo ? 'Desativada' : cred.falhas_consecutivas ? 'Com falha' : 'Ativa' }}
          </span>
        </div>
        <div v-if="resumo" class="lx-dl ft-dl">
          <div><span>Quem acessa a CPFL</span><b>{{ agenteModo ? 'Coletor local (notebook)' : 'Servidor (Railway)' }}</b></div>
          <div v-if="agenteModo"><span>Último contato do coletor</span><b :style="{ color: contatoAgente.c }">{{ contatoAgente.t }}</b></div>
          <div><span>Sessão válida até</span><b :style="{ color: sessaoExpira?.c }">{{ cred.refresh_expira_em ? `${dataHora(cred.refresh_expira_em)} (${sessaoExpira.t})` : '—' }}</b></div>
          <div><span>Última renovação</span><b>{{ cred.ultima_renovacao ? rel(cred.ultima_renovacao) : '—' }}</b></div>
        </div>
        <span v-else class="lx-skel ft-sk2"></span>
      </article>

      <!-- agenda -->
      <article class="ft-card" style="--c:var(--green);--c2:var(--teal)">
        <div class="ft-card-hd"><span class="ft-lb">Coleta automática</span></div>
        <template v-if="resumo">
          <template v-if="resumo.agendamento">
            <b class="ft-big ft-big-sm">{{ resumo.agendamento.ativo ? (resumo.agendamento.proxima ? data(resumo.agendamento.proxima) : 'em breve') : 'Desligada' }}</b>
            <p class="ft-meta">
              <template v-if="resumo.agendamento.ativo">Próxima coleta {{ resumo.agendamento.proxima ? rel(resumo.agendamento.proxima) : '' }} · a cada {{ resumo.agendamento.a_cada_dias }} dias</template>
              <template v-else>O agendamento está desativado no Admin (Periodic tasks).</template>
            </p>
            <p v-if="resumo.agendamento.ultima" class="ft-meta">Última disparada {{ rel(resumo.agendamento.ultima) }}</p>
          </template>
          <p v-else class="ft-meta">Agendamento não encontrado (rode o migrate do app faturas).</p>
          <ul class="ft-regras">
            <li>Só busca as competências que faltam, até o mês anterior, inclusive lacunas no meio do histórico</li>
            <li>Atualiza a situação de pagamento sem duplicar faturas</li>
            <li>PDFs guardados {{ resumo.armazenamento === 'R2' ? 'no Cloudflare R2' : 'no disco do servidor' }}</li>
          </ul>
        </template>
        <span v-else class="lx-skel ft-sk2"></span>
      </article>
    </section>

    <!-- ═══ KPIs ═══ -->
    <div class="lx-kpis">
      <button v-for="k in KPIS" :key="k.t" class="lx-kpi ft-kpi" :style="{ '--c': k.c }" @click="irKpi(k)">
        <span class="ico">{{ k.i }}</span>
        <span>{{ k.t }}</span>
        <b v-if="resumo">{{ k.v }}</b><span v-else class="lx-skel ft-sk3"></span>
        <small>{{ resumo ? k.s : '' }}</small>
      </button>
    </div>

    <!-- ═══ abas ═══ -->
    <section class="lx-panel">
      <div class="ft-tabs">
        <div class="lx-seg" role="tablist">
          <button v-for="t in ABAS" :key="t.k" role="tab" :aria-selected="aba === t.k" :class="{ on: aba === t.k }" :style="{ '--c': t.c }" @click="aba = t.k">
            {{ t.t }}
            <span class="ft-cnt">{{ t.k === 'execucoes' ? exec.total : t.k === 'faturas' ? fat.total : aus.total }}</span>
          </button>
        </div>
      </div>

      <!-- ── Execuções ── -->
      <div v-if="aba === 'execucoes'">
        <div v-if="exec.erro" class="lx-alert err">{{ exec.erro }}</div>
        <div v-if="exec.carregando && !exec.lista.length" class="lx-loading"><span class="lx-spin"></span><b>Carregando execuções…</b></div>
        <div v-else-if="!exec.lista.length" class="lx-empty">Nenhuma execução ainda. Use "Solicitar coleta" ou aguarde a coleta automática.</div>
        <div v-else class="lx-tbl-wrap">
          <table class="lx-tbl">
            <thead><tr>
              <th>#</th><th>Status</th><th>Origem</th><th>Criada</th><th>Duração</th><th>UCs</th>
              <th class="r">Novas</th><th class="r">Situações atualizadas</th><th>Solicitada por</th><th></th>
            </tr></thead>
            <tbody>
              <tr v-for="x in exec.lista" :key="x.id" class="ft-click" @click="abrirDetalhe(x.id)">
                <td class="lx-mono">#{{ x.id }}</td>
                <td><span class="lx-pill" :style="{ '--c': de(ST_EX, x.status).c }"><i></i>{{ de(ST_EX, x.status).t }}</span></td>
                <td>{{ x.origem === 'MANUAL' ? 'Manual' : 'Agendada' }}<span v-if="x.unidades_filtro?.length" class="ft-sub"> · {{ x.unidades_filtro.length }} UC(s)</span></td>
                <td>{{ dataHora(x.criado_em) }}</td>
                <td>{{ x.iniciado_em ? dur(x.iniciado_em, x.finalizado_em) : '—' }}</td>
                <td>
                  <div class="ft-mini">
                    <div class="ft-bar sm"><span :style="{ width: pct(x.progresso) + '%', background: de(ST_EX, x.status).c }"></span></div>
                    <span class="lx-mono">{{ x.progresso.ucs_processadas }}/{{ x.total_ucs }}</span>
                  </div>
                  <span v-if="x.progresso.por_status?.ERRO" class="ft-sub" style="color:var(--red)">{{ x.progresso.por_status.ERRO }} com erro</span>
                </td>
                <td class="r"><b>{{ ['AGUARDANDO', 'EM_ANDAMENTO'].includes(x.status) ? x.progresso.faturas_ate_agora : x.faturas_novas }}</b></td>
                <td class="r">{{ x.faturas_atualizadas }}</td>
                <td class="ft-sub">{{ x.solicitado_por || (x.origem === 'AGENDADA' ? 'automático' : '—') }}</td>
                <td class="r">
                  <button class="lx-icon-btn ft-ib" style="--c:var(--purple)" title="Ver detalhes" @click.stop="abrirDetalhe(x.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="exec.lista.length < exec.total" class="ft-mais">
            <button class="lx-btn-ghost sm" :disabled="exec.carregando" @click="carregarExecucoes(true)">{{ exec.carregando ? 'Carregando…' : `Carregar mais (${exec.total - exec.lista.length})` }}</button>
          </div>
        </div>
      </div>

      <!-- ── Faturas ── -->
      <div v-else-if="aba === 'faturas'">
        <div class="lx-filtros ft-filtros">
          <div class="lx-field grow"><label for="ft-b">Buscar</label>
            <div class="lx-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input id="ft-b" v-model="ff.busca" class="lx-input" placeholder="UC ou nome da unidade" />
            </div>
          </div>
          <div class="lx-field"><label for="ft-a">Ano</label>
            <select id="ft-a" v-model="ff.ano" class="lx-input"><option value="">Todos</option><option v-for="a in ANOS" :key="a" :value="a">{{ a }}</option></select>
          </div>
          <div class="lx-field"><label>Situação</label>
            <div class="lx-seg">
              <button :class="{ on: !ff.situacao }" @click="ff.situacao = ''">Todas</button>
              <button v-for="(s, k) in SIT" :key="k" :class="{ on: ff.situacao === k }" :style="{ '--c': s.c }" @click="ff.situacao = k">{{ s.t }}</button>
            </div>
          </div>
        </div>
        <div v-if="fat.erro" class="lx-alert err">{{ fat.erro }}</div>
        <div v-if="fat.carregando && !fat.lista.length" class="lx-loading"><span class="lx-spin"></span><b>Carregando faturas…</b></div>
        <div v-else-if="!fat.lista.length" class="lx-empty">Nenhuma fatura encontrada com esses filtros.</div>
        <div v-else class="lx-tbl-wrap" :class="{ 'ft-fade': fat.carregando }">
          <table class="lx-tbl">
            <thead><tr>
              <th>Competência</th><th>Unidade</th><th>Vencimento</th><th class="r">Valor</th><th>Situação</th><th>Pagamento</th><th>Nº conta</th><th>Coletada</th><th></th>
            </tr></thead>
            <tbody>
              <tr v-for="f in fat.lista" :key="f.id">
                <td><b>{{ comp(f.competencia) }}</b><span v-if="f.tipo_fatura && f.tipo_fatura !== 'FA'" class="ft-sub"> · {{ f.tipo_fatura }}</span></td>
                <td><div class="ft-uc"><b>{{ f.nome || '—' }}</b><span class="lx-mono">{{ f.uc }}</span></div></td>
                <td>{{ data(f.data_vencimento) }}</td>
                <td class="r"><b>{{ f.valor_total == null ? '—' : brl(f.valor_total) }}</b></td>
                <td><span class="lx-pill" :style="{ '--c': de(SIT, f.situacao).c }"><i></i>{{ de(SIT, f.situacao).t }}</span></td>
                <td>{{ data(f.data_pagamento) }}</td>
                <td class="lx-mono">{{ f.numero_conta_energia }}</td>
                <td class="ft-sub">{{ dataHora(f.coletado_em) }}</td>
                <td class="r">
                  <button class="lx-icon-btn ft-ib" style="--c:var(--teal)" title="Abrir PDF" :disabled="abrindoPdf === f.id" @click="abrirPdf(f)">
                    <span v-if="abrindoPdf === f.id" class="lx-spin" style="width:12px;height:12px"></span>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="fat.total > PAG_FT" class="ft-pag">
          <span>{{ faixa(fat.offset, PAG_FT, fat.total) }}</span>
          <button class="lx-btn-ghost sm" :disabled="!fat.offset || fat.carregando" @click="carregarFaturas(Math.max(0, fat.offset - PAG_FT))">‹ Anterior</button>
          <button class="lx-btn-ghost sm" :disabled="fat.offset + PAG_FT >= fat.total || fat.carregando" @click="carregarFaturas(fat.offset + PAG_FT)">Próxima ›</button>
        </div>
      </div>

      <!-- ── Competências ausentes ── -->
      <div v-else>
        <p class="ft-expl">
          Competências que faltam no Lucentis e não puderam ser coletadas. Elas são verificadas de novo a cada execução
          (exceto as anteriores ao histórico da CPFL) e somem daqui quando a fatura é encontrada.
        </p>
        <div class="lx-filtros ft-filtros">
          <div class="lx-field grow"><label for="au-b">Buscar</label>
            <div class="lx-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input id="au-b" v-model="fa.busca" class="lx-input" placeholder="UC ou nome da unidade" />
            </div>
          </div>
          <div class="lx-field"><label for="au-m">Motivo</label>
            <select id="au-m" v-model="fa.motivo" class="lx-input">
              <option value="">Todos</option>
              <option v-for="(m, k) in MOTIVO" :key="k" :value="k">{{ m.t }}{{ resumo?.ausentes?.por_motivo?.[k] ? ` (${resumo.ausentes.por_motivo[k]})` : '' }}</option>
            </select>
          </div>
          <label class="ft-check"><input v-model="fa.resolvidas" type="checkbox" /> Incluir resolvidas</label>
        </div>
        <div v-if="aus.erro" class="lx-alert err">{{ aus.erro }}</div>
        <div v-if="aus.carregando && !aus.lista.length" class="lx-loading"><span class="lx-spin"></span><b>Carregando…</b></div>
        <div v-else-if="!aus.lista.length" class="lx-empty">Nenhuma competência ausente. 🎉</div>
        <div v-else class="lx-tbl-wrap" :class="{ 'ft-fade': aus.carregando }">
          <table class="lx-tbl">
            <thead><tr><th>Competência</th><th>Unidade</th><th>Motivo</th><th class="c">Verificações</th><th>Primeira</th><th>Última</th><th></th></tr></thead>
            <tbody>
              <template v-for="a in aus.lista" :key="a.id">
                <tr class="ft-click" @click="ausAberta = ausAberta === a.id ? null : a.id">
                  <td><b>{{ compAM(a.ano, a.mes) }}</b><span v-if="a.resolvida" class="lx-pill" style="--c:var(--green);margin-left:6px">resolvida</span></td>
                  <td><div class="ft-uc"><b>{{ a.nome || '—' }}</b><span class="lx-mono">{{ a.uc }}</span></div></td>
                  <td><span class="lx-pill" :style="{ '--c': de(MOTIVO, a.motivo).c }"><i></i>{{ de(MOTIVO, a.motivo).t }}</span></td>
                  <td class="c">{{ a.verificacoes }}</td>
                  <td class="ft-sub">{{ dataHora(a.primeira_verificacao) }}</td>
                  <td class="ft-sub">{{ dataHora(a.ultima_verificacao) }}</td>
                  <td class="r"><span class="ft-chev" :class="{ on: ausAberta === a.id }">›</span></td>
                </tr>
                <tr v-if="ausAberta === a.id" class="ft-exp">
                  <td colspan="7">
                    <div class="ft-evid">
                      <b>Evidência</b>
                      <p v-if="a.evidencia?.erro">Erro: <span class="lx-mono">{{ a.evidencia.erro }}</span><template v-if="a.evidencia.numero_conta"> · conta {{ a.evidencia.numero_conta }}</template></p>
                      <template v-if="a.evidencia?.listadas_pela_cpfl">
                        <p>Na última verificação ({{ dataHora(a.evidencia.verificado_em) }}) a CPFL listou {{ a.evidencia.listadas_pela_cpfl.length }} competência(s){{ a.evidencia.listadas_pela_cpfl.length ? `, de ${comp(a.evidencia.listadas_pela_cpfl[0])} a ${comp(a.evidencia.listadas_pela_cpfl.at(-1))}` : '' }}, e {{ compAM(a.ano, a.mes) }} não estava entre elas.</p>
                        <div class="ft-comps"><span v-for="c in a.evidencia.listadas_pela_cpfl" :key="c">{{ comp(c) }}</span></div>
                      </template>
                      <pre v-if="!a.evidencia?.erro && !a.evidencia?.listadas_pela_cpfl">{{ JSON.stringify(a.evidencia, null, 2) }}</pre>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div v-if="aus.total > PAG_AU" class="ft-pag">
          <span>{{ faixa(aus.offset, PAG_AU, aus.total) }}</span>
          <button class="lx-btn-ghost sm" :disabled="!aus.offset || aus.carregando" @click="carregarAusentes(Math.max(0, aus.offset - PAG_AU))">‹ Anterior</button>
          <button class="lx-btn-ghost sm" :disabled="aus.offset + PAG_AU >= aus.total || aus.carregando" @click="carregarAusentes(aus.offset + PAG_AU)">Próxima ›</button>
        </div>
      </div>
    </section>

    <!-- ═══ dialog: detalhe da execução ═══ -->
    <LxDialog v-model="det.aberto" :titulo="`Execução #${det.id ?? ''}`"
      :subtitulo="det.ex ? `${det.ex.origem === 'MANUAL' ? 'Manual' : 'Agendada'} · criada em ${dataHora(det.ex.criado_em)}${ativaDet ? ' · atualizando a cada 5 s' : ''}` : ''"
      icone="⟳" :cor="det.ex ? de(ST_EX, det.ex.status).c : 'var(--purple)'" :largura="1100">
      <div v-if="det.carregando && !det.ex" class="lx-loading"><span class="lx-spin"></span><b>Carregando…</b></div>
      <template v-else-if="det.ex">
        <div class="ft-det-top">
          <div class="ft-det-st">
            <span class="lx-pill" :style="{ '--c': de(ST_EX, det.ex.status).c }"><i></i>{{ de(ST_EX, det.ex.status).t }}</span>
            <b class="ft-big">{{ det.ex.progresso.ucs_processadas }}<small> / {{ det.ex.total_ucs || '—' }} UCs</small></b>
            <div class="ft-bar"><span :style="{ width: pct(det.ex.progresso) + '%', background: `linear-gradient(90deg, ${de(ST_EX, det.ex.status).c}, var(--purple))` }"></span></div>
          </div>
          <div class="lx-dl ft-dl">
            <div><span>Solicitada por</span><b>{{ det.ex.solicitado_por || (det.ex.origem === 'AGENDADA' ? 'agendamento automático' : '—') }}</b></div>
            <div><span>Início / fim</span><b>{{ dataHora(det.ex.iniciado_em) }} → {{ dataHora(det.ex.finalizado_em) }}</b></div>
            <div><span>Duração</span><b>{{ dur(det.ex.iniciado_em, det.ex.finalizado_em) }}</b></div>
          </div>
          <div class="lx-dl ft-dl">
            <div><span>Faturas novas</span><b style="color:var(--green)">{{ ativaDet ? det.ex.progresso.faturas_ate_agora : det.ex.faturas_novas }}</b></div>
            <div><span>Situações atualizadas</span><b style="color:var(--teal)">{{ ativaDet ? det.ex.ucs.reduce((s, u) => s + (u.situacoes_atualizadas?.length || 0), 0) : det.ex.faturas_atualizadas }}</b></div>
            <div><span>Não encontradas</span><b style="color:var(--orange)">{{ det.ex.ucs.reduce((s, u) => s + (u.competencias_nao_encontradas?.length || 0), 0) }}</b></div>
          </div>
        </div>
        <div v-if="det.ex.erro" class="lx-alert err">{{ det.ex.erro }}</div>

        <div class="lx-filtros ft-filtros">
          <div class="lx-seg">
            <button :class="{ on: !det.filtro }" @click="det.filtro = ''">Todas {{ det.ex.ucs.length }}</button>
            <button v-for="(n, s) in det.ex.progresso.por_status" :key="s" :class="{ on: det.filtro === s }" :style="{ '--c': de(ST_UC, s).c }" @click="det.filtro = s">{{ de(ST_UC, s).t }} {{ n }}</button>
          </div>
          <div class="lx-field grow">
            <div class="lx-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input v-model="det.busca" class="lx-input" placeholder="Filtrar UC ou nome" aria-label="Filtrar UC" />
            </div>
          </div>
        </div>

        <div class="lx-tbl-wrap">
          <table class="lx-tbl">
            <thead><tr><th>Unidade</th><th>Status</th><th class="c">Tent.</th><th class="c">Faltavam</th><th class="c">Coletadas</th><th class="c">Não encontr.</th><th class="c">Situações</th><th>Erro</th><th></th></tr></thead>
            <tbody>
              <template v-for="u in ucsDet" :key="u.id">
                <tr class="ft-click" @click="det.ucAberta = det.ucAberta === u.id ? null : u.id">
                  <td><div class="ft-uc"><b>{{ u.nome }}</b><span class="lx-mono">{{ u.uc }}<template v-if="u.ligacao"> · {{ u.ligacao === 'L' ? 'ligada' : u.ligacao === 'D' ? 'desligada' : u.ligacao }}</template></span></div></td>
                  <td><span class="lx-pill" :style="{ '--c': de(ST_UC, u.status).c }"><i :class="{ 'ft-pulse': u.status === 'EM_ANDAMENTO' }"></i>{{ de(ST_UC, u.status).t }}</span></td>
                  <td class="c">{{ u.tentativas }}</td>
                  <td class="c">{{ u.competencias_faltantes?.length || 0 }}</td>
                  <td class="c" :style="{ color: u.competencias_coletadas?.length ? 'var(--green)' : '' }">{{ u.competencias_coletadas?.length || 0 }}</td>
                  <td class="c" :style="{ color: u.competencias_nao_encontradas?.length ? 'var(--orange)' : '' }">{{ u.competencias_nao_encontradas?.length || 0 }}</td>
                  <td class="c">{{ u.situacoes_atualizadas?.length || 0 }}</td>
                  <td class="ft-err">{{ u.erro_tipo ? (ERRO_TIPO[u.erro_tipo] || u.erro_tipo) : '' }}</td>
                  <td class="r"><span class="ft-chev" :class="{ on: det.ucAberta === u.id }">›</span></td>
                </tr>
                <tr v-if="det.ucAberta === u.id" class="ft-exp">
                  <td colspan="9">
                    <div class="ft-uc-det">
                      <p v-if="u.erro" class="ft-note err">{{ u.erro }}</p>
                      <div v-if="u.competencias_faltantes?.length" class="ft-grp"><span>Faltavam</span>
                        <div class="ft-comps"><span v-for="c in u.competencias_faltantes" :key="c" :class="{ ok: u.competencias_coletadas?.includes(c) }">{{ comp(c) }}</span></div>
                      </div>
                      <div v-if="u.competencias_nao_encontradas?.length" class="ft-grp"><span>Não encontradas</span>
                        <div class="ft-comps"><span v-for="n in u.competencias_nao_encontradas" :key="n.competencia" class="warn" :title="de(MOTIVO, n.motivo).t">{{ comp(n.competencia) }}</span></div>
                      </div>
                      <div v-if="u.situacoes_atualizadas?.length" class="ft-grp"><span>Situações</span>
                        <div class="ft-comps"><span v-for="s in u.situacoes_atualizadas" :key="s.competencia">{{ comp(s.competencia) }}: {{ de(SIT, s.de).t }} → {{ de(SIT, s.para).t }}</span></div>
                      </div>
                      <ol v-if="u.log?.length" class="ft-log">
                        <li v-for="(l, i) in u.log" :key="i">
                          <span class="lx-mono">{{ l.em ? new Date(l.em).toLocaleTimeString('pt-BR') : '' }}</span>
                          <span class="lx-pill" :style="{ '--c': de(EVENTO, l.evento).c }">{{ de(EVENTO, l.evento).t }}</span>
                          <b v-if="l.competencia">{{ comp(l.competencia) }}</b>
                          <span class="ft-log-msg">{{ l.msg }}</span>
                        </li>
                      </ol>
                      <p v-else-if="u.status === 'PENDENTE'" class="ft-sub">Ainda não processada.</p>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="!ucsDet.length"><td colspan="9" class="lx-empty">Nenhuma UC com esse filtro.</td></tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #rodape>
        <button v-if="ativaDet" class="lx-btn-ghost danger" :disabled="cancelando" @click="cancelar(det.ex)">{{ cancelando ? 'Cancelando…' : 'Cancelar execução' }}</button>
        <span class="sp"></span>
        <button class="lx-btn-ghost" @click="carregarDetalhe">↻ Atualizar</button>
        <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" @click="det.aberto = false">Fechar</button>
      </template>
    </LxDialog>

    <!-- ═══ dialog: solicitar coleta ═══ -->
    <LxDialog v-model="sol.aberto" titulo="Solicitar coleta de faturas" subtitulo="A solicitação só entra na fila; acompanhe o andamento nesta página"
      icone="⇣" cor="var(--purple)" :largura="640">
      <div v-if="sol.msg" class="lx-alert err">{{ sol.msg }}</div>
      <div class="lx-field full"><label>Unidades</label>
        <div class="lx-seg">
          <button :class="{ on: sol.modo === 'todas' }" style="--c:var(--purple)" @click="sol.modo = 'todas'">Todas as UCs</button>
          <button :class="{ on: sol.modo === 'algumas' }" style="--c:var(--teal)" @click="sol.modo = 'algumas'">Escolher UCs</button>
        </div>
      </div>
      <ul class="ft-regras ft-regras-dlg">
        <li>Busca só as competências que faltam no Lucentis, até o mês anterior, incluindo lacunas no meio do histórico.</li>
        <li>Entram UCs ligadas e desligadas. Faturas já coletadas só têm a situação de pagamento atualizada.</li>
        <li v-if="agenteModo">Quem acessa a CPFL é o coletor do notebook (roda a cada hora). Para começar já, execute o <b>executar.bat</b>.</li>
      </ul>
      <template v-if="sol.modo === 'algumas'">
        <div class="ft-sel-hd">
          <div class="lx-search" style="flex:1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
            <input v-model="sol.busca" class="lx-input" placeholder="Buscar UC ou nome" aria-label="Buscar UC" />
          </div>
          <button class="lx-btn-ghost sm" @click="marcarVisiveis">Marcar visíveis</button>
          <button class="lx-btn-ghost sm" :disabled="!sol.sel.size" @click="sol.sel = new Set()">Limpar</button>
        </div>
        <div v-if="!unidades" class="lx-loading"><span class="lx-spin"></span></div>
        <ul v-else class="ft-sel">
          <li v-for="u in ucsFiltradas" :key="u.id">
            <label :class="{ on: sol.sel.has(u.id) }">
              <input type="checkbox" :checked="sol.sel.has(u.id)" @change="alternar(u.id)" />
              <span class="ft-uc"><b>{{ u.nome }}</b><span class="lx-mono">{{ u.uc }}</span></span>
              <span class="lx-pill" :style="{ '--c': (STATUS_UC_CAD[u.status] || {}).c || 'var(--mut)' }">{{ (STATUS_UC_CAD[u.status] || {}).t || u.status }}</span>
            </label>
          </li>
          <li v-if="!ucsFiltradas.length" class="lx-empty">Nenhuma UC encontrada.</li>
        </ul>
      </template>
      <template #rodape>
        <span v-if="sol.modo === 'algumas'" class="ft-sub">{{ sol.sel.size }} UC(s) selecionada(s)</span>
        <span class="sp"></span>
        <button class="lx-btn-ghost" @click="sol.aberto = false">Cancelar</button>
        <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" :disabled="sol.enviando" @click="solicitar">
          {{ sol.enviando ? 'Enviando…' : 'Colocar na fila' }}
        </button>
      </template>
    </LxDialog>

    <Transition name="ft-toast">
      <div v-if="toast" class="ft-toast" :class="{ err: toast.err }" role="status" @click="toast = null">{{ toast.txt }}</div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── cartões de status ── */
.ft-top { display: grid; grid-template-columns: 1.25fr 1fr 1fr; gap: 14px; margin-bottom: 18px; }
.ft-card {
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 20px; border-radius: 22px; min-width: 0;
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--c, var(--teal)) 20%, transparent), transparent 60%), var(--card);
  border: 1px solid color-mix(in srgb, var(--c, var(--teal)) 38%, transparent); box-shadow: 0 0 44px -22px var(--c, var(--teal));
}
.ft-card::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, var(--c, var(--teal)), var(--c2, var(--purple))); box-shadow: 0 0 14px var(--c, var(--teal)); }
.ft-live { box-shadow: 0 0 60px -18px var(--c); }
.ft-card-hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.ft-lb { display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--mut); }
.ft-big { font: 600 clamp(24px, 2.6vw, 32px) var(--mono); letter-spacing: -.02em; line-height: 1.05; }
.ft-big small { font: 500 13px var(--font); color: var(--mut); margin-left: 4px; letter-spacing: 0; }
.ft-big-sm { font-size: clamp(20px, 2.2vw, 26px); }
.ft-meta { font-size: 12px; color: var(--mut); }
.ft-note { font-size: 12px; padding: 8px 10px; border-radius: 10px; background: color-mix(in srgb, var(--orange) 10%, transparent); border: 1px solid color-mix(in srgb, var(--orange) 30%, transparent); }
.ft-note.err { background: color-mix(in srgb, var(--red) 10%, transparent); border-color: color-mix(in srgb, var(--red) 32%, transparent); overflow-wrap: anywhere; }
.ft-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ft-card-ac { display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto; }
.ft-dl > div { padding: 7px 0; font-size: 12.5px; }
.ft-sk { height: 34px; width: 60%; } .ft-sk2 { height: 80px; width: 100%; } .ft-sk3 { height: 26px; width: 50%; }
.ft-regras { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 6px; font-size: 11.5px; color: var(--mut); line-height: 1.45; }
.ft-regras li { display: flex; gap: 8px; }
.ft-regras li::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--green); margin-top: 6px; flex: none; }
.ft-regras-dlg { margin: 14px 0; padding: 12px 14px; border-radius: 14px; background: var(--card2); border: 1px dashed var(--line); font-size: 12.5px; }
.ft-regras-dlg li::before { background: var(--purple); }

.ft-pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 0 0 var(--teal); animation: ftPulse 1.6s infinite; display: inline-block; }
@keyframes ftPulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--teal) 70%, transparent); } 70% { box-shadow: 0 0 0 8px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }

.ft-bar { height: 8px; border-radius: 99px; background: rgba(255, 255, 255, .07); overflow: hidden; }
.ft-bar span { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--teal), var(--purple)); box-shadow: 0 0 12px var(--teal); transition: width .6s ease; }
.ft-bar.sm { height: 5px; width: 80px; }
.ft-mini { display: flex; align-items: center; gap: 8px; }

/* ── KPIs clicáveis ── */
.ft-kpi { font: inherit; color: inherit; text-align: left; cursor: pointer; width: 100%; transition: transform .2s, border-color .2s; }
.ft-kpi:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 50%, transparent); }
.ft-kpi:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

/* ── abas e tabelas ── */
.ft-tabs { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.ft-cnt { font: 600 10.5px var(--mono); margin-left: 6px; padding: 1px 7px; border-radius: 99px; background: rgba(255, 255, 255, .1); }
.lx-seg button.on .ft-cnt { background: rgba(0, 0, 0, .18); }
.ft-filtros { margin-bottom: 14px; }
.ft-expl { font-size: 12.5px; color: var(--mut); margin-bottom: 14px; line-height: 1.5; }
.ft-click { cursor: pointer; }
.ft-sub { font-size: 11.5px; color: var(--mut); }
.ft-uc { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ft-uc b { font-weight: 600; font-size: 12.5px; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ft-uc .lx-mono { font-size: 11px; }
.ft-ib { width: 30px; height: 30px; border-radius: 9px; }
.ft-ib svg { width: 14px; height: 14px; }
.ft-err { font-size: 11.5px; color: var(--red); max-width: 220px; }
.ft-chev { display: inline-block; color: var(--mut); font-size: 18px; transition: transform .2s; }
.ft-chev.on { transform: rotate(90deg); color: var(--tx); }
.ft-exp > td { background: rgba(255, 255, 255, .025); padding: 12px 14px 16px; }
.ft-fade { opacity: .55; transition: opacity .2s; }
.ft-mais, .ft-pag { display: flex; justify-content: center; align-items: center; gap: 10px; padding-top: 14px; font-size: 12px; color: var(--mut); }
.ft-pag { justify-content: flex-end; }
.ft-check { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--mut); cursor: pointer; padding-bottom: 10px; }
.ft-check input { accent-color: var(--orange); width: 15px; height: 15px; }

.ft-evid { display: grid; gap: 8px; font-size: 12.5px; color: var(--mut); }
.ft-evid b { color: var(--tx); font-size: 12.5px; }
.ft-evid pre { margin: 0; font: 11px var(--mono); white-space: pre-wrap; overflow-wrap: anywhere; }
.ft-comps { display: flex; flex-wrap: wrap; gap: 5px; }
.ft-comps span { font: 500 11px var(--mono); padding: 3px 8px; border-radius: 8px; background: rgba(255, 255, 255, .06); border: 1px solid var(--line2); color: var(--tx); }
.ft-comps span.ok { border-color: color-mix(in srgb, var(--green) 45%, transparent); background: color-mix(in srgb, var(--green) 12%, transparent); }
.ft-comps span.warn { border-color: color-mix(in srgb, var(--orange) 45%, transparent); background: color-mix(in srgb, var(--orange) 12%, transparent); }

/* ── detalhe ── */
.ft-det-top { display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 18px; margin-bottom: 16px; align-items: start; }
.ft-det-st { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.ft-det-st .ft-bar { width: 100%; }
.ft-uc-det { display: grid; gap: 10px; }
.ft-grp { display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: start; font-size: 11.5px; color: var(--mut); }
.ft-log { list-style: none; margin: 0; padding: 10px 12px; border-radius: 12px; background: rgba(0, 0, 0, .2); display: grid; gap: 6px; max-height: 280px; overflow-y: auto; }
.ft-log li { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }
.ft-log li b { font: 600 11.5px var(--mono); }
.ft-log-msg { color: var(--mut); overflow-wrap: anywhere; min-width: 0; flex: 1; }

/* ── seleção de UCs ── */
.ft-sel-hd { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.ft-sel { list-style: none; margin: 0; padding: 4px; max-height: 320px; overflow-y: auto; border-radius: 14px; border: 1px solid var(--line2); background: var(--card2); }
.ft-sel label { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; cursor: pointer; transition: background .15s; }
.ft-sel label:hover { background: rgba(255, 255, 255, .05); }
.ft-sel label.on { background: color-mix(in srgb, var(--teal) 12%, transparent); }
.ft-sel input { accent-color: var(--teal); width: 15px; height: 15px; flex: none; }
.ft-sel .ft-uc { flex: 1; }

/* ── toast ── */
.ft-toast {
  position: fixed; left: 50%; bottom: 110px; transform: translateX(-50%); z-index: 3000; cursor: pointer; padding: 11px 18px; border-radius: 14px;
  font-size: 13px; font-weight: 500; color: var(--tx); background: var(--bg2); border: 1px solid rgba(52, 211, 122, .45);
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, .7), 0 0 30px -12px var(--green);
}
.ft-toast.err { border-color: rgba(255, 161, 46, .5); box-shadow: 0 10px 40px -10px rgba(0, 0, 0, .7), 0 0 30px -12px var(--orange); }
.ft-toast-enter-active, .ft-toast-leave-active { transition: opacity .25s, transform .25s; }
.ft-toast-enter-from, .ft-toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }

@media (max-width: 1100px) { .ft-top { grid-template-columns: 1fr 1fr; } .ft-top > :first-child { grid-column: 1 / -1; } .ft-det-top { grid-template-columns: 1fr 1fr; } .ft-det-st { grid-column: 1 / -1; } }
@media (max-width: 640px) { .ft-top, .ft-det-top { grid-template-columns: 1fr; } .ft-grp { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .ft-pulse { animation: none; } .ft-bar span { transition: none; } }
</style>
