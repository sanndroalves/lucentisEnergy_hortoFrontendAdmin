<script setup >
import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';

useHead ({ title: 'Prédios Públicos' });
definePageMeta({ middleware: 'sidebase-auth' })

import UiParentCard from '@/components/shared/UiParentCard.vue'; 
import { ref } from 'vue';
import { SearchIcon } from 'vue-tabler-icons';

const { data: predios } = await useFetch(`${API_BASE_URL}/unidadecompensacao/`);
const { data: usinas }  = await useFetch(`${API_BASE_URL}/usina/`);

const getStatusLabel = (status) => ({ L:'Ligado', D:'Desligado', M:'Manutenção' }[status] ?? 'Desconhecido');
const getStatusSecretaria = (status) => ({ E:'Educação', S:'Saúde', O:'Outros' }[status] ?? 'Desconhecido');
const getStatusColorClass = (status) => ({ E:'primary', S:'success', O:'warning' }[status] ?? 'error');

const selecionado = ref(null);
const categoriaSelecionada = (prediosNovo) => {
  if (selecionado.value !== null) return prediosNovo.filter(p => p.secretaria === selecionado.value);
  return predios.value;
};

const { data: listaPorcento } = await useFetch(`${API_BASE_URL}/porcentagem/`);
const procurarPorcentagem = (predioId) => listaPorcento.value.filter(p => p.idUnidadeCompensa === predioId);
const procurarGeradora    = (geradoraId) => usinas.value.filter(u => u.id === geradoraId);

const dialogOpen             = ref(false);
const porcentagensAtivas     = ref([]);
const porcentagensHistoricas = ref([]);
const openDialog = (predioId) => {
  const p = procurarPorcentagem(predioId);
  porcentagensAtivas.value     = p.filter(x => !x.data_fim);
  porcentagensHistoricas.value = p.filter(x => x.data_fim);
  dialogOpen.value = true;
};
const formatarData = (data) => { if (!data) return ''; const d = new Date(data); return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };

const dialogGeradora          = ref(false);
const showErrorAlertGeracao   = ref(false);
const showErrorCampoGeracao   = ref(false);
const showSuccessAlertGeracao = ref(false);
const selectedUsina           = ref('');
const porcentagem             = ref('');
const selectedPredio          = ref('');
const ucUnidadeRela           = ref('');
const nomeUnidadeRela         = ref('');

const openDialogGeradora = async (predioId) => {
  dialogGeradora.value = true;
  showErrorCampoGeracao.value = false; showSuccessAlertGeracao.value = false;
  selectedUsina.value = ''; porcentagem.value = '';
  const { data: u } = await useFetch(`${API_BASE_URL}/unidadecompensacao/${predioId}`);
  ucUnidadeRela.value = u.value.uc; nomeUnidadeRela.value = u.value.nome; selectedPredio.value = u.value.id;
};
const sendGeradora = async () => {
  if (!selectedUsina.value || !porcentagem.value) { showErrorCampoGeracao.value = true; showSuccessAlertGeracao.value = false; return; }
  try {
    const r = await useFetch(`${API_BASE_URL}/porcentagem/`, { method:'POST', body:{ idUnidadeCompensa:selectedPredio.value, idGeradora:selectedUsina.value, porcentagem:porcentagem.value }, key:'GeradoraPost' });
    if (r) { showErrorCampoGeracao.value=false; showSuccessAlertGeracao.value=true; const { data:n } = await useFetch(`${API_BASE_URL}/porcentagem/`); listaPorcento.value=n._value; }
    else { showErrorAlertGeracao.value=true; showErrorCampoGeracao.value=false; showSuccessAlertGeracao.value=false; }
  } catch { showErrorAlertGeracao.value=true; showErrorCampoGeracao.value=false; showSuccessAlertGeracao.value=false; }
};

const showSuccessAlertUnidade = ref(false); const showErrorAlertUnidade = ref(false); const showErrorCampoUnidade = ref(false);
const dialogNovaUnidade = ref(false);
const ucUnidade=ref(''); const nomeUnidade=ref(''); const dataInicioUnidade=ref(''); const consumoUnidade=ref(''); const kwhUnidade=ref(''); const enderecoUnidade=ref(''); const cep=ref(''); const secretaria=ref(''); const statusUnidade=ref('');
const openDialogNovaUnidade = () => { dialogNovaUnidade.value=true; showSuccessAlertUnidade.value=false; showErrorAlertUnidade.value=false; showErrorCampoUnidade.value=false; };
const sendUnidade = async () => {
  if (!ucUnidade.value||!nomeUnidade.value||!dataInicioUnidade.value||!consumoUnidade.value||!kwhUnidade.value||!cep.value||!enderecoUnidade.value||!statusUnidade.value||!secretaria.value) { showErrorCampoUnidade.value=true; showSuccessAlertUnidade.value=false; showErrorAlertUnidade.value=false; return; }
  try {
    const r = await useFetch(`${API_BASE_URL}/unidadecompensacao/`, { method:'POST', body:{uc:ucUnidade.value,nome:nomeUnidade.value,dataInicio:dataInicioUnidade.value,mediaConsumo:consumoUnidade.value,valorKWH:kwhUnidade.value,endereco:enderecoUnidade.value,status:statusUnidade.value,cep:cep.value,secretaria:secretaria.value}, key:'unidadePost' });
    if (r) { showSuccessAlertUnidade.value=true; showErrorAlertUnidade.value=false; showErrorCampoUnidade.value=false; const {data:pu}=await useFetch(`${API_BASE_URL}/unidadecompensacao/`); predios.value=pu._value; }
    else { showSuccessAlertUnidade.value=false; showErrorAlertUnidade.value=true; showErrorCampoUnidade.value=false; }
  } catch { showSuccessAlertUnidade.value=false; showErrorAlertUnidade.value=true; showErrorCampoUnidade.value=false; }
};

const meses = [1,2,3,4,5,6,7,8,9,10,11,12];
const anos  = [2026,2025,2024,2023];

const mesRelUni=ref(''); const anoRelUni=ref(''); const consumoUni=ref(''); const valorConUni=ref(''); const enerTusdUni=ref(''); const valorTusdUni=ref(''); const enerTeUni=ref(''); const valorTeUni=ref(''); const compensada=ref('');
const dialogNovoRelatorio=ref(false); const showSuccessAlertRelatorio=ref(false); const showErrorCampoRelatorio=ref(false); const showErrorMesRelatorio=ref(false); const showErrorAlertRelatorio=ref(false);
const openDialogNovoRelatorio = async (id) => { dialogNovoRelatorio.value=true; compensada.value=id; const {data:u}=await useFetch(`${API_BASE_URL}/unidadecompensacao/${compensada.value}`); ucUnidadeRela.value=u.value.uc; nomeUnidadeRela.value=u.value.nome; };
const sendRelatorioUni = async () => {
  if (!mesRelUni.value||!anoRelUni.value||!consumoUni.value||!valorConUni.value||!enerTusdUni.value||!valorTusdUni.value||!enerTeUni.value||!valorTeUni.value) { showErrorCampoRelatorio.value=true; showSuccessAlertRelatorio.value=false; showErrorMesRelatorio.value=false; return; }
  const {data:rv}=await useFetch(`${API_BASE_URL}/relatoriocompensacao?idUnidadeCompensa=${compensada.value}&mes=${mesRelUni.value}&ano=${anoRelUni.value}`);
  if (rv.value.length) { showErrorMesRelatorio.value=true; showSuccessAlertRelatorio.value=false; showErrorCampoRelatorio.value=false; return; }
  try {
    const r=await useFetch(`${API_BASE_URL}/relatoriocompensacao/`,{method:'POST',body:{idUnidadeCompensa:compensada.value,mes:mesRelUni.value,ano:anoRelUni.value,consumokWh:consumoUni.value,consumoReais:valorConUni.value,enerInjTUSD:enerTusdUni.value,enerInjTE:enerTeUni.value,valorInjTUSD:valorTusdUni.value,valorInjTE:valorTeUni.value},key:'RelatorioUniPost'});
    if (r) { showSuccessAlertRelatorio.value=true; showErrorCampoRelatorio.value=false; showErrorMesRelatorio.value=false; }
    else { showErrorAlertRelatorio.value=true; showSuccessAlertRelatorio.value=false; showErrorCampoRelatorio.value=false; showErrorMesRelatorio.value=false; }
  } catch { showErrorAlertRelatorio.value=true; showSuccessAlertRelatorio.value=false; showErrorCampoRelatorio.value=false; showErrorMesRelatorio.value=false; }
};

