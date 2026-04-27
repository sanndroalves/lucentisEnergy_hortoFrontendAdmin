<script setup>
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import Map from '@/components/Map2.vue';
import { ref, computed } from 'vue'

// ─── Auth ────────────────────────────────────────────────────────────────────
const { data } = useAuth();
const isAdmin = computed(() => data.value?.username === 'admin');
const unidades = ref(0)

// ─── Dados globais ────────────────────────────────────────────────────────────
const { data: geracoes  } = await useFetch(`${API_BASE_URL}/relatoriogeracao/`);
const { data: injecoes  } = await useFetch(`${API_BASE_URL}/relatoriousina/`);
const { data: compensa  } = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`);
const { data: usinas    } = await useFetch(`${API_BASE_URL}/usina/`);
const { data: fetchedUnidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao`);
unidades.value = fetchedUnidades.value

const contaEducacao = computed(() => usinas.value?.filter(i => i.secretaria === 'E') ?? []);
const contaSaude    = computed(() => usinas.value?.filter(i => i.secretaria === 'S') ?? []);
const contaOutros   = computed(() => usinas.value?.filter(i => i.secretaria === 'O') ?? []);

const totalGerado = computed(() =>
  geracoes.value?.reduce((acc, i) => acc + parseFloat(i.geracao), 0) ?? 0
);
const totalInjetado = computed(() =>
  injecoes.value?.reduce((acc, i) => acc + i.injetadoPonta + i.injetadoFPonta, 0) ?? 0
);
const totalCompensa = computed(() =>
  compensa.value?.reduce((acc, i) =>
    acc + parseFloat(i.valorInjTUSD) + parseFloat(i.valorInjTE), 0) ?? 0
);
const totalSaldoJaneiro = computed(() => {
  const hoje = new Date();
  const mesAlvo = hoje.getMonth() + 1 - 3;
  const anoAlvo = hoje.getFullYear() - (mesAlvo <= 0 ? 1 : 0);
  const mesCorrigido = ((mesAlvo + 11) % 12) + 1;
  return compensa.value?.reduce((acc, i) =>
    (i.mes === mesCorrigido && i.ano === anoAlvo)
      ? acc + parseFloat(i.saldoEnergia)
      : acc, 0) ?? 0;
});
const totalCompensaSoma = computed(() =>
  parseFloat(totalCompensa.value) + parseFloat(totalSaldoJaneiro.value) * 0.72
);
const totalPlacas = computed(() =>
  usinas.value?.reduce((acc, i) => acc + parseFloat(i.qtdPlaca), 0) ?? 0
);
const totalInvestido = ref(
  Number(8854468.32) + Number(8005328.88) + Number(7021350.76)
);
const totalCarbono = computed(() => totalGerado.value * 0.536);
const totalCarbonoTon = computed(() => totalCarbono.value / 1000);
const totalArvorePlantadas = computed(() => Math.round(totalCarbono.value / 150));

const mesReferencia = computed(() => {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const hoje = new Date();
  const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  return `${meses[anterior.getMonth()]} ${anterior.getFullYear()}`;
});

const referencia = computed(() => {
  const hoje = new Date();
  const mes = hoje.getMonth();
  const ano = hoje.getFullYear() - (mes === 0 ? 1 : 0);
  const mesCorrigido = mes === 0 ? 12 : mes;
  return { mes: mesCorrigido, ano };
});

