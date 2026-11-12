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
  // ── estado da tela ────────────────────────────────────────────
  const carregandoDados = ref(true);   // parâmetros ainda sendo buscados/calculados
  const dlgParametros   = ref(false);  // dialog "Verificar parâmetros"

  onMounted(async () => {
    try {
      await fetchData();
      buscarConsumoMedioUsinas();
      await calcularProjecaoTotalUsinas();
      calcularValoresFinais();
      await calcularMediaConsumo();
      somarMediaConsumoGrupos();
    } finally {
      carregandoDados.value = false;
    }
  });

  // ── helpers de formatação ─────────────────────────────────────
  const fmtNum = (v) => Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
</script>

<template>
  <div class="lx-page">
    <!-- Cabeçalho -->
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span><span>Gerenciamento</span><span class="sep">›</span><b>Lista de rateio</b>
        </nav>
        <h1 class="lx-title">Lista de <span class="grad">rateio</span></h1>
        <p class="lx-sub">Cálculo do rateio da energia compensada · projeção {{ anoAtual }}</p>
      </div>
      <div class="lx-head-actions">
        <button class="lx-btn-ghost" :disabled="carregandoDados" @click="dlgParametros = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>
          Verificar parâmetros
        </button>
      </div>
    </header>

    <!-- Créditos + ação -->
    <section class="rt-top">
      <article class="rt-cred" style="--c:var(--teal);--c2:var(--green)">
        <span class="rt-cred-ic">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </span>
        <span class="rt-cred-lb">Crédito para injeção</span>
        <b v-if="!carregandoDados">{{ fmtNum(creditoParaInjecao) }}<small>kWh/mês</small></b>
        <span v-else class="lx-skel rt-cred-skel"></span>
        <small class="rt-cred-nt">17 usinas + Paço Municipal · após autoconsumo</small>
      </article>

      <article class="rt-cred" style="--c:var(--purple);--c2:var(--orange)">
        <span class="rt-cred-ic">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        </span>
        <span class="rt-cred-lb">Crédito JAC1</span>
        <b v-if="!carregandoDados">{{ fmtNum(creditoParaInjecaoJac1) }}<small>kWh/mês</small></b>
        <span v-else class="lx-skel rt-cred-skel"></span>
        <small class="rt-cred-nt">Centro de Eventos · 50% iluminação / 50% prédios restantes</small>
      </article>

      <article class="rt-acao" :class="{ ok: mostrarBotaoDownload }">
        <template v-if="carregandoDados">
          <div class="lx-loading rt-acao-load">
            <span class="lx-spin"></span>
            <b>Carregando parâmetros…</b>
            <span>Usinas, projeções e consumo médio das unidades</span>
          </div>
        </template>
        <template v-else-if="!mostrarBotaoDownload">
          <span class="rt-acao-tt">Pronto para calcular</span>
          <p>{{ prediosRateio.length }} prédios e {{ iluminacaoRateio.length }} pontos de iluminação ativos entram no cálculo.</p>
          <button class="lx-btn rt-acao-btn" style="--c1:var(--teal);--c2:var(--purple)" :disabled="!mostrarBotaoCalcular" @click="executarCalculoRateios">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Calcular rateios
          </button>
          <small v-if="!mostrarBotaoCalcular" class="rt-acao-aviso">Sem consumo médio dos prédios — verifique os parâmetros.</small>
        </template>
        <template v-else>
          <span class="lx-pill" style="--c:var(--green)"><i></i>Rateio calculado</span>
          <p>{{ unidadesRateioPredios.length + unidadesListaDeRateioJac1.length }} unidades contempladas nas duas listas.</p>
          <div class="rt-acao-bts">
            <button class="lx-btn" style="--c1:var(--green);--c2:var(--teal)" @click="baixarPlanilhas">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Baixar planilhas .xlsx
            </button>
            <button class="lx-btn-ghost" @click="mostrarBotaoDownload = false; executarCalculoRateios()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              Recalcular
            </button>
          </div>
        </template>
      </article>
    </section>

    <!-- Resultados -->
    <Transition name="lx-fade">
      <div v-if="mostrarBotaoDownload" class="lx-grid">
        <!-- Prédios -->
        <section class="lx-panel accent" style="--c:var(--teal)">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--teal)">⌂</span>Rateio · Prédios</h3>
              <p>{{ unidadesRateioPredios.length }} unidades · crédito das 17 usinas + Paço</p>
            </div>
            <span class="lx-pill" style="--c:var(--teal)">Total injetado <b class="rt-num">{{ fmtNum(unidadesRateioPredios.reduce((a, i) => a + i.injetado, 0)) }} kWh</b></span>
          </div>
          <div class="lx-tbl-wrap">
            <table class="lx-tbl rt-tbl">
              <thead><tr><th>UC</th><th>Nome</th><th class="r">Média kWh</th><th class="r">Injetado kWh</th><th class="r">%</th><th class="r">Saldo rest.</th></tr></thead>
              <tbody>
                <tr v-for="u in unidadesRateioPredios" :key="u.uc">
                  <td class="lx-mono">{{ u.uc }}</td>
                  <td class="rt-nome">{{ u.nome }}</td>
                  <td class="r rt-num">{{ fmtNum(u.mediaConsumo) }}</td>
                  <td class="r rt-num rt-inj" style="--c:var(--teal)">{{ fmtNum(u.injetado) }}</td>
                  <td class="r"><span class="rt-pct" style="--c:var(--teal)">{{ u['%'] }}%</span></td>
                  <td class="r rt-num rt-mut">{{ fmtNum(u.creditoRestante) }}</td>
                </tr>
                <tr v-if="!unidadesRateioPredios.length"><td colspan="6" class="lx-empty">Nenhuma unidade contemplada.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- JAC1 -->
        <section class="lx-panel accent" style="--c:var(--purple)">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--purple)">☀</span>Rateio JAC1 · Iluminação + restantes</h3>
              <p>{{ unidadesListaDeRateioJac1.length }} unidades · crédito do Centro de Eventos</p>
            </div>
            <span class="lx-pill" style="--c:var(--purple)">Total injetado <b class="rt-num">{{ fmtNum(unidadesListaDeRateioJac1.reduce((a, i) => a + i.injetado, 0)) }} kWh</b></span>
          </div>
          <div class="lx-tbl-wrap">
            <table class="lx-tbl rt-tbl">
              <thead><tr><th>UC</th><th>Nome</th><th class="r">Média kWh</th><th class="r">Injetado kWh</th><th class="r">%</th><th class="r">Saldo rest.</th></tr></thead>
              <tbody>
                <template v-for="g in [
                  { k: 'il', txt: 'Iluminação pública', c: 'var(--orange)', lista: unidadesRateioIluminacao },
                  { k: 're', txt: 'Prédios restantes', c: 'var(--purple)', lista: unidadesRateioRestantes },
                ]" :key="g.k">
                  <tr class="rt-grupo" :style="{ '--c': g.c }">
                    <td colspan="6">
                      <span class="rt-grupo-in">
                        <i></i>{{ g.txt }}
                        <small>{{ g.lista.length }} unidades</small>
                        <b class="rt-num">{{ fmtNum(g.lista.reduce((a, i) => a + i.injetado, 0)) }} kWh</b>
                      </span>
                    </td>
                  </tr>
                  <tr v-for="u in g.lista" :key="g.k + u.uc">
                    <td class="lx-mono">{{ u.uc }}</td>
                    <td class="rt-nome">{{ u.nome }}</td>
                    <td class="r rt-num">{{ fmtNum(u.mediaConsumo) }}</td>
                    <td class="r rt-num rt-inj" :style="{ '--c': g.c }">{{ fmtNum(u.injetado) }}</td>
                    <td class="r"><span class="rt-pct" :style="{ '--c': g.c }">{{ u['%'] }}%</span></td>
                    <td class="r rt-num rt-mut">{{ fmtNum(u.creditoRestante) }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Transition>

    <!-- Parâmetros do cálculo -->
    <LxDialog v-model="dlgParametros" titulo="Parâmetros do rateio" :subtitulo="`Base de cálculo · projeção ${anoAtual}`" icone="⚙" cor="var(--teal)" :largura="860">
      <div class="rt-par">
        <section class="rt-par-sec" style="--c:var(--green)">
          <header><span>01</span><div><b>Unidades e consumo</b><small>Unidades ativas e média mensal (últimos 6 meses)</small></div></header>
          <div class="rt-par-grid">
            <div><span>Prédios p/ rateio</span><b>{{ prediosRateio.length }}</b><small>unidades ativas</small></div>
            <div><span>Iluminação p/ rateio</span><b>{{ iluminacaoRateio.length }}</b><small>IP e praças</small></div>
            <div><span>Consumo prédios</span><b>{{ fmtNum(somaPredios) }}</b><small>kWh/mês</small></div>
            <div><span>Consumo iluminação</span><b>{{ fmtNum(somaIluminacao) }}</b><small>kWh/mês</small></div>
          </div>
        </section>

        <section class="rt-par-sec" style="--c:var(--teal)">
          <header><span>02</span><div><b>17 usinas + Paço Municipal</b><small>Projeção anual, autoconsumo e crédito para injeção</small></div></header>
          <div class="rt-par-grid">
            <div><span>Consumo usinas</span><b>{{ fmtNum(consumoMedioUsinas) }}</b><small>kWh/ano</small></div>
            <div><span>Geração usinas</span><b>{{ fmtNum(totalProjetado) }}</b><small>kWh/ano</small></div>
            <div><span>Pós autoconsumo</span><b>{{ fmtNum(calculoPosAutoConsumo) }}</b><small>kWh/ano</small></div>
            <div class="dest"><span>Crédito p/ injeção</span><b>{{ fmtNum(creditoParaInjecao) }}</b><small>kWh/mês</small></div>
          </div>
        </section>

        <section class="rt-par-sec" style="--c:var(--purple)">
          <header><span>03</span><div><b>Centro de Eventos JAC1</b><small>Dividido 50% iluminação / 50% prédios restantes</small></div></header>
          <div class="rt-par-grid">
            <div><span>Geração JAC1</span><b>{{ fmtNum(totalProjetadoJac1) }}</b><small>kWh/ano</small></div>
            <div class="dest"><span>Crédito total</span><b>{{ fmtNum(creditoParaInjecaoJac1) }}</b><small>kWh/mês</small></div>
            <div><span>50% por grupo</span><b>{{ fmtNum(creditoParaInjecaoJac1 / 2) }}</b><small>kWh/mês</small></div>
          </div>
        </section>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dlgParametros = false">Fechar</button>
      </template>
    </LxDialog>
  </div>
</template>

<style scoped>
/* ── Créditos + ação ── */
.rt-top { display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 14px; margin-bottom: 18px; }
.rt-cred {
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 6px; padding: 22px 22px 20px; border-radius: 22px;
  background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--c) 26%, transparent), transparent 60%), var(--card);
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); box-shadow: 0 0 46px -20px var(--c);
}
.rt-cred::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, var(--c), var(--c2)); box-shadow: 0 0 14px var(--c); }
.rt-cred-ic { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), var(--c2)); margin-bottom: 6px; }
.rt-cred-lb { font-size: 12px; color: var(--mut); font-weight: 600; letter-spacing: .03em; text-transform: uppercase; }
.rt-cred b { font-size: clamp(28px, 3.2vw, 38px); font-weight: 700; letter-spacing: -.02em; line-height: 1.05; color: var(--tx); font-variant-numeric: tabular-nums; }
.rt-cred b small { font-size: 13px; font-weight: 500; color: var(--c); margin-left: 6px; letter-spacing: 0; }
.rt-cred-nt { font-size: 11.5px; color: var(--mut); }
.rt-cred-skel { height: 40px; width: 70%; }

