<script setup>
import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';

useHead({ title: 'Usinas' });
definePageMeta({ middleware: 'sidebase-auth' })

import { ref } from "vue";
import UiParentCard from "@/components/shared/UiParentCard.vue";
const dialog = ref(false);

const usinaId       = ref("");
const ucUsina       = ref("");
const nomeUsina     = ref("");
const dataInicioUsina = ref("");
const potenciaUsina = ref("");
const enderecoUsina = ref("");
const statusUsina   = ref("");
const tensaoUsina   = ref("");

const showSuccessAlert = ref(false);
const showErrorAlert   = ref(false);
const showErrorCampo   = ref(false);

const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);

const getStatusLabel = (s) => ({ L:'Ligado', D:'Desligado', M:'Manutenção' }[s] ?? 'Desconhecido');
const getStatusColorClass = (s) => ({ L:'bg-success', D:'bg-error', M:'bg-warning' }[s] ?? 'bg-primary');

const openDialog = async (idUsina) => {
  const { data: u } = await useFetch(`${API_BASE_URL}/usina/${idUsina}`);
  ucUsina.value       = u.value.uc;
  nomeUsina.value     = u.value.nome;
  dataInicioUsina.value = u.value.dataInicio;
  potenciaUsina.value = u.value.potencia;
  enderecoUsina.value = u.value.endereco;
  statusUsina.value   = u.value.status;
  tensaoUsina.value   = u.value.tensao;
  usinaId.value       = idUsina;
  dialog.value = true;
};

const closeDialog = () => {
  showErrorAlert.value = false; showErrorCampo.value = false; showSuccessAlert.value = false;
  dialog.value = false;
};

const saveChanges = async () => {
  if (!ucUsina.value || !nomeUsina.value || !dataInicioUsina.value || !potenciaUsina.value || !enderecoUsina.value || !statusUsina.value) {
    showErrorCampo.value = true; return;
  }
  try {
    const response = await useFetch(`${API_BASE_URL}/usina/${usinaId.value}`, {
      method: "PUT",
      body: { uc: ucUsina, nome: nomeUsina, dataInicio: dataInicioUsina, potencia: potenciaUsina, endereco: enderecoUsina, status: statusUsina, tensao: tensaoUsina },
      key: "usinaPut",
    });
    if (response) { showSuccessAlert.value = true; showErrorCampo.value = false; }
    else { showErrorAlert.value = true; showErrorCampo.value = false; }
  } catch { showErrorAlert.value = true; showErrorCampo.value = false; }
  const { data: upd } = await useFetch(`${API_BASE_URL}/usina/`);
  usinas.value = upd._value;
};

usinas.value.sort((a, b) => (a.status === 'L' ? -1 : b.status === 'L' ? 1 : 0));

const usinasLigadas   = usinas.value.filter(i => i.status === 'L');
const usinasDesligadas = usinas.value.filter(i => i.status === 'D' || i.status === 'M');
const mudarVisu = ref(0);

const ANOS  = [2023,2024,2025,2026,2027,2028];
const MESES = [1,2,3,4,5,6,7,8,9,10,11,12];
</script>