const dialogEditUnidade=ref(false); const showErrorCampoUnidadeEdit=ref(false); const showSuccessAlertUnidadeEdit=ref(false); const showErrorAlertUnidadeEdit=ref(false);
const ucUnidadeEdit=ref(''); const nomeUnidadeEdit=ref(''); const dataInicioUnidadeEdit=ref(''); const consumoUnidadeEdit=ref(''); const kwhUnidadeEdit=ref(''); const enderecoUnidadeEdit=ref(''); const statusUnidadeEdit=ref(''); const secretariaEdit=ref(''); const cepEdit=ref(''); const compensadaId=ref('');
const openDialogEditUnidade = async (id) => {
  showErrorCampoUnidadeEdit.value=false; showSuccessAlertUnidadeEdit.value=false; showErrorAlertUnidadeEdit.value=false; dialogEditUnidade.value=true;
  const {data:u}=await useFetch(`${API_BASE_URL}/unidadecompensacao/${id}`);
  ucUnidadeEdit.value=u.value.uc; nomeUnidadeEdit.value=u.value.nome; dataInicioUnidadeEdit.value=u.value.dataInicio; consumoUnidadeEdit.value=u.value.mediaConsumo; kwhUnidadeEdit.value=u.value.valorKWH; enderecoUnidadeEdit.value=u.value.endereco; statusUnidadeEdit.value=u.value.status; compensadaId.value=u.value.id; secretariaEdit.value=u.value.secretaria; cepEdit.value=u.value.cep;
};
const editUnidade = async () => {
  if (!ucUnidadeEdit.value||!nomeUnidadeEdit.value||!dataInicioUnidadeEdit.value||!consumoUnidadeEdit.value||!kwhUnidadeEdit.value||!enderecoUnidadeEdit.value||!statusUnidadeEdit.value) { showErrorCampoUnidadeEdit.value=true; showSuccessAlertUnidadeEdit.value=false; return; }
  try {
    const r=await useFetch(`${API_BASE_URL}/unidadecompensacao/${compensadaId.value}`,{method:'PUT',body:{uc:ucUnidadeEdit.value,nome:nomeUnidadeEdit.value,dataInicio:dataInicioUnidadeEdit.value,mediaConsumo:consumoUnidadeEdit.value,valorKWH:kwhUnidadeEdit.value,endereco:enderecoUnidadeEdit.value,status:statusUnidadeEdit.value,cep:cepEdit.value,secretaria:secretariaEdit.value},key:'unidadePut'});
    if (r) { showErrorCampoUnidadeEdit.value=false; showSuccessAlertUnidadeEdit.value=true; const {data:up}=await useFetch(`${API_BASE_URL}/unidadecompensacao/`); predios.value=up._value; }
    else { showErrorAlertUnidadeEdit.value=true; showErrorCampoUnidadeEdit.value=false; showSuccessAlertUnidadeEdit.value=false; }
  } catch { showErrorAlertUnidadeEdit.value=true; showErrorCampoUnidadeEdit.value=false; showSuccessAlertUnidadeEdit.value=false; }
};

const dialogExcluirUnidade=ref(false); const showSuccessAlertUnidadeExcluida=ref(false); const showErrorAlertUnidadeExcluida=ref(false);
const ucUnidadeExcluir=ref(''); const nomeUnidadeExcluir=ref(''); const idUnidadeExcluir=ref('');
const openDialogExcluirUnidade = async (id) => { dialogExcluirUnidade.value=true; showSuccessAlertUnidadeExcluida.value=false; const {data:u}=await useFetch(`${API_BASE_URL}/unidadecompensacao/${id}`); ucUnidadeExcluir.value=u.value.uc; nomeUnidadeExcluir.value=u.value.nome; idUnidadeExcluir.value=u.value.id; };
const deleteUnidade = async () => {
  try {
    const r=await useFetch(`${API_BASE_URL}/unidadecompensacao/${idUnidadeExcluir.value}`,{method:'DELETE',key:'deleteUnidade'});
    if (r) showSuccessAlertUnidadeExcluida.value=true; else { showSuccessAlertUnidadeExcluida.value=false; showErrorAlertUnidadeExcluida.value=true; }
    const {data:up}=await useFetch(`${API_BASE_URL}/unidadecompensacao/`); predios.value=up._value;
  } catch (e) { console.error(e); alert('Erro ao excluir.'); }
};

const dialogRelatorios=ref(false); const relatoriosUnidade=ref(''); const idUnidadeRela=ref(''); const ucUnidadeRelatorio=ref(''); const nomeUnidadeRelatorio=ref('');
const openDialogRelatorios = async (id) => {
  dialogRelatorios.value=true;
  const {data:u}=await useFetch(`${API_BASE_URL}/unidadecompensacao/${id}`); ucUnidadeRelatorio.value=u.value.uc; nomeUnidadeRelatorio.value=u.value.nome;
  const {data:r}=await useFetch(`${API_BASE_URL}/relatoriocompensacao?idUnidadeCompensa=${id}`); relatoriosUnidade.value=r._value; idUnidadeRela.value=id;
};
const relatoriosOrdenados = computed(() => [...relatoriosUnidade.value].sort((a,b) => a.ano!==b.ano ? b.ano-a.ano : b.mes-a.mes));
const deleteRelatorio = async (id) => {
  try { await useFetch(`${API_BASE_URL}/relatoriocompensacao/${id}`,{method:'DELETE',key:'deleteRelatorio'}); const {data:r}=await useFetch(`${API_BASE_URL}/relatoriocompensacao?idUnidadeCompensa=${idUnidadeRela.value}`); relatoriosUnidade.value=r._value; }
  catch (e) { console.error(e); alert('Erro ao excluir.'); }
};

const dialogRelatoriosEditar=ref(false); const showErrorCampoEdit=ref(false); const showSuccessAlertEdit=ref(false); const showErrorAlertEdit=ref(false);
const idRelaEdit=ref(''); const mesRelUniEdit=ref(''); const anoRelUniEdit=ref(''); const consumoUniEdit=ref(''); const valorConUniEdit=ref(''); const enerTusdUniEdit=ref(''); const valorTusdUniEdit=ref(''); const enerTeUniEdit=ref(''); const valorTeUniEdit=ref('');
const openDialogRelatoriosEditar = async (id) => {
  const {data:r}=await useFetch(`${API_BASE_URL}/relatoriocompensacao/${id}`);
  idRelaEdit.value=r.value.id; mesRelUniEdit.value=r.value.mes; anoRelUniEdit.value=r.value.ano; consumoUniEdit.value=r.value.consumokWh; valorConUniEdit.value=r.value.consumoReais; enerTusdUniEdit.value=r.value.enerInjTUSD; valorTusdUniEdit.value=r.value.valorInjTUSD; enerTeUniEdit.value=r.value.enerInjTE; valorTeUniEdit.value=r.value.valorInjTE;
  dialogRelatoriosEditar.value=true;
};
const saveChangesRelatorio = async (id) => {
  if (!mesRelUniEdit.value||!anoRelUniEdit.value||!consumoUniEdit.value||!valorConUniEdit.value||!enerTusdUniEdit.value||!valorTusdUniEdit.value||!enerTeUniEdit.value||!valorTeUniEdit.value) { showErrorCampoEdit.value=true; showSuccessAlertEdit.value=false; return; }
  try {
    const r=await useFetch(`${API_BASE_URL}/relatoriocompensacao/${id}`,{method:'PUT',body:{mes:mesRelUniEdit.value,ano:anoRelUniEdit.value,consumokWh:consumoUniEdit.value,consumoReais:valorConUniEdit.value,enerInjTUSD:enerTusdUniEdit.value,enerInjTE:enerTeUniEdit.value,valorInjTUSD:valorTusdUniEdit.value,valorInjTE:valorTeUniEdit.value},key:'relatorioPut'});
    if (r) { showSuccessAlertEdit.value=true; showErrorCampoEdit.value=false; } else { showErrorAlertEdit.value=true; showSuccessAlertEdit.value=false; showErrorCampoEdit.value=false; }
  } catch { showErrorAlertEdit.value=true; showSuccessAlertEdit.value=false; showErrorCampoEdit.value=false; }
  const {data:pu}=await useFetch(`${API_BASE_URL}/unidadecompensacao/`); predios.value=pu._value;
};