const registrosMes = computed(() =>
  compensa.value?.filter(i => i.mes === referencia.value.mes && i.ano === referencia.value.ano) ?? []
);
const geracoesMes = computed(() =>
  geracoes.value?.filter(i => i.mes === referencia.value.mes && i.ano === referencia.value.ano) ?? []
);
const geracaoMes = computed(() =>
  geracoesMes.value.reduce((acc, i) => acc + Number(i.geracao || 0), 0)
);
const energiaInjetadaMes = computed(() => {
  const total = injecoes.value
    ?.filter(i => i.mes === referencia.value.mes && i.ano === referencia.value.ano)
    .reduce((acc, item) => acc + Number(item.injetadoPonta || 0) + Number(item.injetadoFPonta || 0), 0) ?? 0;
  return Number(total.toFixed(2));
});
const consumoMedioUsinas = computed(() => {
  let total = 0;
  usinas.value.filter(usina => usina.id !== 19 && usina.id !== 20).forEach(usina => {
    const unidade = unidades.value.find(u => u.uc === usina.uc);
    if (unidade) total += Number(unidade.mediaConsumo || 0);
  });
  return Number(total.toFixed(2));
});
const energiaCompensadaPredios = computed(() => {
  const filtrados = registrosMes.value.filter(item => {
    const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa);
    return unidade && ['E', 'S', 'O'].includes(unidade.secretaria);
  });
  return Number(filtrados.reduce((acc, item) => acc + Number(item.enerInjTUSD || 0), 0).toFixed(2));
});
const consumoPredios = computed(() => {
  const UCsEspeciais = ['4000266381', '37068768'];
  const filtrados = registrosMes.value.filter(item => {
    const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa);
    return unidade && ['E', 'S', 'O'].includes(unidade.secretaria);
  });
  const total = filtrados.reduce((acc, item) => {
    const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa);
    const uc = String(unidade?.uc || '');
    const consumo = Number(item.consumokWh || 0);
    if (UCsEspeciais.includes(uc)) {
      const geracaoUC = geracoesMes.value.find(g => String(g.uc) === uc);
      return acc + consumo + (geracaoUC ? Number(geracaoUC.geracao || 0) : 0);
    }
    return acc + consumo;
  }, 0);
  return Number(total.toFixed(2));
});
const taxaAutossuficiencia = computed(() => {
  const totalCompensado = energiaCompensadaPredios.value + (geracaoMes.value - energiaInjetadaMes.value);
  const totalConsumo = consumoPredios.value + consumoMedioUsinas.value;
  if (!totalConsumo) return 0;
  return Number(((totalCompensado / totalConsumo) * 100).toFixed(2));
});

const TARIFA_BT = 0.88;
const MT_TARIFAS = { TUSD_ponta: 1.66642019, TE_ponta: 0.57222160, TUSD_forap: 0.14734841, TE_forap: 0.34908095 };
const tarifaMediaMTParaUsina = () => ((MT_TARIFAS.TUSD_forap + MT_TARIFAS.TE_forap) + (MT_TARIFAS.TUSD_ponta + MT_TARIFAS.TE_ponta)) / 2;

const somarEconomiaPorMesAno = (ano, mes) => {
  const dados = compensa.value.filter(item => item.ano == ano && item.mes == mes);
  return Number(dados.reduce((acc, item) => acc + Number(item.valorInjTUSD || 0) + Number(item.valorInjTE || 0), 0).toFixed(2));
};
const calcularCustoAutoconsumoMes = (ano, mes) => {
  let total = 0;
  usinas.value.filter(u => u.id != 19 && u.id != 20).forEach(u => {
    const gMes = geracoes.value.find(g => g.idGeradora == u.id && g.ano == ano && g.mes == mes);
    const inj = injecoes.value.filter(i => i.idGeradora == u.id && i.ano == ano && i.mes == mes)
      .reduce((acc, item) => acc + Number(item.injetadoPonta || 0) + Number(item.injetadoFPonta || 0), 0);
    let autoconsumo = Math.max(0, Number(gMes?.geracao || 0) - inj);
    total += autoconsumo * ((u.tensao || '').toUpperCase() !== 'BT' ? tarifaMediaMTParaUsina() : TARIFA_BT);
  });
  usinas.value.filter(u => u.id == 19 || u.id == 20).forEach(u => {
    const gMes = geracoes.value.find(g => g.idGeradora == u.id && g.ano == ano && g.mes == mes);
    total += Number(gMes?.geracao || 0) * ((u.tensao || '').toUpperCase() !== 'BT' ? tarifaMediaMTParaUsina() : TARIFA_BT);
  });
  return Number(total.toFixed(2));
};
const calcularCustoEvitadoTotal = (ano, mes) =>
  Number((somarEconomiaPorMesAno(ano, mes) + calcularCustoAutoconsumoMes(ano, mes)).toFixed(2));
const custo_evitado_total = computed(() =>
  calcularCustoEvitadoTotal(referencia.value.ano, referencia.value.mes)
);
const saldoMes = computed(() =>
  registrosMes.value.reduce((acc, i) => acc + Number(i.saldoEnergia ?? 0), 0)
);

function consumoSecretaria(sigla) {
  return registrosMes.value
    .filter(item => {
      const unidade = unidades.value.find(u => u.id == item.idUnidadeCompensa);
      return unidade && unidade.secretaria === sigla;
    })
    .reduce((acc, item) => acc + Number(item.consumokWh || 0), 0);
}
const consumoEducacao = computed(() => consumoSecretaria('E'));
const consumoSaude    = computed(() => consumoSecretaria('S'));
const consumoOutros   = computed(() => consumoSecretaria('O'));
const consumoTotal = computed(() => consumoEducacao.value + consumoSaude.value + consumoOutros.value);
function pct(valor) {
  if (!consumoTotal.value) return '0%';
  return ((valor / consumoTotal.value) * 100).toFixed(1) + '%';
}

