<script setup>
import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';

useHead({ title: 'Nova Usina' });
definePageMeta({ middleware: 'sidebase-auth' })

import { ref } from 'vue';

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

const sendUsina = async () => {
  if (!ucUsina.value || !nomeUsina.value || !dataInicioUsina.value || !potenciaUsina.value || !enderecoUsina.value || !statusUsina.value) {
    showErrorCampo.value = true; return;
  }
  try {
    const response = await useFetch(`${API_BASE_URL}/usina/`, {
      method: 'POST',
      body: { uc: ucUsina.value, nome: nomeUsina.value, dataInicio: dataInicioUsina.value, potencia: potenciaUsina.value, endereco: enderecoUsina.value, status: statusUsina.value, tensao: tensaoUsina.value },
      key: 'usinaPost'
    });
    if (response) { showSuccessAlert.value = true; showErrorCampo.value = false; }
    else { showErrorAlert.value = true; showErrorCampo.value = false; }
  } catch (error) { console.error(error); showErrorAlert.value = true; }
};
</script>

<template>
<div class="nc-root">

  <!-- HEADER -->
  <div class="nc-header">
    <div class="nc-header-left">
      <div class="nc-header-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <div>
        <nav class="nc-breadcrumb"><a href="/">Início</a><span>›</span><a href="/usinas">Usinas</a><span>›</span><span>Nova Usina</span></nav>
        <h1 class="nc-title">Nova Usina</h1>
        <p class="nc-sub">Cadastro de nova usina fotovoltaica no sistema</p>
      </div>
    </div>
  </div>

  <!-- FORM CARD -->
  <div class="nc-body">
    <div class="nc-card">

      <div class="nc-card-hd">
        <div class="nc-card-num">01</div>
        <div>
          <h3 class="nc-card-title">Dados da Usina</h3>
          <p class="nc-card-sub">Preencha todos os campos para cadastrar a nova usina</p>
        </div>
      </div>

      <div class="nc-form">
        <div v-if="showErrorCampo"   class="nc-alert nc-alert-err">Preencha todos os campos obrigatórios!</div>
        <div v-if="showErrorAlert"   class="nc-alert nc-alert-err">Erro ao cadastrar usina. Tente novamente.</div>
        <div v-if="showSuccessAlert" class="nc-alert nc-alert-ok">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Usina cadastrada com sucesso!
        </div>

        <div class="nc-form-grid">
          <div class="nc-fg">
            <label class="nc-flbl">UC <span class="nc-req">*</span></label>
            <input v-model="ucUsina" type="number" class="nc-input" placeholder="Número da UC"/>
          </div>
          <div class="nc-fg">
            <label class="nc-flbl">Nome <span class="nc-req">*</span></label>
            <input v-model="nomeUsina" class="nc-input" placeholder="Nome da usina"/>
          </div>
          <div class="nc-fg">
            <label class="nc-flbl">Data de Início <span class="nc-req">*</span></label>
            <input v-model="dataInicioUsina" type="date" class="nc-input"/>
          </div>
          <div class="nc-fg">
            <label class="nc-flbl">Potência (kWp) <span class="nc-req">*</span></label>
            <input v-model="potenciaUsina" type="number" class="nc-input" placeholder="Ex: 150"/>
          </div>
          <div class="nc-fg nc-fg-full">
            <label class="nc-flbl">Endereço <span class="nc-req">*</span></label>
            <input v-model="enderecoUsina" class="nc-input" placeholder="Endereço completo da usina"/>
          </div>
          <div class="nc-fg">
            <label class="nc-flbl">Tensão</label>
            <div class="nc-radio-group">
              <label class="nc-radio" :class="tensaoUsina==='BT'?'nc-radio-on':''"><input type="radio" v-model="tensaoUsina" value="BT" style="display:none"> BT</label>
              <label class="nc-radio" :class="tensaoUsina==='MT'?'nc-radio-on':''"><input type="radio" v-model="tensaoUsina" value="MT" style="display:none"> MT</label>
            </div>
          </div>
          <div class="nc-fg">
            <label class="nc-flbl">Status <span class="nc-req">*</span></label>
            <div class="nc-radio-group">
              <label class="nc-radio nc-radio-green" :class="statusUsina==='L'?'nc-radio-on-green':''"><input type="radio" v-model="statusUsina" value="L" style="display:none"> Ligado</label>
              <label class="nc-radio nc-radio-red"   :class="statusUsina==='D'?'nc-radio-on-red':''"><input type="radio" v-model="statusUsina" value="D" style="display:none"> Desligado</label>
              <label class="nc-radio nc-radio-amber" :class="statusUsina==='M'?'nc-radio-on-amber':''"><input type="radio" v-model="statusUsina" value="M" style="display:none"> Manutenção</label>
            </div>
          </div>
        </div>

        <div class="nc-form-footer">
          <NuxtLink to="/usinas/">
            <button class="nc-btn-cancel">Cancelar</button>
          </NuxtLink>
          <button class="nc-btn-submit" @click="sendUsina">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Cadastrar Usina
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<style>
.nc-root { min-height:100vh!important; background:#F0FDF9!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; color:#0f172a!important; padding-bottom:40px!important; }
.nc-header { background:linear-gradient(135deg,#ECFDF5 0%,#EEF2FF 100%)!important; border-bottom:1px solid #E2E8F0!important; padding:24px 28px 20px!important; margin-bottom:28px!important; display:flex!important; align-items:center!important; justify-content:space-between!important; }
.nc-header-left { display:flex!important; align-items:center!important; gap:16px!important; }
.nc-header-icon { width:48px!important; height:48px!important; border-radius:13px!important; background:#059669!important; display:flex!important; align-items:center!important; justify-content:center!important; box-shadow:0 4px 14px rgba(5,150,105,.3)!important; flex-shrink:0!important; }
.nc-breadcrumb { display:flex!important; align-items:center!important; gap:5px!important; font-size:11px!important; color:#94A3B8!important; margin-bottom:3px!important; }
.nc-breadcrumb a { color:#059669!important; text-decoration:none!important; font-weight:600!important; }
.nc-title { font-size:26px!important; font-weight:900!important; letter-spacing:-.03em!important; color:#0f172a!important; margin:0 0 3px!important; }
.nc-sub { font-size:13px!important; color:#64748b!important; margin:0!important; }
.nc-body { padding:0 28px!important; }
.nc-card { background:#fff!important; border:1px solid #E2E8F0!important; border-radius:16px!important; overflow:hidden!important; box-shadow:0 1px 6px rgba(0,0,0,.05)!important; }
.nc-card-hd { display:flex!important; align-items:center!important; gap:14px!important; padding:18px 24px!important; border-bottom:1px solid #F1F5F9!important; background:#FAFBFF!important; border-left:4px solid #059669!important; }
.nc-card-num { width:32px!important; height:32px!important; border-radius:9px!important; background:#059669!important; color:#fff!important; display:flex!important; align-items:center!important; justify-content:center!important; font-size:13px!important; font-weight:900!important; flex-shrink:0!important; }
.nc-card-title { font-size:16px!important; font-weight:800!important; color:#0f172a!important; margin:0 0 2px!important; display:block!important; }
.nc-card-sub { font-size:12px!important; color:#64748b!important; margin:0!important; }
.nc-form { padding:24px!important; }
.nc-alert { display:flex!important; align-items:center!important; gap:8px!important; padding:11px 14px!important; border-radius:10px!important; font-size:13px!important; font-weight:600!important; margin-bottom:20px!important; }
.nc-alert-ok  { background:#ECFDF5!important; color:#047857!important; border:1px solid #A7F3D0!important; }
.nc-alert-err { background:#FFF1F2!important; color:#9F1239!important; border:1px solid #FECDD3!important; }
.nc-alert svg { stroke:currentColor!important; flex-shrink:0!important; }
.nc-form-grid { display:grid!important; grid-template-columns:1fr 1fr!important; gap:16px!important; margin-bottom:24px!important; }
.nc-fg { display:flex!important; flex-direction:column!important; gap:7px!important; }
.nc-fg-full { grid-column:1/-1!important; }
.nc-flbl { font-size:11px!important; font-weight:700!important; letter-spacing:.06em!important; text-transform:uppercase!important; color:#475569!important; }
.nc-req { color:#E11D48!important; }
.nc-input { font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; font-size:14px!important; font-weight:600!important; color:#0f172a!important; background:#F8FAFC!important; border:1.5px solid #E2E8F0!important; border-radius:11px!important; padding:11px 14px!important; outline:none!important; transition:border-color .14s,box-shadow .14s!important; width:100%!important; }
.nc-input:focus { border-color:#059669!important; background:#fff!important; box-shadow:0 0 0 3px rgba(5,150,105,.1)!important; }
.nc-input::placeholder { color:#CBD5E1!important; }
.nc-radio-group { display:flex!important; gap:6px!important; flex-wrap:wrap!important; }
.nc-radio { padding:7px 16px!important; border-radius:20px!important; border:1.5px solid #E2E8F0!important; background:#F8FAFC!important; color:#64748b!important; font-size:13px!important; font-weight:700!important; cursor:pointer!important; transition:all .13s!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; }
.nc-radio:hover { border-color:#94A3B8!important; }
.nc-radio-on       { background:#4F46E5!important; border-color:#4F46E5!important; color:#fff!important; }
.nc-radio-on-green { background:#059669!important; border-color:#059669!important; color:#fff!important; }
.nc-radio-on-red   { background:#E11D48!important; border-color:#E11D48!important; color:#fff!important; }
.nc-radio-on-amber { background:#D97706!important; border-color:#D97706!important; color:#fff!important; }
.nc-form-footer { display:flex!important; align-items:center!important; justify-content:flex-end!important; gap:12px!important; padding-top:8px!important; border-top:1px solid #F1F5F9!important; }
.nc-btn-cancel { font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; font-size:13px!important; font-weight:700!important; background:#F8FAFC!important; color:#475569!important; border:1.5px solid #E2E8F0!important; border-radius:11px!important; padding:11px 22px!important; cursor:pointer!important; transition:all .14s!important; }
.nc-btn-cancel:hover { background:#F1F5F9!important; }
.nc-btn-submit { display:flex!important; align-items:center!important; gap:8px!important; font-family:'Plus Jakarta Sans',system-ui,sans-serif!important; font-size:13px!important; font-weight:800!important; background:#059669!important; color:#fff!important; border:none!important; border-radius:11px!important; padding:11px 28px!important; cursor:pointer!important; box-shadow:0 4px 14px rgba(5,150,105,.35)!important; transition:all .15s!important; }
.nc-btn-submit:hover { background:#047857!important; transform:translateY(-1px)!important; }
.nc-btn-submit svg { stroke:#fff!important; }
@media (max-width:640px) {
  .nc-header { padding:16px 20px!important; } .nc-body { padding:0 16px!important; }
  .nc-form-grid { grid-template-columns:1fr!important; } .nc-title { font-size:22px!important; }
}
</style>