<script setup>

import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';

useHead ({ title: 'Controle' });
definePageMeta({ middleware: 'sidebase-auth' })

import { defineAsyncComponent } from 'vue';
import RelatorioGeracao from "~~/components/dashboard/RelatorioGeracao.vue";
import AnaliseGeracao from "~~/components/dashboard/AnaliseGeracao.vue";
import GeracaoDinheiro from "@/components/dashboard/GeracaoDinheiro.vue"; 
const Irregular = defineAsyncComponent(() => import("@/components/dashboard/Irregular.vue"));
import Alerta from "@/components/dashboard/Alerta.vue"; 
import VerificarStrings from "@/components/dashboard/VerificarStrings.vue"; 
import SolarMan from '~/components/dashboard/SolarMan.vue';

const { data: usinas }    = await useFetch(`${API_BASE_URL}/usina/`); 
const { data: unidades }  = await useFetch(`${API_BASE_URL}/unidadecompensacao`); 
const { data: relatorios }= await useFetch(`${API_BASE_URL}/relatoriocompensacao/`);
const { data: manutencoes}= await useFetch(`${API_BASE_URL}/manutencao/`);  

const valorIluminacao        = unidades.value.filter(i => i.secretaria == 'I' || i.secretaria == 'P') 
const valoresPredios         = unidades.value.filter(i => i.secretaria == 'E' || i.secretaria == 'S' || i.secretaria == 'O' && i.status == 'L')
const valoresUnidadesCompensa= unidades.value.filter(i => i.status == 'L')

const overlay = ref(true);
onMounted(() => { setTimeout(() => { overlay.value = false; }, 5000); });

import html2pdf from 'html2pdf.js';
const baixarPDF = () => {
    const tituloElement = document.getElementById('TelaPDF'); 
    const tempContainer = document.createElement('div');
    const clonedTitulo = tituloElement.cloneNode(true); 
    tempContainer.appendChild(clonedTitulo); 
    html2pdf(tituloElement, { margin: 0, filename: 'InfoPeeHorto.pdf', html2canvas: { scale: 3 }, jsPDF: { unit: 'in', format: 'a3' } });
};
</script>

<template>
  <div class="ct-root">

    <!-- ══════════════════════════════════════
         HEADER DA PÁGINA
    ══════════════════════════════════════ -->
    <div class="ct-page-header">
      <div class="ct-page-header-left">
        <div class="ct-page-header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <div>
          <nav class="ct-breadcrumb">
            <a href="/">Início</a>
            <span>›</span>
            <span>Painel de Controle</span>
          </nav>
          <h1 class="ct-page-title">Painel de Controle</h1>
          <p class="ct-page-sub">Visão geral do sistema fotovoltaico · Hortolândia</p>
        </div>
      </div>
      <img src="https://i.imgur.com/dn2LqE5.png" class="ct-page-img" alt="">
    </div>

    <!-- ══════════════════════════════════════
         KPI CARDS
    ══════════════════════════════════════ -->
    <div class="ct-kpi-grid">

      <div class="ct-kpi ct-kpi-indigo">
        <div class="ct-kpi-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <div class="ct-kpi-body">
          <span class="ct-kpi-label">Usinas</span>
          <span class="ct-kpi-value">{{ usinas.length }}</span>
          <span class="ct-kpi-note">fotovoltaicas ativas</span>
        </div>
        <div class="ct-kpi-orb"></div>
      </div>

      <div class="ct-kpi ct-kpi-amber">
        <div class="ct-kpi-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        </div>
        <div class="ct-kpi-body">
          <span class="ct-kpi-label">IP</span>
          <span class="ct-kpi-value">{{ valorIluminacao.length }}</span>
          <span class="ct-kpi-note">iluminação pública</span>
        </div>
        <div class="ct-kpi-orb"></div>
      </div>

      <div class="ct-kpi ct-kpi-green">
        <div class="ct-kpi-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div class="ct-kpi-body">
          <span class="ct-kpi-label">Prédios</span>
          <span class="ct-kpi-value">{{ valoresPredios.length }}</span>
          <span class="ct-kpi-note">unidades públicas</span>
        </div>
        <div class="ct-kpi-orb"></div>
      </div>

      <div class="ct-kpi ct-kpi-teal">
        <div class="ct-kpi-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <div class="ct-kpi-body">
          <span class="ct-kpi-label">Unidades</span>
          <span class="ct-kpi-value">{{ valoresUnidadesCompensa.length }}</span>
          <span class="ct-kpi-note">compensando energia</span>
        </div>
        <div class="ct-kpi-orb"></div>
      </div>

      <div class="ct-kpi ct-kpi-violet">
        <div class="ct-kpi-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div class="ct-kpi-body">
          <span class="ct-kpi-label">Relatórios</span>
          <span class="ct-kpi-value">{{ relatorios.length }}</span>
          <span class="ct-kpi-note">registros no sistema</span>
        </div>
        <div class="ct-kpi-orb"></div>
      </div>

      <div class="ct-kpi ct-kpi-rose">
        <div class="ct-kpi-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
            <path d="M15.54 8.46a5 5 0 010 7.07M8.46 8.46a5 5 0 000 7.07"/>
          </svg>
        </div>
        <div class="ct-kpi-body">
          <span class="ct-kpi-label">Manutenções</span>
          <span class="ct-kpi-value">{{ manutencoes.length }}</span>
          <span class="ct-kpi-note">registros abertos</span>
        </div>
        <div class="ct-kpi-orb"></div>
      </div>

    </div>

    <!-- ══════════════════════════════════════
         CONTEÚDO PRINCIPAL
    ══════════════════════════════════════ -->
    <div class="ct-content-grid">

      <!-- Coluna principal -->
      <div class="ct-col-main">
        <div class="ct-widget-card">
          <GeracaoDinheiro />
        </div>
        <div class="ct-widget-card">
          <RelatorioGeracao />
        </div>
      </div>

      <!-- Coluna lateral -->
      <div class="ct-col-side">
        <div class="ct-widget-card">
          <AnaliseGeracao />
        </div>
        <div class="ct-widget-card">
          <Suspense>
            <template #default>
              <Irregular />
            </template>
            <template #fallback>
              <div class="ct-loading">
                <v-progress-circular indeterminate color="primary" size="28"/>
                <span>Carregando análise...</span>
              </div>
            </template>
          </Suspense>
        </div>
      </div>

    </div>

    <!-- Rodapé -->
    <div class="ct-footer">
      <span>Desenvolvido por <strong>AleTechLab</strong> · Sistema LUCENTIS — Hortolândia</span>
    </div>

  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* ══════════ ROOT ══════════ */
