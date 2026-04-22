<script setup>

import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';


import Map from '@/components/Map2.vue';

const { data: geracoes } = await useFetch(`${API_BASE_URL}/relatoriogeracao/`);
const { data: injecoes } = await useFetch(`${API_BASE_URL}/relatoriousina/`);
const { data: compensa } = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`);

// Soma total da geração (convertendo string para número)
const totalGerado = computed(() => {
  return geracoes.value?.reduce((acc, item) => acc + parseFloat(item.geracao), 0) || 0;
});

// Soma total da injeção (ponta + fora de ponta)
const totalInjetado = computed(() => {
  return injecoes.value?.reduce((acc, item) => acc + item.injetadoPonta + item.injetadoFPonta, 0) || 0;
});

// Soma total do consumo em R$ (convertendo string para número)
const totalCompensa = computed(() => {
  return compensa.value?.reduce((acc, item) => acc + parseFloat(item.valorInjTUSD) + parseFloat(item.valorInjTE), 0) || 0;
});

const totalSaldoJaneiro = computed(() => {
  // Obtem a data atual
  const hoje = new Date();

  // Calcula o mês-alvo (3 meses atrás)
  const mesAlvo = hoje.getMonth() + 1 - 3; // getMonth retorna 0-11
  const anoAlvo = hoje.getFullYear() - (mesAlvo <= 0 ? 1 : 0);
  const mesCorrigido = ((mesAlvo + 11) % 12) + 1;

  return compensa.value?.reduce((acc, item) => {
    if (item.mes === mesCorrigido && item.ano === anoAlvo) {
      return acc + parseFloat(item.saldoEnergia);
    }
    return acc;
  }, 0) || 0;
});
 

const totalCompensaSoma = ref(parseFloat(totalCompensa.value) + (parseFloat(totalSaldoJaneiro.value) * 0.72)) 
// Defina o título da página
useHead ({
  title: 'Mapa Eficiência • Lucentis',
});  

definePageMeta({
  layout: "blank",
});


const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`); 

const contaEducacao = usinas.value.filter(item => item.secretaria === 'E')
const contaSaude = usinas.value.filter(item => item.secretaria === 'S')
const contaOutros = usinas.value.filter(item => item.secretaria === 'O')
 
const totalPlacas = computed(() => {
  return usinas.value?.reduce((acc, item) => acc + parseFloat(item.qtdPlaca), 0) || 0;
});

const showInfo = ref(false);

const toggleInfo = () => {
  showInfo.value = !showInfo.value;
};

const totalInvestido = ref(Number(8854468.32)+
  Number(8005328.88) + 
  Number(7021350.76) 
);
//8.854.468,32 jac 
//8.005.328,88 17 usinas
// 7.021.350,76

const totalCarbono = ref(Number(0,536) * totalGerado.value.toFixed(2)); // 0,536 kgCO2/kWh
const totalArvore = ref()




