<script setup>
import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import * as XLSX from "xlsx";

// Defina o título da página
useHead ({
  title: 'Conclusivo'
});

definePageMeta({
  middleware: 'sidebase-auth'
})

import { ref } from "vue"; 

const unidades = ref(0)
const usinas = ref(0)

  const fetchData = async () => {
    const { data: fetchedUsinas } = await useFetch(`${API_BASE_URL}/usina/`);
    const { data: fetchedUnidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao`); 
    
    usinas.value = fetchedUsinas.value.filter(usina => usina.id !== 19 && usina.id !== 20);
    unidades.value = fetchedUnidades.value  
     
  };

  const unidadesComMediaConsumo = ref([]);
  const calcularMediaConsumo = async (tipo) => {
    unidadesComMediaConsumo.value = [] 
    const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`);
    
    if(tipo == 'PREDIO' ){
      unidades.value = unidades.value.filter(item => item.secretaria == 'E' || item.secretaria == 'S' || item.secretaria == 'O' )
    }else if (tipo == 'IP'){
      unidades.value = unidades.value.filter(item => item.secretaria == 'I' || item.secretaria == 'P') 
    }


    for (const unidade of unidades.value) {  
      const relatoriosDaUnidade = relatorios.value.filter(item => item.idUnidadeCompensa === unidade.id);

      if (relatoriosDaUnidade.length > 0) {
        // Ordenar por ano e mês (mais recente primeiro)
        const relatoriosOrdenados = relatoriosDaUnidade.sort((a, b) => {
          if (b.ano === a.ano) {
            return b.mes - a.mes; // Meses do mesmo ano: mais recente primeiro
          }
          return b.ano - a.ano; // Anos diferentes: mais recente primeiro
        });

        // Selecionar os 6 últimos registros
        const ultimos6Relatorios = relatoriosOrdenados.slice(0, 6);

        // Calcular a média do consumo
        const somaConsumo = ultimos6Relatorios.reduce((soma, item) => soma + parseFloat(item.consumokWh || 0), 0);
        const mediaConsumo = somaConsumo / ultimos6Relatorios.length; 
        unidade.mediaConsumo = mediaConsumo.toFixed(2);

        // Verificar os últimos 3 relatórios para saldoEnergia
        const ultimos3Relatorios = relatoriosOrdenados.slice(0, 3); // Pega os últimos 3
        const saldoEnergiaPreenchido = ultimos3Relatorios.every(item => parseFloat(item.saldoEnergia || 0) !== 0);
        const saldoEnergiaStatus = saldoEnergiaPreenchido ? "True" : "False";

        // Adicionar unidade com a média calculada e status de saldoEnergia
        unidadesComMediaConsumo.value.push({
          uc: unidade.uc,
          nome: unidade.nome,
          mediaConsumo: unidade.mediaConsumo,
          saldoEnergia: saldoEnergiaStatus,
          status: unidade.status,
          tensao: unidade.tensao,
          endereco: unidade.endereco,
        });
      } else {
        // Caso não haja relatórios, definir mediaConsumo como 0
        unidade.mediaConsumo = 0;

        // Adicionar unidade com saldoEnergia como "NÃO"
        unidadesComMediaConsumo.value.push({
          uc: unidade.uc,
          nome: unidade.nome,
          mediaConsumo: unidade.mediaConsumo,
          saldoEnergia: "False", 
          status: unidade.status,
          tensao: unidade.tensao,
          endereco: unidade.endereco,
        });
      }
    } 
  
    // Ordenar unidades pela média de consumo, do maior para o menor
    unidadesComMediaConsumo.value.sort((a, b) => b.mediaConsumo - a.mediaConsumo);
  };

  // Chamadas no ciclo de vida
  onMounted(async () => {
      await fetchData();  // Buscar dados das usinas e unidades 
  });

  //EXPORTAR PARA PREDIOS E CIP
  const exportarParaExcel = async (tipo) => {
    await calcularMediaConsumo(tipo); // <- agora esperamos terminar

    if (unidadesComMediaConsumo.value.length === 0) {
      alert("Nenhum dado disponível para exportar.");
      return;
    }

    const dados = unidadesComMediaConsumo.value.map(unidade => ({
      UC: unidade.uc,
      Nome: unidade.nome,
      "Consumo Médio (kWh)": unidade.mediaConsumo,
      "Saldo": unidade.saldoEnergia,
      "Status": unidade.status,
      "Tensão": unidade.tensao,
      "Endereço": unidade.endereco,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Unidades");

    if(tipo == 'PREDIO'){
      XLSX.writeFile(workbook, "UC_Predios.xlsx");
    } else {
      XLSX.writeFile(workbook, "UC_CIP.xlsx");
    }
  };




//DADOS COMPENSADOS

//COMPENSADO
const { data: compensado } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`);

const somarIndividualCompensado = async () => {
  const totalPorMesAno = {};

  compensado.value.forEach(item => {
    const chave = `${item.ano}-${item.mes.toString().padStart(2, '0')}`;
    
    const energiaTUSD = parseFloat(item.enerInjTUSD) || 0;
    const energiaTE = parseFloat(item.enerInjTE) || 0;
    const energiaTotal = energiaTUSD + energiaTE;

    const valorTUSD = parseFloat(item.valorInjTUSD) || 0;
    const valorTE = parseFloat(item.valorInjTE) || 0;
    const valorTotal = valorTUSD + valorTE;

    const saldoEnergia = parseFloat(item.saldoEnergia) || 0;

    if (!totalPorMesAno[chave]) {
      totalPorMesAno[chave] = {
        energiaTotal: 0,
        valorTotal: 0,
        saldoEnergiaTotal: 0
      };
    }

    totalPorMesAno[chave].energiaTotal += energiaTotal;
    totalPorMesAno[chave].valorTotal += valorTotal;
    totalPorMesAno[chave].saldoEnergiaTotal += saldoEnergia;
  });

  // Arredonda os valores
  for (const chave in totalPorMesAno) {
    totalPorMesAno[chave].energiaTotal = parseFloat(totalPorMesAno[chave].energiaTotal.toFixed(2));
    totalPorMesAno[chave].valorTotal = parseFloat(totalPorMesAno[chave].valorTotal.toFixed(2));
    totalPorMesAno[chave].saldoEnergiaTotal = parseFloat(totalPorMesAno[chave].saldoEnergiaTotal.toFixed(2));
  }

  return totalPorMesAno;
};




const exportarParaExcel2 = async () => {
  const totalPorMesAno = await somarIndividualCompensado();

  const dados = Object.entries(totalPorMesAno)
    .map(([chave, valores]) => ({
      "Ano-Mês": chave,
      "Energia Compensada (kWh)": valores.energiaTotal,
      "Valor Compensado (R$)": valores.valorTotal,
      "Saldo de Energia (kWh)": valores.saldoEnergiaTotal
    }))
    .sort((a, b) => {
      // Converte "2024-05" => 202405 para ordenar corretamente
      const valorA = parseInt(a["Ano-Mês"].replace("-", ""));
      const valorB = parseInt(b["Ano-Mês"].replace("-", ""));
      return valorB - valorA; // do maior (mais recente) pro menor
    });

  const worksheet = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resumo Mensal");

  XLSX.writeFile(workbook, "Resumo_Mensal_Compensado.xlsx");
};



//EXPORTAR CONSUMO MENSAL
const extrairEExportar6meses = async (tipo) => {
  const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`); 
  // Filtra unidades conforme o tipo
  if (tipo === 'PREDIO') {
    unidades.value = unidades.value.filter(item =>
      (item.secretaria === 'E' || item.secretaria === 'S' || item.secretaria === 'O') &&
      (item.status === 'L' || item.status === 'D')
    );
  } else if (tipo === 'IP') {
    unidades.value = unidades.value.filter(item =>
      item.secretaria === 'I' || item.secretaria === 'P'
    );
  }

  const dadosParaExportar = [];

  // Função auxiliar para converter número do mês em nome abreviado
  const nomeMes = (num) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[num - 1] || '??';
  };

  for (const unidade of unidades.value) {
    const relatoriosDaUnidade = relatorios.value.filter(item => item.idUnidadeCompensa === unidade.id); 

    if (relatoriosDaUnidade.length > 0) {
      const relatoriosOrdenados = relatoriosDaUnidade.sort((a, b) => {
        if (b.ano === a.ano) return b.mes - a.mes;
        return b.ano - a.ano;
      });

      const ultimos6Relatorios = relatoriosOrdenados.slice(0, 13); 
      const linha = {
        UC: unidade.uc,
        Nome: unidade.nome,
        Status: unidade.status,
        Endereço: unidade.endereco,
        Tensão: unidade.tensao,
        Secretaria: unidade.secretaria,
        MédioAPI: unidade.mediaConsumo || 0,
      };

      let consumoMaisAntigo = 0;
      let consumoMaisRecente = 0;
      let somaConsumo = 0;
      let totalConsumos = 0;
      let maiorConsumo = 0;

      ultimos6Relatorios.forEach((r, idx) => {
        const chave = `${nomeMes(r.mes)}/${r.ano}`;
        const consumo = Number(r.consumokWh) || 0;
        linha[chave] = consumo;

        somaConsumo += consumo;
        totalConsumos++;

        if (consumo > maiorConsumo) maiorConsumo = consumo;

        if (idx === ultimos6Relatorios.length - 1) consumoMaisAntigo = consumo;
        if (idx === 0) consumoMaisRecente = consumo;
      });

      const media = totalConsumos > 0 ? somaConsumo / totalConsumos : 0;
      linha["MédioSistema"] = `${media.toFixed(2)} kWh`;

      // Maior Consumo
      linha["MaiorConsumo"] = `${maiorConsumo} kWh`;

      // Calcula o aumento percentual
      let variacao = 0;
      if (consumoMaisAntigo > 0) {
        variacao = ((consumoMaisRecente - consumoMaisAntigo) / consumoMaisAntigo) * 100;
      }

      linha["Variação %"] = consumoMaisAntigo === 0 ? 'N/A' : `${variacao.toFixed(1)}%`;

      // Adiciona alerta caso o aumento seja alto
      if (variacao > 25) {
        linha["Alerta"] = "AUMENTO ALTO";
      } else if (variacao < -20) {
        linha["Alerta"] = "REDUÇÃO SIGNIFICATIVA";
      } else {
        linha["Alerta"] = "OK";
      }

      dadosParaExportar.push(linha);
    }
  }

  // Exportar para Excel
  const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Últimos 8 Meses");

  XLSX.writeFile(workbook, `Consumo_8_Meses_${tipo}.xlsx`);
};