.ct-root {
  min-height: 100vh !important;
  background: #F0FDF9 !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  color: #0f172a !important;
  padding-bottom: 40px !important;
}

/* ══════════ PAGE HEADER ══════════ */
.ct-page-header {
  background: linear-gradient(135deg, #ECFDF5 0%, #EEF2FF 100%) !important;
  border-bottom: 1px solid #E2E8F0 !important;
  padding: 24px 28px 20px !important;
  margin-bottom: 28px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  overflow: hidden !important;
}
.ct-page-header-left { display: flex !important; align-items: center !important; gap: 16px !important; }
.ct-page-header-icon {
  width: 48px !important; height: 48px !important; border-radius: 13px !important;
  background: #059669 !important; display: flex !important;
  align-items: center !important; justify-content: center !important;
  box-shadow: 0 4px 14px rgba(5,150,105,.3) !important; flex-shrink: 0 !important;
}
.ct-breadcrumb {
  display: flex !important; align-items: center !important; gap: 6px !important;
  font-size: 12px !important; color: #94A3B8 !important; margin-bottom: 3px !important;
}
.ct-breadcrumb a { color: #059669 !important; text-decoration: none !important; font-weight: 600 !important; }
.ct-page-title {
  font-size: 26px !important; font-weight: 900 !important;
  letter-spacing: -.03em !important; color: #0f172a !important;
  margin: 0 0 3px !important; line-height: 1 !important;
}
.ct-page-sub { font-size: 13px !important; color: #64748b !important; margin: 0 !important; }
.ct-page-img { height: 110px !important; opacity: .85 !important; }

/* ══════════ KPI GRID ══════════ */
.ct-kpi-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
  gap: 14px !important;
  padding: 0 28px 28px !important;
}

.ct-kpi {
  background: #ffffff !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 16px !important;
  padding: 18px !important;
  display: flex !important;
  align-items: center !important;
  gap: 14px !important;
  position: relative !important;
  overflow: hidden !important;
  box-shadow: 0 1px 4px rgba(0,0,0,.05) !important;
  transition: transform .18s, box-shadow .18s !important;
}
.ct-kpi:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 8px 24px rgba(0,0,0,.09) !important;
}
.ct-kpi::before {
  content: '' !important; position: absolute !important;
  top: 0 !important; left: 0 !important; right: 0 !important; height: 3px !important;
}

/* Cores por tipo */
.ct-kpi-indigo::before { background: #4F46E5 !important; }
.ct-kpi-amber::before  { background: #D97706 !important; }
.ct-kpi-green::before  { background: #059669 !important; }
.ct-kpi-teal::before   { background: #0891B2 !important; }
.ct-kpi-violet::before { background: #7C3AED !important; }
.ct-kpi-rose::before   { background: #E11D48 !important; }

/* Ícone */
.ct-kpi-icon {
  width: 44px !important; height: 44px !important;
  border-radius: 12px !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  flex-shrink: 0 !important;
}
.ct-kpi-indigo .ct-kpi-icon { background: #EEF2FF !important; color: #4F46E5 !important; }
.ct-kpi-amber  .ct-kpi-icon { background: #FFFBEB !important; color: #D97706 !important; }
.ct-kpi-green  .ct-kpi-icon { background: #ECFDF5 !important; color: #059669 !important; }
.ct-kpi-teal   .ct-kpi-icon { background: #ECFEFF !important; color: #0891B2 !important; }
.ct-kpi-violet .ct-kpi-icon { background: #F5F3FF !important; color: #7C3AED !important; }
.ct-kpi-rose   .ct-kpi-icon { background: #FFF1F2 !important; color: #E11D48 !important; }

.ct-kpi-icon svg { stroke: currentColor !important; }

/* Corpo do KPI */
.ct-kpi-body {
  display: flex !important; flex-direction: column !important; gap: 2px !important; flex: 1 !important;
}
.ct-kpi-label {
  font-size: 10px !important; font-weight: 700 !important;
  letter-spacing: .1em !important; text-transform: uppercase !important; color: #94A3B8 !important;
}
.ct-kpi-value {
  font-size: 28px !important; font-weight: 900 !important;
  letter-spacing: -.03em !important; color: #0f172a !important; line-height: 1 !important;
}
.ct-kpi-note { font-size: 11px !important; color: #94A3B8 !important; }

/* Orb decorativo */
.ct-kpi-orb {
  position: absolute !important; right: -20px !important; top: -20px !important;
  width: 80px !important; height: 80px !important; border-radius: 50% !important;
  opacity: .06 !important; pointer-events: none !important;
}
.ct-kpi-indigo .ct-kpi-orb { background: #4F46E5 !important; }
.ct-kpi-amber  .ct-kpi-orb { background: #D97706 !important; }
.ct-kpi-green  .ct-kpi-orb { background: #059669 !important; }
.ct-kpi-teal   .ct-kpi-orb { background: #0891B2 !important; }
.ct-kpi-violet .ct-kpi-orb { background: #7C3AED !important; }
.ct-kpi-rose   .ct-kpi-orb { background: #E11D48 !important; }

/* ══════════ CONTENT GRID ══════════ */
.ct-content-grid {
  display: grid !important;
  grid-template-columns: 1fr 420px !important;
  gap: 20px !important;
  padding: 0 28px !important;
}
@media (max-width: 1100px) {
  .ct-content-grid { grid-template-columns: 1fr !important; }
}

.ct-col-main, .ct-col-side {
  display: flex !important; flex-direction: column !important; gap: 20px !important;
}

/* Widget card wrapper */
.ct-widget-card {
  background: #ffffff !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 16px !important;
  overflow: hidden !important;
  box-shadow: 0 1px 4px rgba(0,0,0,.05) !important;
}

/* Loading fallback */
.ct-loading {
  display: flex !important; align-items: center !important;
  justify-content: center !important; gap: 12px !important;
  padding: 32px !important; color: #94A3B8 !important;
  font-size: 13px !important; font-weight: 600 !important;
}

/* ══════════ FOOTER ══════════ */
.ct-footer {
  text-align: center !important;
  padding: 24px 28px 0 !important;
  font-size: 12px !important; color: #94A3B8 !important;
}
.ct-footer strong { color: #059669 !important; font-weight: 700 !important; }

/* ══════════ MOBILE ══════════ */
@media (max-width: 640px) {
  .ct-page-header { padding: 16px 20px !important; flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
  .ct-page-img { display: none !important; }
  .ct-page-title { font-size: 22px !important; }
  .ct-kpi-grid { padding: 0 16px 20px !important; grid-template-columns: 1fr 1fr !important; }
  .ct-content-grid { padding: 0 16px !important; }
}
</style>