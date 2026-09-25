<script setup lang="ts">
// pages/mapa/index.vue
//
// v2 — a lógica de cálculo (geração, compensação, autossuficiência, CO2,
// consumo por secretaria) foi extraída para composables/useMapaEnergia.ts.
// Esta página agora só: (1) busca os dados, (2) chama o composable,
// (3) decide o que mostrar. Nenhuma regra de negócio foi alterada — ver
// useMapaEnergia.ts para a migração linha a linha e os TODOs de itens que
// dependem de mudança no backend (tarifas hardcoded, IDs de exceção).
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import Map from '@/components/Map2.vue';
import { ref, computed } from 'vue';
import { useMapaEnergia } from '~/composables/useMapaEnergia';
import { useEnergyFormat } from '~/composables/useEnergyFormat';
import type { Usina, UnidadeCompensacao, RegistroGeracao, RegistroInjecao, RegistroCompensacao } from '~/types/energy';

// ─── Auth ──────────────────────────────────────────────────────────────
const { data } = useAuth();
const isAdmin = computed(() => data.value?.username === 'admin');

// ─── Dados ─────────────────────────────────────────────────────────────
const { data: geracoes } = await useFetch<RegistroGeracao[]>(`${API_BASE_URL}/relatoriogeracao/`);
const { data: injecoes } = await useFetch<RegistroInjecao[]>(`${API_BASE_URL}/relatoriousina/`);
const { data: compensa } = await useFetch<RegistroCompensacao[]>(`${API_BASE_URL}/relatoriocompensacao/`);
const { data: usinas } = await useFetch<Usina[]>(`${API_BASE_URL}/usina/`);
const { data: unidades } = await useFetch<UnidadeCompensacao[]>(`${API_BASE_URL}/unidadecompensacao`);

// ─── Indicadores (toda a matemática mora no composable agora) ──────────
const {
  contaEducacao, contaSaude, contaOutros,
  mesReferencia,
  totalGerado, totalInjetado, totalCompensaSoma, totalPlacas, totalInvestido,
  totalCarbono, totalArvorePlantadas,
  geracaoMes, custoEvitadoTotal, saldoMes, taxaAutossuficiencia,
  consumoEducacao, consumoSaude, consumoOutros, consumoTotal, pctDoConsumo,
} = useMapaEnergia({ usinas, unidades, geracoes, injecoes, compensa });

const { moeda, numero } = useEnergyFormat();

// ─── Estado de UI (sem regra de negócio) ────────────────────────────────
const showPanel = ref(false);
const adminTab = ref<'geral' | 'secretarias'>('geral');
const modoPainel = ref<'publico' | 'admin'>('publico');
const togglePanel = () => { showPanel.value = !showPanel.value; };