const showPanel  = ref(false);
const adminTab   = ref('geral');
const togglePanel = () => { showPanel.value = !showPanel.value; };

useHead({ title: 'Mapa Eficiência • Lucentis' });
definePageMeta({ layout: 'blank' });

const modoPainel = ref('publico');
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
            <circle cx="12" cy="12" r="4" fill="#00e5ff"/>
            <g stroke="#00e5ff" stroke-width="1.5" stroke-linecap="round">
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
          <span class="hd-eyebrow">PREFEITURA DE HORTOLÂNDIA</span>
          <h1 class="hd-title">EFICIÊNCIA ENERGÉTICA</h1>
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
              <span class="pub-hero-val">R$ {{ totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
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
            <span class="pub-card-val">{{ totalPlacas.toLocaleString('pt-BR') }}</span>
          </div>
          <div class="pub-card">
            <div class="pub-card-glow" style="background:#28a74522"></div>
            <span class="pub-card-icon-wrap" style="background:#28a74518; color:#5cd68a">📈</span>
            <span class="pub-card-label">GERADO</span>
            <span class="pub-card-val">{{ totalGerado.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }}</span>
            <span class="pub-card-unit">kWh</span>
          </div>
          <div class="pub-card">
            <div class="pub-card-glow" style="background:#ffc10722"></div>
            <span class="pub-card-icon-wrap" style="background:#ffc10718; color:#ffd966">🔋</span>
            <span class="pub-card-label">INJETADO</span>
            <span class="pub-card-val">{{ totalInjetado.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }}</span>
            <span class="pub-card-unit">kWh</span>
          </div>
          <div class="pub-card pub-card-wide">
            <div class="pub-card-glow" style="background:#9700ce22"></div>
            <span class="pub-card-icon-wrap" style="background:#9700ce18; color:#c96af5">💵</span>
            <span class="pub-card-label">COMPENSADO</span>
            <span class="pub-card-val">R$ {{ totalCompensaSoma.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
          </div>
        </div>

        <div class="pub-section-label" style="margin-top:14px">
          <span class="psl-line"></span><span>MEIO AMBIENTE</span><span class="psl-line"></span>
        </div>

        <div class="pub-grid pub-grid-eco">
          <div class="pub-card pub-card-eco">
            <div class="pub-card-glow" style="background:#00e5ff18"></div>
            <span class="pub-card-icon-wrap" style="background:#00e5ff12; color:#00e5ff">🌿</span>
            <span class="pub-card-label">CARBONO EVITADO</span>
            <span class="pub-card-val">{{ totalCarbono.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }}</span>
            <span class="pub-card-unit">kgCO₂</span>
          </div>
          <div class="pub-card pub-card-eco">
            <div class="pub-card-glow" style="background:#13deb918"></div>
            <span class="pub-card-icon-wrap" style="background:#13deb912; color:#13deb9">🌳</span>
            <span class="pub-card-label">EQUIV. ÁRVORES</span>
            <span class="pub-card-val">{{ totalArvorePlantadas.toLocaleString('pt-BR') }}</span>
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
              <span class="adm-hero-val">{{ taxaAutossuficiencia.toFixed(1) }}</span>
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
              <span class="adm-card-val">R$ {{ custo_evitado_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
              <span class="adm-card-ref">Ref.: {{ mesReferencia }}</span>
            </div>
            <div class="adm-card adm-card-blue">
              <span class="adm-card-label">GERAÇÃO NO MÊS</span>
              <span class="adm-card-val">{{ geracaoMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }} <small>kWh</small></span>
              <span class="adm-card-ref">Ref.: {{ mesReferencia }}</span>
            </div>
            <div class="adm-card adm-card-teal">
              <span class="adm-card-label">SALDO DE ENERGIA</span>
              <span class="adm-card-val">{{ saldoMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }} <small>kWh</small></span>
              <span class="adm-card-ref">Ref.: {{ mesReferencia }}</span>
            </div>
          </div>
        </div>

        <!-- ABA SECRETARIAS -->
        <div v-if="adminTab === 'secretarias'" class="adm-sec-section">
          <div class="adm-total-row">
            <span class="adm-total-label">Consumo total das unidades</span>
            <span class="adm-total-val">{{ consumoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }} kWh</span>
          </div>
          <div class="adm-sec-grid">
            <div class="adm-sec-card">
              <div class="adm-sec-card-top">
                <div class="adm-sec-icon" style="background:#1d4ed818; color:#4fa3ff">📚</div>
                <span class="adm-sec-name">Educação</span>
              </div>
              <span class="adm-sec-val">{{ consumoEducacao.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }} <small>kWh</small></span>
              <div class="adm-sec-bar-track">
                <div class="adm-sec-bar" style="background:#1d4ed8" :style="{ width: pct(consumoEducacao) }"></div>
              </div>
              <div class="adm-sec-footer">
                <span class="adm-sec-pct" style="background:#1d4ed818; color:#4fa3ff">{{ pct(consumoEducacao) }}</span>
                <span class="adm-sec-ref">Ref.: {{ mesReferencia }}</span>
              </div>
            </div>
            <div class="adm-sec-card">
              <div class="adm-sec-card-top">
                <div class="adm-sec-icon" style="background:#05966918; color:#13deb9">🏥</div>
                <span class="adm-sec-name">Saúde</span>
              </div>
              <span class="adm-sec-val">{{ consumoSaude.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }} <small>kWh</small></span>
              <div class="adm-sec-bar-track">
                <div class="adm-sec-bar" style="background:#059669" :style="{ width: pct(consumoSaude) }"></div>
              </div>
              <div class="adm-sec-footer">
                <span class="adm-sec-pct" style="background:#05966918; color:#13deb9">{{ pct(consumoSaude) }}</span>
                <span class="adm-sec-ref">Ref.: {{ mesReferencia }}</span>
              </div>
            </div>
            <div class="adm-sec-card">
              <div class="adm-sec-card-top">
                <div class="adm-sec-icon" style="background:#d9770618; color:#ffae1f">🏛</div>
                <span class="adm-sec-name">Outros</span>
              </div>
              <span class="adm-sec-val">{{ consumoOutros.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }} <small>kWh</small></span>
              <div class="adm-sec-bar-track">
                <div class="adm-sec-bar" style="background:#d97706" :style="{ width: pct(consumoOutros) }"></div>
              </div>
              <div class="adm-sec-footer">
                <span class="adm-sec-pct" style="background:#d9770618; color:#ffae1f">{{ pct(consumoOutros) }}</span>
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
  border: 1px solid rgba(0,229,255,0.18);
  border-radius: 16px;
  padding: 12px 16px 10px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04);
}
.hd-grid-bg {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(0,229,255,0.07) 1px, transparent 1px);
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
  background: rgba(0,229,255,0.1);
  border: 1px solid rgba(0,229,255,0.25);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  animation: hd-pulse 3s ease-in-out infinite;
}
@keyframes hd-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(0,229,255,0.0); }
  50%     { box-shadow: 0 0 0 6px rgba(0,229,255,0.12); }
}
.hd-texts { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.hd-eyebrow {
  font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
  color: rgba(0,229,255,0.6); text-transform: uppercase;
}
.hd-title {
  font-size: 18px; font-weight: 800; color: #ffffff;
  letter-spacing: 0.04em; line-height: 1;
  text-shadow: 0 0 20px rgba(0,229,255,0.3);
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
  border: 1px solid rgba(0,229,255,0.2);
  border-bottom: none;
  border-top-left-radius: 20px; border-top-right-radius: 20px;
  padding: 10px 20px 8px;
  cursor: pointer; z-index: 15; overflow: hidden;
  box-shadow: 0 -6px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(0,229,255,0.1);
  transition: all 0.2s;
}
.pull-tab:hover {
  border-color: rgba(0,229,255,0.4);
  box-shadow: 0 -8px 28px rgba(0,0,0,0.5), 0 0 20px rgba(0,229,255,0.08);
}
.pull-tab-scan {
  position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0,229,255,0.06), transparent);
  animation: scan 3s linear infinite; pointer-events: none;
}
@keyframes scan { 0%{ left: -60%; } 100%{ left: 120%; } }
.pull-tab-handle {
  position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
  width: 28px; height: 3px; background: rgba(0,229,255,0.3); border-radius: 2px;
}
.pull-tab-content {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; margin-top: 4px;
}
.pull-tab-icon  { font-size: 10px; color: #00e5ff; }
.pull-tab-label { font-size: 13px; font-weight: 800; color: #ffffff; letter-spacing: 0.12em; }
.pull-tab-dash  { font-size: 11px; color: rgba(0,229,255,0.3); letter-spacing: -0.05em; }
.pull-tab-sub   { font-size: 10px; font-weight: 600; color: rgba(0,229,255,0.6); letter-spacing: 0.08em; }

/* ════════════════════════════════════════════
   PAINEL
════════════════════════════════════════════ */
.info-panel {
  position: absolute; bottom: 0; left: 0; width: 100%;
  background: #080e1c; z-index: 9999;
  overflow-y: auto; max-height: 78vh;
  border-top-left-radius: 24px; border-top-right-radius: 24px;
  border-top: 1px solid rgba(0,229,255,0.15);
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
.panel-topbar-dot  { width: 7px; height: 7px; border-radius: 50%; background: #00e5ff; box-shadow: 0 0 6px #00e5ff; }
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
.mode-btn.active          { background: rgba(0,229,255,0.12); color: #00e5ff; box-shadow: 0 0 10px rgba(0,229,255,0.15); }
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
  border: 1px solid rgba(0,229,255,0.15); border-radius: 16px;
  padding: 16px; display: flex; align-items: center; justify-content: space-between; overflow: hidden;
}
.pub-hero-glow {
  position: absolute; top: -40px; right: -40px; width: 140px; height: 140px;
  border-radius: 50%; background: rgba(0,71,204,0.25); filter: blur(40px); pointer-events: none;
}
.pub-hero-left  { display: flex; align-items: center; gap: 12px; }
.pub-hero-icon  { font-size: 26px; }
.pub-card-label { display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: rgba(255,255,255,0.35); text-transform: uppercase; margin-bottom: 2px; }
.pub-hero-val   { display: block; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; }
.pub-hero-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: rgba(0,229,255,0.6); background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.15); padding: 4px 10px; border-radius: 20px; }

.pub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pub-grid-eco { grid-template-columns: 1fr 1fr; }

.pub-card {
  position: relative; background: rgba(13,22,42,0.9);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 14px;
  padding: 13px 12px 11px; display: flex; flex-direction: column; gap: 3px; overflow: hidden; transition: border-color 0.2s;
}
.pub-card:hover { border-color: rgba(255,255,255,0.12); }
.pub-card-wide  { grid-column: 1 / -1; }
.pub-card-eco   { background: rgba(8,20,16,0.9); border-color: rgba(0,229,255,0.08); }
.pub-card-glow  { position: absolute; top: -24px; right: -24px; width: 80px; height: 80px; border-radius: 50%; filter: blur(20px); pointer-events: none; }
.pub-card-icon-wrap { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 17px; margin-bottom: 4px; }
.pub-card-val   { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; line-height: 1.1; }
.pub-card-unit  { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3); }

/* ════════════════════════════════════════════
   ADMIN
════════════════════════════════════════════ */
.adm-section { padding: 14px 14px 20px; display: flex; flex-direction: column; gap: 12px; }
.adm-badge-row { display: flex; justify-content: center; }
.adm-badge { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; background: rgba(255,174,31,0.1); border: 1px solid rgba(255,174,31,0.25); color: #ffae1f; padding: 5px 14px; border-radius: 20px; }

.adm-tabs { display: flex; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 4px; gap: 4px; }
.adm-tab { flex: 1; padding: 8px 0; border-radius: 9px; border: none; background: transparent; color: rgba(255,255,255,0.35); font-size: 12px; font-weight: 700; cursor: pointer; letter-spacing: 0.04em; transition: all 0.2s; }
.adm-tab.active { background: rgba(0,229,255,0.1); color: #00e5ff; box-shadow: 0 0 12px rgba(0,229,255,0.12); border: 1px solid rgba(0,229,255,0.2); }

.adm-geral { display: flex; flex-direction: column; gap: 10px; }

.adm-hero-card { position: relative; background: linear-gradient(145deg, #050e22, #091526); border: 1px solid rgba(0,229,255,0.2); border-radius: 16px; padding: 16px; overflow: hidden; }
.adm-hero-bg   { position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(0,229,255,0.05) 1px, transparent 1px); background-size: 18px 18px; pointer-events: none; }
.adm-card-label { display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.12em; color: rgba(255,255,255,0.35); text-transform: uppercase; margin-bottom: 6px; }
.adm-hero-val-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 10px; }
.adm-hero-val  { font-size: 48px; font-weight: 900; color: #ffffff; line-height: 1; letter-spacing: -0.03em; text-shadow: 0 0 30px rgba(0,229,255,0.25); }
.adm-hero-unit { font-size: 24px; font-weight: 700; color: rgba(0,229,255,0.7); }
.adm-bar-track { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
.adm-bar-fill  { height: 100%; background: linear-gradient(90deg, #0047cc, #00e5ff); border-radius: 3px; transition: width 0.8s cubic-bezier(0.34,1.56,0.64,1); box-shadow: 0 0 8px rgba(0,229,255,0.5); }
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