<template>
<div class="us-root">

  <!-- ══════ HEADER ══════ -->
  <div class="us-header">
    <div class="us-header-left">
      <div class="us-header-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <div>
        <nav class="us-breadcrumb"><a href="/">Início</a><span>›</span><a href="/">Eficiência</a><span>›</span><span>Usinas</span></nav>
        <h1 class="us-title">Usinas Fotovoltaicas</h1>
        <p class="us-sub">Gestão e monitoramento das usinas geradoras</p>
      </div>
    </div>
    <img src="https://i.imgur.com/wBFBoIm.png" class="us-header-img" alt="">
  </div>

  <!-- ══════ KPI CARDS ══════ -->
  <div class="us-kpi-row">
    <div class="us-kpi us-kpi-green">
      <div class="us-kpi-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
      <span class="us-kpi-label">Ligadas</span>
      <span class="us-kpi-val">{{ usinasLigadas.length }}</span>
      <span class="us-kpi-note">operando normalmente</span>
      <div class="us-kpi-bottom"></div>
    </div>
    <div class="us-kpi us-kpi-rose">
      <div class="us-kpi-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
      <span class="us-kpi-label">Desligadas / Manutenção</span>
      <span class="us-kpi-val">{{ usinasDesligadas.length }}</span>
      <span class="us-kpi-note">fora de operação</span>
      <div class="us-kpi-bottom"></div>
    </div>
    <div class="us-kpi us-kpi-indigo">
      <div class="us-kpi-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
      <span class="us-kpi-label">Total</span>
      <span class="us-kpi-val">{{ usinas.length }}</span>
      <span class="us-kpi-note">usinas cadastradas</span>
      <div class="us-kpi-bottom"></div>
    </div>
  </div>

  <!-- ══════ TABELA / CARDS ══════ -->
  <div class="us-body">
    <div class="us-table-card">

      <div class="us-card-hd">
        <div class="us-card-hd-left">
          <div class="us-card-num">01</div>
          <div>
            <h3 class="us-card-title">Lista de Usinas</h3>
            <p class="us-card-sub">Clique em ver para acessar os detalhes individuais</p>
          </div>
        </div>
        <div class="us-card-hd-right">
          <NuxtLink to="/usinas/criar/">
            <button class="us-btn-add">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nova Usina
            </button>
          </NuxtLink>
          <button class="us-btn-toggle" @click="mudarVisu = mudarVisu === 0 ? 1 : 0" :title="mudarVisu===0 ? 'Vista tabela' : 'Vista cards'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- VISTA TABELA -->
      <div v-if="mudarVisu === 1" class="us-tbl-wrap">
        <table class="us-table">
          <thead class="us-thead">
            <tr>
              <th class="us-th">ID</th>
              <th class="us-th">UC</th>
              <th class="us-th">Nome</th>
              <th class="us-th" style="text-align:center">kWp</th>
              <th class="us-th" style="text-align:center">Status</th>
              <th class="us-th" style="text-align:center">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(usina, i) in usinas" :key="usina.id" class="us-tr" :class="{'us-tr-alt': i%2===1}">
              <td class="us-td us-mono">{{ usina.id }}</td>
              <td class="us-td us-mono">{{ usina.uc }}</td>
              <td class="us-td" style="font-weight:700">{{ usina.nome.toUpperCase() }}</td>
              <td class="us-td" style="text-align:center;font-weight:700">{{ usina.potencia }}</td>
              <td class="us-td" style="text-align:center">
                <span class="us-status-pill" :class="usina.status==='L' ? 'us-status-green' : usina.status==='M' ? 'us-status-amber' : 'us-status-red'">
                  <span class="us-status-dot"></span>{{ getStatusLabel(usina.status) }}
                </span>
              </td>
              <td class="us-td" style="text-align:center">
                <div class="us-actions-row">
                  <NuxtLink :to="`/usinas/${usina.id}`">
                    <button class="us-icon-btn us-icon-indigo" title="Ver Usina">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </NuxtLink>
                  <button class="us-icon-btn us-icon-slate" title="Editar" @click="openDialog(usina.id)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- VISTA CARDS -->
      <div v-if="mudarVisu === 0" class="us-cards-grid">
        <div v-for="usina in usinas" :key="usina.id" class="us-card"
          :class="usina.status==='L' ? 'us-card-green' : usina.status==='M' ? 'us-card-amber' : 'us-card-red'">
          <div class="us-card-top">
            <span class="us-status-pill" :class="usina.status==='L' ? 'us-status-green' : usina.status==='M' ? 'us-status-amber' : 'us-status-red'">
              <span class="us-status-dot"></span>{{ getStatusLabel(usina.status) }}
            </span>
            <div class="us-card-actions-top">
              <NuxtLink :to="`/usinas/${usina.id}`">
                <button class="us-icon-btn us-icon-indigo" title="Ver">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </NuxtLink>
              <button class="us-icon-btn us-icon-slate" title="Editar" @click="openDialog(usina.id)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          </div>
          <h4 class="us-card-nome">{{ usina.nome.toUpperCase() }}</h4>
          <div class="us-card-divider"></div>
          <div class="us-card-info">
            <div class="us-card-info-row">
              <span class="us-card-info-lbl">UC</span>
              <span class="us-card-info-val us-mono">{{ usina.uc }}</span>
            </div>
            <div class="us-card-info-row">
              <span class="us-card-info-lbl">Potência</span>
              <span class="us-card-info-val">{{ usina.potencia }} kWp</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ══════ DIALOG EDITAR ══════ -->
  <v-dialog v-model="dialog" max-width="600" persistent>
    <div class="us-dialog">
      <div class="us-dialog-hd" style="background:linear-gradient(135deg,#475569,#0f172a)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <span>Editando Usina</span>
        <button class="us-dialog-close" @click="closeDialog">✕</button>
      </div>
      <div class="us-dialog-body">
        <div v-if="showErrorCampo"   class="us-alert us-alert-err">Preencha todos os campos!</div>
        <div v-if="showSuccessAlert" class="us-alert us-alert-ok">Usina editada com sucesso!</div>
        <div v-if="showErrorAlert"   class="us-alert us-alert-err">Erro ao editar usina!</div>
        <div class="us-form-grid">
          <div class="us-fg"><label class="us-flbl">UC</label><input v-model="ucUsina" type="number" class="us-input"/></div>
          <div class="us-fg"><label class="us-flbl">Nome</label><input v-model="nomeUsina" class="us-input"/></div>
          <div class="us-fg"><label class="us-flbl">Data início</label><input v-model="dataInicioUsina" type="date" class="us-input"/></div>
          <div class="us-fg"><label class="us-flbl">Potência (kWp)</label><input v-model="potenciaUsina" type="number" class="us-input"/></div>
          <div class="us-fg us-fg-full"><label class="us-flbl">Endereço</label><input v-model="enderecoUsina" class="us-input"/></div>
          <div class="us-fg">
            <label class="us-flbl">Tensão</label>
            <div class="us-radio-group">
              <label class="us-radio" :class="tensaoUsina==='BT'?'us-radio-on':''"><input type="radio" v-model="tensaoUsina" value="BT" style="display:none"> BT</label>
              <label class="us-radio" :class="tensaoUsina==='MT'?'us-radio-on':''"><input type="radio" v-model="tensaoUsina" value="MT" style="display:none"> MT</label>
            </div>
          </div>
          <div class="us-fg">
            <label class="us-flbl">Status</label>
            <div class="us-radio-group">
              <label class="us-radio us-radio-green" :class="statusUsina==='L'?'us-radio-on-green':''"><input type="radio" v-model="statusUsina" value="L" style="display:none"> Ligado</label>
              <label class="us-radio us-radio-red"   :class="statusUsina==='D'?'us-radio-on-red':''"><input type="radio" v-model="statusUsina" value="D" style="display:none"> Desligado</label>
              <label class="us-radio us-radio-amber" :class="statusUsina==='M'?'us-radio-on-amber':''"><input type="radio" v-model="statusUsina" value="M" style="display:none"> Manutenção</label>
            </div>
          </div>
        </div>
      </div>
      <div class="us-dialog-footer">
        <button class="us-btn-secondary" @click="closeDialog">Cancelar</button>
        <button class="us-btn-primary" style="background:#475569!important" @click="saveChanges">Salvar edição</button>
      </div>
    </div>
  </v-dialog>