</script>
<template>
 
    <!-- QTD USINAS FOTOVOLTAICAS --> 
  <!-- Seção do Título e Subtítulo -->
  <div class="header-container">
    <h2 class="title">EFICIÊNCIA ENERGÉTICA</h2>
    <h4 class="subtitle">USINAS FOTOVOLTAICAS</h4>
  </div>

  <!-- Seção dos Chips (no topo do mapa) -->
  <div class="chip-container mt-2">
    <v-chip class="chip bg-lightprimary text-secondary">
      <BooksIcon size="20" class="mr-2" />
      Educação: <strong style="margin-left: 5px;">{{ contaEducacao.length }}</strong>
    </v-chip>

    <v-chip class="chip bg-lightsuccess text-success">
      <FirstAidKitIcon size="20" class="mr-2" />
      Saúde: <strong  style="margin-left: 5px;">{{ contaSaude.length }}</strong>
    </v-chip>

    <v-chip class="chip bg-lightwarning text-warning">
      <BuildingCommunityIcon size="20" class="mr-2" />
      Outros: <strong  style="margin-left: 5px;">{{ contaOutros.length }}</strong>
    </v-chip>
  </div>

  <!-- Mapa -->
  <v-col cols="12" lg="12" class="pa-0">
    <Map />
  </v-col>

  <!-- Título fixado na parte inferior -->
   <div class="bottom-title" @click="toggleInfo">
      <h3>ESTATÍSTICAS ▼</h3>
    </div>

    <v-expand-transition>
  <div v-if="showInfo" class="info-panel">
    <h3 class="info-title">ESTATÍSTICAS</h3>
    
    <!-- Contêiner de estatísticas -->
    <div class="stats-container">
      <!-- INVESTIDO -->
      <div class="stat-card stat-orange">
        <ZoomMoneyIcon size="30" class="stat-icon" />
        <h4>INVESTIDO</h4>
        <p>R$ {{ totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
      </div>

      <!-- QTD USINAS -->
      <div class="stat-card stat-blue">
        <FilePowerIcon size="30" class="stat-icon" />
        <h4>USINAS</h4>
        <p>{{ usinas.length }}</p>
      </div>

       <!-- QTD PLACAS -->
       <div class="stat-card stat-pink">
        <SunIcon size="30" class="stat-icon" />
        <h4>PLACAS</h4>
        <p>{{ totalPlacas }}</p>
      </div>

      

      <!-- GERADO -->
      <div class="stat-card stat-green">
        <TrendingUpIcon size="30" class="stat-icon" />
        <h4>GERADO</h4>
        <p>{{ totalGerado }} kWh</p>
      </div>

      <!-- INJETADO -->
      <div class="stat-card stat-yellow">
        <BoltIcon size="30" class="stat-icon" />
        <h4>INJETADO</h4>
        <p>{{ totalInjetado }} kWh</p>
      </div>

      <!-- COMPENSADO -->
      <div class="stat-card stat-purple">
        <CashIcon size="30" class="stat-icon" />
        <h4>COMPENSADO</h4>
        <p>R$ {{ totalCompensaSoma.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
      </div>

      <div class="stat-card stat-purple">
        <TreeIcon size="30" class="stat-icon" />
        <h4>ÁRVORES PLANTADAS</h4>
        <p>R$ {{ (totalGerado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
      </div>
    </div>

    <!-- Botão Fechar -->
    <v-btn @click="toggleInfo" color="primary">Fechar</v-btn>
  </div>
</v-expand-transition>





</template>

<style scoped> 

/* Container do Título e Subtítulo */
.header-container {
  position: absolute;
  top: 10px; /* Mantém no topo */
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
  width: 100%;
  max-width: 90%; 
  padding: 10px;
  border-radius: 8px;
}

/* Estilização do Título */

.v-row {
  height: 50vh; /* Define altura total da tela */
  overflow: hidden; /* Impede rolagem */
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 25px;
  font-weight: bold;
  color: white; /* Cor do texto branco */
  background-color: #007bff; /* Fundo preto */
  padding: 0px 5px; /* Espaçamento interno */
  border: 2px solid #007bff; /* Borda preta */
  display: inline-block; /* Evita que ocupe a largura toda */
  border-radius: 5px; /* Bordas arredondadas (opcional) */
}

/* Estilização do Subtítulo */
.subtitle {
  font-size: 14px;
  font-weight: bold;
  color: #007bff; /* Azul */ 
  margin-top: 0px;
}

/* Container dos Chips */
.chip-container {
  position: absolute;
  top: 78px; /* Ajusta a posição abaixo do título */
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

/* Estilização dos Chips */
.chip {
  font-size: 16px;
  padding: 10px 16px;
  font-weight: bold;
}

/* Ajuste para telas menores */
@media (max-width: 600px) {
  .header-container {
    padding: 8px;
  }

  .title {
    font-size: 25px;
  }

  .subtitle {
    font-size: 13px;
  }

  .chip-container {
    top: 85px; /* Ajusta para telas menores */
    flex-direction: column;
    align-items: center;
  }
}

/* Título na parte inferior */
.bottom-title {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  background: rgba(0, 123, 255, 0.7); /* Azul com 70% de opacidade */
  color: white;
  text-align: center;
  padding: 10px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  z-index: 15; /* Sobrepõe qualquer elemento */
  transition: 0.3s;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
}
 
/* 🔹 PAINEL QUE SOBE AO CLICAR */
.info-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: white;
  padding: 20px;
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.2);
  z-index: 9999; /* Sobrepõe o mapa */
  transition: transform 0.3s ease-in-out;
  text-align: center;
  overflow-y: auto; /* Habilita rolagem vertical */
  max-height: 70vh; /* Define uma altura máxima para a área rolável */
}


/* Título principal */
.info-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}

/* Contêiner dos quadros */
.stats-container {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

/* Estilo base dos quadros */
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

/* Ícones */
.stat-icon {
  margin-bottom: 5px;
}

/* Cores dos quadros */
.stat-blue {
  background: #007bff;
  color: white;
}

.stat-green {
  background: #28a745;
  color: white;
}

.stat-yellow {
  background: #ffc107;
  color: black;
}

.stat-orange {
  background: #ff8809;
  color: white;
}

.stat-pink {
  background: #ff416a;
  color: white;
}

.stat-purple {
  background: #9700ce;
  color: white;
}
/* Responsividade */
@media (max-width: 600px) {
  .stat-card {
    width: 140px;
    height: 90px;
  }
  .stats-container {
    flex-direction: column;
    align-items: center;
    font-size: 13px;
  }
}

/* 🔹 IMPEDIR QUE O TEXTO DO MAPTILER SEJA INTERATIVO */
.leaflet-control-attribution {
  pointer-events: none; /* Não permite clique */
  opacity: 0.3; /* Deixa mais transparente */
  font-size: 12px; /* Deixa menor */
  z-index: 1;
}
</style> 