const deletePorcetagem = async (id) => {
  try { await useFetch(`${API_BASE_URL}/porcentagem/${id}`,{method:'DELETE',key:'deletePorcetagem'}); const {data:n}=await useFetch(`${API_BASE_URL}/porcentagem/`); listaPorcento.value=n._value; porcentagensAtivas.value=porcentagensAtivas.value.filter(p=>p.id!==id); }
  catch (e) { console.error(e); alert('Erro ao excluir.'); }
};

const contaEducacao = predios.value.filter(i => i.secretaria==='E');
const contaSaude    = predios.value.filter(i => i.secretaria==='S');
const contaOutros   = predios.value.filter(i => i.secretaria==='O');
</script>

<template>
<div class="pb-root">

  <!-- ══════════════════════════════════════
       HEADER DA PÁGINA
  ══════════════════════════════════════ -->
  <div class="pb-header">
    <div class="pb-header-left">
      <div class="pb-header-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <div>
        <nav class="pb-breadcrumb">
          <a href="/">Início</a><span>›</span>
          <a href="/">Unidades Consumidoras</a><span>›</span>
          <span>Prédios Públicos</span>
        </nav>
        <h1 class="pb-title">Prédios Públicos</h1>
        <p class="pb-sub">Gestão das unidades compensadoras por secretaria</p>
      </div>
    </div>
    <img src="https://i.imgur.com/NeDPR3O.png" class="pb-header-img" alt="">
  </div>

  <!-- ══════════════════════════════════════
       KPI CARDS
  ══════════════════════════════════════ -->
  <div class="pb-kpi-row">
    <div class="pb-kpi pb-kpi-indigo">
      <div class="pb-kpi-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
        </svg>
      </div>
      <span class="pb-kpi-label">Educação</span>
      <span class="pb-kpi-val">{{ contaEducacao.length }}</span>
      <span class="pb-kpi-note">escolas e CEIs</span>
      <div class="pb-kpi-bottom"></div>
    </div>

    <div class="pb-kpi pb-kpi-green">
      <div class="pb-kpi-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
      <span class="pb-kpi-label">Saúde</span>
      <span class="pb-kpi-val">{{ contaSaude.length }}</span>
      <span class="pb-kpi-note">UBS e postos</span>
      <div class="pb-kpi-bottom"></div>
    </div>

    <div class="pb-kpi pb-kpi-amber">
      <div class="pb-kpi-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        </svg>
      </div>
      <span class="pb-kpi-label">Outros</span>
      <span class="pb-kpi-val">{{ contaOutros.length }}</span>
      <span class="pb-kpi-note">órgãos municipais</span>
      <div class="pb-kpi-bottom"></div>
    </div>

    <div class="pb-kpi pb-kpi-violet">
      <div class="pb-kpi-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </div>
      <span class="pb-kpi-label">Total</span>
      <span class="pb-kpi-val">{{ predios.length }}</span>
      <span class="pb-kpi-note">unidades cadastradas</span>
      <div class="pb-kpi-bottom"></div>
    </div>
  </div>

  <!-- ══════════════════════════════════════
       TABELA PRINCIPAL
  ══════════════════════════════════════ -->
  <div class="pb-body">
    <div class="pb-table-card">

      <!-- Cabeçalho do card -->
      <div class="pb-card-hd">
        <div class="pb-card-hd-left">
          <div class="pb-card-num">01</div>
          <div>
            <h3 class="pb-card-title">Lista de Prédios Públicos</h3>
            <p class="pb-card-sub">Filtre por secretaria e gerencie cada unidade</p>
          </div>
        </div>
        <button class="pb-btn-add" @click="openDialogNovaUnidade">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Adicionar Prédio
        </button>
      </div>

      <!-- Filtros de categoria -->
      <div class="pb-filters">
        <span class="pb-filters-lbl">Filtrar por secretaria</span>
        <div class="pb-filter-chips">
          <button class="pb-chip"
            :class="selecionado===null ? 'pb-chip-active pb-chip-slate' : ''"
            @click="selecionado=null">Todos</button>
          <button class="pb-chip"
            :class="selecionado==='E' ? 'pb-chip-active pb-chip-indigo' : ''"
            @click="selecionado='E'">Educação</button>
          <button class="pb-chip"
            :class="selecionado==='S' ? 'pb-chip-active pb-chip-green' : ''"
            @click="selecionado='S'">Saúde</button>
          <button class="pb-chip"
            :class="selecionado==='O' ? 'pb-chip-active pb-chip-amber' : ''"
            @click="selecionado='O'">Outros</button>
        </div>
      </div>

      <!-- Tabela -->
      <div class="pb-tbl-wrap">
        <table class="pb-table">
          <thead class="pb-thead">
            <tr>
              <th class="pb-th">UC</th>
              <th class="pb-th">Nome</th>
              <th class="pb-th" style="text-align:center">Tensão</th>
              <th class="pb-th" style="text-align:center">Status</th>
              <th class="pb-th" style="text-align:center">Geradora</th>
              <th class="pb-th" style="text-align:center">Secretaria</th>
              <th class="pb-th" style="text-align:center">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(predio, i) in categoriaSelecionada(predios.value ?? predios)"
              :key="i" class="pb-tr" :class="{'pb-tr-alt': i%2===1}">

              <!-- UC -->
              <td class="pb-td pb-mono">{{ predio.uc }}</td>

              <!-- Nome -->
              <td class="pb-td" style="font-weight:700;max-width:220px">{{ predio.nome }}</td>

              <!-- Tensão -->
              <td class="pb-td" style="text-align:center">
                <span class="pb-tensao-pill">{{ predio.tensao }}</span>
              </td>

              <!-- Status -->
              <td class="pb-td" style="text-align:center">
                <span class="pb-status-pill" :class="predio.status==='L' ? 'pb-status-green' : predio.status==='M' ? 'pb-status-amber' : 'pb-status-red'">
                  <span class="pb-status-dot"></span>
                  {{ getStatusLabel(predio.status) }}
                </span>
              </td>

              <!-- Geradora -->
              <td class="pb-td" style="text-align:center">
                <button v-if="predio.status==='L'"
                  class="pb-icon-btn pb-icon-indigo"
                  @click="openDialog(predio.id)"
                  title="Ver Porcentagens">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </button>
                <span v-else class="pb-off-pill">Off</span>
              </td>

              <!-- Secretaria -->
              <td class="pb-td" style="text-align:center">
                <span class="pb-sec-pill"
                  :class="predio.secretaria==='E' ? 'pb-sec-indigo' : predio.secretaria==='S' ? 'pb-sec-green' : 'pb-sec-amber'">
                  {{ getStatusSecretaria(predio.secretaria) }}
                </span>
              </td>

              <!-- Ações -->
              <td class="pb-td" style="text-align:center">
                <div class="pb-actions-row">
                  <!-- Novo relatório -->
                  <button class="pb-icon-btn pb-icon-indigo" @click="openDialogNovoRelatorio(predio.id)" title="Novo Relatório">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                  <!-- Ver/editar relatórios -->
                  <button class="pb-icon-btn pb-icon-indigo" @click="openDialogRelatorios(predio.id)" title="Editar Relatórios">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </button>
                  <!-- Adicionar geradora -->
                  <button v-if="predio.status==='L'" class="pb-icon-btn pb-icon-amber" @click="openDialogGeradora(predio.id)" title="Adicionar Geradora">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                  </button>
                  <!-- Editar prédio -->
                  <button class="pb-icon-btn pb-icon-slate" @click="openDialogEditUnidade(predio.id)" title="Editar Prédio">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <!-- Excluir prédio -->
                  <button class="pb-icon-btn pb-icon-red" @click="openDialogExcluirUnidade(predio.id)" title="Excluir Prédio">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════
       DIALOGS — estilos Lucentis aplicados
  ══════════════════════════════════════ -->

  <!-- Dialog: Adicionar Geradora -->
  <v-dialog v-model="dialogGeradora" max-width="560">
    <div class="pb-dialog">
      <div class="pb-dialog-hd" style="background:linear-gradient(135deg,#4F46E5,#7C3AED)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        <span>Adicionar Usina ao Prédio</span>
        <button class="pb-dialog-close" @click="dialogGeradora=false">✕</button>
      </div>
      <div class="pb-dialog-body">
        <div v-if="showErrorAlertGeracao"   class="pb-alert pb-alert-err">Erro ao enviar geradora!</div>
        <div v-if="showErrorCampoGeracao"   class="pb-alert pb-alert-err">Preencha todos os campos!</div>
        <div v-if="showSuccessAlertGeracao" class="pb-alert pb-alert-ok">Geradora enviada com sucesso!</div>
        <div class="pb-dialog-info">
          <span class="pb-info-row"><strong>UC:</strong> {{ ucUnidadeRela }}</span>
          <span class="pb-info-row"><strong>Unidade:</strong> {{ nomeUnidadeRela }}</span>
        </div>
        <div class="pb-dialog-divider"></div>
        <div class="pb-fg">
          <label class="pb-flbl">Usina</label>
          <select v-model="selectedUsina" class="pb-select">
            <option disabled value="">Selecione a usina…</option>
            <option v-for="u in usinas" :key="u.id" :value="u.id">{{ u.uc }} — {{ u.nome }}</option>
          </select>
        </div>
        <div class="pb-fg">
          <label class="pb-flbl">Porcentagem (%)</label>
          <input v-model="porcentagem" type="number" class="pb-input" placeholder="0" />
        </div>
      </div>
      <div class="pb-dialog-footer">
        <button class="pb-btn-secondary" @click="dialogGeradora=false">Cancelar</button>
        <button class="pb-btn-primary pb-btn-indigo" @click="sendGeradora">Salvar</button>
      </div>
    </div>
  </v-dialog>

  <!-- Dialog: Ver Porcentagens -->
  <v-dialog v-model="dialogOpen" max-width="560">
    <div class="pb-dialog">
      <div class="pb-dialog-hd" style="background:linear-gradient(135deg,#059669,#4F46E5)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <span>Porcentagens do Prédio</span>
        <button class="pb-dialog-close" @click="dialogOpen=false">✕</button>
      </div>
      <div class="pb-dialog-body">
        <p class="pb-dialog-section-lbl">Porcentagens Ativas</p>
        <div class="pb-pct-list">
          <div v-for="(qtd, i) in porcentagensAtivas" :key="i" class="pb-pct-item">
            <div class="pb-pct-info">
              <span class="pb-pct-uc" v-for="g in procurarGeradora(qtd.idGeradora)" :key="g.id">{{ g.uc }}</span>
              <span class="pb-pct-val">{{ qtd.porcentagem }}%</span>
            </div>
            <button class="pb-icon-btn pb-icon-red" @click="deletePorcetagem(qtd.id)" title="Remover">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p v-if="!porcentagensAtivas.length" class="pb-empty-msg">Nenhuma porcentagem ativa.</p>
        </div>
        <p class="pb-dialog-section-lbl" style="margin-top:16px">Histórico</p>
        <div class="pb-pct-list">
          <div v-for="(qtd, i) in porcentagensHistoricas" :key="i" class="pb-pct-item pb-pct-hist">
            <div class="pb-pct-info">
              <span class="pb-pct-uc" v-for="g in procurarGeradora(qtd.idGeradora)" :key="g.id">{{ g.uc }}</span>
              <span class="pb-pct-val">{{ qtd.porcentagem }}%</span>
              <span class="pb-pct-period">{{ formatarData(qtd.data_inicio) }} → {{ formatarData(qtd.data_fim) }}</span>
            </div>
          </div>
          <p v-if="!porcentagensHistoricas.length" class="pb-empty-msg">Sem histórico.</p>
        </div>
      </div>
      <div class="pb-dialog-footer">
        <button class="pb-btn-primary pb-btn-green" @click="dialogOpen=false">Fechar</button>
      </div>
    </div>
  </v-dialog>

  <!-- Dialog: Adicionar Prédio -->
  <v-dialog v-model="dialogNovaUnidade" max-width="680">
    <div class="pb-dialog">
      <div class="pb-dialog-hd" style="background:linear-gradient(135deg,#059669,#4F46E5)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Adicionar Prédio Público</span>
        <button class="pb-dialog-close" @click="dialogNovaUnidade=false">✕</button>
      </div>
      <div class="pb-dialog-body">
        <div v-if="showErrorCampoUnidade"   class="pb-alert pb-alert-err">Preencha todos os campos!</div>
        <div v-if="showSuccessAlertUnidade" class="pb-alert pb-alert-ok">Prédio adicionado com sucesso!</div>
        <div class="pb-form-grid">
          <div class="pb-fg"><label class="pb-flbl">UC</label><input v-model="ucUnidade"          type="number" class="pb-input" placeholder="Número UC" /></div>
          <div class="pb-fg"><label class="pb-flbl">Nome</label><input v-model="nomeUnidade"       class="pb-input" placeholder="Nome da unidade" /></div>
          <div class="pb-fg"><label class="pb-flbl">Data início</label><input v-model="dataInicioUnidade" type="date" class="pb-input" /></div>
          <div class="pb-fg"><label class="pb-flbl">Consumo médio (kWh)</label><input v-model="consumoUnidade" type="number" class="pb-input" placeholder="0" /></div>
          <div class="pb-fg"><label class="pb-flbl">Valor kWh (R$)</label><input v-model="kwhUnidade" type="number" class="pb-input" placeholder="0,00" /></div>
          <div class="pb-fg"><label class="pb-flbl">CEP</label><input v-model="cep" type="number" class="pb-input" placeholder="CEP" /></div>
          <div class="pb-fg pb-fg-full"><label class="pb-flbl">Endereço</label><input v-model="enderecoUnidade" class="pb-input" placeholder="Endereço completo" /></div>
          <div class="pb-fg">
            <label class="pb-flbl">Secretaria</label>
            <div class="pb-radio-group">
              <label class="pb-radio" :class="secretaria==='E'?'pb-radio-on':''"><input type="radio" v-model="secretaria" value="E" style="display:none"> Educação</label>
              <label class="pb-radio" :class="secretaria==='S'?'pb-radio-on':''"><input type="radio" v-model="secretaria" value="S" style="display:none"> Saúde</label>
              <label class="pb-radio" :class="secretaria==='O'?'pb-radio-on':''"><input type="radio" v-model="secretaria" value="O" style="display:none"> Outros</label>
            </div>
          </div>
          <div class="pb-fg">
            <label class="pb-flbl">Status</label>
            <div class="pb-radio-group">
              <label class="pb-radio pb-radio-green" :class="statusUnidade==='L'?'pb-radio-on-green':''"><input type="radio" v-model="statusUnidade" value="L" style="display:none"> Ligado</label>
              <label class="pb-radio pb-radio-red"   :class="statusUnidade==='D'?'pb-radio-on-red':''"><input type="radio" v-model="statusUnidade" value="D" style="display:none"> Desligado</label>
              <label class="pb-radio pb-radio-amber" :class="statusUnidade==='M'?'pb-radio-on-amber':''"><input type="radio" v-model="statusUnidade" value="M" style="display:none"> Manutenção</label>
            </div>
          </div>
        </div>
      </div>
      <div class="pb-dialog-footer">
        <button class="pb-btn-secondary" @click="dialogNovaUnidade=false">Cancelar</button>
        <button class="pb-btn-primary pb-btn-green" @click="sendUnidade">Adicionar</button>
      </div>
    </div>
  </v-dialog>

  <!-- Dialog: Novo Relatório -->
  <v-dialog v-model="dialogNovoRelatorio" max-width="620">
    <div class="pb-dialog">
      <div class="pb-dialog-hd" style="background:linear-gradient(135deg,#059669,#4F46E5)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="13" x2="8" y2="13"/><line x1="12" y1="17" x2="8" y2="17"/></svg>
        <span>Criar Relatório Mensal</span>
        <button class="pb-dialog-close" @click="dialogNovoRelatorio=false">✕</button>
      </div>
      <div class="pb-dialog-body">
        <div v-if="showErrorAlertRelatorio"  class="pb-alert pb-alert-err">Erro ao enviar relatório!</div>
        <div v-if="showErrorCampoRelatorio"  class="pb-alert pb-alert-err">Preencha todos os campos!</div>
        <div v-if="showErrorMesRelatorio"    class="pb-alert pb-alert-err">Esse mês/ano já está preenchido!</div>
        <div v-if="showSuccessAlertRelatorio" class="pb-alert pb-alert-ok">Relatório enviado com sucesso!</div>
        <div class="pb-dialog-info">
          <span class="pb-info-row"><strong>UC:</strong> {{ ucUnidadeRela }}</span>
          <span class="pb-info-row"><strong>Unidade:</strong> {{ nomeUnidadeRela }}</span>
        </div>
        <div class="pb-dialog-divider"></div>
        <div class="pb-form-grid">
          <div class="pb-fg">
            <label class="pb-flbl">Mês</label>
            <select v-model="mesRelUni" class="pb-select">
              <option disabled value="">Mês</option>
              <option v-for="m in meses" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="pb-fg">
            <label class="pb-flbl">Ano</label>
            <select v-model="anoRelUni" class="pb-select">
              <option disabled value="">Ano</option>
              <option v-for="a in anos" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div class="pb-fg"><label class="pb-flbl">Consumo (kWh)</label><input v-model="consumoUni"   type="number" class="pb-input" placeholder="0" /></div>
          <div class="pb-fg"><label class="pb-flbl">Consumo (R$)</label><input v-model="valorConUni"  type="number" class="pb-input" placeholder="0,00" /></div>
          <div class="pb-fg"><label class="pb-flbl">Ener. Inj-TUSD (kWh)</label><input v-model="enerTusdUni"  type="number" class="pb-input" placeholder="0" /></div>
          <div class="pb-fg"><label class="pb-flbl">Valor TUSD (R$)</label><input v-model="valorTusdUni" type="number" class="pb-input" placeholder="0,00" /></div>
          <div class="pb-fg"><label class="pb-flbl">Ener. Inj-TE (kWh)</label><input v-model="enerTeUni"    type="number" class="pb-input" placeholder="0" /></div>
          <div class="pb-fg"><label class="pb-flbl">Valor TE (R$)</label><input v-model="valorTeUni"  type="number" class="pb-input" placeholder="0,00" /></div>
        </div>
      </div>
      <div class="pb-dialog-footer">
        <button class="pb-btn-secondary" @click="dialogNovoRelatorio=false">Cancelar</button>
        <button class="pb-btn-primary pb-btn-green" @click="sendRelatorioUni">Salvar</button>
      </div>
    </div>
  </v-dialog>

  <!-- Dialog: Editar Prédio -->
  <v-dialog v-model="dialogEditUnidade" max-width="680">
    <div class="pb-dialog">
      <div class="pb-dialog-hd" style="background:linear-gradient(135deg,#475569,#0f172a)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <span>Editar Prédio Público</span>
        <button class="pb-dialog-close" @click="dialogEditUnidade=false">✕</button>
      </div>
      <div class="pb-dialog-body">
        <div v-if="showErrorAlertUnidadeEdit"   class="pb-alert pb-alert-err">Erro ao editar unidade!</div>
        <div v-if="showErrorCampoUnidadeEdit"   class="pb-alert pb-alert-err">Preencha todos os campos!</div>
        <div v-if="showSuccessAlertUnidadeEdit" class="pb-alert pb-alert-ok">Unidade editada com sucesso!</div>
        <div class="pb-form-grid">
          <div class="pb-fg"><label class="pb-flbl">UC</label><input v-model="ucUnidadeEdit"          type="number" class="pb-input" /></div>
          <div class="pb-fg"><label class="pb-flbl">Nome</label><input v-model="nomeUnidadeEdit"       class="pb-input" /></div>
          <div class="pb-fg"><label class="pb-flbl">Data início</label><input v-model="dataInicioUnidadeEdit" type="date" class="pb-input" /></div>
          <div class="pb-fg"><label class="pb-flbl">Consumo médio (kWh)</label><input v-model="consumoUnidadeEdit" type="number" class="pb-input" /></div>
          <div class="pb-fg"><label class="pb-flbl">Valor kWh (R$)</label><input v-model="kwhUnidadeEdit" type="number" class="pb-input" /></div>
          <div class="pb-fg"><label class="pb-flbl">CEP</label><input v-model="cepEdit" type="number" class="pb-input" /></div>
          <div class="pb-fg pb-fg-full"><label class="pb-flbl">Endereço</label><input v-model="enderecoUnidadeEdit" class="pb-input" /></div>
          <div class="pb-fg">
            <label class="pb-flbl">Secretaria</label>
            <div class="pb-radio-group">
              <label class="pb-radio" :class="secretariaEdit==='E'?'pb-radio-on':''"><input type="radio" v-model="secretariaEdit" value="E" style="display:none"> Educação</label>
              <label class="pb-radio" :class="secretariaEdit==='S'?'pb-radio-on':''"><input type="radio" v-model="secretariaEdit" value="S" style="display:none"> Saúde</label>
              <label class="pb-radio" :class="secretariaEdit==='O'?'pb-radio-on':''"><input type="radio" v-model="secretariaEdit" value="O" style="display:none"> Outros</label>
            </div>
          </div>
          <div class="pb-fg">
            <label class="pb-flbl">Status</label>
            <div class="pb-radio-group">
              <label class="pb-radio pb-radio-green" :class="statusUnidadeEdit==='L'?'pb-radio-on-green':''"><input type="radio" v-model="statusUnidadeEdit" value="L" style="display:none"> Ligado</label>
              <label class="pb-radio pb-radio-red"   :class="statusUnidadeEdit==='D'?'pb-radio-on-red':''"><input type="radio" v-model="statusUnidadeEdit" value="D" style="display:none"> Desligado</label>
              <label class="pb-radio pb-radio-amber" :class="statusUnidadeEdit==='M'?'pb-radio-on-amber':''"><input type="radio" v-model="statusUnidadeEdit" value="M" style="display:none"> Manutenção</label>
            </div>
          </div>
        </div>
      </div>
      <div class="pb-dialog-footer">
        <button class="pb-btn-secondary" @click="dialogEditUnidade=false">Cancelar</button>
        <button class="pb-btn-primary" style="background:#475569!important" @click="editUnidade">Salvar edição</button>
      </div>
    </div>
  </v-dialog>

  <!-- Dialog: Excluir Prédio -->
  <v-dialog v-model="dialogExcluirUnidade" max-width="420">
    <div class="pb-dialog">
      <div class="pb-dialog-hd" style="background:linear-gradient(135deg,#E11D48,#9F1239)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        <span>Excluir Prédio</span>
        <button class="pb-dialog-close" @click="dialogExcluirUnidade=false">✕</button>
      </div>
      <div class="pb-dialog-body">
        <div v-if="showSuccessAlertUnidadeExcluida" class="pb-alert pb-alert-ok">Prédio excluído com sucesso!</div>
        <div v-if="showErrorAlertUnidadeExcluida"   class="pb-alert pb-alert-err">Erro ao excluir prédio!</div>
        <div v-if="!showSuccessAlertUnidadeExcluida" class="pb-excluir-box">
          <div class="pb-excluir-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E11D48" stroke-width="2" stroke-linecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <p class="pb-excluir-msg">Tem certeza que deseja excluir este prédio?</p>
          <div class="pb-dialog-info" style="margin-top:12px">
            <span class="pb-info-row"><strong>UC:</strong> {{ ucUnidadeExcluir }}</span>
            <span class="pb-info-row"><strong>Nome:</strong> {{ nomeUnidadeExcluir }}</span>
          </div>
        </div>
      </div>
      <div class="pb-dialog-footer" v-if="!showSuccessAlertUnidadeExcluida">
        <button class="pb-btn-secondary" @click="dialogExcluirUnidade=false">Cancelar</button>
        <button class="pb-btn-primary pb-btn-red" @click="deleteUnidade">Confirmar exclusão</button>
      </div>
    </div>
  </v-dialog>

  <!-- Dialog: Listar Relatórios -->
  <v-dialog v-model="dialogRelatorios" max-width="680">
    <div class="pb-dialog">
      <div class="pb-dialog-hd" style="background:linear-gradient(135deg,#4F46E5,#059669)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>Lista de Relatórios</span>
        <button class="pb-dialog-close" @click="dialogRelatorios=false">✕</button>
      </div>
      <div class="pb-dialog-body">
        <div class="pb-dialog-info" style="margin-bottom:16px">
          <span class="pb-info-row"><strong>UC:</strong> {{ ucUnidadeRelatorio }}</span>
          <span class="pb-info-row"><strong>Unidade:</strong> {{ nomeUnidadeRelatorio }}</span>
        </div>
        <div class="pb-rela-tbl-wrap">
          <table class="pb-table" style="font-size:13px">
            <thead class="pb-thead">
              <tr>
                <th class="pb-th">ID</th>
                <th class="pb-th">Ano</th>
                <th class="pb-th">Mês</th>
                <th class="pb-th" style="text-align:center">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r,i) in relatoriosOrdenados" :key="r.id" class="pb-tr" :class="{'pb-tr-alt':i%2===1}">
                <td class="pb-td pb-mono">{{ r.id }}</td>
                <td class="pb-td" style="font-weight:700">{{ r.ano }}</td>
                <td class="pb-td">{{ r.mes }}</td>
                <td class="pb-td" style="text-align:center">
                  <div class="pb-actions-row" style="justify-content:center">
                    <button class="pb-icon-btn pb-icon-slate" @click="openDialogRelatoriosEditar(r.id)" title="Editar">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="pb-icon-btn pb-icon-red" @click="deleteRelatorio(r.id)" title="Excluir">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="pb-dialog-footer">
        <button class="pb-btn-primary pb-btn-indigo" @click="dialogRelatorios=false">Fechar</button>
      </div>
    </div>
  </v-dialog>

  <!-- Dialog: Editar Relatório -->
  <v-dialog v-model="dialogRelatoriosEditar" max-width="620">
    <div class="pb-dialog">
      <div class="pb-dialog-hd" style="background:linear-gradient(135deg,#4F46E5,#7C3AED)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <span>Editando Relatório #{{ idRelaEdit }}</span>
        <button class="pb-dialog-close" @click="dialogRelatoriosEditar=false">✕</button>
      </div>
      <div class="pb-dialog-body">
        <div v-if="showErrorAlertEdit"   class="pb-alert pb-alert-err">Erro ao editar relatório!</div>
        <div v-if="showErrorCampoEdit"   class="pb-alert pb-alert-err">Preencha todos os campos!</div>
        <div v-if="showSuccessAlertEdit" class="pb-alert pb-alert-ok">Relatório editado com sucesso!</div>
        <div class="pb-form-grid">
          <div class="pb-fg">
            <label class="pb-flbl">Mês</label>
            <select v-model="mesRelUniEdit" class="pb-select" disabled>
              <option v-for="m in meses" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="pb-fg">
            <label class="pb-flbl">Ano</label>
            <select v-model="anoRelUniEdit" class="pb-select" disabled>
              <option v-for="a in anos" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div class="pb-fg"><label class="pb-flbl">Consumo (kWh)</label><input v-model="consumoUniEdit"   type="number" class="pb-input" /></div>
          <div class="pb-fg"><label class="pb-flbl">Consumo (R$)</label><input v-model="valorConUniEdit"  type="number" class="pb-input" /></div>
          <div class="pb-fg"><label class="pb-flbl">Ener. Inj-TUSD (kWh)</label><input v-model="enerTusdUniEdit"  type="number" class="pb-input" /></div>
          <div class="pb-fg"><label class="pb-flbl">Valor TUSD (R$)</label><input v-model="valorTusdUniEdit" type="number" class="pb-input" /></div>
          <div class="pb-fg"><label class="pb-flbl">Ener. Inj-TE (kWh)</label><input v-model="enerTeUniEdit"    type="number" class="pb-input" /></div>
          <div class="pb-fg"><label class="pb-flbl">Valor TE (R$)</label><input v-model="valorTeUniEdit"  type="number" class="pb-input" /></div>
        </div>
      </div>
      <div class="pb-dialog-footer">
        <button class="pb-btn-secondary" @click="dialogRelatoriosEditar=false">Cancelar</button>
        <button class="pb-btn-primary pb-btn-indigo" @click="saveChangesRelatorio(idRelaEdit)">Salvar edição</button>
      </div>
    </div>
  </v-dialog>