// CONCLUSIVO
  const { data: geracoes } = await useFetch(`${API_BASE_URL}/relatoriogeracao`); 
  const { data: projecoes } = await useFetch(`${API_BASE_URL}/projecaogeracao`); 
  const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`); 
  const { data: relatorio_usinas } = await useFetch(`${API_BASE_URL}/relatoriousina`);
  const { data: usinas_conclusivo } = await useFetch(`${API_BASE_URL}/usina/`);

  
  
  /* VARIAVEIS ANTES DA PESQUISA */
  const mesAnoSelecionado = ref(null)
  const dialogRelatorioPDF = ref(false)

  /* VARIÁVEIS PÓS PESQUISA */
  const periodo_mes = ref(null) // VARIAVEL EXPOSTA DO MES
  const periodo_ano = ref(null) // VARIAVEL EXPOSTA DO ANO

  const projecao_total = ref(null) // VARIAVEL PARA O PROJETO TOTAL DO MES
  const geracao_total = ref(null) //VARIAVEL PARA A GERAÇÃO TOTAL DO MES 
  const consumo_total = ref(null) // VARIAVEL PARA CONSUMO TOTAL DO MES
  const saldo_liquido = ref(null) // VARIAVEL PARA SALDO LIQUIDO DO MES
  const economia_total = ref(null) // VARIAVEL PARA ECONOMIA TOTAL DO MES
  const co2_evitado = ref(0) // VARIAVEL PARA CO2 EVITADO DO MES
  const arvores_equivalente = ref(0) // VARIAVEL PARA ÁRVORES EQUIVALENTE DO MES

  const energia_compensada = ref(0) // VARIAVEL PARA ENERGIA COMPENSADA DO MES
  const energia_injetada = ref(0) // VARIAVEL PARA ENERGIA INJETADA DO MES
  const taxa_autossuficiencia_predios = ref(0) // VARIAVEL PARA TAXA DE AUTOSSUFICIÊNCIA DO MES
  const taxa_autossuficiencia_ip = ref(0) // VARIAVEL PARA TAXA DE AUTOSSUFICIÊNCIA DO MES
  const custo_evitado_total = ref(0) // VARIAVEL PARA CUSTO EVITADO TOTAL DO MES
  const custo_autoconsumo_total = ref(0) // VARIAVEL PARA CUSTO DE AUTOCONSUMO TOTAL DO MES  

  const economia_ate_hoje = ref(0) // VARIAVEL PARA ECONOMIA ATÉ HOJE
  const economia_do_ano = ref(0) // VARIAVEL PARA ECONOMIA DO ANO ATUAL
  const payback_acumulado = ref(0) // VARIAVEL PARA PAYBACK ACUMULADO

  const ranking_mais_compensacao = ref([]);
  const ranking_mais_consumo = ref([]);
  const ranking_mais_economia = ref([]);
  const ranking_mais_geracao = ref([]);
  const ranking_mais_saldo = ref([]);
  const ranking_maior_aumento_consumo = ref([]);
  const ranking_maior_reducao_consumo = ref([]);

  const co2_evitado_acumulado = ref(0) // VARIAVEL PARA CO2 EVITADO TOTAL

  const usinas_desempenho = ref([]); // VARIAVEL PARA USINAS DESEMPENHO

  const projecao_geracao = ref(0); // VARIAVEL PARA PROJEÇÃO DE GERAÇÃO DO MES

  /* DIÁLOGO RELATÓRIO PDF */
  const abrirDialog = () =>{ 

        dialogRelatorioPDF.value = true
        const [ano, mes] = mesAnoSelecionado.value.split('-')
        periodo_ano.value = Number(ano)
        periodo_mes.value = Number(mes)

        /* PRIMEIRA PARTE */
        projecao_total.value = somarProjecoesPorMesAno(Number(ano), Number(mes))
        geracao_total.value = somarGeracaoPorMesAno(Number(ano), Number(mes))
        consumo_total.value = somarConsumoPorMesAno(Number(ano), Number(mes))
        saldo_liquido.value = somarSaldoPorMesAno(Number(ano), Number(mes))
        economia_total.value = somarEconomiaPorMesAno(Number(ano), Number(mes))
        co2_evitado.value = calcularCo2Evitado()
        arvores_equivalente.value = calcularArvoresEquivalente()

      /* SEGUNDA PARTE */
      energia_compensada.value =  calcularEnergiaCompensada(Number(ano), Number(mes))
      energia_injetada.value = calcularEnergiaInjetada(Number(ano), Number(mes)) 

      const custoEvitadoTotal =  calcularCustoAutoconsumoMes(Number(ano), Number(mes))
      custo_autoconsumo_total.value = Number(custoEvitadoTotal.toFixed(2));
      custo_evitado_total.value = (custo_autoconsumo_total.value + Number(economia_total.value || 0)).toFixed(2);


      taxa_autossuficiencia_predios.value = calcularTaxaAutossuficienciaPredios(Number(ano), Number(mes))
      taxa_autossuficiencia_ip.value = calcularTaxaAutossuficienciaIP(Number(ano), Number(mes))

      /* TERCEIRA PARTE */
      ranking_mais_compensacao.value = top5MaisReceberamEnergia(Number(ano), Number(mes))
      ranking_mais_consumo.value = top5MaisConsumiuEnergia(Number(ano), Number(mes))
      ranking_mais_economia.value = top5MaisEconomizou(Number(ano), Number(mes))
      ranking_mais_geracao.value = top5Geracoes(Number(ano), Number(mes))
      ranking_mais_saldo.value = top5MaisSaldo(Number(ano), Number(mes))
      ranking_maior_aumento_consumo.value = top5MaiorAumentoConsumo(Number(ano), Number(mes))
      ranking_maior_reducao_consumo.value = top5MaiorReducaoConsumo(Number(ano), Number(mes))

      /* QUARTA PARTE */
      calcularCustoEvitadoTodosMeses();

      economia_ate_hoje.value = somarEconomiaMeses(Number(ano), Number(mes)).toFixed(2);
      economia_do_ano.value = somarEconomiaAno(Number(ano), Number(mes)).toFixed(2);
      payback_acumulado.value = calcularPayback(economia_ate_hoje.value);

      /* QUINTA PARTE */
      co2_evitado_acumulado.value = calcularCo2EvitadoTotal(Number(ano), Number(mes));

      /* SEXTA PARTE */
      usinas_desempenho.value = calcularDesempenhoUsinas(Number(ano), Number(mes));

      /* SÉTIMA PARTE */
      projecao_geracao.value = somarProjecoesProximoMes(Number(ano), Number(mes));

    }

  /* FUNÇÃO PARA SOMAR AS PROJEÇÕES DO MES ESCOLHIDO */
  const somarProjecoesPorMesAno = (ano, mes) => { 
    if (!projecoes.value) return 0

    const filtrados = projecoes.value.filter(item => item.ano === ano && item.mes === mes)

     const soma =  filtrados.reduce((acc, item) => acc + Number(item.projecao || 0), 0)
     return Number(soma.toFixed(2))
  }

  /* FUNÇÃO PARA SOMAR AS GERAÇÕES DO MES ESCOLHIDO */
  const somarGeracaoPorMesAno = (ano, mes) => { 
    if (!geracoes.value) return 0

    const filtrados = geracoes.value.filter(item => item.ano === ano && item.mes === mes)

     const soma =  filtrados.reduce((acc, item) => acc + Number(item.geracao || 0), 0)
     return Number(soma.toFixed(2))
  }

  /* FUNÇÃo PARA SOMAR O CONSUMO DO MÊS ESCOLHIDO */
  const somarConsumoPorMesAno = (ano, mes) => { 
    if (!relatorios.value) return 0

    const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes)

    const soma =  filtrados.reduce((acc, item) => acc + Number(item.consumokWh || 0), 0)
    return Number(soma.toFixed(2))
  }

  /* FUNÇÃo PARA SOMAR O SALDO DO MÊS ESCOLHIDO */
  const somarSaldoPorMesAno = (ano, mes) => { 
    if (!relatorios.value) return 0

    const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes)

    const soma =  filtrados.reduce((acc, item) => acc + Number(item.saldoEnergia || 0), 0)
    return Number(soma.toFixed(2))
  }
  
  /* FUNÇÃo PARA SOMAR O SALDO DO MÊS ESCOLHIDO */
  const somarEconomiaPorMesAno = (ano, mes) => { 
    if (!relatorios.value) return 0

    const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes)

    const totalTUSD = filtrados.reduce((acc, item) => acc + Number(item.valorInjTUSD || 0), 0)
    const totalTE = filtrados.reduce((acc, item) => acc + Number(item.valorInjTE || 0), 0)

    const total = totalTUSD + totalTE

    return Number(total.toFixed(2))
  }

  /* CALCULO DO CO2 EVITADO */
  const calcularCo2Evitado = () => {
    const fatorCo2 = 0.00005 // FATOR DE CONVERSÃO (EXEMPLO)
    return  Number(geracao_total.value * fatorCo2).toFixed(2)
  }

  /* CALCULO DO ARVORE EVITADO */
  const calcularArvoresEquivalente = () => {
    const CAPTURA_ARVORE = 0.165   // kg CO2/ano por árvore
    return Math.round(co2_evitado.value / CAPTURA_ARVORE)
  }

  /* CALCULO DE ENERGIA COMPENSADA */
  const calcularEnergiaCompensada = (ano, mes) => { 
    if (!relatorios.value) return 0

    const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes)

    const totalTUSD = filtrados.reduce((acc, item) => acc + Number(item.enerInjTUSD || 0), 0) 

    const total = totalTUSD 

    return Number(total.toFixed(2))
  }

  /* CALCULO DE ENERGIA INJETADA */
  const calcularEnergiaInjetada = (ano, mes) => { 
    if (!relatorio_usinas.value) return 0

    const filtrados = relatorio_usinas.value.filter(item => item.ano === ano && item.mes === mes)

    const totalPONTA = filtrados.reduce((acc, item) => acc + Number(item.injetadoPonta || 0), 0) 
    const totalFPONTA = filtrados.reduce((acc, item) => acc + Number(item.injetadoFPonta || 0), 0)

    const total = totalPONTA + totalFPONTA

    return Number(total.toFixed(2))
  }

   /* CÁLCULO CONSUMO MEDIO DAS USINAS DO MES PARA AUTOSSUFICIENCIA */
  const buscarConsumoMedio = () => {
    let consumoMedio = 0

    usinas.value.forEach(usina => {
      const unidadeCorrespondente = unidades.value.find(unidade => unidade.uc === usina.uc)
      if (unidadeCorrespondente) {
        consumoMedio += Number(unidadeCorrespondente.mediaConsumo || 0)
      }
    })

    return Number((consumoMedio).toFixed(2))
  }

  // AUTOSSUFICIENCIA DOS PREDIOS 

   /* CALCULO DE ENERGIA COMPENSADA */
   const calcularEnergiaCompensadaPredios = (ano, mes) => { 
        if (!relatorios.value || !unidades.value) return 0

        // filtra relatórios do mês/ano
        const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes)

        // só mantém relatórios das secretarias E, S ou O
        const filtradosSecretaria = filtrados.filter(item => {
            const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa)
            return unidade && ['E', 'S', 'O'].includes(unidade.secretaria)
        })

        // soma apenas os que passaram no filtro
        const totalTUSD = filtradosSecretaria.reduce(
            (acc, item) => acc + Number(item.enerInjTUSD || 0),
            0
        )

        return Number(totalTUSD.toFixed(2))
    }

   /* CÁLCULO SOMA ESPECIAL PARA AUTOSSUFICIÊNCIA arrumando O HOSPITAL E O UPA*/
   /* tendo em vista q eles nao estao no usinas.value e precisa add o valor medioConsumo deles*/
  const somarConsumoPorMesAnoEspecial = (ano, mes) => { 
    if (!relatorios.value || !geracoes.value || !unidades.value) return 0

    const UCsEspeciais = ['4000266381', '37068768']

    // pega relatórios do mês/ano
    const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes)

    // filtra relatórios só das secretarias E, S ou O
    const filtradosSecretaria = filtrados.filter(item => {
        const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa)
        return unidade && ['E', 'S', 'O'].includes(unidade.secretaria)
    })

    // soma consumos (e gerações, no caso das UCs especiais)
    const soma = filtradosSecretaria.reduce((acc, item) => {
        if (UCsEspeciais.includes(String(item.uc))) {
        const geracaoUC = geracoes.value.find(
            g => g.uc === item.uc && g.ano === ano && g.mes === mes
        )
        const valorGeracao = geracaoUC ? Number(geracaoUC.geracao || 0) : 0
        return acc + Number(item.consumokWh || 0) + valorGeracao
        } else {
        return acc + Number(item.consumokWh || 0)
        }
    }, 0)

    return Number(soma.toFixed(2))
    }

  
  /* CÁLCULO AUTOSSUFICIÊNCIA */
  const calcularTaxaAutossuficienciaPredios = (ano, mes) => {

    const consumoMedioUsinas = buscarConsumoMedio()
    const consumoMedioUnidadesPredios = somarConsumoPorMesAnoEspecial(ano, mes) 

    const energia_compensadaPredios = calcularEnergiaCompensadaPredios(ano, mes)

    const totalCompensado = energia_compensadaPredios + (geracao_total.value - energia_injetada.value)
    const totalConsumo = consumoMedioUnidadesPredios + consumoMedioUsinas

    const taxaAutossuficiencia = (totalCompensado / totalConsumo) * 100


    return Number(taxaAutossuficiencia.toFixed(2))

  }


  // AUTOSSUFICIENCIA DOS PREDIOS 

    /* CALCULO DE ENERGIA DAS IPs */
    const calcularEnergiaIP = (ano, mes) => {
        if (!relatorios.value || !unidades.value) return { consumoTotal: 0, energiaCompensada: 0 }

        // filtra relatórios do mês/ano
        const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes)

        // mantém apenas os relatórios de unidades com secretaria I ou P
        const filtradosSecretaria = filtrados.filter(item => {
            const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa)
            return unidade && ['I', 'P'].includes(unidade.secretaria) && (unidade.uc) !== 12877638
            
        }) 
 
 

        // soma consumo
        const consumoTotal = filtradosSecretaria.reduce(
            (acc, item) => acc + Number(item.consumokWh || 0),
            0
        )

        // soma energia injetada (TUSD)
        const energiaCompensada = filtradosSecretaria.reduce(
            (acc, item) => acc + Number(item.enerInjTUSD || 0),
            0
        )

        return {
            consumoTotal: Number(consumoTotal.toFixed(2)),
            energiaCompensada: Number(energiaCompensada.toFixed(2))
        }
    }


     /* CÁLCULO AUTOSSUFICIÊNCIA */
    const calcularTaxaAutossuficienciaIP = (ano, mes) => {

        const consumoMedioUsinas = buscarConsumoMedio()

        const dadosUnidades = calcularEnergiaIP(ano, mes)  

        console.log("DADOS UNIDADES1: ", dadosUnidades.energiaCompensada)
        console.log("DADOS UNIDADES2: ", dadosUnidades.consumoTotal)
        const totalCompensado = dadosUnidades.energiaCompensada
        const totalConsumo =  dadosUnidades.consumoTotal

        const taxaAutossuficiencia = (totalCompensado / totalConsumo) * 100


        return Number(taxaAutossuficiencia.toFixed(2))

    }









  /* CALCULO DE CUSTO EVITADO */
  // ---------- Tarifas base (já com tributos conforme você disse) ----------
  const TARIFA_BT = 0.88;
  const MT_TARIFAS = {
    TUSD_ponta: 1.66642019,
    TE_ponta:   0.57222160,
    TUSD_forap: 0.14734841,
    TE_forap:   0.34908095
  };


  // tarifa média MT: tenta usar valores da fatura; se não existir, usa estimativa (ponto médio)
  function tarifaMediaMTParaUsina(idUsina) {  
    const minima = Number(MT_TARIFAS.TUSD_forap || 0) + Number(MT_TARIFAS.TE_forap || 0);
    const maxima = Number(MT_TARIFAS.TUSD_ponta || 0) + Number(MT_TARIFAS.TE_ponta || 0);
    return (minima + maxima) / 2;
  }
 

  // CALCULA TOTAL COMPENSADO DO AUTOCONSUMO 
  const calcularCustoAutoconsumoMes = (ano, mes) => {
    let total = 0; 

    (usinas.value || []).forEach(u => { 
      const geraMes = geracoes.value.find(r => r.idGeradora === u.id && r.mes === mes && r.ano === ano);
      const injeMes = relatorio_usinas.value.filter(r => r.idGeradora === u.id && r.mes === mes && r.ano === ano).reduce((s, r) => s + Number(r.injetadoFPonta || 0) + Number(r.injetadoPonta || 0), 0);

      let autoconsumo_kWh = Number(geraMes?.geracao || 0) - Number(injeMes || 0); 
      autoconsumo_kWh = autoconsumo_kWh > 0 ? autoconsumo_kWh : 0; // evita negativo

      let tarifa_RpkWh = 0;
      if ((u.tensao || '').toUpperCase() === 'BT') {
        tarifa_RpkWh = TARIFA_BT;
      } else {
        tarifa_RpkWh = tarifaMediaMTParaUsina(u.id);
      } 

      const custo_evitado_R$ = autoconsumo_kWh * tarifa_RpkWh;
      total += custo_evitado_R$;
 
    });

    //adicionar o autoconsuno da upa e do hospital
    (usinas_conclusivo.value || [])
    .filter(u => u.id === 19 || u.id === 20)
    .forEach(u => {
      const geraMes = geracoes.value.find(r => r.idGeradora === u.id && r.mes === mes && r.ano === ano);

      let autoconsumo_kWh = Number(geraMes?.geracao || 0);
      autoconsumo_kWh = autoconsumo_kWh > 0 ? autoconsumo_kWh : 0; // evita negativo

      let tarifa_RpkWh = 0;
      if ((u.tensao || '').toUpperCase() === 'BT') {
        tarifa_RpkWh = TARIFA_BT;
      } else {
        tarifa_RpkWh = tarifaMediaMTParaUsina(u.id);
      }

      const custo_evitado_R$ = autoconsumo_kWh * tarifa_RpkWh;
      total += custo_evitado_R$;

    });

    return total;
  }; 


  /* CALCULAR PAYBACK */
  //FUNÇÃO PARA CALCULAR CUSTOS MENSAIS EVITADOS
  const calcularCustoEvitadoTodosMeses = () => {
    const resultados = [];

    const chaves = new Set([
      ...geracoes.value.map(g => `${g.ano}-${g.mes}`),
      ...relatorio_usinas.value.map(r => `${r.ano}-${r.mes}`)
    ]);

     for (const chave of chaves) {
      const [ano, mes] = chave.split("-").map(Number);

      // ---- PRIMEIRA PARTE ---- 
      const economia_total = somarEconomiaPorMesAno(Number(ano), Number(mes))  
    
      
      // ---- CALCULO DO CUSTO AUTOCONSUMO (usinas BT/MT) ----
      const resultado = calcularCustoAutoconsumoMes(Number(ano), Number(mes))
      const custo_autoconsumo_total = Number(resultado || 0);

      // ---- CUSTO EVITADO TOTAL ----
      const custo_evitado_total = (Number(custo_autoconsumo_total) + Number(economia_total)).toFixed(2);

      resultados.push({
        ano,
        mes,
        custo_evitado_total
      });
    }
    
    // console.log("RESULTADOS: ", resultados)
    return resultados.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  }

  const totalInvestido = ref(Number(8854468.32)+
      Number(8005328.88) + 
      Number(7021350.76) 

      //8.854.468,32 jac 
    //8.005.328,88 17 usinas
    // 7.021.350,76
  );

  //ECONOMIA ATÉ O MES selecionado
  const somarEconomiaMeses = (ano, mes) => {
    const resultados = calcularCustoEvitadoTodosMeses();
    // filtra apenas meses/anos até o informado
    const resultadosFiltrados = resultados.filter(item => {
      return (
        item.ano < ano || 
        (item.ano === ano && item.mes <= mes)
      );
    });

    // soma os custo_evitado_total desses meses
    return resultadosFiltrados.reduce(
      (acc, item) => acc + Number(item.custo_evitado_total || 0), 
      0
    ); 
  };

  //ECONOMIA ATÉ O ANO selecionado
  const somarEconomiaAno = (ano, mes) => {
    const resultados = calcularCustoEvitadoTodosMeses();

    // filtra apenas os meses do ano informado e até o mês selecionado
    const resultadosFiltrados = resultados.filter(item => 
      item.ano === ano && item.mes <= mes
    );

    // soma os custo_evitado_total desses meses
    return resultadosFiltrados.reduce(
      (acc, item) => acc + Number(item.custo_evitado_total || 0),
      0
    );
  };

  //CALCULAR PAYBACK
  const calcularPayback = (economia) => {
    if (totalInvestido.value === 0) return 0;
    return ((economia / totalInvestido.value) * 100).toFixed(2);
  };


  /*TOP 5 MAIS TRALALÁ.. */
  // MAIS RECEBERAM ENERGIA
  const top5MaisReceberamEnergia = (ano, mes) =>  { 
    const ucsUsinas  = usinas_conclusivo.value.map(u => u.uc);
    const idsUnidadesParaExcluir = unidades.value
    .filter(un => ucsUsinas.includes(un.uc))
    .map(un => un.id);

    const relatoriosFiltrados = relatorios.value
      .filter(r => 
        r.ano === ano && 
        r.mes === mes && 
        !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)
      )
      .sort((a, b) => (b.enerInjTUSD || 0) - (a.enerInjTUSD || 0))
      .slice(0, 5); // Top 5

    // 4. Junta dados da unidade
    return relatoriosFiltrados.map(r => {
      const unidade = unidades.value.find(u => u.id === r.idUnidadeCompensa);
      return {
        uc: unidade?.uc || "N/A",
        nome: unidade?.nome || "N/A",
        enerInjTUSD: r.enerInjTUSD || 0
      };
    });
  }

  // MAIS CONSUMIU ENERGIA
  const top5MaisConsumiuEnergia = (ano, mes) =>  { 
    const ucsUsinas  = usinas_conclusivo.value.map(u => u.uc);
    const idsUnidadesParaExcluir = unidades.value
    .filter(un => ucsUsinas.includes(un.uc))
    .map(un => un.id);

    const relatoriosFiltrados = relatorios.value
      .filter(r => 
        r.ano === ano && 
        r.mes === mes && 
        !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)
      )
      .sort((a, b) => (b.consumokWh || 0) - (a.consumokWh || 0))
      .slice(0, 5); // Top 5

    // 4. Junta dados da unidade
    return relatoriosFiltrados.map(r => {
      const unidade = unidades.value.find(u => u.id === r.idUnidadeCompensa);
      return {
        uc: unidade?.uc || "N/A",
        nome: unidade?.nome || "N/A",
        consumokWh: r.consumokWh || 0
      };
    });
  }

  // MAIS ECONOMIZOU R$
  const top5MaisEconomizou = (ano, mes) => { 
    const ucsUsinas = usinas_conclusivo.value.map(u => u.uc);

    // Pega os IDs das unidades que correspondem às UCs das usinas
    const idsUnidadesParaExcluir = unidades.value
      .filter(un => ucsUsinas.includes(un.uc))
      .map(un => un.id);

    // Filtra relatórios do mês/ano e exclui unidades ligadas a usinas
    const relatoriosFiltrados = relatorios.value
      .filter(r => 
        r.ano === ano && 
        r.mes === mes && 
        !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)
      )
      .sort((a, b) => {
        const totalA = (Number(b.valorInjTUSD) || 0) + (Number(b.valorInjTE) || 0);
        const totalB = (Number(a.valorInjTUSD) || 0) + (Number(a.valorInjTE) || 0);
        return totalA - totalB; // Maior primeiro
      })
      .slice(0, 5); // Top 5

    // Monta o retorno com UC, nome e total injetado
    return relatoriosFiltrados.map(r => {
      const unidade = unidades.value.find(u => u.id === r.idUnidadeCompensa);
      return {
        uc: unidade?.uc || "N/A",
        nome: unidade?.nome || "N/A",
        energiaInjetada: 
          (Number(r.valorInjTUSD) || 0) + (Number(r.valorInjTE) || 0)
      };
    });
  };

  //USINAS MAIS GEROU KWH
  const top5Geracoes = (ano, mes) => { 
    const geracoesFiltradas = geracoes.value
      .filter(g => g.ano === ano && g.mes === mes)
      .sort((a, b) => (b.geracao || 0) - (a.geracao || 0)) // Ordena do maior pro menor
      .slice(0, 5); // Top 5

    // Junta com dados das usinas
    return geracoesFiltradas.map(g => {
      const usina = usinas_conclusivo.value.find(u => u.id === g.idGeradora);
      return {
        uc: usina?.uc || "N/A",
        nome: usina?.nome || "N/A",
        geracao: g.geracao || 0
      };
    });
  };

  // MAIS SALDO EM ENERGIA
  const top5MaisSaldo= (ano, mes) =>  { 
    const ucsUsinas  = usinas_conclusivo.value.map(u => u.uc);
    const idsUnidadesParaExcluir = unidades.value
    .filter(un => ucsUsinas.includes(un.uc))
    .map(un => un.id);

    const relatoriosFiltrados = relatorios.value
      .filter(r => 
        r.ano === ano && 
        r.mes === mes && 
        !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)
      )
      .sort((a, b) => (b.saldoEnergia || 0) - (a.saldoEnergia || 0))
      .slice(0, 5); // Top 5

    // 4. Junta dados da unidade
    return relatoriosFiltrados.map(r => {
      const unidade = unidades.value.find(u => u.id === r.idUnidadeCompensa);
      return {
        uc: unidade?.uc || "N/A",
        nome: unidade?.nome || "N/A",
        saldoEnergia: r.saldoEnergia || 0
      };
    });
  }

  // MAIORES AUMENTO DE CONSUMO
  const top5MaiorAumentoConsumo = (ano, mes) => {
    // Descobre mês e ano anterior
    let mesAnterior = mes - 1;
    let anoAnterior = ano;
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anoAnterior = ano - 1;
    }

    // UCs das usinas para excluir
    const ucsUsinas = usinas_conclusivo.value.map(u => u.uc);
    const idsUnidadesParaExcluir = unidades.value
      .filter(un => ucsUsinas.includes(un.uc))
      .map(un => un.id);

    // Relatórios do mês atual e anterior
    const relatoriosAtual = relatorios.value.filter(r =>
      r.ano === ano &&
      r.mes === mes &&
      !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)
    );

    const relatoriosAnterior = relatorios.value.filter(r =>
      r.ano === anoAnterior &&
      r.mes === mesAnterior &&
      !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)
    );

    // Indexa consumo anterior por idUnidadeCompensa
    const consumoAnteriorMap = {};
    relatoriosAnterior.forEach(r => {
      consumoAnteriorMap[r.idUnidadeCompensa] = r.consumokWh || 0;
    });

    // Calcula aumentos
    const aumentos = relatoriosAtual.map(r => {
      const consumoAtual = r.consumokWh || 0;
      const consumoAnterior = consumoAnteriorMap[r.idUnidadeCompensa] || 0;
      const aumento = consumoAtual - consumoAnterior;

      return {
        idUnidadeCompensa: r.idUnidadeCompensa,
        aumento: aumento > 0 ? aumento : 0
      };
    });

    // Ordena e pega top 5
    const top5 = aumentos
      .sort((a, b) => b.aumento - a.aumento)
      .slice(0, 5);

    // Junta com dados das unidades
    return top5.map(a => {
      const unidade = unidades.value.find(u => u.id === a.idUnidadeCompensa);
      return {
        uc: unidade?.uc || "N/A",
        nome: unidade?.nome || "N/A",
        aumento_kWh: a.aumento
      };
    });
  };

  //ABAIXOU CONSUMO
  const top5MaiorReducaoConsumo = (ano, mes) => {
    // Descobre mês e ano anterior
    let mesAnterior = mes - 1;
    let anoAnterior = ano;
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anoAnterior = ano - 1;
    }

    // UCs das usinas para excluir
    const ucsUsinas = usinas_conclusivo.value.map(u => u.uc);
    const idsUnidadesParaExcluir = unidades.value
      .filter(un => ucsUsinas.includes(un.uc))
      .map(un => un.id);

    // Relatórios do mês atual e anterior
    const relatoriosAtual = relatorios.value.filter(r =>
      r.ano === ano &&
      r.mes === mes &&
      !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)
    );

    const relatoriosAnterior = relatorios.value.filter(r =>
      r.ano === anoAnterior &&
      r.mes === mesAnterior &&
      !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)
    );

    // Indexa consumo anterior por idUnidadeCompensa
    const consumoAnteriorMap = {};
    relatoriosAnterior.forEach(r => {
      consumoAnteriorMap[r.idUnidadeCompensa] = r.consumokWh || 0;
    });

    // Calcula reduções
    const reducoes = relatoriosAtual.map(r => {
      const consumoAtual = r.consumokWh || 0;
      const consumoAnterior = consumoAnteriorMap[r.idUnidadeCompensa] || 0;
      const reducao = consumoAnterior - consumoAtual;

      return {
        idUnidadeCompensa: r.idUnidadeCompensa,
        reducao: reducao > 0 ? reducao : 0
      };
    });

    // Ordena e pega top 5
    const top5 = reducoes
      .sort((a, b) => b.reducao - a.reducao)
      .slice(0, 5);

    // Junta com dados das unidades
    return top5.map(a => {
      const unidade = unidades.value.find(u => u.id === a.idUnidadeCompensa);
      return {
        uc: unidade?.uc || "N/A",
        nome: unidade?.nome || "N/A",
        reducao_kWh: a.reducao
      };
    });
  };

  /* CO2 EVITADO TOTAL */
  /* FUNÇÃO PARA SOMAR AS GERAÇÕES GERAL */
  const somarGeracaoGeral = () => { 
    if (!geracoes.value) return 0 

     const soma =  geracoes.value.reduce((acc, item) => acc + Number(item.geracao || 0), 0)
     console.log("SOMA GERAL: ", soma)
     return Number(soma.toFixed(2))
  }

  const calcularCo2EvitadoTotal = () => {
    const geracaoTotal = somarGeracaoGeral()
    const co2PorKwh = 0.0005 // Exemplo de fator de emissão de CO2 por kWh
    return Number((geracaoTotal * co2PorKwh).toFixed(2));
  }

  /* USINA DESEMPENHO */
  const calcularDesempenhoUsinas = (ano, mes) => {
    return usinas_conclusivo.value.map(u => {
      // Geração real da usina no mês/ano
      const geracao = geracoes.value.find(g => g.idGeradora === u.id && g.ano === ano && g.mes === mes); 
      const geracaoReal = Number(geracao?.geracao || 0)

      // Projeção da usina no mês/ano
      const projecao = projecoes.value.find(p => p.idGeradora === u.id && p.ano === ano && p.mes === mes);
      const geracaoProjetada = Number(projecao?.projecao || 0);

      // Desempenho em %
      const desempenhoPct = geracaoProjetada > 0 ? (geracaoReal / geracaoProjetada) * 100 : 0;
      const desempenho = Number.isFinite(desempenhoPct) ? Number(desempenhoPct.toFixed(2)) : 0;

      return {
        uc: u.uc || "N/A",
        nome: u.nome || "N/A",
        geracaoReal: geracaoReal,
        geracaoReal,
        desempenho 
      };
    });
  };

  /* PROJECAO PROXIMO MES */
  const somarProjecoesProximoMes = (ano, mes) => {
    // Calcula próximo mês
    let proximoMes = mes + 1;
    let anoProximoMes = ano;
    if (proximoMes === 13) {
      proximoMes = 1;
      anoProximoMes = ano + 1;
    }

    // Filtra projeções do próximo mês
    const projecoesFiltradas = projecoes.value.filter(p =>
      p.ano === anoProximoMes && p.mes === proximoMes
    );

    // Soma todas as projeções
    const totalProjetado = projecoesFiltradas.reduce(
      (acc, p) => acc + Number(p.projecao || 0),
      0
    );

    return Number(totalProjetado.toFixed(2));
  };



  // BAIXAR PDF CONCLUSIVO
  import html2pdf from 'html2pdf.js';
  const baixarPDF = () => {
  // seleciona o container que será exportado
  const element = document.getElementById("conteudo-pdf");

  if (!element) {
    console.error("Elemento #conteudo-pdf não encontrado!");
    return;
  }

  const opt = {
    margin:       0,
    filename:     "relatorio-usinas.pdf",
    image:        { type: "jpeg", quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: "in", format: "a3", orientation: "portrait" }
  };

  html2pdf().set(opt).from(element).save();
};


</script>
<template>
  <!-- BTNS DOWNLOAD INFOS -->
  <v-row>
    <v-col sm="12" xs="12" md="12" lg="12" xl="12" cols="12">
            <v-card elevation="10" class="withbg">
                <!-- style="background-color: #ECF2FF; " -->
                <v-card-item class="pa-0">
                    <div class="d-sm-flex align-center">
                        
                        <h5 class="text-h3 pl-7 pt-7">
                            <v-avatar class="bg-lightsecondary text-secondary mb-1" size="25">
                                <FileReportIcon size="19" />
                            </v-avatar>
                             
                            
                            Exportar informações conclusivas </h5>

                    </div> 

                    <div class="pa-7 pt-1">  
                      <v-row class="mt-10" justify="space-around"> 
                        <v-btn @click="exportarParaExcel('PREDIO')" class="bg-primary text-white mb-5">
                          Dados Prédios
                        </v-btn>

                        <v-btn @click="exportarParaExcel('IP')" class="bg-primary text-white mb-5">
                          Dados CIP
                        </v-btn> 

                        <v-btn @click="extrairEExportar6meses('PREDIO')" class="bg-primary text-white mb-5">
                          Consumo Últimos 6 Meses (Prédios)
                        </v-btn>

                        <v-btn @click="extrairEExportar6meses('IP')" class="bg-primary text-white mb-5">
                          Consumo Últimos 6 Meses (IP)
                        </v-btn>

                        <v-btn @click="exportarParaExcel2(3)" class="bg-primary text-white mb-5">
                          Dados Compensados
                        </v-btn>

                        <!-- <v-btn @click="exportarParaExcel2(4)" class="bg-primary text-white mb-5">
                         Conclusivo
                        </v-btn> -->
                      </v-row>
                      <br>
                      <hr>
                      <br>
                      <v-row class="mt-5" align="center" justify="start">
                        <!-- Seletor de mês -->
                        <v-col cols="12" sm="4" md="3">
                          <v-text-field
                            v-model="mesAnoSelecionado"
                            label="Selecione o mês"
                            type="month"
                            outlined
                            dense
                          ></v-text-field>
                        </v-col>

                        
                        <!-- Botão conclusivo -->
                        <v-col cols="12" sm="3" md="2">
                          <v-btn
                            class="bg-primary text-white"
                            @click="abrirDialog()"
                            block
                          >
                            Conclusivo
                          </v-btn>
                        </v-col>
                      </v-row>

                    </div>

                </v-card-item>
            </v-card>
        </v-col>
  </v-row> 

  <v-dialog v-model="dialogRelatorioPDF" width="1024">
  <v-card id="conteudo-pdf">
    <!-- Cabeçalho -->
    <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
      <span class="text-h5 font-weight-bold">RELATÓRIO CONCLUSIVO - DESEMPENHO ENERGÉTICO</span>
    </v-card-title>

    <v-card-text ref="tabelaElement" id="OSPDF">
      <!-- Logos e título central -->
      <v-row align="center">
        <v-col cols="2" class="text-left">
          <img src="/images/logo_lucentis.png" alt="" width="80">
        </v-col>
        <v-col cols="8" class="text-center">
          <h2 class="font-weight-bold mb-0">Sistema de Monitoramento Energético</h2>
          <h4 class="mt-1">Período: {{ periodo_mes }}/{{ periodo_ano }}</h4>
        </v-col>
        <v-col cols="2" class="text-right">
          <img src="/images/logo_peehorto.png" alt="" width="150">
        </v-col>
      </v-row>

      <v-divider class="my-4"></v-divider>

      <!-- 1. Sumário Executivo --> 
      <v-row>
        <v-col cols="12" class="text-center">
            <v-table>
                 <tbody>
                  <tr>
                      <th colspan="2" class="text-center bg-primary" >SUMÁRIO EXECUTIVO</th>
                  </tr>
                  <tr style="background-color: #e8e8e8; color: black; font-weight: bold;">
                    <td style="height: 30px;">Indicador</td>
                    <td style="height: 30px;">Valor</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">Projeção total no mês</td>
                    <td style="height: 35px;">{{ projecao_total }} kWh</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">Geração total no mês</td>
                    <td style="height: 35px;">{{ geracao_total }} kWh</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">Consumo total no mês</td>
                    <td style="height: 35px;">{{ consumo_total }} kWh</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">Saldo líquido de energia</td>
                    <td style="height: 35px;">{{ saldo_liquido }} kWh</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">Custo Evitado Total <br><code style="font-size: 10px;">(unidades + usinas)</code></td>
                    <td style="height: 35px;">R$ {{ custo_evitado_total }}</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">CO₂ evitado</td>
                    <td style="height: 35px;">{{ co2_evitado }} t (equivalente a {{ arvores_equivalente }} árvores)</td>
                  </tr>

                 </tbody>
            </v-table>
          </v-col>
        </v-row> 

      <v-divider class="my-4"></v-divider>

      <!-- 2. Indicadores Globais -->
      <v-row>
        <v-col cols="12" class="text-center">
            <v-table>
                 <tbody>
                  <tr>
                    <th colspan="2" class="text-center bg-primary" >INDICADORES GLOBAIS</th>
                  </tr>
                  <tr style="background-color: #e8e8e8; color: black; font-weight: bold;">
                    <td style="height: 30px;">Indicador</td>
                    <td style="height: 30px;">Valor</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">Energia Compensada</td>
                    <td style="height: 35px;">{{ energia_compensada }} kWh</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">Energia Injetada</td>
                    <td style="height: 35px;">{{ energia_injetada }} kWh</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">AutoConsumo Evitado Total</td>
                    <td style="height: 35px;">R$ {{ custo_autoconsumo_total }}</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">Economia total Compensada</td>
                    <td style="height: 35px;">R$ {{ economia_total }}</td>
                  </tr> 
                </tbody>
              </v-table>
                <br>
                <v-table>
                 <tbody>
                    <tr>
                        <th class="text-center bg-primary">PRÉDIOS</th>
                        <th class="text-center bg-primary">IP</th>
                    </tr> 
                    <tr>
                        <td style="height: 35px;">Taxa de Autossuficiência: <b>{{ taxa_autossuficiencia_predios }}%</b></td>
                        <td style="height: 35px;">Taxa de Autossuficiência: <b>{{ taxa_autossuficiencia_ip }}%</b></td>
                    </tr>
                 </tbody>
                </v-table>
          </v-col>
      </v-row> 

      <v-divider class="my-4"></v-divider>

      <!-- 3. Rankings do Mês --> 
      <v-row>
        <v-col cols="12" class="text-center">
            <v-table>
                 <thead>
                  <tr>
                    <th class="text-center bg-primary" >RANKING DO MÊS</th>
                  </tr> 
                </thead>
            </v-table>
                  <div v-for="ranking in [
                    { title: 'Mais Receberam Energia Compensada (kWh)', data: ranking_mais_compensacao, valueKey: 'enerInjTUSD', color: '#ffd700' },
                    { title: 'Mais Consumiram Energia (kWh)', data: ranking_mais_consumo, valueKey: 'consumokWh', color: '#ff7f0e' },
                    { title: 'Mais Economizaram (R$)', data: ranking_mais_economia, valueKey: 'energiaInjetada', color: '#2ca02c' },
                    { title: 'Maior Geração de Energia (kWh)', data: ranking_mais_geracao, valueKey: 'geracao', color: '#1f77b4' },
                    { title: 'Maior Saldo de Energia (kWh)', data: ranking_mais_saldo, valueKey: 'saldoEnergia', color: '#9467bd' },
                    { title: 'Maior Aumento de Consumo (kWh)', data: ranking_maior_aumento_consumo, valueKey: 'aumento_kWh', color: '#d62728' },
                    { title: 'Maior Redução de Consumo (kWh)', data: ranking_maior_reducao_consumo, valueKey: 'reducao_kWh', color: '#2ca02c' }
                  ]" :key="ranking.title" class="mb-4">
                    <v-table>
                      <tbody>
                        <tr>
                          <td colspan="3" class="text-center":style="{fontWeight: 'bold', backgroundColor: ranking.color }">🏆 {{ ranking.title }}</td>
                        </tr>
                        <tr style="background-color: #e8e8e8; color: black; font-weight: bold;">
                          <th style="height: 30px;" class="text-center">#</th>
                          <th style="height: 30px;" class="text-center">Unidade</th>
                          <th style="height: 30px;" class="text-center">Valor</th>
                        </tr>
                        <tr v-for="(item, index) in ranking.data" :key="item.uc">
                          <td>{{ index + 1 }}</td>
                          <td>{{ item.nome }} (UC: {{ item.uc }})</td>
                          <td class="text-right">{{ Number(item[ranking.valueKey]).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </div>
        </v-col>
      </v-row> 

      <v-divider class="my-4"></v-divider>

      <!-- 4. Eficiência Econômica --> 
      <v-row>
        <v-col cols="12" class="text-center">
            <v-table>
                 <tbody>
                  <tr>
                    <th colspan="2" class="text-center bg-primary" >EFICIÊNCIA ECONÔMICA</th>
                  </tr>
                  <tr style="background-color: #e8e8e8; color: black; font-weight: bold;">
                    <td style="height: 30px;">Indicador</td>
                    <td style="height: 30px;">Valor</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">Economia Até Hoje</td>
                    <td style="height: 35px;">R$ {{ economia_ate_hoje }}</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">Economia Do Ano</td>
                    <td style="height: 35px;">R$ {{ economia_do_ano }}</td>
                  </tr>
                  <tr>
                    <td style="height: 35px;">Payback Acumulado</td>
                    <td style="height: 35px;">{{ payback_acumulado }}%</td>
                  </tr>
                </tbody>
            </v-table>
          </v-col>
      </v-row> 

      <v-divider class="my-4"></v-divider>

      <!-- 5. Resumo por Usina --> 
      <v-row dense>
        <v-col cols="12" class="text-center">
            <v-table>
                 <tbody>
                    <tr>
                      <th colspan="2" class="text-center bg-primary" >RESUMO POR USINA</th>
                    </tr>
                  </tbody>
            </v-table>
        </v-col>
        <v-col cols="12" sm="6" md="4" v-for="usina in usinas_desempenho" :key="usina.id">
          <v-card class="pa-3 elevation-2">
            <v-card-title class="font-weight-bold">{{ usina.nome }}</v-card-title>
            <v-card-text>
              UC: {{ usina.uc }}<br>
              Geração no mês: {{ Number(usina.geracaoReal).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }} kWh<br> 
              <v-progress-linear
                :model-value="Number(usina.desempenho)"  
                :max="100"
                height="20"
                color="success"
                rounded
              >
                <template #default>
                  {{ Number(usina.desempenho).toFixed(2) }}%
                </template>
              </v-progress-linear>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>


      <v-divider class="my-4"></v-divider>

      <!-- 6. Projeção Próximo Mês -->
      <h4 class="font-weight-bold">6. Projeção para o Próximo Mês</h4>
      <p>Geração esperada: {{ projecao_geracao }} kWh</p>

      <v-divider class="my-4"></v-divider>

      <!-- Rodapé -->
      <v-row>
        <v-col cols="6" class="text-left">
          <h5>www.admin.peehorto.com</h5>
        </v-col>
        <v-col cols="6" class="text-right">
          <h5>{{ new Date().toLocaleDateString() }}</h5>
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Botão PDF -->
    <v-card-actions>
      <v-row justify="center" class="mt-4">
        <v-btn color="primary" @click="baixarPDF()" large>
          <v-icon left>mdi-file-pdf-box</v-icon>
          Exportar PDF
        </v-btn>
      </v-row>
    </v-card-actions>
  </v-card>
</v-dialog>

</template>
