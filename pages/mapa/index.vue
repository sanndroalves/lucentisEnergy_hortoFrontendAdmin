<script setup>
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import Map from '@/components/Map2.vue';
import { ref, computed } from 'vue'

// ─── Auth ────────────────────────────────────────────────────────────────────
// Ajuste para o composable/store de auth do seu projeto.
// Esperamos um objeto user com { cargo: 'AD' } para admin.
const { data } = useAuth(); // ex: useAuthStore(), useSanctum(), etc.
const isAdmin = computed(() => data.value?.username === 'admin');
const unidades = ref(0)

// ─── Dados globais ────────────────────────────────────────────────────────────
const { data: geracoes  } = await useFetch(`${API_BASE_URL}/relatoriogeracao/`);
const { data: injecoes  } = await useFetch(`${API_BASE_URL}/relatoriousina/`);
const { data: compensa  } = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`);
const { data: usinas    } = await useFetch(`${API_BASE_URL}/usina/`);
const { data: fetchedUnidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao`); 
unidades.value = fetchedUnidades.value  


// ─── Chips de secretaria ──────────────────────────────────────────────────────
const contaEducacao = computed(() => usinas.value?.filter(i => i.secretaria === 'E') ?? []);
const contaSaude    = computed(() => usinas.value?.filter(i => i.secretaria === 'S') ?? []);
const contaOutros   = computed(() => usinas.value?.filter(i => i.secretaria === 'O') ?? []);

// ─── Totais gerais ────────────────────────────────────────────────────────────
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

// ─── Rótulo do mês de referência (mês anterior) ───────────────────────────────
const mesReferencia = computed(() => {
  const meses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ];
  const hoje = new Date();
  const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  return `${meses[anterior.getMonth()]} ${anterior.getFullYear()}`;
});

// ─── Estatísticas administrativas — ABA GERAL ─────────────────────────────────
// 📅 Último mês fechado
const referencia = computed(() => {
  // const hoje = new Date(2026, 0, 1); // Janeiro = 0
  const hoje = new Date();
  const mes = hoje.getMonth();
  const ano = hoje.getFullYear() - (mes === 0 ? 1 : 0);
  const mesCorrigido = mes === 0 ? 12 : mes;

  const ref = { mes: mesCorrigido, ano };
 

  return ref;
});

// 🔎 Filtrar dados do mês correto
const registrosMes = computed(() => {
  const filtrado = compensa.value?.filter(i =>
    i.mes === referencia.value.mes &&
    i.ano === referencia.value.ano
  ) ?? [];


  return filtrado;

});

const geracoesMes = computed(() => {
  const filtrado = geracoes.value?.filter(i =>
    i.mes === referencia.value.mes &&
    i.ano === referencia.value.ano
  ) ?? [];


  return filtrado;
});

// ⚡ GERAÇÃO DO MÊS
const geracaoMes = computed(() => {
  const total = geracoesMes.value.reduce((acc, i) => {
    return acc + Number(i.geracao || 0);
  }, 0);


  return total;
});

const energiaInjetadaMes = computed(() => {
  const total = injecoes.value
    ?.filter(i =>
      i.mes === referencia.value.mes &&
      i.ano === referencia.value.ano
    )
    .reduce((acc, item) => {
      return acc +
        Number(item.injetadoPonta || 0) +
        Number(item.injetadoFPonta || 0)
    }, 0) ?? 0


  return Number(total.toFixed(2))
})

const consumoMedioUsinas = computed(() => {
  let total = 0

  usinas.value
    .filter(usina => usina.id !== 19 && usina.id !== 20)
    .forEach(usina => {
      const unidade = unidades.value.find(u => u.uc === usina.uc)

      if (unidade) {
        total += Number(unidade.mediaConsumo || 0)
      }
    })

  return Number(total.toFixed(2))
})

const energiaCompensadaPredios = computed(() => {
  const filtrados = registrosMes.value.filter(item => {
    const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa)

    return unidade && ['E', 'S', 'O'].includes(unidade.secretaria)
  })

  const total = filtrados.reduce((acc, item) => {
    return acc + Number(item.enerInjTUSD || 0)
  }, 0)

  return Number(total.toFixed(2))
})

