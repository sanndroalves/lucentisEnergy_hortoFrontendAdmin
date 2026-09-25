// composables/useMapaEnergia.ts
//
// Extraído de pages/mapa/index.vue (v1).
// Antes: ~200 linhas de cálculo (geração, compensação, autossuficiência,
// CO2, consumo por secretaria) misturadas com <script setup> da página.
// Agora: a página só chama useMapaEnergia(...) e usa os retornos.
//
// Regra de negócio preservada 1:1 — nenhuma fórmula foi alterada aqui,
// apenas movida e tipada. Onde algo pareceu um "número mágico" (tarifas,
// UCs especiais hardcoded), documentei com TODO para revisão futura em
// vez de tentar adivinhar a regra.

import { computed, type Ref } from 'vue';
import type {
  Usina,
  UnidadeCompensacao,
  RegistroGeracao,
  RegistroInjecao,
  RegistroCompensacao,
  ReferenciaMes,
  IndicadoresMapa,
} from '~/types/energy';

// TODO(backend): estas tarifas MT/BT deveriam vir de uma tabela versionada
// por data no backend, não hardcoded no frontend — hoje qualquer reajuste
// tarifário exige deploy de código.
const TARIFA_BT = 0.88;
const MT_TARIFAS = { TUSD_ponta: 1.66642019, TE_ponta: 0.5722216, TUSD_forap: 0.14734841, TE_forap: 0.34908095 };
const tarifaMediaMT = () =>
  MT_TARIFAS.TUSD_forap + MT_TARIFAS.TE_forap + (MT_TARIFAS.TUSD_ponta + MT_TARIFAS.TE_ponta) / 2 / 2;

// TODO(backend): IDs 19/20 e as UCs '4000266381'/'37068768' são exceções
// de negócio hardcoded (usinas com regra de faturamento diferente, UCs que
// somam geração própria ao consumo). Preservadas como estavam, mas devem
// virar uma flag no modelo da Usina/Unidade (ex: `regimeFaturamento`)
// para não depender de IDs mágicos no código.
const USINAS_EXCECAO = [19, 20];
const UCS_ESPECIAIS = ['4000266381', '37068768'];

interface FontesDados {
  usinas: Ref<Usina[] | null>;
  unidades: Ref<UnidadeCompensacao[] | null>;
  geracoes: Ref<RegistroGeracao[] | null>;
  injecoes: Ref<RegistroInjecao[] | null>;
  compensa: Ref<RegistroCompensacao[] | null>;
}

