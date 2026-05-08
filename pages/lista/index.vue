<script setup>
  import { useHead } from '@vueuse/head';
  import { nextTick, ref, onMounted, computed } from 'vue';
  import { API_BASE_URL } from '~/base/link';

  useHead({ title: 'Lista de Rateio' });
  definePageMeta({ middleware: 'sidebase-auth' })

  // ── estado ────────────────────────────────────────────────────
  const usinas            = ref([]);
  const unidades          = ref([]);
  const prediosRateio     = ref([]);
  const iluminacaoRateio  = ref([]);
  const projecaoFiltrada  = ref([]);
  const porcentagens      = ref([]);

  const mesAtual  = new Date().getMonth() + 1;
  const anoAtual  = mesAtual === 1 ? new Date().getFullYear() - 1 : new Date().getFullYear();

  const projecaoJac1      = ref([]);
  const unidadesCompensadas = ref([]);

  // ── fetch inicial ─────────────────────────────────────────────
  const fetchData = async () => {
    const { data: fetchedUsinas }      = await useFetch(`${API_BASE_URL}/usina/`);
    const { data: fetchedUnidades }    = await useFetch(`${API_BASE_URL}/unidadecompensacao`);
    const { data: fetchedProjecao }    = await useFetch(`${API_BASE_URL}/projecaogeracao`);
    const { data: fetchedPorcentagens} = await useFetch(`${API_BASE_URL}/porcentagem/`);

    usinas.value           = fetchedUsinas.value.filter(u => u.id !== 19 && u.id !== 20 && u.id !== 22);
    unidades.value         = fetchedUnidades.value;
    projecaoFiltrada.value = fetchedProjecao.value.filter(i => i.ano === anoAtual && i.idGeradora !== 19 && i.idGeradora !== 20 && i.idGeradora !== 22);
    projecaoJac1.value     = fetchedProjecao.value.filter(i => i.ano === anoAtual && i.idGeradora === 22);
    porcentagens.value     = fetchedPorcentagens.value;

    const unidadesAtivas   = fetchedUnidades.value.filter(u => u.status === 'L');
    prediosRateio.value    = unidadesAtivas.filter(u => ['E','S','O'].includes(u.secretaria));
    iluminacaoRateio.value = unidadesAtivas.filter(u => ['I','P'].includes(u.secretaria));
    unidadesCompensadas.value = prediosRateio.value;
  };

  // ── cálculos de projeção e autoconsumo ───────────────────────
  const consumoMedioUsinas    = ref(0);
  const totalProjetado        = ref(0);
  const somaProjecao          = ref('');
  const calculoPosAutoConsumo = ref(0);
  const creditoParaInjecao    = ref(0);
  const totalProjetadoJac1    = ref(0);
  const creditoParaInjecaoJac1 = ref(0);

  const buscarConsumoMedioUsinas = () => {
    usinas.value.forEach(usina => {
      const unidade = unidades.value.find(u => u.uc == usina.uc);
      if (unidade) consumoMedioUsinas.value += Number(unidade.mediaConsumo);
    });
    consumoMedioUsinas.value = parseFloat((consumoMedioUsinas.value * 12).toFixed(2));
  };

  const calcularProjecaoTotalUsinas = async () => {
    somaProjecao.value = projecaoFiltrada.value.reduce((acc, item) => {
      const mes = item.mes;
      acc[mes] = parseFloat(((acc[mes] || 0) + Number(item.projecao)).toFixed(2));
      return acc;
    }, {});
    const valores = Object.values(somaProjecao.value);
    totalProjetado.value = parseFloat(valores.reduce((t, v) => t + v, 0).toFixed(2));
    const somaJac1 = projecaoJac1.value.reduce((t, i) => t + Number(i.projecao), 0);
    totalProjetadoJac1.value += parseFloat(somaJac1.toFixed(2));
  };

  const calcularValoresFinais = () => {
    calculoPosAutoConsumo.value = (totalProjetado.value - consumoMedioUsinas.value).toFixed(2);
    creditoParaInjecao.value    = ((totalProjetado.value - consumoMedioUsinas.value) / 12).toFixed(2);
    creditoParaInjecaoJac1.value = (totalProjetadoJac1.value / 12).toFixed(2);
  };

  // ── médias de consumo das unidades ───────────────────────────
  const unidadesComMediaConsumoPredios     = ref([]);
  const unidadesComMediaConsumoIluminacao  = ref([]);

  const calcularMediaConsumo = async () => {
    const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`);

    const calcularParaGrupo = (unidadesGrupo, destino) => {
      destino.value = [];
      for (const unidade of unidadesGrupo) {
        const rela = relatorios.value.filter(i => i.idUnidadeCompensa === unidade.id);
        if (rela.length > 0) {
          const ord     = rela.sort((a,b) => b.ano===a.ano ? b.mes-a.mes : b.ano-a.ano);
          const ult6    = ord.slice(0,6);
          const soma    = ult6.reduce((s,i) => s + parseFloat(i.consumokWh||0), 0);
          const media   = parseFloat((soma / ult6.length).toFixed(2));
          unidade.mediaConsumo = media;
          const ult3    = ord.slice(0,3);
          const saldoOk = ult3.every(i => parseFloat(i.saldoEnergia||0) !== 0);
          destino.value.push({ uc: unidade.uc, nome: unidade.nome, mediaConsumo: media, saldoEnergia: saldoOk ? 'True' : 'False' });
        } else {
          unidade.mediaConsumo = 0;
          destino.value.push({ uc: unidade.uc, nome: unidade.nome, mediaConsumo: 0, saldoEnergia: 'False' });
        }
      }
      destino.value.sort((a,b) => b.mediaConsumo - a.mediaConsumo);
    };

    calcularParaGrupo(prediosRateio.value,    unidadesComMediaConsumoPredios);
    calcularParaGrupo(iluminacaoRateio.value, unidadesComMediaConsumoIluminacao);
  };

  const somaPredios    = ref(0);
  const somaIluminacao = ref(0);

  const somarMediaConsumoGrupos = () => {
    somaPredios.value    = parseFloat(unidadesComMediaConsumoPredios.value.reduce((t,i) => t + parseFloat(i.mediaConsumo||0), 0).toFixed(2));
    somaIluminacao.value = parseFloat(unidadesComMediaConsumoIluminacao.value.reduce((t,i) => t + parseFloat(i.mediaConsumo||0), 0).toFixed(2));
  };

  // ── lógica de rateio corrigida ────────────────────────────────
  // Distribui o crédito pela ordem de maior consumo.
  // Se sobrar crédito após a primeira rodada, redistribui em fatias
  // de até 500 kWh para cada unidade, repetindo até zerar o saldo.
  const calcularRateioGrupo = (unidadesInput, creditoDisponivel, creditoBasePercentual = null) => {
    const basePercentual = creditoBasePercentual ?? creditoDisponivel;
    const unidadesValidas = unidadesInput
      .filter(u => u.mediaConsumo > 200)
      .sort((a, b) => b.mediaConsumo - a.mediaConsumo);

    // mapa de injetado acumulado por UC
    const injetadoMap = {};
    unidadesValidas.forEach(u => { injetadoMap[u.uc] = 0; });

    let saldo = creditoDisponivel;

    // --- 1ª passagem: preenche até o consumo médio ---
    for (const u of unidadesValidas) {
      if (saldo <= 0) break;
      const injetar = Math.min(u.mediaConsumo, saldo);
      injetadoMap[u.uc] += injetar;
      saldo -= injetar;
    }

    // --- 2ª+ passagens: redistribui sobra em fatias de 500 kWh ---
    const FATIAMENTO = 500;
    let iteracoes = 0;
    while (saldo > 0.01 && iteracoes < 200) {
      iteracoes++;
      let distribuiuAlgo = false;
      for (const u of unidadesValidas) {
        if (saldo <= 0.01) break;
        const fatia = Math.min(FATIAMENTO, saldo);
        injetadoMap[u.uc] += fatia;
        saldo -= fatia;
        distribuiuAlgo = true;
      }
      if (!distribuiuAlgo) break;
    }

    // monta resultado final
    let acumulado = 0;
    const resultado = [];
    for (const u of unidadesValidas) {
      const injetado = parseFloat(injetadoMap[u.uc].toFixed(2));
      if (injetado === 0) continue;
      acumulado += injetado;
      resultado.push({
        uc: u.uc,
        nome: u.nome,
        mediaConsumo: parseFloat(u.mediaConsumo),
        injetado,
        '%': ((injetado / basePercentual) * 100).toFixed(2),
        creditoRestante: parseFloat((creditoDisponivel - acumulado).toFixed(2)),
      });
    }

    // unidades não contempladas = todas as válidas que não entraram no resultado
    // (crédito acabou antes ou mediaConsumo ≤ 200)
    const ucsNoResultado = new Set(resultado.map(r => r.uc));
    const naoContempladas = unidadesInput.filter(u => !ucsNoResultado.has(u.uc));
    return { resultado, naoContempladas };
  };

  // ── arrays de resultado ───────────────────────────────────────
  const unidadesRateioPredios     = ref([]);
  const unidadesRateioIluminacao  = ref([]);
  const unidadesRateioRestantes   = ref([]);
  const unidadesListaDeRateioJac1 = ref([]);

  const calcularRateioPredios = (credito) => {
    const { resultado, naoContempladas } = calcularRateioGrupo(
      unidadesComMediaConsumoPredios.value, credito
    );
    unidadesRateioPredios.value = resultado;
    return naoContempladas;
  };

  const calcularRateioIluminacao = (creditoJac1) => {
    // 50 % do Jac1 para iluminação, base percentual = total Jac1
    const { resultado } = calcularRateioGrupo(
      unidadesComMediaConsumoIluminacao.value,
      parseFloat((creditoJac1 * 0.5).toFixed(2)),
      parseFloat(creditoJac1)
    );
    unidadesRateioIluminacao.value = resultado;
  };

  const calcularRateioRestantes = (arrayRestantes, creditoJac1) => {
    // outros 50 % do Jac1 para prédios restantes
    const { resultado } = calcularRateioGrupo(
      arrayRestantes,
      parseFloat((creditoJac1 * 0.5).toFixed(2)),
      parseFloat(creditoJac1)
    );
    unidadesRateioRestantes.value = resultado;
  };

  const mostrarBotaoCalcular = computed(() => somaPredios.value !== 0 && !mostrarBotaoDownload.value);
  const mostrarBotaoDownload  = ref(false);

  const executarCalculoRateios = () => {
    const restantes = calcularRateioPredios(Number(creditoParaInjecao.value));
    calcularRateioIluminacao(Number(creditoParaInjecaoJac1.value));
    calcularRateioRestantes(restantes, Number(creditoParaInjecaoJac1.value));
    unidadesListaDeRateioJac1.value = [
      ...unidadesRateioIluminacao.value,
      ...unidadesRateioRestantes.value,
    ];
    mostrarBotaoDownload.value = true;
  };

  // ── download XLSX ─────────────────────────────────────────────
  import * as XLSX from 'xlsx';

  const baixarPlanilhas = () => {
    const exportarXLSX = (dados, nome) => {
      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rateio');
      XLSX.writeFile(wb, `${nome}.xlsx`);
    };
    exportarXLSX(unidadesListaDeRateioJac1.value, 'Rateio_Iluminacao_Restantes');
    exportarXLSX(unidadesRateioPredios.value,     'Rateio_Predios');
  };

  // ── progresso de atualização de API ──────────────────────────
  const progresso  = ref(0);
  const carregando = ref(false);
  const totalRegistros = ref(0);

  const atualizarDataFimNaAPI = async (dados) => {
    const dataFim = new Date();
    dataFim.setMonth(dataFim.getMonth() + 1);
    const dataFimFormatada = dataFim.toISOString().split('T')[0];
    carregando.value = true; totalRegistros.value = dados.length; progresso.value = 0;
    for (let i = 0; i < dados.length; i++) {
      await useFetch(`${API_BASE_URL}/porcentagem/${dados[i].id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...dados[i], data_fim: dataFimFormatada }),
        headers: { 'Content-Type': 'application/json' },
      });
      progresso.value = Math.round(((i+1)/dados.length)*100);
    }
    carregando.value = false;
  };

  // ── onMounted ─────────────────────────────────────────────────
  onMounted(async () => {
    await fetchData();
    buscarConsumoMedioUsinas();
    await calcularProjecaoTotalUsinas();
    calcularValoresFinais();
    await calcularMediaConsumo();
    somarMediaConsumoGrupos();
  });

  // ── helpers de formatação ─────────────────────────────────────
  const fmtNum = (v) => Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