const consumoPredios = computed(() => {
  const UCsEspeciais = ['4000266381', '37068768']

  const filtrados = registrosMes.value.filter(item => {
    const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa)

    return unidade && ['E', 'S', 'O'].includes(unidade.secretaria)
  })

  const total = filtrados.reduce((acc, item) => {
    const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa)
    const uc = String(unidade?.uc || '')
    const consumo = Number(item.consumokWh || 0)

    if (UCsEspeciais.includes(uc)) {
      const geracaoUC = geracoesMes.value.find(g => String(g.uc) === uc)

      const valorGeracao = geracaoUC
        ? Number(geracaoUC.geracao || 0)
        : 0

      return acc + consumo + valorGeracao
    }

    return acc + consumo
  }, 0)

  return Number(total.toFixed(2))
})

const taxaAutossuficiencia = computed(() => {
  const totalCompensado =
    energiaCompensadaPredios.value +
    (geracaoMes.value - energiaInjetadaMes.value)

  const totalConsumo =
    consumoPredios.value +
    consumoMedioUsinas.value

  if (!totalConsumo) return 0

  const taxa = (totalCompensado / totalConsumo) * 100

  return Number(taxa.toFixed(2))
})


// 💰 CUSTO EVITADO TOTAL (PAINEL = CONCLUSIVO)
/* =======================================================
CUSTO EVITADO TOTAL - PAINEL
======================================================= */

const TARIFA_BT = 0.88

const MT_TARIFAS = {
  TUSD_ponta: 1.66642019,
  TE_ponta: 0.57222160,
  TUSD_forap: 0.14734841,
  TE_forap: 0.34908095
}

const tarifaMediaMTParaUsina = () => {
  const minima =
    MT_TARIFAS.TUSD_forap + MT_TARIFAS.TE_forap

  const maxima =
    MT_TARIFAS.TUSD_ponta + MT_TARIFAS.TE_ponta

  return (minima + maxima) / 2
}

/* -------------------------------
ECONOMIA COMPENSADA
--------------------------------*/
const somarEconomiaPorMesAno = (ano, mes) => {
  const dados = compensa.value.filter(
    item => item.ano == ano && item.mes == mes
  )

  const total = dados.reduce((acc, item) => {
    return acc +
      Number(item.valorInjTUSD || 0) +
      Number(item.valorInjTE || 0)
  }, 0)

  return Number(total.toFixed(2))
}

/* -------------------------------
AUTOCONSUMO
--------------------------------*/
const calcularCustoAutoconsumoMes = (ano, mes) => {
  let total = 0

  usinas.value
  .filter(u => u.id != 19 && u.id != 20)
  .forEach(u => {
    const geracaoMes = geracoes.value.find(
      g =>
        g.idGeradora == u.id &&
        g.ano == ano &&
        g.mes == mes
    )

    const injecaoMes = injecoes.value
      .filter(
        i =>
          i.idGeradora == u.id &&
          i.ano == ano &&
          i.mes == mes
      )
      .reduce((acc, item) => {
        return acc +
          Number(item.injetadoPonta || 0) +
          Number(item.injetadoFPonta || 0)
      }, 0)

    let autoconsumo =
      Number(geracaoMes?.geracao || 0) - injecaoMes

    if (autoconsumo < 0) autoconsumo = 0

    let tarifa = TARIFA_BT

    if ((u.tensao || '').toUpperCase() !== 'BT') {
      tarifa = tarifaMediaMTParaUsina()
    }

    total += autoconsumo * tarifa
  })

  usinas.value
  .filter(u => u.id == 19 || u.id == 20)
  .forEach(u => {
    const geracaoMes = geracoes.value.find(
      g =>
        g.idGeradora == u.id &&
        g.ano == ano &&
        g.mes == mes
    )

    let autoconsumo = Number(geracaoMes?.geracao || 0)

    let tarifa = TARIFA_BT

    if ((u.tensao || '').toUpperCase() !== 'BT') {
      tarifa = tarifaMediaMTParaUsina()
    }

    total += autoconsumo * tarifa
  })

  return Number(total.toFixed(2))
}

/* -------------------------------
TOTAL FINAL
--------------------------------*/
const calcularCustoEvitadoTotal = (ano, mes) => {
  const compensado = somarEconomiaPorMesAno(ano, mes)

  const autoconsumo = calcularCustoAutoconsumoMes(ano, mes)

  const total = compensado + autoconsumo

  return Number(total.toFixed(2))
}

