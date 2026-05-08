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
          <p class="ct-page-sub">Visão geral do sistema energético · Hortolândia</p>
        </div>
      </div>
      <img src="https://i.imgur.com/dn2LqE5.png" class="ct-page-img" alt="">
    </div>

    <!-- ══════════════════════════════════════
         KPI CARDS — linha única desktop
    ══════════════════════════════════════ -->
    <div class="ct-kpi-row">

      <div class="ct-kpi ct-ki">
        <div class="ct-kpi-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <span class="ct-kpi-label">Usinas</span>
        <span class="ct-kpi-val">{{ usinas.length }}</span>
        <span class="ct-kpi-note">fotovoltaicas</span>
        <div class="ct-kpi-bottom"></div>
      </div>

      <div class="ct-kpi ct-ka">
        <div class="ct-kpi-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
          </svg>
        </div>
        <span class="ct-kpi-label">IP</span>
        <span class="ct-kpi-val">{{ valorIluminacao.length }}</span>
        <span class="ct-kpi-note">iluminação pública</span>
        <div class="ct-kpi-bottom"></div>
      </div>

      <div class="ct-kpi ct-kg">
        <div class="ct-kpi-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span class="ct-kpi-label">Prédios</span>
        <span class="ct-kpi-val">{{ valoresPredios.length }}</span>
        <span class="ct-kpi-note">unidades públicas</span>
        <div class="ct-kpi-bottom"></div>
      </div>

      <div class="ct-kpi ct-kt">
        <div class="ct-kpi-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <span class="ct-kpi-label">Unidades</span>
        <span class="ct-kpi-val">{{ valoresUnidadesCompensa.length }}</span>
        <span class="ct-kpi-note">compensando</span>
        <div class="ct-kpi-bottom"></div>
      </div>

      <div class="ct-kpi ct-kv">
        <div class="ct-kpi-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <span class="ct-kpi-label">Relatórios</span>
        <span class="ct-kpi-val">{{ relatorios.length }}</span>
        <span class="ct-kpi-note">no sistema</span>
        <div class="ct-kpi-bottom"></div>
      </div>

      <div class="ct-kpi ct-kr">
        <div class="ct-kpi-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
          </svg>
        </div>
        <span class="ct-kpi-label">Manutenções</span>
        <span class="ct-kpi-val">{{ manutencoes.length }}</span>
        <span class="ct-kpi-note">registros abertos</span>
        <div class="ct-kpi-bottom"></div>
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

/* ══════════ KPI ROW — linha única desktop ══════════ */
.ct-kpi-row {
  display: grid !important;
  grid-template-columns: repeat(6, 1fr) !important;
  gap: 10px !important;
  padding: 0 28px 28px !important;
}

.ct-kpi {
  background: #ffffff !important;
  border: 1px solid #f1f5f9 !important;
  border-radius: 14px !important;
  padding: 16px 14px 14px !important;
  position: relative !important;
  overflow: hidden !important;
  transition: transform .18s, box-shadow .18s !important;
  cursor: default !important;
  display: flex !important;
  flex-direction: column !important;
}
.ct-kpi:hover {
  transform: translateY(-4px) !important;
  box-shadow: 0 8px 28px rgba(0,0,0,.08) !important;
}
.ct-kpi::before {
  content: '' !important; position: absolute !important;
  top: 0 !important; left: 0 !important; right: 0 !important; height: 2px !important;
}
.ct-ki::before { background: #4F46E5 !important; }
.ct-ka::before { background: #D97706 !important; }
.ct-kg::before { background: #059669 !important; }
.ct-kt::before { background: #0891B2 !important; }
.ct-kv::before { background: #7C3AED !important; }
.ct-kr::before { background: #E11D48 !important; }

/* Badge ícone no canto */
.ct-kpi-badge {
  position: absolute !important; top: 13px !important; right: 13px !important;
  width: 28px !important; height: 28px !important; border-radius: 8px !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
}
.ct-ki .ct-kpi-badge { background: #EEF2FF !important; color: #4F46E5 !important; }
.ct-ka .ct-kpi-badge { background: #FFFBEB !important; color: #D97706 !important; }
.ct-kg .ct-kpi-badge { background: #ECFDF5 !important; color: #059669 !important; }
.ct-kt .ct-kpi-badge { background: #ECFEFF !important; color: #0891B2 !important; }
.ct-kv .ct-kpi-badge { background: #F5F3FF !important; color: #7C3AED !important; }
.ct-kr .ct-kpi-badge { background: #FFF1F2 !important; color: #E11D48 !important; }
.ct-kpi-badge svg { stroke: currentColor !important; }

/* Textos */
.ct-kpi-label {
  font-size: 10px !important; font-weight: 700 !important;
  letter-spacing: .12em !important; text-transform: uppercase !important;
  color: #94A3B8 !important; display: block !important;
  margin-bottom: 10px !important; margin-top: 2px !important;
}
.ct-kpi-val {
  font-size: 32px !important; font-weight: 900 !important;
  letter-spacing: -.04em !important; line-height: 1 !important;
  display: block !important; margin-bottom: 5px !important;
}
.ct-ki .ct-kpi-val { color: #4F46E5 !important; }
.ct-ka .ct-kpi-val { color: #D97706 !important; }
.ct-kg .ct-kpi-val { color: #059669 !important; }
.ct-kt .ct-kpi-val { color: #0891B2 !important; }
.ct-kv .ct-kpi-val { color: #7C3AED !important; }
.ct-kr .ct-kpi-val { color: #E11D48 !important; }

.ct-kpi-note {
  font-size: 11px !important; color: #94A3B8 !important;
  font-weight: 500 !important; display: block !important;
}

/* Fundo sutil no bottom */
.ct-kpi-bottom {
  position: absolute !important; bottom: 0 !important; left: 0 !important; right: 0 !important;
  height: 40px !important; border-radius: 0 0 14px 14px !important; opacity: .04 !important;
}
.ct-ki .ct-kpi-bottom { background: #4F46E5 !important; }
.ct-ka .ct-kpi-bottom { background: #D97706 !important; }
.ct-kg .ct-kpi-bottom { background: #059669 !important; }
.ct-kt .ct-kpi-bottom { background: #0891B2 !important; }
.ct-kv .ct-kpi-bottom { background: #7C3AED !important; }
.ct-kr .ct-kpi-bottom { background: #E11D48 !important; }

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
@media (max-width: 1024px) {
  .ct-kpi-row { grid-template-columns: repeat(3, 1fr) !important; }
}
@media (max-width: 640px) {
  .ct-page-header { padding: 16px 20px !important; flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
  .ct-page-img { display: none !important; }
  .ct-page-title { font-size: 22px !important; }
  .ct-kpi-row { padding: 0 16px 20px !important; grid-template-columns: 1fr 1fr !important; }
  .ct-content-grid { padding: 0 16px !important; }
}
</style>