.rt-acao {
  display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 10px; padding: 22px; border-radius: 22px;
  background: var(--card); border: 1px dashed var(--line); transition: border-color .3s;
}
.rt-acao.ok { border-style: solid; border-color: rgba(34, 197, 94, .4); }
.rt-acao-tt { font-size: 15px; font-weight: 600; }
.rt-acao p { margin: 0; font-size: 12.5px; color: var(--mut); line-height: 1.5; }
.rt-acao-btn { padding: 12px 22px; font-size: 14px; }
.rt-acao-bts { display: flex; gap: 10px; flex-wrap: wrap; }
.rt-acao-aviso { font-size: 11.5px; color: var(--orange); }
.rt-acao-load { padding: 10px; align-self: stretch; }

/* ── Tabelas ── */
.rt-num { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.rt-nome { font-weight: 500; max-width: 320px; }
.rt-inj { color: var(--c); font-weight: 600; }
.rt-mut { color: var(--mut); }
.rt-pct { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.rt-grupo td { padding: 0; border-bottom: 0; }
.rt-grupo:hover { background: transparent !important; }
.rt-grupo-in {
  display: flex; align-items: center; gap: 10px; margin: 10px 0 4px; padding: 8px 12px; border-radius: 12px;
  font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--c);
  background: color-mix(in srgb, var(--c) 10%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent);
}
.rt-grupo-in i { width: 7px; height: 7px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }
.rt-grupo-in small { color: var(--mut); text-transform: none; letter-spacing: 0; font-weight: 500; }
.rt-grupo-in b { margin-left: auto; letter-spacing: 0; }

/* ── Dialog de parâmetros ── */
.rt-par { display: grid; gap: 14px; }
.rt-par-sec { padding: 14px; border-radius: 16px; background: var(--card2); border: 1px solid var(--line); }
.rt-par-sec header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.rt-par-sec header > span {
  width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; flex: none; font: 600 12px var(--mono);
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
}
.rt-par-sec header b { display: block; font-size: 14px; font-weight: 600; }
.rt-par-sec header small { font-size: 11.5px; color: var(--mut); }
.rt-par-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.rt-par-grid > div { display: flex; flex-direction: column; gap: 3px; padding: 11px 12px; border-radius: 12px; background: rgba(255, 255, 255, .03); border: 1px solid var(--line2); }
.rt-par-grid > div.dest { border-color: color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 8%, transparent); }
.rt-par-grid span { font-size: 11px; color: var(--mut); }
.rt-par-grid b { font: 600 17px var(--mono); color: var(--tx); font-variant-numeric: tabular-nums; }
.rt-par-grid .dest b { color: var(--c); }
.rt-par-grid small { font-size: 10.5px; color: var(--mut); }

@media (max-width: 1100px) { .rt-top { grid-template-columns: 1fr 1fr; } .rt-acao { grid-column: 1 / -1; } }
@media (max-width: 640px) { .rt-top { grid-template-columns: 1fr; } }
</style>