</script>

<template>
  <div class="lr-root">

    <!-- ══════════════════════════════════════
         HEADER
    ══════════════════════════════════════ -->
    <div class="lr-header">
      <div class="lr-header-left">
        <div class="lr-header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </div>
        <div>
          <nav class="lr-breadcrumb">
            <a href="/">Início</a><span>›</span>
            <a href="/">Gerenciamento</a><span>›</span>
            <span>Lista de Rateio</span>
          </nav>
          <h1 class="lr-title">Lista de Rateio</h1>
          <p class="lr-sub">Configuração e cálculo do rateio de energia compensada · {{ anoAtual }}</p>
        </div>
      </div>
      <img src="https://i.imgur.com/QYFVuX6.png" class="lr-header-img" alt="">
    </div>

    <!-- ══════════════════════════════════════
         CARDS KPI TOPO
    ══════════════════════════════════════ -->
    <div class="lr-kpi-row">
      <div class="lr-kpi lr-kpi-indigo">
        <div class="lr-kpi-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <span class="lr-kpi-label">Prédios para Rateio</span>
        <span class="lr-kpi-val">{{ prediosRateio.length }}</span>
        <span class="lr-kpi-note">unidades ativas</span>
        <div class="lr-kpi-bottom"></div>
      </div>

      <div class="lr-kpi lr-kpi-amber">
        <div class="lr-kpi-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          </svg>
        </div>
        <span class="lr-kpi-label">IP para Rateio</span>
        <span class="lr-kpi-val">{{ iluminacaoRateio.length }}</span>
        <span class="lr-kpi-note">iluminação pública</span>
        <div class="lr-kpi-bottom"></div>
      </div>

      <div class="lr-kpi lr-kpi-green">
        <div class="lr-kpi-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <span class="lr-kpi-label">Crédito p/ Injeção</span>
        <span class="lr-kpi-val">{{ fmtNum(creditoParaInjecao) }}</span>
        <span class="lr-kpi-note">kWh/mês · 17 usinas</span>
        <div class="lr-kpi-bottom"></div>
      </div>

      <div class="lr-kpi lr-kpi-violet">
        <div class="lr-kpi-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
        </div>
        <span class="lr-kpi-label">Crédito Jac1</span>
        <span class="lr-kpi-val">{{ fmtNum(creditoParaInjecaoJac1) }}</span>
        <span class="lr-kpi-note">kWh/mês · centro eventos</span>
        <div class="lr-kpi-bottom"></div>
      </div>
    </div>

    <!-- ══════════════════════════════════════
         PAINÉIS DE DADOS
    ══════════════════════════════════════ -->

    <!-- Seção 1 — Consumo das Unidades -->
    <div class="lr-section">
      <div class="lr-section-header lr-sh-green">
        <div class="lr-sh-num">01</div>
        <div>
          <h3 class="lr-sh-title">Consumo das Unidades</h3>
          <p class="lr-sh-sub">Média mensal de consumo dos grupos Prédios e Iluminação Pública</p>
        </div>
      </div>
      <div class="lr-data-grid lr-data-2">
        <div class="lr-data-card lr-dc-indigo">
          <span class="lr-dc-label">Consumo Prédios</span>
          <span class="lr-dc-val">{{ fmtNum(somaPredios) }}</span>
          <span class="lr-dc-unit">kWh / Mensal</span>
        </div>
        <div class="lr-data-card lr-dc-amber">
          <span class="lr-dc-label">Consumo Iluminação</span>
          <span class="lr-dc-val">{{ fmtNum(somaIluminacao) }}</span>
          <span class="lr-dc-unit">kWh / Mensal</span>
        </div>
      </div>
    </div>

    <!-- Seção 2 — 17 Usinas + Paço Municipal -->
    <div class="lr-section">
      <div class="lr-section-header lr-sh-indigo">
        <div class="lr-sh-num" style="background:#4F46E5">02</div>
        <div>
          <h3 class="lr-sh-title">17 Usinas + Paço Municipal</h3>
          <p class="lr-sh-sub">Projeção anual, autoconsumo e créditos disponíveis para injeção</p>
        </div>
      </div>
      <div class="lr-data-grid lr-data-4">
        <div class="lr-data-card lr-dc-slate">
          <span class="lr-dc-label">Consumo Usinas</span>
          <span class="lr-dc-val">{{ fmtNum(consumoMedioUsinas) }}</span>
          <span class="lr-dc-unit">kWh / Ano</span>
        </div>
        <div class="lr-data-card lr-dc-indigo">
          <span class="lr-dc-label">Geração Usinas</span>
          <span class="lr-dc-val">{{ fmtNum(totalProjetado) }}</span>
          <span class="lr-dc-unit">kWh / Ano</span>
        </div>
        <div class="lr-data-card lr-dc-green">
          <span class="lr-dc-label">Pós AutoConsumo</span>
          <span class="lr-dc-val">{{ fmtNum(calculoPosAutoConsumo) }}</span>
          <span class="lr-dc-unit">kWh / Ano</span>
        </div>
        <div class="lr-data-card lr-dc-violet">
          <span class="lr-dc-label">Créditos p/ Injeção</span>
          <span class="lr-dc-val">{{ fmtNum(creditoParaInjecao) }}</span>
          <span class="lr-dc-unit">kWh / Mensal</span>
        </div>
      </div>
    </div>

    <!-- Seção 3 — JAC1 -->
    <div class="lr-section">
      <div class="lr-section-header lr-sh-amber">
        <div class="lr-sh-num" style="background:#D97706">03</div>
        <div>
          <h3 class="lr-sh-title">Centro de Eventos JAC1</h3>
          <p class="lr-sh-sub">Créditos da usina JAC1 divididos 50% Iluminação / 50% Prédios restantes</p>
        </div>
      </div>
      <div class="lr-data-grid lr-data-3">
        <div class="lr-data-card lr-dc-amber">
          <span class="lr-dc-label">Geração Usina JAC1</span>
          <span class="lr-dc-val">{{ fmtNum(totalProjetadoJac1) }}</span>
          <span class="lr-dc-unit">kWh / Ano</span>
        </div>
        <div class="lr-data-card lr-dc-green">
          <span class="lr-dc-label">Crédito Total Mensal</span>
          <span class="lr-dc-val">{{ fmtNum(creditoParaInjecaoJac1) }}</span>
          <span class="lr-dc-unit">kWh / Mensal</span>
        </div>
        <div class="lr-data-card lr-dc-slate">
          <span class="lr-dc-label">50% por grupo</span>
          <span class="lr-dc-val">{{ fmtNum(creditoParaInjecaoJac1 / 2) }}</span>
          <span class="lr-dc-unit">kWh / Mensal</span>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════
         BOTÕES DE AÇÃO
    ══════════════════════════════════════ -->
    <div class="lr-actions">
      <button v-if="mostrarBotaoCalcular" class="lr-btn-calc" @click="executarCalculoRateios">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Calcular Rateios
      </button>

      <div v-if="mostrarBotaoDownload" class="lr-result-actions">
        <div class="lr-result-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Rateio calculado com sucesso
        </div>
        <button class="lr-btn-download" @click="baixarPlanilhas">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Baixar Arquivos XLSX
        </button>
        <button class="lr-btn-recalc" @click="mostrarBotaoDownload=false; executarCalculoRateios()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
          Recalcular
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════
         TABELAS DE RESULTADO
    ══════════════════════════════════════ -->
    <div v-if="mostrarBotaoDownload" class="lr-results">

      <!-- Prédios -->
      <div class="lr-result-section">
        <div class="lr-result-header lr-rh-indigo">
          <div class="lr-rh-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <span class="lr-rh-title">Rateio — Prédios</span>
            <span class="lr-rh-count">{{ unidadesRateioPredios.length }} unidades</span>
          </div>
          <div class="lr-rh-total">
            Total injetado: <strong>{{ fmtNum(unidadesRateioPredios.reduce((a,i)=>a+i.injetado,0)) }} kWh</strong>
          </div>
        </div>
        <div class="lr-tbl-wrap">
          <table class="lr-table">
            <thead class="lr-thead-indigo">
              <tr>
                <th class="lr-th">UC</th>
                <th class="lr-th">Nome</th>
                <th class="lr-th lr-th-r">Média kWh</th>
                <th class="lr-th lr-th-r">Injetado kWh</th>
                <th class="lr-th lr-th-r">%</th>
                <th class="lr-th lr-th-r">Saldo Rest.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(u, i) in unidadesRateioPredios" :key="u.uc" class="lr-tr" :class="{'lr-tr-alt': i%2===1}">
                <td class="lr-td lr-mono">{{ u.uc }}</td>
                <td class="lr-td lr-td-nome">{{ u.nome }}</td>
                <td class="lr-td lr-td-r">{{ fmtNum(u.mediaConsumo) }}</td>
                <td class="lr-td lr-td-r lr-td-green">{{ fmtNum(u.injetado) }}</td>
                <td class="lr-td lr-td-r">
                  <span class="lr-pct-pill">{{ u['%'] }}%</span>
                </td>
                <td class="lr-td lr-td-r lr-td-slate">{{ fmtNum(u.creditoRestante) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Iluminação + Restantes -->
      <div class="lr-result-section">
        <div class="lr-result-header lr-rh-amber">
          <div class="lr-rh-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            </svg>
          </div>
          <div>
            <span class="lr-rh-title">Rateio JAC1 — Iluminação + Restantes</span>
            <span class="lr-rh-count">{{ unidadesListaDeRateioJac1.length }} unidades</span>
          </div>
          <div class="lr-rh-total">
            Total injetado: <strong>{{ fmtNum(unidadesListaDeRateioJac1.reduce((a,i)=>a+i.injetado,0)) }} kWh</strong>
          </div>
        </div>
        <div class="lr-tbl-wrap">
          <table class="lr-table">
            <thead class="lr-thead-amber">
              <tr>
                <th class="lr-th">UC</th>
                <th class="lr-th">Nome</th>
                <th class="lr-th lr-th-r">Média kWh</th>
                <th class="lr-th lr-th-r">Injetado kWh</th>
                <th class="lr-th lr-th-r">%</th>
                <th class="lr-th lr-th-r">Saldo Rest.</th>
              </tr>
            </thead>
            <tbody>

              <!-- ── Grupo: Iluminação Pública ── -->
              <tr class="lr-group-row">
                <td colspan="6" class="lr-group-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  </svg>
                  Iluminação Pública
                  <span class="lr-group-count">{{ unidadesRateioIluminacao.length }} unidades</span>
                  <span class="lr-group-total">{{ fmtNum(unidadesRateioIluminacao.reduce((a,i)=>a+i.injetado,0)) }} kWh</span>
                </td>
              </tr>
              <tr v-for="(u, i) in unidadesRateioIluminacao" :key="'il-'+u.uc" class="lr-tr" :class="{'lr-tr-alt': i%2===1}">
                <td class="lr-td lr-mono">{{ u.uc }}</td>
                <td class="lr-td lr-td-nome">{{ u.nome }}</td>
                <td class="lr-td lr-td-r">{{ fmtNum(u.mediaConsumo) }}</td>
                <td class="lr-td lr-td-r lr-td-amber">{{ fmtNum(u.injetado) }}</td>
                <td class="lr-td lr-td-r"><span class="lr-pct-pill lr-pct-amber">{{ u['%'] }}%</span></td>
                <td class="lr-td lr-td-r lr-td-slate">{{ fmtNum(u.creditoRestante) }}</td>
              </tr>

              <!-- ── Grupo: Prédios Restantes ── -->
              <tr class="lr-group-row">
                <td colspan="6" class="lr-group-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Prédios Restantes
                  <span class="lr-group-count">{{ unidadesRateioRestantes.length }} unidades</span>
                  <span class="lr-group-total">{{ fmtNum(unidadesRateioRestantes.reduce((a,i)=>a+i.injetado,0)) }} kWh</span>
                </td>
              </tr>
              <tr v-for="(u, i) in unidadesRateioRestantes" :key="'re-'+u.uc" class="lr-tr" :class="{'lr-tr-alt': i%2===1}">
                <td class="lr-td lr-mono">{{ u.uc }}</td>
                <td class="lr-td lr-td-nome">{{ u.nome }}</td>
                <td class="lr-td lr-td-r">{{ fmtNum(u.mediaConsumo) }}</td>
                <td class="lr-td lr-td-r lr-td-amber">{{ fmtNum(u.injetado) }}</td>
                <td class="lr-td lr-td-r"><span class="lr-pct-pill lr-pct-amber">{{ u['%'] }}%</span></td>
                <td class="lr-td lr-td-r lr-td-slate">{{ fmtNum(u.creditoRestante) }}</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Rodapé -->
    <div class="lr-footer">
      Desenvolvido por <strong>AleTechLab</strong> · Sistema LUCENTIS — Hortolândia · {{ anoAtual }}
    </div>

  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

/* ══════ ROOT ══════ */
.lr-root {
  min-height: 100vh !important;
  background: #F0FDF9 !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  color: #0f172a !important;
  padding-bottom: 40px !important;
}

/* ══════ HEADER ══════ */
.lr-header {
  background: linear-gradient(135deg, #ECFDF5 0%, #EEF2FF 100%) !important;
  border-bottom: 1px solid #E2E8F0 !important;
  padding: 24px 28px 20px !important;
  margin-bottom: 28px !important;
  display: flex !important; align-items: center !important;
  justify-content: space-between !important; overflow: hidden !important;
}
.lr-header-left { display: flex !important; align-items: center !important; gap: 16px !important; }
.lr-header-icon {
  width: 48px !important; height: 48px !important; border-radius: 13px !important;
  background: #059669 !important; color: #fff !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  box-shadow: 0 4px 14px rgba(5,150,105,.3) !important; flex-shrink: 0 !important;
}
.lr-breadcrumb {
  display: flex !important; align-items: center !important; gap: 5px !important;
  font-size: 11px !important; color: #94A3B8 !important; margin-bottom: 3px !important;
}
.lr-breadcrumb a { color: #059669 !important; text-decoration: none !important; font-weight: 600 !important; }
.lr-title { font-size: 26px !important; font-weight: 900 !important; letter-spacing: -.03em !important; color: #0f172a !important; margin: 0 0 3px !important; }
.lr-sub   { font-size: 13px !important; color: #64748b !important; margin: 0 !important; }
.lr-header-img { height: 110px !important; opacity: .85 !important; }

/* ══════ KPI ROW ══════ */
.lr-kpi-row {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 12px !important;
  padding: 0 28px 28px !important;
}
.lr-kpi {
  background: #fff !important; border: 1px solid #f1f5f9 !important;
  border-radius: 14px !important; padding: 16px 14px 14px !important;
  position: relative !important; overflow: hidden !important;
  display: flex !important; flex-direction: column !important;
  transition: transform .18s, box-shadow .18s !important;
}
.lr-kpi:hover { transform: translateY(-3px) !important; box-shadow: 0 8px 24px rgba(0,0,0,.08) !important; }
.lr-kpi::before { content:'' !important; position:absolute !important; top:0 !important; left:0 !important; right:0 !important; height:2px !important; }
.lr-kpi-indigo::before { background:#4F46E5 !important; }
.lr-kpi-amber::before  { background:#D97706 !important; }
.lr-kpi-green::before  { background:#059669 !important; }
.lr-kpi-violet::before { background:#7C3AED !important; }

.lr-kpi-badge {
  position: absolute !important; top:13px !important; right:13px !important;
  width:28px !important; height:28px !important; border-radius:8px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
}
.lr-kpi-indigo .lr-kpi-badge { background:#EEF2FF !important; color:#4F46E5 !important; }
.lr-kpi-amber  .lr-kpi-badge { background:#FFFBEB !important; color:#D97706 !important; }
.lr-kpi-green  .lr-kpi-badge { background:#ECFDF5 !important; color:#059669 !important; }
.lr-kpi-violet .lr-kpi-badge { background:#F5F3FF !important; color:#7C3AED !important; }
.lr-kpi-badge svg { stroke: currentColor !important; }

.lr-kpi-label { font-size:10px !important; font-weight:700 !important; letter-spacing:.12em !important; text-transform:uppercase !important; color:#94A3B8 !important; display:block !important; margin-bottom:8px !important; margin-top:2px !important; }
.lr-kpi-val   { font-size:26px !important; font-weight:900 !important; letter-spacing:-.03em !important; line-height:1 !important; display:block !important; margin-bottom:4px !important; }
.lr-kpi-note  { font-size:11px !important; color:#94A3B8 !important; font-weight:500 !important; display:block !important; }
.lr-kpi-indigo .lr-kpi-val { color:#4F46E5 !important; }
.lr-kpi-amber  .lr-kpi-val { color:#D97706 !important; }
.lr-kpi-green  .lr-kpi-val { color:#059669 !important; }
.lr-kpi-violet .lr-kpi-val { color:#7C3AED !important; }
.lr-kpi-bottom { position:absolute !important; bottom:0 !important; left:0 !important; right:0 !important; height:36px !important; opacity:.04 !important; }
.lr-kpi-indigo .lr-kpi-bottom { background:#4F46E5 !important; }
.lr-kpi-amber  .lr-kpi-bottom { background:#D97706 !important; }
.lr-kpi-green  .lr-kpi-bottom { background:#059669 !important; }
.lr-kpi-violet .lr-kpi-bottom { background:#7C3AED !important; }

/* ══════ SECTIONS ══════ */
.lr-section { margin: 0 28px 20px !important; }
.lr-section-header {
  display: flex !important; align-items: center !important; gap: 14px !important;
  padding: 14px 18px !important; border-radius: 12px !important;
  margin-bottom: 14px !important;
}
.lr-sh-green  { background: #ECFDF5 !important; border-left: 4px solid #059669 !important; }
.lr-sh-indigo { background: #EEF2FF !important; border-left: 4px solid #4F46E5 !important; }
.lr-sh-amber  { background: #FFFBEB !important; border-left: 4px solid #D97706 !important; }
.lr-sh-num {
  width: 32px !important; height: 32px !important; border-radius: 9px !important;
  background: #059669 !important; color: #fff !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  font-size: 13px !important; font-weight: 900 !important; flex-shrink: 0 !important;
}
.lr-sh-title { font-size: 15px !important; font-weight: 800 !important; color: #0f172a !important; margin: 0 0 2px !important; display: block !important; }
.lr-sh-sub   { font-size: 12px !important; color: #64748b !important; margin: 0 !important; }

/* data cards grid */
.lr-data-grid { display: grid !important; gap: 10px !important; }
.lr-data-2 { grid-template-columns: 1fr 1fr !important; }
.lr-data-3 { grid-template-columns: repeat(3, 1fr) !important; }
.lr-data-4 { grid-template-columns: repeat(4, 1fr) !important; }

.lr-data-card {
  background: #fff !important; border: 1px solid #E2E8F0 !important;
  border-radius: 12px !important; padding: 16px 18px !important;
  display: flex !important; flex-direction: column !important; gap: 4px !important;
  position: relative !important;
}
.lr-data-card::before { content:'' !important; position:absolute !important; top:0 !important; left:0 !important; right:0 !important; height:2px !important; border-radius:12px 12px 0 0 !important; }
.lr-dc-indigo::before { background:#4F46E5 !important; }
.lr-dc-amber::before  { background:#D97706 !important; }
.lr-dc-green::before  { background:#059669 !important; }
.lr-dc-violet::before { background:#7C3AED !important; }
.lr-dc-slate::before  { background:#64748B !important; }

.lr-dc-label { font-size:10px !important; font-weight:700 !important; letter-spacing:.1em !important; text-transform:uppercase !important; color:#94A3B8 !important; }
.lr-dc-val   { font-size:22px !important; font-weight:900 !important; letter-spacing:-.03em !important; color:#0f172a !important; line-height:1 !important; }
.lr-dc-unit  { font-size:11px !important; color:#94A3B8 !important; }
.lr-dc-indigo .lr-dc-val { color:#4F46E5 !important; }
.lr-dc-amber  .lr-dc-val { color:#D97706 !important; }
.lr-dc-green  .lr-dc-val { color:#059669 !important; }
.lr-dc-violet .lr-dc-val { color:#7C3AED !important; }

/* ══════ AÇÕES ══════ */
.lr-actions {
  display: flex !important; justify-content: center !important;
  padding: 8px 28px 28px !important;
}
.lr-btn-calc {
  display: flex !important; align-items: center !important; gap: 8px !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 14px !important; font-weight: 800 !important;
  background: #4F46E5 !important; color: #fff !important;
  border: none !important; border-radius: 12px !important; padding: 13px 32px !important;
  cursor: pointer !important; box-shadow: 0 4px 16px rgba(79,70,229,.35) !important;
  transition: all .16s !important;
}
.lr-btn-calc:hover { background: #4338CA !important; transform: translateY(-1px) !important; }
.lr-btn-calc svg { stroke: #fff !important; }

.lr-result-actions { display: flex !important; align-items: center !important; gap: 12px !important; flex-wrap: wrap !important; justify-content: center !important; }
.lr-result-badge {
  display: flex !important; align-items: center !important; gap: 7px !important;
  background: #ECFDF5 !important; border: 1px solid #A7F3D0 !important;
  border-radius: 20px !important; padding: 8px 16px !important;
  font-size: 13px !important; font-weight: 700 !important; color: #047857 !important;
}
.lr-result-badge svg { stroke: #059669 !important; }
.lr-btn-download {
  display: flex !important; align-items: center !important; gap: 7px !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 13px !important; font-weight: 800 !important;
  background: #059669 !important; color: #fff !important;
  border: none !important; border-radius: 11px !important; padding: 11px 24px !important;
  cursor: pointer !important; box-shadow: 0 3px 12px rgba(5,150,105,.35) !important;
  transition: all .15s !important;
}
.lr-btn-download:hover { background: #047857 !important; }
.lr-btn-download svg { stroke: #fff !important; }
.lr-btn-recalc {
  display: flex !important; align-items: center !important; gap: 6px !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 12px !important; font-weight: 700 !important;
  background: #fff !important; color: #4F46E5 !important;
  border: 1.5px solid #C7D2FE !important; border-radius: 11px !important; padding: 10px 18px !important;
  cursor: pointer !important; transition: all .15s !important;
}
.lr-btn-recalc:hover { background: #EEF2FF !important; }
.lr-btn-recalc svg { stroke: #4F46E5 !important; }

/* ══════ TABELAS DE RESULTADO ══════ */
.lr-results { padding: 0 28px !important; display: flex !important; flex-direction: column !important; gap: 24px !important; }

.lr-result-section { background: #fff !important; border: 1px solid #E2E8F0 !important; border-radius: 16px !important; overflow: hidden !important; box-shadow: 0 1px 6px rgba(0,0,0,.05) !important; }

.lr-result-header {
  display: flex !important; align-items: center !important; gap: 12px !important;
  padding: 16px 20px !important; border-bottom: 1px solid #F1F5F9 !important; flex-wrap: wrap !important;
}
.lr-rh-indigo { background: linear-gradient(90deg,#EEF2FF,#fff) !important; border-left: 4px solid #4F46E5 !important; }
.lr-rh-amber  { background: linear-gradient(90deg,#FFFBEB,#fff) !important; border-left: 4px solid #D97706 !important; }
.lr-rh-icon {
  width: 34px !important; height: 34px !important; border-radius: 9px !important;
  display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;
}
.lr-rh-indigo .lr-rh-icon { background: #EEF2FF !important; color: #4F46E5 !important; }
.lr-rh-amber  .lr-rh-icon { background: #FFFBEB !important; color: #D97706 !important; }
.lr-rh-icon svg { stroke: currentColor !important; }
.lr-rh-title { font-size: 14px !important; font-weight: 800 !important; color: #0f172a !important; display: block !important; }
.lr-rh-count { font-size: 11px !important; color: #94A3B8 !important; font-weight: 500 !important; }
.lr-rh-total { margin-left: auto !important; font-size: 12px !important; color: #475569 !important; font-weight: 600 !important; }
.lr-rh-total strong { color: #059669 !important; font-weight: 800 !important; }

.lr-tbl-wrap { overflow-x: auto !important; }
.lr-table { width: 100% !important; border-collapse: collapse !important; font-size: 12px !important; font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important; }
.lr-thead-indigo th { background: #4F46E5 !important; color: #fff !important; }
.lr-thead-amber  th { background: #D97706 !important; color: #fff !important; }
.lr-th { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .07em !important; text-transform: uppercase !important; padding: 10px 14px !important; text-align: left !important; white-space: nowrap !important; border: none !important; }
.lr-th-r { text-align: right !important; }
.lr-tr td { border-bottom: 1px solid #F1F5F9 !important; }
.lr-tr:hover td { background: #F8FAFC !important; }
.lr-tr-alt td { background: #FAFBFF !important; }
.lr-td { padding: 9px 14px !important; color: #0f172a !important; vertical-align: middle !important; }
.lr-td-r { text-align: right !important; font-weight: 700 !important; font-family: 'DM Mono', monospace !important; }
.lr-td-nome { font-weight: 600 !important; max-width: 260px !important; }
.lr-td-green { color: #059669 !important; }
.lr-td-amber { color: #D97706 !important; }
.lr-td-slate { color: #94A3B8 !important; }
.lr-mono { font-family: 'DM Mono', monospace !important; font-size: 11px !important; color: #64748b !important; }

.lr-pct-pill {
  display: inline-block !important; background: #EEF2FF !important; color: #4F46E5 !important;
  font-size: 10px !important; font-weight: 800 !important;
  padding: 2px 8px !important; border-radius: 20px !important;
}
.lr-pct-amber { background: #FFFBEB !important; color: #D97706 !important; }

/* ══════ GROUP ROWS NA TABELA ══════ */
.lr-group-row { background: #F8FAFC !important; }
.lr-group-label {
  padding: 8px 14px !important;
  font-size: 11px !important; font-weight: 800 !important;
  color: #475569 !important; letter-spacing: .04em !important;
  text-transform: uppercase !important;
  display: flex !important; align-items: center !important; gap: 8px !important;
  border-top: 2px solid #E2E8F0 !important;
  border-bottom: 1px solid #E2E8F0 !important;
}
.lr-group-label svg { stroke: #D97706 !important; flex-shrink: 0 !important; }
.lr-group-count {
  background: #EEF2FF !important; color: #4F46E5 !important;
  font-size: 10px !important; font-weight: 800 !important;
  padding: 2px 8px !important; border-radius: 20px !important;
  margin-left: 4px !important;
}
.lr-group-total {
  background: #ECFDF5 !important; color: #047857 !important;
  font-size: 10px !important; font-weight: 800 !important;
  padding: 2px 8px !important; border-radius: 20px !important;
  font-family: 'DM Mono', monospace !important;
}

/* ══════ FOOTER ══════ */
.lr-footer {
  text-align: center !important; padding: 24px 28px 0 !important;
  font-size: 12px !important; color: #94A3B8 !important;
}
.lr-footer strong { color: #059669 !important; font-weight: 700 !important; }

/* ══════ MOBILE ══════ */
@media (max-width: 900px) {
  .lr-kpi-row { grid-template-columns: 1fr 1fr !important; }
  .lr-data-4  { grid-template-columns: 1fr 1fr !important; }
  .lr-data-3  { grid-template-columns: 1fr 1fr !important; }
}
@media (max-width: 600px) {
  .lr-header { padding: 16px 20px !important; flex-direction: column !important; align-items: flex-start !important; }
  .lr-header-img { display: none !important; }
  .lr-title  { font-size: 22px !important; }
  .lr-kpi-row, .lr-data-2, .lr-data-3, .lr-data-4 { grid-template-columns: 1fr !important; padding: 0 16px 16px !important; }
  .lr-section, .lr-results, .lr-actions { padding-left: 16px !important; padding-right: 16px !important; }
}

/* ══════ GROUP ROWS ══════ */
.lr-group-row td { padding: 0 !important; }
.lr-group-label {
  display: flex !important; align-items: center !important; gap: 8px !important;
  padding: 9px 14px !important;
  background: #FFFBEB !important;
  border-top: 1px solid #FDE68A !important;
  border-bottom: 1px solid #FDE68A !important;
  font-size: 11px !important; font-weight: 800 !important;
  color: #92400E !important; text-transform: uppercase !important;
  letter-spacing: .08em !important;
}
.lr-group-label svg { stroke: #D97706 !important; flex-shrink: 0 !important; }
.lr-group-count {
  margin-left: 4px !important;
  background: #FEF9C3 !important; color: #92400E !important;
  font-size: 10px !important; font-weight: 700 !important;
  padding: 1px 8px !important; border-radius: 20px !important;
}
.lr-group-total {
  margin-left: auto !important;
  font-size: 12px !important; font-weight: 800 !important; color: #D97706 !important;
  font-family: 'DM Mono', monospace !important;
}

</style>