useHead({ title: 'Mapa Eficiência • Lucentis' });
definePageMeta({ layout: 'blank' });
</script>
<template>
  <!-- ══════════════════════════════════════════
       CABEÇALHO TECH
  ══════════════════════════════════════════ -->
  <div class="hd-container">
    <div class="hd-inner">
      <div class="hd-grid-bg"></div>
      <div class="hd-top-row">
        <div class="hd-solar-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4" fill="#2fb8a6"/>
            <g stroke="#2fb8a6" stroke-width="1.5" stroke-linecap="round">
              <line x1="12" y1="2"  x2="12" y2="5"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="2"  y1="12" x2="5"  y2="12"/>
              <line x1="19" y1="12" x2="22" y2="12"/>
              <line x1="4.9"  y1="4.9"  x2="7"    y2="7"/>
              <line x1="17"   y1="17"   x2="19.1" y2="19.1"/>
              <line x1="4.9"  y1="19.1" x2="7"    y2="17"/>
              <line x1="17"   y1="7"    x2="19.1" y2="4.9"/>
            </g>
          </svg>
        </div>
        <div class="hd-texts">
          <span class="hd-eyebrow">EFICIÊNCIA ENERGÉTICA</span>
          <h1 class="hd-title">PREFEITURA DE HORTOLÂNDIA</h1>
        </div>
        <div class="hd-pulse-dot"></div>
      </div>
      <div class="hd-bottom-row">
        <span class="hd-sub">USINAS FOTOVOLTAICAS</span>
        <div class="hd-chips">
          <div class="hd-chip hd-chip-edu">
            <BooksIcon size="13" />
            <span>Educação</span>
            <strong>{{ contaEducacao.length }}</strong>
          </div>
          <div class="hd-chip hd-chip-sau">
            <FirstAidKitIcon size="13" />
            <span>Saúde</span>
            <strong>{{ contaSaude.length }}</strong>
          </div>
          <div class="hd-chip hd-chip-out">
            <BuildingCommunityIcon size="13" />
            <span>Outros</span>
            <strong>{{ contaOutros.length }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════
       MAPA
  ══════════════════════════════════════════ -->
  <v-col cols="12" lg="12" class="pa-0">
    <Map />
  </v-col>

  <!-- ══════════════════════════════════════════
       PULL TAB
  ══════════════════════════════════════════ -->
  <div class="pull-tab" @click="togglePanel">
    <div class="pull-tab-scan"></div>
    <div class="pull-tab-handle"></div>
    <div class="pull-tab-content">
      <span class="pull-tab-icon">{{ showPanel ? '▼' : '▲' }}</span>
      <span class="pull-tab-label">ESTATÍSTICAS</span>
      <span class="pull-tab-dash">——</span>
      <span class="pull-tab-sub">{{ showPanel ? 'FECHAR PAINEL' : 'VER DADOS' }}</span>
    </div>
  </div>

  <!-- ══════════════════════════════════════════
       PAINEL DESLIZANTE
  ══════════════════════════════════════════ -->
  <v-expand-transition>
    <div v-if="showPanel" class="info-panel">

      <!-- topo sticky -->
      <div class="panel-topbar">
        <div class="panel-topbar-left">
          <div class="panel-topbar-dot"></div>
          <span class="panel-topbar-title">PAINEL DE DADOS</span>
          <span class="panel-topbar-ref">· {{ mesReferencia }}</span>
        </div>
        <div class="panel-topbar-right">
          <div v-if="isAdmin" class="mode-switcher">
            <button class="mode-btn" :class="{ active: modoPainel === 'publico' }" @click="modoPainel = 'publico'">Público</button>
            <button class="mode-btn mode-btn-admin" :class="{ active: modoPainel === 'admin' }" @click="modoPainel = 'admin'">🔒 Admin</button>
          </div>
          <button class="panel-close-btn" @click="togglePanel">✕</button>
        </div>
      </div>

      <!-- ── MODO PÚBLICO ── -->
      <div v-if="modoPainel === 'publico'" class="pub-section">

        <div class="pub-section-label">
          <span class="psl-line"></span><span>VISÃO GERAL</span><span class="psl-line"></span>
        </div>

        <div class="pub-hero-card">
          <div class="pub-hero-glow"></div>
          <div class="pub-hero-left">
            <span class="pub-hero-icon">💰</span>
            <div>
              <span class="pub-card-label">TOTAL INVESTIDO</span>
              <span class="pub-hero-val">{{ moeda(totalInvestido) }}</span>
            </div>
          </div>
          <div class="pub-hero-badge">MUNICÍPIO</div>
        </div>

        <div class="pub-grid">
          <div class="pub-card">
            <div class="pub-card-glow" style="background:#0047cc22"></div>
            <span class="pub-card-icon-wrap" style="background:#0047cc18; color:#4fa3ff">⚡</span>
            <span class="pub-card-label">USINAS</span>
            <span class="pub-card-val">{{ usinas.length }}</span>
          </div>
          <div class="pub-card">
            <div class="pub-card-glow" style="background:#ff416a22"></div>
            <span class="pub-card-icon-wrap" style="background:#ff416a18; color:#ff7b9a">☀️</span>
            <span class="pub-card-label">PLACAS</span>
            <span class="pub-card-val">{{ numero(totalPlacas) }}</span>
          </div>
          <div class="pub-card">
            <div class="pub-card-glow" style="background:#28a74522"></div>
            <span class="pub-card-icon-wrap" style="background:#28a74518; color:#5cd68a">📈</span>
            <span class="pub-card-label">GERADO</span>
            <span class="pub-card-val">{{ numero(totalGerado) }}</span>
            <span class="pub-card-unit">kWh</span>
          </div>
          <div class="pub-card">
            <div class="pub-card-glow" style="background:#ffc10722"></div>
            <span class="pub-card-icon-wrap" style="background:#ffc10718; color:#ffd966">🔋</span>
            <span class="pub-card-label">INJETADO</span>
            <span class="pub-card-val">{{ numero(totalInjetado) }}</span>
            <span class="pub-card-unit">kWh</span>
          </div>
          <div class="pub-card pub-card-wide">
            <div class="pub-card-glow" style="background:#9700ce22"></div>
            <span class="pub-card-icon-wrap" style="background:#9700ce18; color:#c96af5">💵</span>
            <span class="pub-card-label">COMPENSADO</span>
            <span class="pub-card-val">{{ moeda(totalCompensaSoma) }}</span>
          </div>
        </div>

        <div class="pub-section-label" style="margin-top:14px">
          <span class="psl-line"></span><span>MEIO AMBIENTE</span><span class="psl-line"></span>
        </div>

        <div class="pub-grid pub-grid-eco">
          <div class="pub-card pub-card-eco">
            <div class="pub-card-glow" style="background:#2fb8a618"></div>
            <span class="pub-card-icon-wrap" style="background:#2fb8a612; color:#2fb8a6">🌿</span>
            <span class="pub-card-label">CARBONO EVITADO</span>
            <span class="pub-card-val">{{ numero(totalCarbono) }}</span>
            <span class="pub-card-unit">kgCO₂</span>
          </div>
          <div class="pub-card pub-card-eco">
            <div class="pub-card-glow" style="background:#13deb918"></div>
            <span class="pub-card-icon-wrap" style="background:#13deb912; color:#13deb9">🌳</span>
            <span class="pub-card-label">EQUIV. ÁRVORES</span>
            <span class="pub-card-val">{{ numero(totalArvorePlantadas) }}</span>
            <span class="pub-card-unit">plantadas</span>
          </div>
        </div>

      </div>

      <!-- ── MODO ADMIN ── -->
      <div v-if="modoPainel === 'admin' && isAdmin" class="adm-section">

        <div class="adm-badge-row">
          <span class="adm-badge">🔒 PAINEL ADMINISTRATIVO</span>
        </div>

        <div class="adm-tabs">
          <button class="adm-tab" :class="{ active: adminTab === 'geral' }" @click="adminTab = 'geral'">◈ Geral</button>
          <button class="adm-tab" :class="{ active: adminTab === 'secretarias' }" @click="adminTab = 'secretarias'">🏛 Secretarias</button>
        </div>

        <!-- ABA GERAL -->
        <div v-if="adminTab === 'geral'" class="adm-geral">
          <div class="adm-hero-card">
            <div class="adm-hero-bg"></div>
            <span class="adm-card-label">TAXA DE AUTOSSUFICIÊNCIA</span>
            <div class="adm-hero-val-row">
              <span class="adm-hero-val">{{ numero(taxaAutossuficiencia, 1) }}</span>
              <span class="adm-hero-unit">%</span>
            </div>
            <div class="adm-bar-track">
              <div class="adm-bar-fill" :style="{ width: Math.min(taxaAutossuficiencia, 100) + '%' }"></div>
            </div>
            <span class="adm-card-sub">Energia gerada vs. consumo total municipal · Ref.: {{ mesReferencia }}</span>
          </div>
          <div class="adm-grid">
            <div class="adm-card adm-card-orange">
              <span class="adm-card-label">CUSTO EVITADO</span>
              <span class="adm-card-val">{{ moeda(custoEvitadoTotal) }}</span>
              <span class="adm-card-ref">Ref.: {{ mesReferencia }}</span>
            </div>
            <div class="adm-card adm-card-blue">
              <span class="adm-card-label">GERAÇÃO NO MÊS</span>
              <span class="adm-card-val">{{ numero(geracaoMes) }} <small>kWh</small></span>
              <span class="adm-card-ref">Ref.: {{ mesReferencia }}</span>
            </div>
            <div class="adm-card adm-card-teal">
              <span class="adm-card-label">SALDO DE ENERGIA</span>
              <span class="adm-card-val">{{ numero(saldoMes) }} <small>kWh</small></span>
              <span class="adm-card-ref">Ref.: {{ mesReferencia }}</span>
            </div>
          </div>
        </div>

        <!-- ABA SECRETARIAS -->
        <div v-if="adminTab === 'secretarias'" class="adm-sec-section">
          <div class="adm-total-row">
            <span class="adm-total-label">Consumo total das unidades</span>
            <span class="adm-total-val">{{ numero(consumoTotal) }} kWh</span>
          </div>
          <div class="adm-sec-grid">
            <div class="adm-sec-card">
              <div class="adm-sec-card-top">
                <div class="adm-sec-icon" style="background:#1d4ed818; color:#4fa3ff">📚</div>
                <span class="adm-sec-name">Educação</span>
              </div>
              <span class="adm-sec-val">{{ numero(consumoEducacao) }} <small>kWh</small></span>
              <div class="adm-sec-bar-track">
                <div class="adm-sec-bar" style="background:#1d4ed8" :style="{ width: pctDoConsumo(consumoEducacao) }"></div>
              </div>
              <div class="adm-sec-footer">
                <span class="adm-sec-pct" style="background:#1d4ed818; color:#4fa3ff">{{ pctDoConsumo(consumoEducacao) }}</span>
                <span class="adm-sec-ref">Ref.: {{ mesReferencia }}</span>
              </div>
            </div>
            <div class="adm-sec-card">
              <div class="adm-sec-card-top">
                <div class="adm-sec-icon" style="background:#05966918; color:#13deb9">🏥</div>
                <span class="adm-sec-name">Saúde</span>
              </div>
              <span class="adm-sec-val">{{ numero(consumoSaude) }} <small>kWh</small></span>
              <div class="adm-sec-bar-track">
                <div class="adm-sec-bar" style="background:#059669" :style="{ width: pctDoConsumo(consumoSaude) }"></div>
              </div>
              <div class="adm-sec-footer">
                <span class="adm-sec-pct" style="background:#05966918; color:#13deb9">{{ pctDoConsumo(consumoSaude) }}</span>
                <span class="adm-sec-ref">Ref.: {{ mesReferencia }}</span>
              </div>
            </div>
            <div class="adm-sec-card">
              <div class="adm-sec-card-top">
                <div class="adm-sec-icon" style="background:#d9770618; color:#ffae1f">🏛</div>
                <span class="adm-sec-name">Outros</span>
              </div>
              <span class="adm-sec-val">{{ numero(consumoOutros) }} <small>kWh</small></span>
              <div class="adm-sec-bar-track">
                <div class="adm-sec-bar" style="background:#d97706" :style="{ width: pctDoConsumo(consumoOutros) }"></div>
              </div>
              <div class="adm-sec-footer">
                <span class="adm-sec-pct" style="background:#d9770618; color:#ffae1f">{{ pctDoConsumo(consumoOutros) }}</span>
                <span class="adm-sec-ref">Ref.: {{ mesReferencia }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      <!-- fim admin -->

    </div>
  </v-expand-transition>
</template>

<style scoped>
/* ════════════════════════════════════════════
   CABEÇALHO
════════════════════════════════════════════ */
.hd-container {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: min(560px, 94vw);
}
.hd-inner {
  position: relative;
  background: rgba(8,14,28,0.88);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(47,184,166,0.18);
  border-radius: 16px;
  padding: 12px 16px 10px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04);
}
.hd-grid-bg {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(47,184,166,0.07) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}
.hd-top-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.hd-solar-icon {
  width: 38px; height: 38px;
  background: rgba(47,184,166,0.1);
  border: 1px solid rgba(47,184,166,0.25);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  animation: hd-pulse 3s ease-in-out infinite;
}
@keyframes hd-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(47,184,166,0.0); }
  50%     { box-shadow: 0 0 0 6px rgba(47,184,166,0.12); }
}
.hd-texts { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.hd-eyebrow {
  font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
  color: rgba(47,184,166,0.6); text-transform: uppercase;
}
.hd-title {
  font-family: var(--lct-font-display);
  font-size: 18px; font-weight: 800; color: #ffffff;
  letter-spacing: 0.04em; line-height: 1;
  text-shadow: 0 0 20px rgba(47,184,166,0.3);
}
.hd-pulse-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #13deb9; flex-shrink: 0;
  animation: hd-dot 2s ease-in-out infinite;
}
@keyframes hd-dot {
  0%  { box-shadow: 0 0 0 0   rgba(19,222,185,0.6); }
  70% { box-shadow: 0 0 0 8px rgba(19,222,185,0); }
  100%{ box-shadow: 0 0 0 0   rgba(19,222,185,0); }
}
.hd-bottom-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hd-sub {
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  color: rgba(255,255,255,0.35); text-transform: uppercase; white-space: nowrap;
}
.hd-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.hd-chip {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600;
  padding: 4px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap;
}
.hd-chip-edu { background: rgba(29,78,216,0.18); border-color: rgba(29,78,216,0.4); color: #7ab4ff; }
.hd-chip-sau { background: rgba(5,150,105,0.18);  border-color: rgba(5,150,105,0.4);  color: #13deb9; }
.hd-chip-out { background: rgba(217,119,6,0.18);  border-color: rgba(217,119,6,0.4);  color: #ffae1f; }
.hd-chip strong { background: rgba(255,255,255,0.12); padding: 1px 6px; border-radius: 8px; font-size: 11px; }

/* ════════════════════════════════════════════
   PULL TAB
════════════════════════════════════════════ */
.pull-tab {
  position: absolute;
  bottom: 0; left: 50%;
  transform: translateX(-50%);
  width: min(380px, 82vw);
  background: linear-gradient(135deg, #050d1f 0%, #0a1628 50%, #050d1f 100%);
  border: 1px solid rgba(47,184,166,0.2);
  border-bottom: none;
  border-top-left-radius: 20px; border-top-right-radius: 20px;
  padding: 10px 20px 8px;
  cursor: pointer; z-index: 15; overflow: hidden;
  box-shadow: 0 -6px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(47,184,166,0.1);
  transition: all 0.2s;
}
.pull-tab:hover {
  border-color: rgba(47,184,166,0.4);
  box-shadow: 0 -8px 28px rgba(0,0,0,0.5), 0 0 20px rgba(47,184,166,0.08);
}
.pull-tab-scan {
  position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(47,184,166,0.06), transparent);
  animation: scan 3s linear infinite; pointer-events: none;
}
@keyframes scan { 0%{ left: -60%; } 100%{ left: 120%; } }
.pull-tab-handle {
  position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
  width: 28px; height: 3px; background: rgba(47,184,166,0.3); border-radius: 2px;
}
.pull-tab-content {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; margin-top: 4px;
}
.pull-tab-icon  { font-size: 10px; color: #2fb8a6; }
.pull-tab-label { font-size: 13px; font-weight: 800; color: #ffffff; letter-spacing: 0.12em; }
.pull-tab-dash  { font-size: 11px; color: rgba(47,184,166,0.3); letter-spacing: -0.05em; }
.pull-tab-sub   { font-size: 10px; font-weight: 600; color: rgba(47,184,166,0.6); letter-spacing: 0.08em; }

/* ════════════════════════════════════════════
   PAINEL
════════════════════════════════════════════ */
.info-panel {
  font-family: var(--lct-font-body);
  position: absolute; bottom: 0; left: 0; width: 100%;
  background: #080e1c; z-index: 9999;
  overflow-y: auto; max-height: 78vh;
  border-top-left-radius: 24px; border-top-right-radius: 24px;
  border-top: 1px solid rgba(47,184,166,0.15);
  box-shadow: 0 -12px 48px rgba(0,0,0,0.6);
}
.panel-topbar {
  position: sticky; top: 0;
  background: rgba(8,14,28,0.97); backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 13px 16px 11px;
  display: flex; align-items: center; justify-content: space-between;
  z-index: 2;
  border-top-left-radius: 24px; border-top-right-radius: 24px;
}
.panel-topbar-left { display: flex; align-items: center; gap: 8px; }
.panel-topbar-dot  { width: 7px; height: 7px; border-radius: 50%; background: #2fb8a6; box-shadow: 0 0 6px #2fb8a6; }
.panel-topbar-title { font-size: 12px; font-weight: 800; color: #ffffff; letter-spacing: 0.1em; }
.panel-topbar-ref   { font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 500; }
.panel-topbar-right { display: flex; align-items: center; gap: 8px; }
.panel-close-btn {
  width: 28px; height: 28px; border-radius: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.45); font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.panel-close-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

.mode-switcher {
  display: flex; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 3px; gap: 3px;
}
.mode-btn {
  font-size: 11px; font-weight: 700; padding: 5px 11px; border-radius: 7px;
  border: none; background: transparent; color: rgba(255,255,255,0.35);
  cursor: pointer; transition: all 0.15s; letter-spacing: 0.03em;
}
.mode-btn.active          { background: rgba(47,184,166,0.12); color: #2fb8a6; box-shadow: 0 0 10px rgba(47,184,166,0.15); }
.mode-btn-admin.active    { background: rgba(255,174,31,0.12); color: #ffae1f; }

/* ════════════════════════════════════════════
   PÚBLICO
════════════════════════════════════════════ */
.pub-section { padding: 16px 14px 20px; display: flex; flex-direction: column; gap: 10px; }
.pub-section-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: rgba(255,255,255,0.22);
}
.psl-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }

.pub-hero-card {
  position: relative;
  background: linear-gradient(135deg, #0a1628, #0d1e38);
  border: 1px solid rgba(47,184,166,0.15); border-radius: 16px;
  padding: 16px; display: flex; align-items: center; justify-content: space-between; overflow: hidden;
}
.pub-hero-glow {
  position: absolute; top: -40px; right: -40px; width: 140px; height: 140px;
  border-radius: 50%; background: rgba(0,71,204,0.25); filter: blur(40px); pointer-events: none;
}
.pub-hero-left  { display: flex; align-items: center; gap: 12px; }
.pub-hero-icon  { font-size: 26px; }
.pub-card-label { display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.35); text-transform: uppercase; margin-bottom: 2px; }
.pub-hero-val   { display: block; font-family: var(--lct-font-display); font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; }
.pub-hero-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: rgba(47,184,166,0.6); background: rgba(47,184,166,0.08); border: 1px solid rgba(47,184,166,0.15); padding: 4px 10px; border-radius: 20px; }

.pub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pub-grid-eco { grid-template-columns: 1fr 1fr; }

.pub-card {
  position: relative; background: rgba(13,22,42,0.9);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 14px;
  padding: 13px 12px 11px; display: flex; flex-direction: column; gap: 3px; overflow: hidden; transition: border-color 0.2s;
}
.pub-card:hover { border-color: rgba(255,255,255,0.12); }
.pub-card-wide  { grid-column: 1 / -1; }
.pub-card-eco   { background: rgba(8,20,16,0.9); border-color: rgba(47,184,166,0.08); }
.pub-card-glow  { position: absolute; top: -24px; right: -24px; width: 80px; height: 80px; border-radius: 50%; filter: blur(20px); pointer-events: none; }
.pub-card-icon-wrap { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 17px; margin-bottom: 4px; }
.pub-card-val   { font-family: var(--lct-font-display); font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; line-height: 1.1; }
.pub-card-unit  { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3); }

/* ════════════════════════════════════════════
   ADMIN
════════════════════════════════════════════ */
.adm-section { padding: 14px 14px 20px; display: flex; flex-direction: column; gap: 12px; }
.adm-badge-row { display: flex; justify-content: center; }
.adm-badge { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; background: rgba(255,174,31,0.1); border: 1px solid rgba(255,174,31,0.25); color: #ffae1f; padding: 5px 14px; border-radius: 20px; }

.adm-tabs { display: flex; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 4px; gap: 4px; }
.adm-tab { flex: 1; padding: 8px 0; border-radius: 9px; border: none; background: transparent; color: rgba(255,255,255,0.35); font-size: 12px; font-weight: 700; cursor: pointer; letter-spacing: 0.04em; transition: all 0.2s; }
.adm-tab.active { background: rgba(47,184,166,0.1); color: #2fb8a6; box-shadow: 0 0 12px rgba(47,184,166,0.12); border: 1px solid rgba(47,184,166,0.2); }

.adm-geral { display: flex; flex-direction: column; gap: 10px; }

.adm-hero-card { position: relative; background: linear-gradient(145deg, #050e22, #091526); border: 1px solid rgba(47,184,166,0.2); border-radius: 16px; padding: 16px; overflow: hidden; }
.adm-hero-bg   { position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(47,184,166,0.05) 1px, transparent 1px); background-size: 18px 18px; pointer-events: none; }
.adm-card-label { display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.12em; color: rgba(255,255,255,0.35); text-transform: uppercase; margin-bottom: 6px; }
.adm-hero-val-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 10px; }
.adm-hero-val  { font-family: var(--lct-font-display); font-size: 48px; font-weight: 900; color: #ffffff; line-height: 1; letter-spacing: -0.03em; text-shadow: 0 0 30px rgba(47,184,166,0.25); }
.adm-hero-unit { font-size: 24px; font-weight: 700; color: rgba(47,184,166,0.7); }
.adm-bar-track { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
.adm-bar-fill  { height: 100%; background: linear-gradient(90deg, #0047cc, #2fb8a6); border-radius: 3px; transition: width 0.8s cubic-bezier(0.34,1.56,0.64,1); box-shadow: 0 0 8px rgba(47,184,166,0.5); }
.adm-card-sub  { font-size: 10px; color: rgba(255,255,255,0.28); line-height: 1.4; }

.adm-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.adm-card { background: rgba(13,22,42,0.9); border-radius: 14px; padding: 13px 12px; display: flex; flex-direction: column; gap: 4px; border: 1px solid rgba(255,255,255,0.06); }
.adm-card-orange { border-left: 3px solid #ffae1f; }
.adm-card-blue   { border-left: 3px solid #0091ff; }
.adm-card-teal   { border-left: 3px solid #13deb9; }
.adm-card-val    { font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; line-height: 1.2; }
.adm-card-val small { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.3); }
.adm-card-ref    { font-size: 9px; color: rgba(255,255,255,0.2); }

.adm-sec-section { display: flex; flex-direction: column; gap: 10px; }
.adm-total-row   { display: flex; justify-content: space-between; align-items: center; padding: 0 2px; }
.adm-total-label { font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 600; }
.adm-total-val   { font-size: 13px; font-weight: 800; color: #ffffff; }

.adm-sec-grid { display: flex; flex-direction: column; gap: 8px; }
.adm-sec-card { background: rgba(13,22,42,0.9); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 13px; display: flex; flex-direction: column; gap: 8px; }
.adm-sec-card-top { display: flex; align-items: center; gap: 10px; }
.adm-sec-icon  { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.adm-sec-name  { font-size: 13px; font-weight: 700; color: #ffffff; }
.adm-sec-val   { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; }
.adm-sec-val small { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.3); }
.adm-sec-bar-track { height: 5px; background: rgba(255,255,255,0.07); border-radius: 3px; overflow: hidden; }
.adm-sec-bar   { height: 100%; border-radius: 3px; transition: width 0.7s cubic-bezier(0.34,1.56,0.64,1); }
.adm-sec-footer { display: flex; align-items: center; justify-content: space-between; }
.adm-sec-pct   { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
.adm-sec-ref   { font-size: 9px; color: rgba(255,255,255,0.22); }

/* ════════════════════════════════════════════
   RESPONSIVIDADE
════════════════════════════════════════════ */
@media (max-width: 500px) {
  .hd-title    { font-size: 14px; }
  .hd-eyebrow  { font-size: 8px; }
  .hd-solar-icon { width: 32px; height: 32px; }
  .hd-chips    { gap: 4px; }
  .hd-chip     { font-size: 10px; padding: 3px 8px; }
  .adm-grid    { grid-template-columns: 1fr 1fr; }
  .pub-hero-val { font-size: 16px; }
  .adm-hero-val { font-size: 36px; }
}

.v-row { height: 50vh; overflow: hidden; display: flex; flex-direction: column; }
.leaflet-control-attribution { pointer-events: none; opacity: 0.3; font-size: 12px; z-index: 1; }
</style>