export function useMapaEnergia({ usinas, unidades, geracoes, injecoes, compensa }: FontesDados) {
  const listaUsinas = computed(() => usinas.value ?? []);
  const listaUnidades = computed(() => unidades.value ?? []);
  const listaGeracoes = computed(() => geracoes.value ?? []);
  const listaInjecoes = computed(() => injecoes.value ?? []);
  const listaCompensa = computed(() => compensa.value ?? []);

  const contaEducacao = computed(() => listaUsinas.value.filter((u) => u.secretaria === 'E'));
  const contaSaude = computed(() => listaUsinas.value.filter((u) => u.secretaria === 'S'));
  const contaOutros = computed(() => listaUsinas.value.filter((u) => u.secretaria === 'O'));

  const totalGerado = computed(() =>
    listaGeracoes.value.reduce((acc, i) => acc + parseFloat(String(i.geracao)), 0),
  );
  const totalInjetado = computed(() =>
    listaInjecoes.value.reduce((acc, i) => acc + Number(i.injetadoPonta) + Number(i.injetadoFPonta), 0),
  );
  const totalCompensa = computed(() =>
    listaCompensa.value.reduce((acc, i) => acc + parseFloat(String(i.valorInjTUSD)) + parseFloat(String(i.valorInjTE)), 0),
  );

  /** Mês de referência = mês anterior ao atual (padrão de faturamento). */
  const referencia = computed<ReferenciaMes>(() => {
    const hoje = new Date();
    const mes = hoje.getMonth(); // 0-11
    const ano = hoje.getFullYear() - (mes === 0 ? 1 : 0);
    const mesCorrigido = mes === 0 ? 12 : mes;
    return { mes: mesCorrigido, ano };
  });

  const mesReferencia = computed(() => {
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const hoje = new Date();
    const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    return `${meses[anterior.getMonth()]} ${anterior.getFullYear()}`;
  });

  const registrosMes = computed(() =>
    listaCompensa.value.filter((i) => i.mes === referencia.value.mes && i.ano === referencia.value.ano),
  );
  const geracoesMes = computed(() =>
    listaGeracoes.value.filter((i) => i.mes === referencia.value.mes && i.ano === referencia.value.ano),
  );
  const geracaoMes = computed(() => geracoesMes.value.reduce((acc, i) => acc + Number(i.geracao || 0), 0));

  const energiaInjetadaMes = computed(() => {
    const total = listaInjecoes.value
      .filter((i) => i.mes === referencia.value.mes && i.ano === referencia.value.ano)
      .reduce((acc, i) => acc + Number(i.injetadoPonta || 0) + Number(i.injetadoFPonta || 0), 0);
    return Number(total.toFixed(2));
  });

  const consumoMedioUsinas = computed(() => {
    let total = 0;
    listaUsinas.value
      .filter((u) => !USINAS_EXCECAO.includes(u.id))
      .forEach((usina) => {
        const unidade = listaUnidades.value.find((u) => u.uc === usina.uc);
        if (unidade) total += Number(unidade.mediaConsumo || 0);
      });
    return Number(total.toFixed(2));
  });

  const energiaCompensadaPredios = computed(() => {
    const filtrados = registrosMes.value.filter((item) => {
      const unidade = listaUnidades.value.find((u) => u.id === item.idUnidadeCompensa);
      return unidade && ['E', 'S', 'O'].includes(unidade.secretaria);
    });
    return Number(filtrados.reduce((acc, item) => acc + Number(item.enerInjTUSD || 0), 0).toFixed(2));
  });

  const consumoPredios = computed(() => {
    const filtrados = registrosMes.value.filter((item) => {
      const unidade = listaUnidades.value.find((u) => u.id === item.idUnidadeCompensa);
      return unidade && ['E', 'S', 'O'].includes(unidade.secretaria);
    });
    const total = filtrados.reduce((acc, item) => {
      const unidade = listaUnidades.value.find((u) => u.id === item.idUnidadeCompensa);
      const uc = String(unidade?.uc || '');
      const consumo = Number(item.consumokWh || 0);
      if (UCS_ESPECIAIS.includes(uc)) {
        const geracaoUC = geracoesMes.value.find((g) => String(g.uc) === uc);
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

  const somarEconomiaPorMesAno = (ano: number, mes: number) => {
    const dados = listaCompensa.value.filter((item) => item.ano == ano && item.mes == mes);
    return Number(dados.reduce((acc, item) => acc + Number(item.valorInjTUSD || 0) + Number(item.valorInjTE || 0), 0).toFixed(2));
  };

  const calcularCustoAutoconsumoMes = (ano: number, mes: number) => {
    let total = 0;
    listaUsinas.value
      .filter((u) => !USINAS_EXCECAO.includes(u.id))
      .forEach((u) => {
        const gMes = listaGeracoes.value.find((g) => g.idGeradora == u.id && g.ano == ano && g.mes == mes);
        const inj = listaInjecoes.value
          .filter((i) => i.idGeradora == u.id && i.ano == ano && i.mes == mes)
          .reduce((acc, item) => acc + Number(item.injetadoPonta || 0) + Number(item.injetadoFPonta || 0), 0);
        const autoconsumo = Math.max(0, Number(gMes?.geracao || 0) - inj);
        total += autoconsumo * ((u.tensao || '').toUpperCase() !== 'BT' ? tarifaMediaMT() : TARIFA_BT);
      });
    listaUsinas.value
      .filter((u) => USINAS_EXCECAO.includes(u.id))
      .forEach((u) => {
        const gMes = listaGeracoes.value.find((g) => g.idGeradora == u.id && g.ano == ano && g.mes == mes);
        total += Number(gMes?.geracao || 0) * ((u.tensao || '').toUpperCase() !== 'BT' ? tarifaMediaMT() : TARIFA_BT);
      });
    return Number(total.toFixed(2));
  };

  const custoEvitadoTotal = computed(() =>
    Number((somarEconomiaPorMesAno(referencia.value.ano, referencia.value.mes) + calcularCustoAutoconsumoMes(referencia.value.ano, referencia.value.mes)).toFixed(2)),
  );

  const saldoMes = computed(() => registrosMes.value.reduce((acc, i) => acc + Number(i.saldoEnergia ?? 0), 0));

  const totalSaldoJaneiro = computed(() => {
    const hoje = new Date();
    const mesAlvo = hoje.getMonth() + 1 - 3;
    const anoAlvo = hoje.getFullYear() - (mesAlvo <= 0 ? 1 : 0);
    const mesCorrigido = ((mesAlvo + 11) % 12) + 1;
    return listaCompensa.value.reduce(
      (acc, i) => (i.mes === mesCorrigido && i.ano === anoAlvo ? acc + parseFloat(String(i.saldoEnergia)) : acc),
      0,
    );
  });
  const totalCompensaSoma = computed(() => totalCompensa.value + totalSaldoJaneiro.value * 0.72);

  const totalPlacas = computed(() => listaUsinas.value.reduce((acc, i) => acc + parseFloat(String(i.qtdPlaca ?? 0)), 0));

  // TODO(backend): valor de investimento total hardcoded (3 parcelas somadas).
  // Deveria vir de um endpoint de investimento por contrato/lote.
  const totalInvestido = 8_854_468.32 + 8_005_328.88 + 7_021_350.76;

  const totalCarbono = computed(() => totalGerado.value * 0.536);
  const totalCarbonoTon = computed(() => totalCarbono.value / 1000);
  const totalArvorePlantadas = computed(() => Math.round(totalCarbono.value / 150));

  function consumoSecretaria(sigla: string) {
    return registrosMes.value
      .filter((item) => {
        const unidade = listaUnidades.value.find((u) => u.id == item.idUnidadeCompensa);
        return unidade && unidade.secretaria === sigla;
      })
      .reduce((acc, item) => acc + Number(item.consumokWh || 0), 0);
  }
  const consumoEducacao = computed(() => consumoSecretaria('E'));
  const consumoSaude = computed(() => consumoSecretaria('S'));
  const consumoOutros = computed(() => consumoSecretaria('O'));
  const consumoTotal = computed(() => consumoEducacao.value + consumoSaude.value + consumoOutros.value);

  const pctDoConsumo = (valor: number) => {
    if (!consumoTotal.value) return '0%';
    return ((valor / consumoTotal.value) * 100).toFixed(1) + '%';
  };

  /** Snapshot único, útil para logging/telemetria ou para o "Modo Prefeito". */
  const indicadores = computed<IndicadoresMapa>(() => ({
    totalGerado: totalGerado.value,
    totalInjetado: totalInjetado.value,
    totalCompensaSoma: totalCompensaSoma.value,
    totalPlacas: totalPlacas.value,
    totalInvestido,
    totalCarbono: totalCarbono.value,
    totalCarbonoTon: totalCarbonoTon.value,
    totalArvorePlantadas: totalArvorePlantadas.value,
    geracaoMes: geracaoMes.value,
    custoEvitadoTotal: custoEvitadoTotal.value,
    saldoMes: saldoMes.value,
    taxaAutossuficiencia: taxaAutossuficiencia.value,
    consumoPorSecretaria: {
      educacao: consumoEducacao.value,
      saude: consumoSaude.value,
      outros: consumoOutros.value,
    },
    consumoTotal: consumoTotal.value,
  }));

  return {
    contaEducacao, contaSaude, contaOutros,
    mesReferencia, referencia,
    totalGerado, totalInjetado, totalCompensaSoma, totalPlacas, totalInvestido,
    totalCarbono, totalArvorePlantadas,
    geracaoMes, custoEvitadoTotal, saldoMes, taxaAutossuficiencia,
    consumoEducacao, consumoSaude, consumoOutros, consumoTotal, pctDoConsumo,
    indicadores,
  };
}