const custo_evitado_total = computed(() =>
  calcularCustoEvitadoTotal(referencia.value.ano, referencia.value.mes)
);



// 🔋 SALDO DO MÊS
const saldoMes = computed(() =>
  registrosMes.value.reduce((acc, i) =>
    acc + Number(i.saldoEnergia ?? 0), 0)
);

/* =====================================================
ABA SECRETARIAS - CONSUMO REAL DAS UNIDADES
===================================================== */

function consumoSecretaria(sigla) {
  return registrosMes.value
    .filter(item => {
      const unidade = unidades.value.find(
        u => u.id == item.idUnidadeCompensa
      )

      return unidade && unidade.secretaria === sigla
    })
    .reduce((acc, item) => {
      return acc + Number(item.consumokWh || 0)
    }, 0)
}

/* Totais por secretaria */
const consumoEducacao = computed(() => consumoSecretaria('E'))
const consumoSaude    = computed(() => consumoSecretaria('S'))
const consumoOutros   = computed(() => consumoSecretaria('O'))

/* Total geral */
const consumoTotal = computed(() =>
  consumoEducacao.value +
  consumoSaude.value +
  consumoOutros.value
)

/* Percentual */
function pct(valor) {
  if (!consumoTotal.value) return '0%'

  return (
    (valor / consumoTotal.value) * 100
  ).toFixed(1) + '%'
}

// ─── UI ───────────────────────────────────────────────────────────────────────
const showPanel  = ref(false);
const adminTab   = ref('geral'); // 'geral' | 'secretarias'

const togglePanel = () => { showPanel.value = !showPanel.value; };

useHead({ title: 'Mapa Eficiência • Lucentis' });

definePageMeta({ layout: 'blank' });

// alternar entre publico e  adm
const modoPainel = ref('publico')

</script>