</div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

.us-root { min-height:100vh!important; background:#F0FDF9!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; color:#0f172a!important; padding-bottom:40px!important; }

/* HEADER */
.us-header { background:linear-gradient(135deg,#ECFDF5 0%,#EEF2FF 100%)!important; border-bottom:1px solid #E2E8F0!important; padding:24px 28px 20px!important; margin-bottom:28px!important; display:flex!important; align-items:center!important; justify-content:space-between!important; overflow:hidden!important; }
.us-header-left { display:flex!important; align-items:center!important; gap:16px!important; }
.us-header-icon { width:48px!important; height:48px!important; border-radius:13px!important; background:#059669!important; display:flex!important; align-items:center!important; justify-content:center!important; box-shadow:0 4px 14px rgba(5,150,105,.3)!important; flex-shrink:0!important; }
.us-breadcrumb { display:flex!important; align-items:center!important; gap:5px!important; font-size:11px!important; color:#94A3B8!important; margin-bottom:3px!important; }
.us-breadcrumb a { color:#059669!important; text-decoration:none!important; font-weight:600!important; }
.us-title { font-size:26px!important; font-weight:900!important; letter-spacing:-.03em!important; color:#0f172a!important; margin:0 0 3px!important; }
.us-sub { font-size:13px!important; color:#64748b!important; margin:0!important; }
.us-header-img { height:110px!important; opacity:.85!important; }

/* KPI */
.us-kpi-row { display:grid!important; grid-template-columns:repeat(3,1fr)!important; gap:12px!important; padding:0 28px 28px!important; }
.us-kpi { background:#fff!important; border:1px solid #f1f5f9!important; border-radius:14px!important; padding:16px 14px 14px!important; position:relative!important; overflow:hidden!important; display:flex!important; flex-direction:column!important; transition:transform .18s,box-shadow .18s!important; }
.us-kpi:hover { transform:translateY(-3px)!important; box-shadow:0 8px 24px rgba(0,0,0,.08)!important; }
.us-kpi::before { content:''!important; position:absolute!important; top:0!important; left:0!important; right:0!important; height:2px!important; }
.us-kpi-green::before { background:#059669!important; } .us-kpi-rose::before { background:#E11D48!important; } .us-kpi-indigo::before { background:#4F46E5!important; }
.us-kpi-badge { position:absolute!important; top:13px!important; right:13px!important; width:28px!important; height:28px!important; border-radius:8px!important; display:flex!important; align-items:center!important; justify-content:center!important; }
.us-kpi-green .us-kpi-badge { background:#ECFDF5!important; color:#059669!important; } .us-kpi-rose .us-kpi-badge { background:#FFF1F2!important; color:#E11D48!important; } .us-kpi-indigo .us-kpi-badge { background:#EEF2FF!important; color:#4F46E5!important; }
.us-kpi-badge svg { stroke:currentColor!important; }
.us-kpi-label { font-size:10px!important; font-weight:700!important; letter-spacing:.12em!important; text-transform:uppercase!important; color:#94A3B8!important; display:block!important; margin-bottom:8px!important; margin-top:2px!important; }
.us-kpi-val { font-size:32px!important; font-weight:900!important; letter-spacing:-.03em!important; line-height:1!important; display:block!important; margin-bottom:4px!important; }
.us-kpi-green .us-kpi-val { color:#059669!important; } .us-kpi-rose .us-kpi-val { color:#E11D48!important; } .us-kpi-indigo .us-kpi-val { color:#4F46E5!important; }
.us-kpi-note { font-size:11px!important; color:#94A3B8!important; font-weight:500!important; display:block!important; }
.us-kpi-bottom { position:absolute!important; bottom:0!important; left:0!important; right:0!important; height:36px!important; opacity:.04!important; }
.us-kpi-green .us-kpi-bottom { background:#059669!important; } .us-kpi-rose .us-kpi-bottom { background:#E11D48!important; } .us-kpi-indigo .us-kpi-bottom { background:#4F46E5!important; }

/* BODY */
.us-body { padding:0 28px!important; }
.us-table-card { background:#fff!important; border:1px solid #E2E8F0!important; border-radius:16px!important; overflow:hidden!important; box-shadow:0 1px 6px rgba(0,0,0,.05)!important; }
.us-card-hd { display:flex!important; align-items:center!important; justify-content:space-between!important; padding:18px 22px!important; border-bottom:1px solid #F1F5F9!important; background:#FAFBFF!important; flex-wrap:wrap!important; gap:12px!important; }
.us-card-hd-left { display:flex!important; align-items:center!important; gap:12px!important; }
.us-card-num { width:32px!important; height:32px!important; border-radius:9px!important; background:#059669!important; color:#fff!important; display:flex!important; align-items:center!important; justify-content:center!important; font-size:13px!important; font-weight:900!important; flex-shrink:0!important; }
.us-card-title { font-size:16px!important; font-weight:800!important; color:#0f172a!important; margin:0 0 2px!important; display:block!important; }
.us-card-sub   { font-size:12px!important; color:#64748b!important; margin:0!important; }
.us-card-hd-right { display:flex!important; align-items:center!important; gap:8px!important; }

/* Botões cabeçalho */
.us-btn-add { display:flex!important; align-items:center!important; gap:7px!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; font-size:12px!important; font-weight:800!important; background:#059669!important; color:#fff!important; border:none!important; border-radius:10px!important; padding:9px 18px!important; cursor:pointer!important; box-shadow:0 2px 8px rgba(5,150,105,.3)!important; transition:all .15s!important; }
.us-btn-add:hover { background:#047857!important; } .us-btn-add svg { stroke:#fff!important; }
.us-btn-toggle { width:36px!important; height:36px!important; border-radius:9px!important; border:1.5px solid #E2E8F0!important; background:#F8FAFC!important; color:#475569!important; cursor:pointer!important; display:flex!important; align-items:center!important; justify-content:center!important; transition:all .14s!important; }
.us-btn-toggle:hover { border-color:#059669!important; color:#059669!important; } .us-btn-toggle svg { stroke:currentColor!important; }

/* Tabela */
.us-tbl-wrap { overflow-x:auto!important; }
.us-table { width:100%!important; border-collapse:collapse!important; font-size:13px!important; }
.us-thead th { background:#059669!important; color:#fff!important; }
.us-th { font-size:10px!important; font-weight:700!important; letter-spacing:.07em!important; text-transform:uppercase!important; padding:11px 14px!important; text-align:left!important; white-space:nowrap!important; border:none!important; }
.us-tr:hover td { background:#F0FDF9!important; } .us-tr-alt td { background:#FAFBFF!important; }
.us-td { padding:10px 14px!important; border-bottom:1px solid #F1F5F9!important; color:#0f172a!important; vertical-align:middle!important; }
.us-mono { font-family:'DM Mono',monospace!important; font-size:11px!important; color:#64748b!important; }

/* Pills */
.us-status-pill { display:inline-flex!important; align-items:center!important; gap:5px!important; font-size:11px!important; font-weight:700!important; padding:3px 10px!important; border-radius:20px!important; }
.us-status-green { background:#ECFDF5!important; color:#047857!important; border:1px solid #A7F3D0!important; }
.us-status-amber { background:#FFFBEB!important; color:#92400E!important; border:1px solid #FDE68A!important; }
.us-status-red   { background:#FFF1F2!important; color:#9F1239!important; border:1px solid #FECDD3!important; }
.us-status-dot   { width:6px!important; height:6px!important; border-radius:50%!important; background:currentColor!important; opacity:.7!important; }

/* Icon btns */
.us-actions-row { display:flex!important; align-items:center!important; gap:4px!important; justify-content:center!important; }
.us-icon-btn { width:30px!important; height:30px!important; border-radius:8px!important; border:none!important; display:flex!important; align-items:center!important; justify-content:center!important; cursor:pointer!important; transition:all .13s!important; flex-shrink:0!important; }
.us-icon-btn svg { stroke:currentColor!important; }
.us-icon-indigo { background:#EEF2FF!important; color:#4F46E5!important; } .us-icon-indigo:hover { background:#4F46E5!important; color:#fff!important; }
.us-icon-slate  { background:#F1F5F9!important; color:#475569!important; } .us-icon-slate:hover  { background:#475569!important; color:#fff!important; }

/* Cards grid */
.us-cards-grid { display:grid!important; grid-template-columns:repeat(auto-fill,minmax(240px,1fr))!important; gap:14px!important; padding:20px!important; }
.us-card { background:#fff!important; border-radius:14px!important; padding:16px!important; border:1px solid #E2E8F0!important; box-shadow:0 1px 4px rgba(0,0,0,.05)!important; transition:transform .18s,box-shadow .18s!important; }
.us-card:hover { transform:translateY(-3px)!important; box-shadow:0 6px 20px rgba(0,0,0,.09)!important; }
.us-card-green { border-top:3px solid #059669!important; } .us-card-amber { border-top:3px solid #D97706!important; } .us-card-red { border-top:3px solid #E11D48!important; }
.us-card-top { display:flex!important; align-items:center!important; justify-content:space-between!important; margin-bottom:12px!important; }
.us-card-actions-top { display:flex!important; gap:4px!important; }
.us-card-nome { font-size:13px!important; font-weight:800!important; color:#0f172a!important; margin:0 0 10px!important; }
.us-card-divider { height:1px!important; background:#F1F5F9!important; margin-bottom:10px!important; }
.us-card-info { display:flex!important; flex-direction:column!important; gap:6px!important; }
.us-card-info-row { display:flex!important; align-items:center!important; justify-content:space-between!important; }
.us-card-info-lbl { font-size:10px!important; font-weight:700!important; letter-spacing:.08em!important; text-transform:uppercase!important; color:#94A3B8!important; }
.us-card-info-val { font-size:13px!important; font-weight:800!important; color:#0f172a!important; }

/* Dialog */
.us-dialog { background:#fff!important; border-radius:16px!important; overflow:hidden!important; box-shadow:0 20px 60px rgba(0,0,0,.18)!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; }
.us-dialog-hd { display:flex!important; align-items:center!important; gap:10px!important; padding:16px 20px!important; }
.us-dialog-hd span { font-size:15px!important; font-weight:800!important; color:#fff!important; flex:1!important; }
.us-dialog-close { width:28px!important; height:28px!important; border-radius:7px!important; border:none!important; background:rgba(255,255,255,.2)!important; color:#fff!important; cursor:pointer!important; font-size:13px!important; display:flex!important; align-items:center!important; justify-content:center!important; }
.us-dialog-close:hover { background:rgba(255,255,255,.35)!important; }
.us-dialog-body { padding:20px!important; max-height:70vh!important; overflow-y:auto!important; }
.us-dialog-footer { display:flex!important; justify-content:flex-end!important; gap:10px!important; padding:14px 20px!important; border-top:1px solid #F1F5F9!important; background:#FAFBFF!important; }
.us-form-grid { display:grid!important; grid-template-columns:1fr 1fr!important; gap:14px!important; }
.us-fg { display:flex!important; flex-direction:column!important; gap:6px!important; }
.us-fg-full { grid-column:1/-1!important; }
.us-flbl { font-size:10px!important; font-weight:700!important; letter-spacing:.1em!important; text-transform:uppercase!important; color:#64748b!important; }
.us-input { font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; font-size:13px!important; font-weight:600!important; color:#0f172a!important; background:#F8FAFC!important; border:1.5px solid #E2E8F0!important; border-radius:10px!important; padding:9px 12px!important; outline:none!important; transition:border-color .14s,box-shadow .14s!important; width:100%!important; }
.us-input:focus { border-color:#059669!important; background:#fff!important; box-shadow:0 0 0 3px rgba(5,150,105,.1)!important; }
.us-radio-group { display:flex!important; gap:6px!important; flex-wrap:wrap!important; }
.us-radio { padding:6px 14px!important; border-radius:20px!important; border:1.5px solid #E2E8F0!important; background:#F8FAFC!important; color:#64748b!important; font-size:12px!important; font-weight:700!important; cursor:pointer!important; transition:all .13s!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; }
.us-radio-on       { background:#4F46E5!important; border-color:#4F46E5!important; color:#fff!important; }
.us-radio-on-green { background:#059669!important; border-color:#059669!important; color:#fff!important; }
.us-radio-on-red   { background:#E11D48!important; border-color:#E11D48!important; color:#fff!important; }
.us-radio-on-amber { background:#D97706!important; border-color:#D97706!important; color:#fff!important; }
.us-alert { display:flex!important; align-items:center!important; gap:8px!important; padding:10px 14px!important; border-radius:10px!important; font-size:13px!important; font-weight:600!important; margin-bottom:12px!important; }
.us-alert-ok  { background:#ECFDF5!important; color:#047857!important; border:1px solid #A7F3D0!important; }
.us-alert-err { background:#FFF1F2!important; color:#9F1239!important; border:1px solid #FECDD3!important; }
.us-btn-secondary { font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; font-size:12px!important; font-weight:700!important; background:#F8FAFC!important; color:#475569!important; border:1.5px solid #E2E8F0!important; border-radius:10px!important; padding:9px 18px!important; cursor:pointer!important; }
.us-btn-primary { font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; font-size:12px!important; font-weight:800!important; color:#fff!important; border:none!important; border-radius:10px!important; padding:9px 20px!important; cursor:pointer!important; }

@media (max-width:640px) {
  .us-header { padding:16px 20px!important; flex-direction:column!important; align-items:flex-start!important; }
  .us-header-img { display:none!important; }
  .us-kpi-row { grid-template-columns:1fr!important; padding:0 16px 16px!important; }
  .us-body { padding:0 16px!important; }
  .us-form-grid { grid-template-columns:1fr!important; }
}
</style>