</div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

/* ══════ ROOT ══════ */
.pb-root { min-height:100vh!important; background:#F0FDF9!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; color:#0f172a!important; padding-bottom:40px!important; }

/* ══════ HEADER ══════ */
.pb-header { background:linear-gradient(135deg,#ECFDF5 0%,#EEF2FF 100%)!important; border-bottom:1px solid #E2E8F0!important; padding:24px 28px 20px!important; margin-bottom:28px!important; display:flex!important; align-items:center!important; justify-content:space-between!important; overflow:hidden!important; }
.pb-header-left { display:flex!important; align-items:center!important; gap:16px!important; }
.pb-header-icon { width:48px!important; height:48px!important; border-radius:13px!important; background:#059669!important; display:flex!important; align-items:center!important; justify-content:center!important; box-shadow:0 4px 14px rgba(5,150,105,.3)!important; flex-shrink:0!important; }
.pb-breadcrumb { display:flex!important; align-items:center!important; gap:5px!important; font-size:11px!important; color:#94A3B8!important; margin-bottom:3px!important; }
.pb-breadcrumb a { color:#059669!important; text-decoration:none!important; font-weight:600!important; }
.pb-title { font-size:26px!important; font-weight:900!important; letter-spacing:-.03em!important; color:#0f172a!important; margin:0 0 3px!important; line-height:1!important; }
.pb-sub { font-size:13px!important; color:#64748b!important; margin:0!important; }
.pb-header-img { height:110px!important; opacity:.85!important; }

/* ══════ KPI ══════ */
.pb-kpi-row { display:grid!important; grid-template-columns:repeat(4,1fr)!important; gap:12px!important; padding:0 28px 28px!important; }
.pb-kpi { background:#fff!important; border:1px solid #f1f5f9!important; border-radius:14px!important; padding:16px 14px 14px!important; position:relative!important; overflow:hidden!important; display:flex!important; flex-direction:column!important; transition:transform .18s,box-shadow .18s!important; }
.pb-kpi:hover { transform:translateY(-3px)!important; box-shadow:0 8px 24px rgba(0,0,0,.08)!important; }
.pb-kpi::before { content:''!important; position:absolute!important; top:0!important; left:0!important; right:0!important; height:2px!important; }
.pb-kpi-indigo::before { background:#4F46E5!important; } .pb-kpi-green::before { background:#059669!important; }
.pb-kpi-amber::before  { background:#D97706!important; } .pb-kpi-violet::before{ background:#7C3AED!important; }
.pb-kpi-badge { position:absolute!important; top:13px!important; right:13px!important; width:28px!important; height:28px!important; border-radius:8px!important; display:flex!important; align-items:center!important; justify-content:center!important; }
.pb-kpi-indigo .pb-kpi-badge { background:#EEF2FF!important; color:#4F46E5!important; }
.pb-kpi-green  .pb-kpi-badge { background:#ECFDF5!important; color:#059669!important; }
.pb-kpi-amber  .pb-kpi-badge { background:#FFFBEB!important; color:#D97706!important; }
.pb-kpi-violet .pb-kpi-badge { background:#F5F3FF!important; color:#7C3AED!important; }
.pb-kpi-badge svg { stroke:currentColor!important; }
.pb-kpi-label { font-size:10px!important; font-weight:700!important; letter-spacing:.12em!important; text-transform:uppercase!important; color:#94A3B8!important; display:block!important; margin-bottom:8px!important; margin-top:2px!important; }
.pb-kpi-val   { font-size:30px!important; font-weight:900!important; letter-spacing:-.03em!important; line-height:1!important; display:block!important; margin-bottom:4px!important; }
.pb-kpi-note  { font-size:11px!important; color:#94A3B8!important; font-weight:500!important; display:block!important; }
.pb-kpi-indigo .pb-kpi-val { color:#4F46E5!important; } .pb-kpi-green .pb-kpi-val  { color:#059669!important; }
.pb-kpi-amber  .pb-kpi-val { color:#D97706!important; } .pb-kpi-violet .pb-kpi-val { color:#7C3AED!important; }
.pb-kpi-bottom { position:absolute!important; bottom:0!important; left:0!important; right:0!important; height:36px!important; opacity:.04!important; }
.pb-kpi-indigo .pb-kpi-bottom { background:#4F46E5!important; } .pb-kpi-green .pb-kpi-bottom  { background:#059669!important; }
.pb-kpi-amber  .pb-kpi-bottom { background:#D97706!important; } .pb-kpi-violet .pb-kpi-bottom { background:#7C3AED!important; }

/* ══════ BODY ══════ */
.pb-body { padding:0 28px!important; }
.pb-table-card { background:#fff!important; border:1px solid #E2E8F0!important; border-radius:16px!important; overflow:hidden!important; box-shadow:0 1px 6px rgba(0,0,0,.05)!important; }
.pb-card-hd { display:flex!important; align-items:center!important; justify-content:space-between!important; padding:18px 22px!important; border-bottom:1px solid #F1F5F9!important; background:#FAFBFF!important; gap:12px!important; flex-wrap:wrap!important; }
.pb-card-hd-left { display:flex!important; align-items:center!important; gap:12px!important; }
.pb-card-num { width:32px!important; height:32px!important; border-radius:9px!important; background:#059669!important; color:#fff!important; display:flex!important; align-items:center!important; justify-content:center!important; font-size:13px!important; font-weight:900!important; flex-shrink:0!important; }
.pb-card-title { font-size:16px!important; font-weight:800!important; color:#0f172a!important; margin:0 0 2px!important; display:block!important; }
.pb-card-sub   { font-size:12px!important; color:#64748b!important; margin:0!important; }

/* Botão adicionar */
.pb-btn-add { display:flex!important; align-items:center!important; gap:7px!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; font-size:12px!important; font-weight:800!important; background:#059669!important; color:#fff!important; border:none!important; border-radius:10px!important; padding:9px 18px!important; cursor:pointer!important; box-shadow:0 2px 8px rgba(5,150,105,.3)!important; transition:all .15s!important; }
.pb-btn-add:hover { background:#047857!important; transform:translateY(-1px)!important; }
.pb-btn-add svg { stroke:#fff!important; }

/* Filtros */
.pb-filters { display:flex!important; align-items:center!important; gap:12px!important; padding:14px 22px!important; border-bottom:1px solid #F1F5F9!important; flex-wrap:wrap!important; }
.pb-filters-lbl { font-size:10px!important; font-weight:700!important; letter-spacing:.1em!important; text-transform:uppercase!important; color:#94A3B8!important; }
.pb-filter-chips { display:flex!important; gap:6px!important; flex-wrap:wrap!important; }
.pb-chip { padding:5px 14px!important; border-radius:20px!important; border:1.5px solid #E2E8F0!important; background:#F8FAFC!important; color:#64748b!important; font-size:12px!important; font-weight:700!important; cursor:pointer!important; transition:all .13s!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; }
.pb-chip:hover { border-color:#94A3B8!important; color:#0f172a!important; }
.pb-chip-active { color:#fff!important; }
.pb-chip-slate.pb-chip-active  { background:#475569!important; border-color:#475569!important; }
.pb-chip-indigo.pb-chip-active { background:#4F46E5!important; border-color:#4F46E5!important; }
.pb-chip-green.pb-chip-active  { background:#059669!important; border-color:#059669!important; }
.pb-chip-amber.pb-chip-active  { background:#D97706!important; border-color:#D97706!important; }

/* Tabela */
.pb-tbl-wrap { overflow-x:auto!important; }
.pb-table { width:100%!important; border-collapse:collapse!important; font-size:13px!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; }
.pb-thead th { background:#059669!important; color:#ffffff!important; }
.pb-th { font-size:10px!important; font-weight:700!important; letter-spacing:.07em!important; text-transform:uppercase!important; padding:11px 14px!important; text-align:left!important; white-space:nowrap!important; border:none!important; }
.pb-tr:hover td { background:#F0FDF9!important; }
.pb-tr-alt td { background:#FAFBFF!important; }
.pb-td { padding:9px 14px!important; border-bottom:1px solid #F1F5F9!important; color:#0f172a!important; vertical-align:middle!important; }
.pb-mono { font-family:'DM Mono',monospace!important; font-size:11px!important; color:#64748b!important; }

/* Pills na tabela */
.pb-tensao-pill { display:inline-block!important; background:#F8FAFC!important; border:1px solid #E2E8F0!important; color:#475569!important; font-size:11px!important; font-weight:700!important; padding:2px 9px!important; border-radius:20px!important; }
.pb-status-pill { display:inline-flex!important; align-items:center!important; gap:5px!important; font-size:11px!important; font-weight:700!important; padding:3px 10px!important; border-radius:20px!important; }
.pb-status-green { background:#ECFDF5!important; color:#047857!important; border:1px solid #A7F3D0!important; }
.pb-status-amber { background:#FFFBEB!important; color:#92400E!important; border:1px solid #FDE68A!important; }
.pb-status-red   { background:#FFF1F2!important; color:#9F1239!important; border:1px solid #FECDD3!important; }
.pb-status-dot   { width:6px!important; height:6px!important; border-radius:50%!important; background:currentColor!important; opacity:.7!important; }
.pb-sec-pill { display:inline-block!important; font-size:11px!important; font-weight:700!important; padding:3px 10px!important; border-radius:20px!important; }
.pb-sec-indigo { background:#EEF2FF!important; color:#4F46E5!important; }
.pb-sec-green  { background:#ECFDF5!important; color:#059669!important; }
.pb-sec-amber  { background:#FFFBEB!important; color:#D97706!important; }
.pb-off-pill { font-size:11px!important; color:#94A3B8!important; }

/* Botões de ação na tabela */
.pb-actions-row { display:flex!important; align-items:center!important; gap:4px!important; }
.pb-icon-btn { width:30px!important; height:30px!important; border-radius:8px!important; border:none!important; display:flex!important; align-items:center!important; justify-content:center!important; cursor:pointer!important; transition:all .13s!important; flex-shrink:0!important; }
.pb-icon-btn svg { stroke:currentColor!important; }
.pb-icon-indigo { background:#EEF2FF!important; color:#4F46E5!important; }
.pb-icon-indigo:hover { background:#4F46E5!important; color:#fff!important; }
.pb-icon-amber  { background:#FFFBEB!important; color:#D97706!important; }
.pb-icon-amber:hover  { background:#D97706!important; color:#fff!important; }
.pb-icon-slate  { background:#F1F5F9!important; color:#475569!important; }
.pb-icon-slate:hover  { background:#475569!important; color:#fff!important; }
.pb-icon-red    { background:#FFF1F2!important; color:#E11D48!important; }
.pb-icon-red:hover    { background:#E11D48!important; color:#fff!important; }

/* ══════ DIALOGS ══════ */
.pb-dialog { background:#fff!important; border-radius:16px!important; overflow:hidden!important; box-shadow:0 20px 60px rgba(0,0,0,.18)!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; }
.pb-dialog-hd { display:flex!important; align-items:center!important; gap:10px!important; padding:16px 20px!important; color:#fff!important; }
.pb-dialog-hd span { font-size:15px!important; font-weight:800!important; flex:1!important; }
.pb-dialog-close { width:28px!important; height:28px!important; border-radius:7px!important; border:none!important; background:rgba(255,255,255,.2)!important; color:#fff!important; cursor:pointer!important; font-size:13px!important; display:flex!important; align-items:center!important; justify-content:center!important; transition:background .13s!important; }
.pb-dialog-close:hover { background:rgba(255,255,255,.35)!important; }
.pb-dialog-body { padding:20px!important; max-height:70vh!important; overflow-y:auto!important; }
.pb-dialog-footer { display:flex!important; justify-content:flex-end!important; gap:10px!important; padding:14px 20px!important; border-top:1px solid #F1F5F9!important; background:#FAFBFF!important; }
.pb-dialog-divider { height:1px!important; background:#F1F5F9!important; margin:14px 0!important; }
.pb-dialog-info { display:flex!important; flex-direction:column!important; gap:4px!important; background:#F8FAFC!important; border:1px solid #E2E8F0!important; border-radius:10px!important; padding:12px 14px!important; }
.pb-info-row { font-size:13px!important; color:#475569!important; }
.pb-info-row strong { color:#0f172a!important; font-weight:700!important; }
.pb-dialog-section-lbl { font-size:10px!important; font-weight:700!important; letter-spacing:.1em!important; text-transform:uppercase!important; color:#94A3B8!important; margin-bottom:8px!important; display:block!important; }

/* Alertas no dialog */
.pb-alert { display:flex!important; align-items:center!important; gap:8px!important; padding:10px 14px!important; border-radius:10px!important; font-size:13px!important; font-weight:600!important; margin-bottom:12px!important; }
.pb-alert-ok  { background:#ECFDF5!important; color:#047857!important; border:1px solid #A7F3D0!important; }
.pb-alert-err { background:#FFF1F2!important; color:#9F1239!important; border:1px solid #FECDD3!important; }

/* Form */
.pb-form-grid { display:grid!important; grid-template-columns:1fr 1fr!important; gap:14px!important; }
.pb-fg { display:flex!important; flex-direction:column!important; gap:6px!important; }
.pb-fg-full { grid-column:1/-1!important; }
.pb-flbl { font-size:10px!important; font-weight:700!important; letter-spacing:.1em!important; text-transform:uppercase!important; color:#64748b!important; }
.pb-input, .pb-select {
  font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; font-size:13px!important; font-weight:600!important; color:#0f172a!important;
  background:#F8FAFC!important; border:1.5px solid #E2E8F0!important; border-radius:10px!important; padding:9px 12px!important;
  outline:none!important; transition:border-color .14s,box-shadow .14s!important; width:100%!important;
}
.pb-input:focus, .pb-select:focus { border-color:#059669!important; background:#fff!important; box-shadow:0 0 0 3px rgba(5,150,105,.1)!important; }

/* Radio customizado */
.pb-radio-group { display:flex!important; gap:6px!important; flex-wrap:wrap!important; }
.pb-radio { padding:6px 14px!important; border-radius:20px!important; border:1.5px solid #E2E8F0!important; background:#F8FAFC!important; color:#64748b!important; font-size:12px!important; font-weight:700!important; cursor:pointer!important; transition:all .13s!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; }
.pb-radio:hover { border-color:#94A3B8!important; }
.pb-radio-on       { background:#4F46E5!important; border-color:#4F46E5!important; color:#fff!important; }
.pb-radio-on-green { background:#059669!important; border-color:#059669!important; color:#fff!important; }
.pb-radio-on-red   { background:#E11D48!important; border-color:#E11D48!important; color:#fff!important; }
.pb-radio-on-amber { background:#D97706!important; border-color:#D97706!important; color:#fff!important; }

/* Botões dialog */
.pb-btn-secondary { font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; font-size:12px!important; font-weight:700!important; background:#F8FAFC!important; color:#475569!important; border:1.5px solid #E2E8F0!important; border-radius:10px!important; padding:9px 18px!important; cursor:pointer!important; transition:all .14s!important; }
.pb-btn-secondary:hover { background:#F1F5F9!important; }
.pb-btn-primary { font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; font-size:12px!important; font-weight:800!important; color:#fff!important; border:none!important; border-radius:10px!important; padding:9px 20px!important; cursor:pointer!important; transition:all .14s!important; }
.pb-btn-green  { background:#059669!important; box-shadow:0 2px 8px rgba(5,150,105,.3)!important; }
.pb-btn-green:hover  { background:#047857!important; }
.pb-btn-indigo { background:#4F46E5!important; box-shadow:0 2px 8px rgba(79,70,229,.3)!important; }
.pb-btn-indigo:hover { background:#4338CA!important; }
.pb-btn-red    { background:#E11D48!important; box-shadow:0 2px 8px rgba(225,29,72,.3)!important; }
.pb-btn-red:hover    { background:#BE123C!important; }

/* Porcentagens */
.pb-pct-list { display:flex!important; flex-direction:column!important; gap:6px!important; }
.pb-pct-item { display:flex!important; align-items:center!important; justify-content:space-between!important; background:#F8FAFC!important; border:1px solid #E2E8F0!important; border-radius:10px!important; padding:10px 14px!important; }
.pb-pct-hist { opacity:.65!important; }
.pb-pct-info { display:flex!important; align-items:center!important; gap:10px!important; }
.pb-pct-uc   { font-family:'DM Mono',monospace!important; font-size:12px!important; color:#64748b!important; }
.pb-pct-val  { font-size:14px!important; font-weight:900!important; color:#059669!important; }
.pb-pct-period { font-size:11px!important; color:#94A3B8!important; }
.pb-empty-msg  { font-size:12px!important; color:#94A3B8!important; text-align:center!important; padding:12px!important; }

/* Excluir dialog */
.pb-excluir-box { display:flex!important; flex-direction:column!important; align-items:center!important; gap:10px!important; padding:16px 0!important; }
.pb-excluir-icon { width:56px!important; height:56px!important; border-radius:14px!important; background:#FFF1F2!important; display:flex!important; align-items:center!important; justify-content:center!important; }
.pb-excluir-msg  { font-size:14px!important; font-weight:700!important; color:#475569!important; text-align:center!important; margin:0!important; }

/* Tabela dentro do dialog */
.pb-rela-tbl-wrap { overflow-x:auto!important; border-radius:10px!important; border:1px solid #E2E8F0!important; }

/* Responsivo */
@media (max-width:900px) { .pb-kpi-row { grid-template-columns:1fr 1fr!important; } }
@media (max-width:640px) {
  .pb-header { padding:16px 20px!important; flex-direction:column!important; align-items:flex-start!important; }
  .pb-header-img { display:none!important; }
  .pb-title { font-size:22px!important; }
  .pb-body, .pb-kpi-row { padding-left:16px!important; padding-right:16px!important; }
  .pb-kpi-row { grid-template-columns:1fr 1fr!important; }
  .pb-form-grid { grid-template-columns:1fr!important; }
}
</style>