<template>
  <!-- Título / Subtítulo -->
  <div class="header-container">
    <h2 class="title">EFICIÊNCIA ENERGÉTICA</h2>
    <h4 class="subtitle">MUNICÍPIO DE HORTOLÂNDIA</h4>
  </div>
 
  <!-- Chips -->
  <div class="chip-container mt-2">
    <v-chip class="chip bg-lightprimary text-secondary">
      <BooksIcon size="20" class="mr-2" />
      Educação: <strong style="margin-left:5px">{{ contaEducacao.length }}</strong>
    </v-chip>
    <v-chip class="chip bg-lightsuccess text-success">
      <FirstAidKitIcon size="20" class="mr-2" />
      Saúde: <strong style="margin-left:5px">{{ contaSaude.length }}</strong>
    </v-chip>
    <v-chip class="chip bg-lightwarning text-warning">
      <BuildingCommunityIcon size="20" class="mr-2" />
      Outros: <strong style="margin-left:5px">{{ contaOutros.length }}</strong>
    </v-chip>
  </div>
 
  <!-- Mapa -->
  <v-col cols="12" lg="12" class="pa-0">
    <Map />
  </v-col>
 
  <!-- Botão inferior -->
  <div class="bottom-title" @click="togglePanel">
    <h3>ESTATÍSTICAS {{ showPanel ? '▲' : '▼' }}</h3>
  </div>
 
  <!-- Painel deslizante -->
  <v-expand-transition>
    <div v-if="showPanel" class="info-panel">
      <h3 class="info-title">ESTATÍSTICAS</h3>
 
      <!-- ── Cards públicos ────────────────────────────────────── -->
      <div class="stats-container">
        <div class="stat-card stat-orange">
          <ZoomMoneyIcon size="30" class="stat-icon" />
          <h4>INVESTIDO</h4>
          <p>R$ {{ totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
        </div>
        <div class="stat-card stat-blue">
          <FilePowerIcon size="30" class="stat-icon" />
          <h4>USINAS</h4>
          <p>{{ usinas.length }}</p>
        </div>
        <div class="stat-card stat-pink">
          <SunIcon size="30" class="stat-icon" />
          <h4>PLACAS</h4>
          <p>{{ totalPlacas }}</p>
        </div>
        <div class="stat-card stat-green">
          <TrendingUpIcon size="30" class="stat-icon" />
          <h4>GERADO</h4>
          <p>{{ totalGerado }} kWh</p>
        </div>
        <div class="stat-card stat-yellow">
          <BoltIcon size="30" class="stat-icon" />
          <h4>INJETADO</h4>
          <p>{{ totalInjetado }} kWh</p>
        </div>
        <div class="stat-card stat-purple">
          <CashIcon size="30" class="stat-icon" />
          <h4>COMPENSADO</h4>
          <p>R$ {{ totalCompensaSoma.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
        </div>
        <div class="stat-card stat-orange">
          <LeafIcon size="30" class="stat-icon" />
          <h4>CARBONO EVITADO</h4>
          <p>{{ totalCarbono.toFixed(0) }} kgCO₂</p>
        </div>
        <div class="stat-card stat-lightgreen">
          <TreeIcon size="30" class="stat-icon" />
          <h4>ÁRVORES PLANTADAS</h4>
          <p>{{ totalArvorePlantadas }}</p>
        </div>
      </div>
 
      <!-- ── Seção Administrativa (somente cargo AD) ────────────── -->
      <div v-if="isAdmin" class="admin-section">
        <div class="admin-header">
          <v-icon size="16" color="warning">mdi-lock</v-icon>
          <span class="admin-badge">ADMINISTRATIVO</span>
        </div>
 
        <!-- Abas -->
        <div class="admin-tabs">
          <button
            class="admin-tab"
            :class="{ active: adminTab === 'geral' }"
            @click="adminTab = 'geral'"
          >
            Geral
          </button>
          <button
            class="admin-tab"
            :class="{ active: adminTab === 'secretarias' }"
            @click="adminTab = 'secretarias'"
          >
            Secretarias
          </button>
        </div>
 
        <!-- ABA: Geral -->
        <div v-if="adminTab === 'geral'" class="admin-cards-grid">
          <div class="admin-card accent-blue">
            <span class="admin-card-label">Taxa de Autossuficiência</span>
            <span class="admin-card-value">{{ taxaAutossuficiencia.toFixed(1) }}%</span>
            <span class="admin-card-ref">Ref.: {{ mesReferencia }}</span>
          </div>
          <div class="admin-card accent-green">
            <span class="admin-card-label">Compensado no mês</span>
            <span class="admin-card-value">
              R$ {{ custo_evitado_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </span>
            <span class="admin-card-ref">Ref.: {{ mesReferencia }}</span>
          </div>
          <div class="admin-card accent-blue">
            <span class="admin-card-label">Geração no mês</span>
            <span class="admin-card-value">{{ geracaoMes.toFixed(0) }} kWh</span>
            <span class="admin-card-ref">Ref.: {{ mesReferencia }}</span>
          </div>
          <div class="admin-card accent-green">
            <span class="admin-card-label">Saldo de Energia</span>
            <span class="admin-card-value">{{ saldoMes.toFixed(0) }} kWh</span>
            <span class="admin-card-ref">Ref.: {{ mesReferencia }}</span>
          </div>
        </div>
 
        <!-- ABA: Secretarias -->
        <div v-if="adminTab === 'secretarias'" class="sec-cards-grid">
          <div class="sec-card">
            <div class="sec-header">
              <span class="sec-dot" style="background:#1e40af" />
              <span class="sec-name">Educação</span>
            </div>
            <span class="sec-value">{{ consumoEducacao.toFixed(0) }} kWh</span>
            <span class="sec-pct">{{ pct(consumoEducacao) }} do consumo total</span>
            <div class="sec-ref">Ref.: {{ mesReferencia }}</div>
          </div>
          <div class="sec-card">
            <div class="sec-header">
              <span class="sec-dot" style="background:#065f46" />
              <span class="sec-name">Saúde</span>
            </div>
            <span class="sec-value">{{ consumoSaude.toFixed(0) }} kWh</span>
            <span class="sec-pct">{{ pct(consumoSaude) }} do consumo total</span>
            <div class="sec-ref">Ref.: {{ mesReferencia }}</div>
          </div>
          <div class="sec-card">
            <div class="sec-header">
              <span class="sec-dot" style="background:#92400e" />
              <span class="sec-name">Outros</span>
            </div>
            <span class="sec-value">{{ consumoOutros.toFixed(0) }} kWh</span>
            <span class="sec-pct">{{ pct(consumoOutros) }} do consumo total</span>
            <div class="sec-ref">Ref.: {{ mesReferencia }}</div>
          </div>
        </div>
      </div>
      <!-- ── Fim da seção admin ─────────────────────────────────── -->
 
      <v-btn @click="togglePanel" color="primary" class="mt-4">Fechar</v-btn>
    </div>
  </v-expand-transition>
</template>
 
<style scoped>
/* ── Layout base ─────────────────────────────────────────────── */
.header-container {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
  width: 100%;
  max-width: 90%;
  padding: 10px;
  border-radius: 8px;
}
 
.v-row {
  height: 50vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
 
.title {
  font-size: 25px;
  font-weight: bold;
  color: white;
  background-color: #007bff;
  padding: 0px 5px;
  border: 2px solid #007bff;
  display: inline-block;
  border-radius: 5px;
}
 
.subtitle {
  font-size: 14px;
  font-weight: bold;
  color: #007bff;
  margin-top: 0px;
}
 
.chip-container {
  position: absolute;
  top: 78px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  width: 100%;
  max-width: 90%;
}
 
.chip {
  font-size: 16px;
  padding: 10px 16px;
  font-weight: bold;
}
 
/* ── Botão inferior ──────────────────────────────────────────── */
.bottom-title {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  background: rgba(0, 123, 255, 0.7);
  color: white;
  text-align: center;
  padding: 10px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  z-index: 15;
  transition: 0.3s;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
}
 
/* ── Painel de estatísticas ──────────────────────────────────── */
.info-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: white;
  padding: 20px;
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  text-align: center;
  overflow-y: auto;
  max-height: 70vh;
}
 
.info-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}
 
/* ── Cards públicos ──────────────────────────────────────────── */
.stats-container {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
 
.stat-card {
  width: 160px;
  height: 120px;
  padding: 10px;
  text-align: center;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
 
.stat-icon { margin-bottom: 5px; }
 
.stat-blue      { background: #007bff; color: white; }
.stat-green     { background: #28a745; color: white; }
.stat-yellow    { background: #ffc107; color: black; }
.stat-orange    { background: #ff8809; color: white; }
.stat-pink      { background: #ff416a; color: white; }
.stat-purple    { background: #9700ce; color: white; }
.stat-lightgreen{ background: #067d00; color: white; }
 
/* ── Seção administrativa ────────────────────────────────────── */
.admin-section {
  margin-top: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  background: #f9f9f9;
  text-align: left;
}
 
.admin-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
 
.admin-badge {
  background: #fef3c7;
  color: #92400e;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: 0.06em;
}
 
/* Abas */
.admin-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
 
.admin-tab {
  flex: 1;
  padding: 8px 0;
  border-radius: 8px;
  border: 1px solid #d0d0d0;
  background: white;
  color: #555;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
 
.admin-tab.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}
 
/* Cards de Geral */
.admin-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}
 
.admin-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
 
.accent-blue  { border-left: 4px solid #007bff; }
.accent-green { border-left: 4px solid #28a745; }
 
.admin-card-label {
  font-size: 10px;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
 
.admin-card-value {
  font-size: 18px;
  font-weight: 700;
  color: #222;
}
 
.admin-card-ref {
  font-size: 10px;
  color: #aaa;
  margin-top: 4px;
}
 
/* Cards de Secretarias */
.sec-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}
 
.sec-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
 
.sec-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
 
.sec-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
 
.sec-name {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}
 
.sec-value {
  font-size: 20px;
  font-weight: 700;
  color: #222;
}
 
.sec-pct {
  font-size: 11px;
  color: #666;
}
 
.sec-ref {
  font-size: 10px;
  color: #aaa;
  border-top: 1px solid #f0f0f0;
  padding-top: 6px;
  margin-top: 2px;
}
 
/* ── Responsividade ──────────────────────────────────────────── */
@media (max-width: 600px) {
  .header-container { padding: 8px; }
  .title            { font-size: 25px; }
  .subtitle         { font-size: 13px; }
  .chip-container   { top: 85px; flex-direction: column; align-items: center; }
  .stat-card        { width: 140px; height: 90px; }
  .stats-container  { flex-direction: column; align-items: center; font-size: 13px; }
  .admin-cards-grid,
  .sec-cards-grid   { grid-template-columns: 1fr 1fr; }
}
 
.leaflet-control-attribution {
  pointer-events: none;
  opacity: 0.3;
  font-size: 12px;
  z-index: 1;
}
</style>