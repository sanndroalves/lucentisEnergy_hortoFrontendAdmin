<script setup >
import { useHead  } from '@vueuse/head';
import { nextTick } from 'vue';

import { API_BASE_URL } from '~/base/link';

// Defina o título da página
useHead ({
  title: 'Relatórios'
});

definePageMeta({
    middleware: 'auth'
})

import UiParentCard from '@/components/shared/UiParentCard.vue';
import RelatorioUsina from "~~/components/dashboard/RelatorioUsina.vue";

import { ref } from 'vue';
  const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);
  const { data: todosPredios } = await useFetch(`${API_BASE_URL}/unidadecompensacao/`);
  const { data: todosRela } = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`);

  const selectedUsina = ref(null);
  const selectedYear = ref(null);

  const relatorios = ref("");
  const usinaEscolhida = ref("");
  const projecaoUsinaEscolhida = ref("");
  const geracaoUsinaEscolhida = ref("");
  const uniCompUsina = ref("");
  const injecoes = ref("")
  const todasInjecoes = ref("")

  // const projInjecao = ref("")

  const idGeradora = ref("");
  const idAno = ref("");


  
  //PROCURAR UNIDADES DA USINA
    const {data: todasPorcento} = await useFetch(`${API_BASE_URL}/porcentagem`)

    const procurarUnidadesCompensadas = async () => {
        const unidadesCompensadas = []
        const {data: porcentagens} = await useFetch(`${API_BASE_URL}/porcentagem?idGeradora=${selectedUsina.value}`)
        await Promise.all(porcentagens.value.map(async (porcentagem) => {
            const idUnidadeCompensa = porcentagem.idUnidadeCompensa;
                const { data: predio } = await useFetch(`${API_BASE_URL}/unidadecompensacao/${idUnidadeCompensa}`);
                unidadesCompensadas.push(predio._rawValue);
        }));
        return unidadesCompensadas;
    }
  
  let ano = 0
  // PESQUISAR INFORMAÇÕES DO RELATORIO
  const relaIndividual = ref("");
  const pesquisarCompensacao = async () => {
    
    idGeradora.value = selectedUsina.value
    idAno.value = selectedYear.value
    ano = selectedYear.value

    const { data: relatorioPesquisa } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`);
    const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/${idGeradora.value}`); //SELECIONAR A USINA
    const { data: projecaoUsina } = await useFetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${idGeradora.value}&ano=${idAno.value}`); //PROJECAO
    const { data: geracaoUsina } = await useFetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${idGeradora.value}`); //GERACAO
    const { data: injecaoUsina } = await useFetch(`${API_BASE_URL}/relatoriousina?idGeradora=${idGeradora.value}&ano=${idAno.value}`);
    const { data: injecoesGeral } = await useFetch(`${API_BASE_URL}/relatoriousina?idGeradora=${idGeradora.value}`);
    const { data: relatorioInd } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`);
    
    const unidadesCompensadas = await procurarUnidadesCompensadas()

    relatorios.value = relatorioPesquisa;
    usinaEscolhida.value = usinas;
    projecaoUsinaEscolhida.value = projecaoUsina;
    geracaoUsinaEscolhida.value = geracaoUsina;
    uniCompUsina.value = unidadesCompensadas
    injecoes.value = injecaoUsina._rawValue
    todasInjecoes.value = injecoesGeral._rawValue
    relaIndividual.value = relatorioInd 

    injetadoSoma.value = []
    injetadoFalta.value = []
} 
  

  // TROCAR NUMERO POR EXTENSO
const monthNumberToName = (monthNumber) => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril',
      'Maio', 'Junho', 'Julho', 'Agosto',
      'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return monthNames[monthNumber - 1] || '';
  };

  //TROCAR NUMERO PARA EXT NO MES DO PROJ. INJ
  const getMes = (monthNumber) => {
    const monthNames = [
      'jan', 'fev', 'mar', 'abr',
      'mai', 'jun', 'jul', 'ago',
      'set', 'out', 'nov', 'dez'
    ];
    return monthNames[monthNumber - 1] || '';
  }; 

  const getAno = (ano) =>{
    switch(ano){
      case 2026:
        return '25'
        break
      case 2025:
        return '26'
        break
      case 2024:
        return '24'
        break
      case 2023:
        return '23'
        break
    }
  }



  const injetadoSoma = ref([]);
  const injetadoFalta = ref([]);

// CALCULAR QUANTIDADE ANALISE INJECAO:
const calcularResultadoInjecao = (somaInjecao, calculoProjecao, idGeradora, mes, ano, idRelatorio) => {
  
  const calculoEncontradoSoma = injetadoSoma._rawValue.find(item => item.idRelatorio === idRelatorio);
  const calculoEncontradoFalta = injetadoFalta._rawValue.find(item => item.idRelatorio === idRelatorio);
  const calculo = parseInt(somaInjecao - calculoProjecao);
  if(calculoEncontradoSoma){
    return calculo;
  }else{
    if (calculo > 0) {
      // Atribua o novo valor ao ref usando a propriedade .value
      injetadoSoma._rawValue.push({ calculo, idGeradora, ano, mes, idRelatorio });
      return Math.abs(calculo);
    }else{
      if(calculoEncontradoFalta){
        return Math.abs(calculo);
      }else{
        injetadoFalta._rawValue.push({ calculo, idGeradora, ano, mes, idRelatorio });
        return Math.abs(calculo);
      }
    }
  }
}

  // FUNÇÃO DE PESQUISAR (DEIXAR BONITO)
const isLoading = ref(false); 
const handlePesquisar = () => {
    isLoading.value = true;  
  setTimeout(() => {
    if(selectedYear.value){
      pesquisarCompensacao();
    }
    if(anoSelecionado.value){
      pesquisarCompensaNovo();
    }
    isLoading.value = false; 
  }, 2000);
};

  //SELECIONAR CATEGORIA
  const cateSelecionada = ref()

  //SISTEMA GERAR RELATORIO CONSUMO
  /* SELECIONAR TIPO DO PREDIO (SECRETARIA)*/
  const preSelecionado = ref()
  /* SELECIONAR ANO RELTORIO PREDIO */
  const selectedYearConsumo = ref()
  const mesesNomes = [1,2,3,4,5,6,7,8,9,10,11,12];

  /* INFORMAÇÕES SOBRE O PREDIO(RELATORIO)*/
  const prediosEscolhidos = ref()
  

  const pesquisarConsumo = async () => { 

    
    if(!selectedYearConsumo.value){
      return;
    }else{
      const { data: relatorioPesquisa } = await useFetch(`${API_BASE_URL}/relatoriocompensacao?ano=${selectedYearConsumo.value}`);
      const { data: predios } = await useFetch(`${API_BASE_URL}/unidadecompensacao?categoria=${preSelecionado.value}`);

      relatorios.value = relatorioPesquisa._rawValue;
      prediosEscolhidos.value = predios._rawValue
    }

}

/*VERIFICAR O CONSUMO REAIS COM O MES ANTERIOR (ICON)*/
const getAvatarClass = (rela, index, predioId) => {  
  const consumoAtual = ref(0)
  const consumoMesAnterior = ref(0)

  if (rela.mes == 1){  
    consumoAtual.value = rela.consumoReais;  
    consumoMesAnterior.value = todosRela.value.find(item => item.mes === 12 && item.ano === (rela.ano -1) && item.idUnidadeCompensa === predioId)?.consumoReais;
 
  }else{
    consumoAtual.value = rela.consumoReais;
    consumoMesAnterior.value = relatorios.value.find(item => item.mes === mesesNomes[index - 1] && item.idUnidadeCompensa === predioId)?.consumoReais;
  }


  if (parseInt(consumoAtual.value) > parseInt(consumoMesAnterior.value)) {
      return 'bg-lighterror text-error';
  } else if (parseInt(consumoAtual.value) < parseInt(consumoMesAnterior.value)) {
    return 'bg-lightsuccess text-success';
  }

  return 'bg-lightsecondary text-secondary';
};

  /* FUNÇÕES PARA ADICONAR QUANTIDADE AOS MESES QUE POSSUEM CONSUMO IRREGULAR*/
  const mesesConsumoIrregular = ref({
    'E': {  // Educação
      2023: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2024: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2025: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2026: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] }))
    },
    'S': {  // Saúde
      2023: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2024: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2025: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2026: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] }))
    },
    'O': {  // Outros
      2023: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2024: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2025: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2026: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] }))
    },
    'P': {  // Praça
      2023: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2024: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2025: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2026: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] }))
    },
    'I': {  // IP (Iluminação Pública)
      2023: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2024: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2025: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] })),
      2026: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, qtdAcima: 0, unidades: [] }))
    }
  });

  

  const adicionarQtdAcima = (mesAtual, anoAtual, predioId, predioCategoria) => {
    const categoria = mesesConsumoIrregular.value[predioCategoria];
    
    if (!categoria[anoAtual]) {
      categoria[anoAtual] = Array.from({ length: 12 }, (_, i) => ({
        mes: i + 1, qtdAcima: 0, unidades: []
      }));
    }
    // Verifica se o mês atual é válido (1 a 12)
    if (mesAtual >= 1 && mesAtual <= 12) {
      const mes = categoria[anoAtual][mesAtual - 1];
      
      // Verifica se o prédio já foi adicionado para evitar duplicações
      if (!mes.unidades.includes(predioId)) {
        mes.unidades.push(predioId);
        mes.qtdAcima += 1;
      }
    }  
  };





  /*VERIFICAR O CONSUMO REAIS COM O MES ANTERIOR (TEXTO)*/
const getQuantidadeConsumo = (rela, index, predioId) => {
  // console.log("QTDCONSUMO entrou")
  const consumoAtual = ref(0)
  const consumoMesAnterior = ref(0)

  if (rela.mes == 1){  
    consumoAtual.value = rela.consumoReais;  
    consumoMesAnterior.value = todosRela.value.find(item => item.mes === 12 && item.ano === (rela.ano -1) && item.idUnidadeCompensa === predioId)?.consumoReais;
 
  }else{
    consumoAtual.value = rela.consumoReais;
    consumoMesAnterior.value = relatorios.value.find(item => item.mes === mesesNomes[index - 1] && item.idUnidadeCompensa === predioId)?.consumoReais;
  }

  if(consumoMesAnterior.value != null){
    const resultado = (Number(consumoAtual.value) - Number(consumoMesAnterior.value))   
    return Math.abs(resultado.toFixed(2))  
  } else{
    return '-'
  }  
};

/*VERIFICAR O CONSUMO REAIS COM O MES ANTERIOR (background)*/

const getBG = (rela, index, predioId, predioCategoria) =>{
  const consumoAtual = ref(0)
  const consumoMesAnterior = ref(0)

  if (rela.mes == 1){  
    consumoAtual.value = rela.consumoReais;  
    consumoMesAnterior.value = todosRela.value.find(item => item.mes === 12 && item.ano === (rela.ano -1) && item.idUnidadeCompensa === predioId)?.consumoReais;
 
  }else{
    consumoAtual.value = rela.consumoReais;
    consumoMesAnterior.value = relatorios.value.find(item => item.mes === mesesNomes[index - 1] && item.idUnidadeCompensa === predioId)?.consumoReais;
  }
  if(consumoMesAnterior.value != null){
    if (parseInt(consumoAtual.value) > parseInt(consumoMesAnterior.value)) {
      const resultado = (Number(consumoAtual.value) - Number(consumoMesAnterior.value))
      const final = Math.abs(resultado.toFixed(2))  
       
      if(parseInt(final) > 150 && parseInt(final) < 299){
        //amarelo 
        return '#FFF3CE'
      }else if(parseInt(final) > 300 && parseInt(final) < 499){
        //laranja
        return '#FFE0BA'
      }else if(parseInt(final) > 500 && parseInt(final) < 799){
        // vermelho claro
        return '#FFC79A'
      }else if(parseInt(final) > 800){
        adicionarQtdAcima(rela.mes, selectedYearConsumo.value, predioId, predioCategoria);  
        return '#FFA086'
      }
    } else{
      return '-'
    } 
  }

}
  /*TITULO DO RELATORIO*/
  const getStatusLabel = (status) => {
    switch (status) {
      case "E":
        return "Educação";
      case "S":
        return "Saúde";
      case "O":
        return "Outros";
      default:
        return "Desconhecido";
    }
  };

  /*MUDOU CATEGORIA*/
  const mudouCategoria = (cetagoria) =>{
    switch (cetagoria) {
      case "CONSUMO":
          /*RELATORIOS CONSUMO */
          preSelecionado.value = null
          selectedYearConsumo.value = null
          prediosEscolhidos.value = null

          /*RELATÓRIOS INJEÇÃO*/
          selectedUsinaInjetado.value = null
          selectedYearInjetado.value = null
          
          /*RELATORIOS COMEPNSACAO*/
          projecaoUsinaEscolhida.value = null
          selectedUsina.value = null
          selectedYear.value = null

          /* COMPENSA NOVO */
          unidadeSelecionado.value = null
          anoSelecionado.value = null
          CompensaPrediosSelecionados.value = null
          selectedUnidade.value = null
          pesquisaCarregada.value = null

      case "INJETADO":
          /*RELATORIOS CONSUMO */
          preSelecionado.value = null
          selectedYearConsumo.value = null
          prediosEscolhidos.value = null
          injetadoSoma.value = []

          /*RELATÓRIOS INJEÇÃO*/
          selectedUsinaInjetado.value = null 
          selectedYearInjetado.value = null
          
          /*RELATORIOS COMEPNSACAO*/
          projecaoUsinaEscolhida.value = null
          selectedUsina.value = null
          selectedYear.value = null
          injetadoSoma.value = []

          /* COMPENSA NOVO */
          unidadeSelecionado.value = null
          anoSelecionado.value = null
          CompensaPrediosSelecionados.value = null
          selectedUnidade.value = null
          pesquisaCarregada.value = null

      case "COMPENSA":
          /*RELATORIOS CONSUMO */
          preSelecionado.value = null
          selectedYearConsumo.value = null
          prediosEscolhidos.value = null

          /*RELATÓRIOS INJEÇÃO*/
          selectedUsinaInjetado.value = null
          selectedYearInjetado.value = null
          
          /*RELATORIOS COMEPNSACAO*/
          projecaoUsinaEscolhida.value = null
          selectedUsina.value = null
          selectedYear.value = null
          injetadoSoma.value = []

          /* COMPENSA NOVO */
          unidadeSelecionado.value = null
          anoSelecionado.value = null
          CompensaPrediosSelecionados.value = null
          selectedUnidade.value = null
          pesquisaCarregada.value = null

      case "COMPENSANOVO":
          /*RELATORIOS CONSUMO */
          preSelecionado.value = null
          selectedYearConsumo.value = null
          prediosEscolhidos.value = null

          /*RELATÓRIOS INJEÇÃO*/
          selectedUsinaInjetado.value = null
          selectedYearInjetado.value = null
          
          /*RELATORIOS COMEPNSACAO*/
          projecaoUsinaEscolhida.value = null
          selectedUsina.value = null
          selectedYear.value = null
          injetadoSoma.value = []

          /* COMPENSA NOVO */
          unidadeSelecionado.value = null
          anoSelecionado.value = null
          CompensaPrediosSelecionados.value = null
          selectedUnidade.value = null
          pesquisaCarregada.value = null

      default:
        return "";
    }
  }


  //SISTEMA RELATÓRIO INJETADO
  const selectedUsinaInjetado = ref()
  const selectedYearInjetado = ref()

  const usinaEscolhidaInjetado = ref("")
  const relatoriosInjetado = ref("")
  const geracaoUsinaInjetada = ref("")
  const projetadoUsinaInjetada = ref("")
  let usinaId = 0

  const pesquisarInjetado = async () =>{
    
    const { data: relatorioPesquisa } = await useFetch(`${API_BASE_URL}/relatoriousina?idGeradora=${selectedUsinaInjetado.value}&ano=${selectedYearInjetado.value}`);
    const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/${selectedUsinaInjetado.value}`); //SELECIONAR A USINA
    const { data: projecaoUsina } = await useFetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${selectedUsinaInjetado.value}&ano=${selectedYearInjetado.value}`); //PROJECAO
    const { data: geracaoUsina } = await useFetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${selectedUsinaInjetado.value}&ano=${selectedYearInjetado.value}`); //GERACAO

    relatoriosInjetado.value = relatorioPesquisa._rawValue;
    usinaEscolhidaInjetado.value = usinas._rawValue;
    projetadoUsinaInjetada.value = projecaoUsina._rawValue;
    geracaoUsinaInjetada.value = geracaoUsina._rawValue;

  }

  // SISTEMA RELATÓRIO GERAL
  const selectedYearGeral = ref("")
  const somaProjecao = ref("")
  const somaReal = ref("")
  const somaInjetado = ref("")
  const somaInjetadoAnterior = ref("")
  const somaCompensado = ref("")
  const somaSaldoEnergia = ref("")


  const { data: projecao } = await useFetch(`${API_BASE_URL}/projecaogeracao`);
    const somarIndividualProjecao = async (anoId) => {                                                                                                                                                                                                                                                              
        const totalPorMes = projecao.value
            .filter(item => item.ano === parseInt(anoId))
            .reduce((acumulador, item) => {
              const mesAtual = item.mes;
                acumulador[mesAtual] = parseFloat(((acumulador[mesAtual] || 0) + Number(item.projecao)).toFixed(2));
              return acumulador;
            }, {});
            return totalPorMes;
    };

    const { data: real } = await useFetch(`${API_BASE_URL}/relatoriogeracao`);
    const somarIndividualReal = async (anoId) => {
      const totalPorMes = real.value
          .filter(item => item.ano === parseInt(anoId))
          .reduce((acumulador, item) => { 
          const mesAtual = item.mes;
            acumulador[mesAtual] = parseFloat(((acumulador[mesAtual] || 0) + Number(item.geracao)).toFixed(2));
          return acumulador;
          }, {});

          return totalPorMes;
      };
    
    //ANO ATUAL
    const { data: injetado } = await useFetch(`${API_BASE_URL}/relatoriousina`);
    const somarIndividualInjetado = async (anoId) => {
      const totalPorMes = injetado.value
          .filter(item => item.ano === parseInt(anoId))
          .reduce((acumulador, item) => {
          const mesAtual = item.mes;
                acumulador[mesAtual] = parseFloat(((acumulador[mesAtual] || 0) + Number(item.injetadoPonta) + Number(item.injetadoFPonta)).toFixed(2));
          return acumulador; 
          }, {});

          return totalPorMes;
      };

    //COMPENSADO
    const { data: compensado } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`);
    const somarIndividualCompensado = async (anoId) => {
      const totalPorMes = compensado.value
          .filter(item => item.ano === parseInt(anoId))
          .reduce((acumulador, item) => {
          const mesAtual = item.mes;
                acumulador[mesAtual] = parseFloat(((acumulador[mesAtual] || 0) + Number(item.enerInjTUSD)).toFixed(2));
          return (mesAtual, acumulador);
          }, {});

          return totalPorMes;
      };

    const somarIndividualSaldoEnergia = async (anoId) => {
      const totalPorMes = compensado.value
          .filter(item => item.ano === parseInt(anoId))
          .reduce((acumulador, item) => {
          const mesAtual = item.mes;
                acumulador[mesAtual] = parseFloat(((acumulador[mesAtual] || 0) + Number(item.saldoEnergia)).toFixed(2));
                return (mesAtual, acumulador);
          }, {});

          return totalPorMes;
      };
  
  const totalProjetado = ref()
  const totalReal = ref()
  const totalInjetado = ref()
  const totalCompensado = ref()

  const pesquisarGeral = async () => {

      somaProjecao.value = await somarIndividualProjecao(selectedYearGeral.value);
      somaReal.value = await somarIndividualReal(selectedYearGeral.value);
      somaInjetado.value = await somarIndividualInjetado(selectedYearGeral.value);
      somaInjetadoAnterior.value = await somarIndividualInjetado(selectedYearGeral.value - 1);
      somaCompensado.value = await somarIndividualCompensado(selectedYearGeral.value);
      somaSaldoEnergia.value = await somarIndividualSaldoEnergia(selectedYearGeral.value);

      const valoresProjetado = Object.values(somaProjecao.value);
      const valoresReal = Object.values(somaReal.value);
      const valoresInjetados = Object.values(somaInjetado.value);
      const valoresCompensado = Object.values(somaCompensado.value);
 
      console.log("PROJETADO", valoresProjetado)
      totalProjetado.value = parseFloat(valoresProjetado.reduce((total, valor) => total + valor, 0).toFixed(2));
      totalReal.value = parseFloat(valoresReal.reduce((total, valor) => total + valor, 0).toFixed(2));
      totalInjetado.value = parseFloat(valoresInjetados.reduce((total, valor) => total + valor, 0).toFixed(2));
      totalCompensado.value = parseFloat(valoresCompensado.reduce((total, valor) => total + valor, 0).toFixed(2));
 
  }

  const calcularMedia = (relatorios) =>{
    const calculo = ref(0)
    for(rela of relatorios){
      calculo.value += rela.consumoReais 
    }

    return calculo
  }


/* COMPENSAÇÃO NOVO */

const unidadeSelecionado = ref()
const anoSelecionado = ref()
const CompensaPrediosSelecionados = ref()
const selectedUnidade = ref()
const pesquisaCarregada = ref(false)
const injecoesUsinas = ref() 

  //PROCURAR INFORMAÇÕES DO PRÉDIO
  const pesquisarPredios = async () =>{
    const { data: unidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao?categoria=${unidadeSelecionado.value}`);
    CompensaPrediosSelecionados.value = unidades._rawValue
  }

  //PROCURAR UNIDADE
  const infoUnidade = ref()
  const infoUsinas = ref()
  const { data: unidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao`);
  
  const normalizeDate = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };
  //PROCURAR PORCENTAGENS DE ACORDO COM O MES
  const filtrarPorcentagensPorMes = (porcentagens, mesSelecionado) => { 
    return porcentagens.filter((porcentagem) => {
      const dataInicio = new Date(porcentagem.data_inicio);
      const dataFim = porcentagem.data_fim ? new Date(porcentagem.data_fim) : null;
 
      const anoMesSelecionado = new Date(`${anoSelecionado.value}-${String(mesSelecionado).padStart(2, '0')}-02`);
 

      // Verifica se o mês/ano está dentro do intervalo
      // Comparar apenas ano e mês
      const isInPeriod =
        (anoMesSelecionado.getFullYear() > dataInicio.getFullYear() ||
          (anoMesSelecionado.getFullYear() === dataInicio.getFullYear() &&
            anoMesSelecionado.getMonth() >= dataInicio.getMonth())) &&
        (dataFim === null ||
          anoMesSelecionado.getFullYear() < dataFim.getFullYear() ||
          (anoMesSelecionado.getFullYear() === dataFim.getFullYear() &&
            anoMesSelecionado.getMonth() <= dataFim.getMonth()));
 

      return isInPeriod;

    });
  };


  //PROCURAR USINAS GERADORES DA UNIDADE
  const procurarUsinasGeradores = async () => {
    const usinasGeradoras = [];
    
    // Busca todas as porcentagens da unidade selecionada
    const { data: porcentagens } = await useFetch(`${API_BASE_URL}/porcentagem?idUnidadeCompensa=${selectedUnidade.value}`);
    
    // Filtra porcentagens que estão ativas para o mês selecionado
    const porcentagensFiltradas = filtrarPorcentagensPorMes(porcentagens.value, mesSelecionado.value);

    console.log("PORCENTAGENS FILTRADAS: ", porcentagensFiltradas)
    // Busca as usinas relacionadas às porcentagens filtradas
    await Promise.all(
      porcentagensFiltradas.map(async (porcentagem) => {
        const idUsina = porcentagem.idGeradora;
        const { data: usina } = await useFetch(`${API_BASE_URL}/usina/${idUsina}`);
        usinasGeradoras.push({ ...usina._rawValue, porcentagem });
      })
    );
       console.log("USINAS GERADORAS", usinasGeradoras)
    return usinasGeradoras;
  };


  //PROCURAR USINAS DA UNIDADE COMPENSAÇÃO
  const pesquisarCompensaNovo = async () =>{
    pesquisaCarregada.value = true
    const pesquisa = unidades.value.filter(item => item.id === selectedUnidade.value)
    infoUnidade.value = pesquisa[0] //informações da unidade

    const usinasGeradoras = await procurarUsinasGeradores() //compactar as usinas geradores
    infoUsinas.value = usinasGeradoras  //para as usinas geradoras da unidade
    tamanhoProcurar.value = infoUsinas.value.length  //para o total de projeto
    pesquisarRelatorio()// pesquisar relatorio da unidade
    totalProjetoInjetado.value = 0 //zerar para gerar um novo de acordo com a usina

    // gerarRelarios();

  }


  // PROCURAR INJEÇÕES PRÉDIO    
  const { data: injecoesGeral } = await useFetch(`${API_BASE_URL}/relatoriousina`);
  const totalProjetoInjetado = ref(0)

  const {data: porcentagens} = await useFetch(`${API_BASE_URL}/porcentagem`)

  const tamanhoProcurar = ref(0) // diminuir repetições de uso da função

  const procurarInjecao = (idUsina, idUnidade, idSolicitacao) => { 
    
    let mesAnterior = 0
    let anoNaFuncao = 0
    const total = ref(0);

    //VERIFICANDO O MES
    if (mesSelecionado.value === 1) {
      mesAnterior = 12;
      anoNaFuncao = anoSelecionado.value - 1;
    }else{
      mesAnterior = mesSelecionado.value-1
      anoNaFuncao = anoSelecionado.value
    }
 
    //PROCURANDO INJEÇÃO DE ACORDO COM MES E ANO DA USINA
    const resultadoInjecao = injecoesGeral.value.filter(item => 
      item.idGeradora === idUsina && item.mes === mesAnterior && item.ano == anoNaFuncao
    );
     
    if (resultadoInjecao.length > 0) {
      total.value = Number(resultadoInjecao[0].injetadoPonta) + Number(resultadoInjecao[0].injetadoFPonta); 
    }

    // ADICIONAR VALOR DA INJEÇÃO/% AO TOTAL A SER INJETADO NA UNIDADE
    const pesquisaPorcento = porcentagens.value.filter(item => 
      item.idGeradora === idUsina && item.idUnidadeCompensa === idUnidade
    );

    //calculo para add ao total de injeção
    if (idSolicitacao === 1) {
      if (pesquisaPorcento.length > 0) {
        if (tamanhoProcurar.value > 0) {  
          let porcentagem = pesquisaPorcento[0].porcentagem;
          let calculoInjecao = (Number(total.value / 100) * Number(porcentagem)).toFixed(2);
          totalProjetoInjetado.value = (Number(totalProjetoInjetado.value) + Number(calculoInjecao)).toFixed(2); 
          tamanhoProcurar.value--; 
        }
      }
    }

    return total.value; 
     
};

  
  const mesSelecionado = ref(1)
  const somarMes = async () =>{
    totalProjetoInjetado.value = 0
    tamanhoProcurar.value = infoUsinas.value.length  

    if(mesSelecionado.value == 12){
      mesSelecionado.value = 1;
      pesquisarRelatorio()
      pesquisarCompensaNovo()
    }else{
      mesSelecionado.value++;
      pesquisarRelatorio()
      pesquisarCompensaNovo()
    }
  }  
  const diminuirMes = async() =>{
    totalProjetoInjetado.value = 0
    tamanhoProcurar.value = infoUsinas.value.length   

    if(mesSelecionado.value == 1){
      mesSelecionado.value = 12;
      pesquisarRelatorio()
      pesquisarCompensaNovo()
    }else{
      mesSelecionado.value--;
      pesquisarRelatorio()
      pesquisarCompensaNovo()
    }
  }

  

  //CAIXA DE TEXTO
  const labelMes = () => {
    const meses = [
      "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", 
      "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
    ];

    // Retorna o nome do mês com base no valor de mesSelecionado
    return meses[mesSelecionado.value - 1] || "";
  }


  //FILTRAR RELATORIO COMPENSACAO UNIDADE
  const relatorioUnidadeCompensaIndividual = ref()
  
  const pesquisarRelatorio = async () =>{
    const { data: relatorioMensal } = await useFetch(`${API_BASE_URL}/relatoriocompensacao?ano=${anoSelecionado.value}&mes=${mesSelecionado.value}&idUnidadeCompensa=${selectedUnidade.value}`);
    relatorioUnidadeCompensaIndividual.value = relatorioMensal._rawValue
  } 



  //BAIXAR PDF DA PAGINA
  const dataAtual = ref(new Date().toLocaleDateString('pt-BR')); // Formato de data brasileiro

  import html2pdf from 'html2pdf.js';
  const baixarPDF = (Tipo) => {
  // Referência para os elementos
  const tabelaElement = ref();
  const tituloElement = document.getElementById('titulo');

  // Verifica qual tabela utilizar
  if (Tipo == 'Mensal') {
    tabelaElement.value = document.getElementById('tabelaMensalGeral');
  } else if (Tipo == 'Geral') {
    tabelaElement.value = document.getElementById('tabelaGeral');
  }else if (Tipo == 'CompensaIndi'){
    tabelaElement.value = document.getElementById('tabelaCompensa');
  }

  // Verifica se os elementos existem
  if (!tabelaElement.value || !tituloElement) {
    console.error('Elementos não encontrados.');
    return;
  }

  // Cria um contêiner temporário para combinar os elementos
  const tempContainer = document.createElement('div');
    
  // Clona e adiciona o título e a tabela no contêiner temporário
  const clonedTitulo = tituloElement.cloneNode(true);
  const clonedTabela = tabelaElement.value.cloneNode(true);
  
  tempContainer.appendChild(clonedTitulo);
  tempContainer.appendChild(clonedTabela);

  // Gera o PDF usando o contêiner temporário
  html2pdf(tempContainer, {
    margin: 0.5, // Margem em polegadas
    filename: 'relatorio.pdf',
    html2canvas: {
      scale: 3, // Aumenta a qualidade
    },
    jsPDF: {
      unit: 'in',
      format: 'a3', // Tamanho do papel
      orientation: 'landscape', // Orientação do papel
    }
  });
};


  //RELATORIO GERAL
  const mudarVisu = ref(0) //mudar vizu de mensal pra geral
 
  const somarMesGeral = async () =>{  
    if(mesSelecionado.value == 12){
      mesSelecionado.value = 1; 
    }else{
      mesSelecionado.value++; 
    }
  }  
  const diminuirMesGeral = async() =>{  
    if(mesSelecionado.value == 1){
      mesSelecionado.value = 12; 
    }else{
      mesSelecionado.value--; 
    }
  }
 

</script>
<template>
    <!-- BANNER -->
    <v-row>
    <div
      class="v-card v-theme--BLUE_THEME v-card--density-default elevation-10 rounded-md v-card--variant-elevated bg-lightprimary elevation-0 rounded-md mb-8"
    >
      <div class="px-8 py-8 py-lg-0">
        <div class="d-flex justify-space-between">
          <div class="d-flex py-0 align-center">
            <div>
              <h3 class="text-h3 mb-2">Relatórios</h3>
              <ul
                class="v-breadcrumbs v-breadcrumbs--density-default text-h6 font-weight-medium pa-0 ml-n1"
              >
                <!---->
                <li class="v-breadcrumbs-item" text="Dashboard">
                  <a class="v-breadcrumbs-item--link" href="/" style="text-decoration:none"
                    ><h6 class="text-medium-emphasis text-subtitle-1">
                      Gerenciamento
                    </h6></a
                  >
                </li>
                <li class="v-breadcrumbs-divider">
                  <div class="d-flex align-center text-h3 mt-n4">.</div>
                </li>
                <li
                  class="v-breadcrumbs-item v-breadcrumbs-item--disabled"
                  text="Relatórios"
                >
                  <h6 class="text-medium-emphasis text-subtitle-1">Relatórios</h6>
                </li>
                <!----><!---->
              </ul>
            </div>
          </div>
          <div class="d-none py-0 d-lg-block overflow-hidden">
            <div class="mb-n16 mt-3">
              <img src="https://i.imgur.com/9rJgHQv.png" height="200" alt="breadcrumbw" />
            </div>
          </div>
        </div>
      </div>
    </div>
    </v-row>
   
    <!-- TABELAS -->
    <v-row>
        <v-col cols="12" md="12">
            <UiParentCard title="Gerar novos relatórios"> 
                <div class="pa-7 pt-1">
                  <!-- SELECIONAR CATEGORIA -->
                  <v-row justify="space-around" >
                      <v-table>
                        <thead>
                            <tr>
                              <th class="text-center header-cell2 bg-lightprimary" style="color: black; font-size: 16px; ; border: 0px;" colspan="4">
                                Página para geração de relatórios estatíscos sobre as usinas e unidades consumidoras.
                              </th>
                            </tr>
                            <tr>
                              <td class="header-cell2">
                                <v-chip-group mandatory v-model="cateSelecionada" @click="mudouCategoria(cateSelecionada)" selected-class="text-primary">
                                  <v-chip value="CONSUMO">Consumo (Unidade)</v-chip>
                                  <v-chip value="INJETADO">Injetado (Usina)</v-chip>
                                  <v-chip value="COMPENSA">Compensação (Usina)</v-chip>
                                  <v-chip value="COMPENSANOVO">Compensação (Unidade)</v-chip>
                                  <v-chip value="GERAL">Geral</v-chip>
                                </v-chip-group>  
                              </td>
                              
                            </tr>   
                          </thead>
                      </v-table>
                    </v-row>  

                  <!-- RELATORIOS CONSUMO (FEITO)-->
                  <v-row justify="space-around" class="mt-5 mb-2" v-if="cateSelecionada === 'CONSUMO' ">
                    <v-table>
                        <thead>
                            <tr>
                              <th class="text-center header-cell2 bg-lightprimary" style="color: black; font-size: 16px; border: 0px;" colspan="2">
                                Relatório para verificar o consumo dos prédios públicos/iluminação pública.
                              </th>
                            </tr>
                            <tr>
                              <th class="text-center header-cell">CATEGORIA</th>
                              <th class="text-center header-cell">ANO</th>
                            </tr>
                            <tr>
                              <td class="text-center header-cell2">
                                <v-chip-group mandatory @click="pesquisarConsumo" v-model="preSelecionado"  selected-class="text-success">
                                  <v-chip value="E">Educação</v-chip>
                                  <v-chip value="S">Saúde</v-chip>
                                  <v-chip value="O">Outros</v-chip>
                                  <v-chip value="P">Praças</v-chip>
                                  <v-chip value="I">IP</v-chip>
                                </v-chip-group> 
                              </td>
                              <td class="text-center header-cell2">
                                <v-chip-group mandatory @click="pesquisarConsumo"  v-model="selectedYearConsumo" selected-class="text-warning">
                                  <v-chip value="2023">2023</v-chip>
                                  <v-chip value="2024">2024</v-chip>
                                  <v-chip value="2025">2025</v-chip>
                                  <v-chip value="2026">2026</v-chip>
                                </v-chip-group>
                              </td>
                            </tr>
                        </thead>
                    </v-table> 
                  </v-row>

                  <!-- RELATORIOS INJETADO (FEITO)-->
                  <div v-if="cateSelecionada === 'INJETADO' " class="flex-container">
                    <v-row justify="space-around" class="mt-5 mb-2">
                      <v-table>
                        <thead>
                            <tr>
                              <th class="text-center header-cell2 bg-lightprimary" style="color: black; font-size: 16px; ; border: 0px;" colspan="4">
                                Relatório das usinas fotovoltaicas co estatísticas individuais.
                              </th>
                            </tr>  
                            <tr>
                              <th class="text-center header-cell">SELECIONAR USINA</th>
                              <th class="text-center header-cell">ANO</th>
                              <th class="text-center header-cell">🔎</th>
                            </tr>
                            <tr>
                              <td class="header-cell2"  style="padding: 10px">
                                <select v-model="selectedUsinaInjetado" class="custom-select">
                                  <option disabled value="">Selecione...</option>
                                  <option v-for="usina in usinas" :key="usina.id" :value="usina.id">
                                      {{ usina.uc }} - {{ usina.nome }}
                                  </option>
                                </select>
                              </td>
                              <td class="header-cell2">
                                <select v-if="selectedUsinaInjetado" v-model="selectedYearInjetado" class="custom-select" style="width: 100%">
                                    <option disabled value="">Selecione...</option>
                                    <option value="2026">2026</option>
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
                                    <option value="2023">2023</option>
                                </select> 
                              </td>
                              <td class="header-cell2">
                                <v-btn v-if="selectedYearInjetado"   @click="pesquisarInjetado" size="40" icon color="primary" dark :loading="isLoading">
                                    <v-avatar size="30" class="text-white">
                                        <SearchIcon size="17" />
                                    </v-avatar>
                                  <v-tooltip activator="parent" location="bottom">Gerar Relatório</v-tooltip>
                                </v-btn>
                              </td>
                            </tr>
                        </thead>
                      </v-table>
                    </v-row> 
                  </div>

                  <!-- RELATORIOS COMPENSAÇÃO UNIDADE (FEITO)-->
                  <div v-if="cateSelecionada === 'COMPENSA' " class="flex-container">
                    <v-row justify="space-around" class="mt-5 mb-2">
                      <v-table>
                        <thead>
                            <tr>
                              <th class="text-center header-cell2 bg-lightprimary" style="color: black; font-size: 16px; ; border: 0px;" colspan="4">
                                Relatório para verificar as informações usina geradora e todas as unidades que ela está compensando.
                              </th>
                            </tr>  
                            <tr>
                                <th class="text-center header-cell">SELECIONAR USINA </th>
                                <th class="text-center header-cell">ANO</th>
                                <th class="text-center header-cell">🔎</th>
                            </tr>
                            <tr>
                              <td class="header-cell2" style="padding: 10px">
                               <select v-model="selectedUsina" class="custom-select">
                                  <option disabled value="">Selecione...</option>
                                  <option v-for="usina in usinas" :key="usina.id" :value="usina.id">
                                      {{ usina.uc }} - {{ usina.nome }}
                                </option>
                                </select> 
                              </td>
                              <td class="header-cell2" >
                                <select v-if="selectedUsina" v-model="selectedYear" class="custom-select" style="width: 100%">
                                  <option disabled value="">Selecione...</option>
                                  <option value="2026">2026</option>
                                  <option value="2025">2025</option>
                                  <option value="2024">2024</option>
                                  <option value="2023">2023</option>
                                </select>
                              </td>
                              <td class="header-cell2 text-center" >
                                <v-btn v-if="selectedYear" @click="handlePesquisar" size="40" icon color="primary" dark :loading="isLoading" >
                                  <v-avatar size="30" class="text-white">
                                      <SearchIcon size="17" />
                                  </v-avatar>
                                </v-btn>
                                <v-tooltip activator="parent" location="bottom">Gerar Relatório</v-tooltip>
                              </td>
                            </tr>
                          </thead>
                        </v-table>
                      </v-row> 
                  </div>

                  <!-- RELATORIO COMPENSAÇÃO NOVO -->
                  <div v-if="cateSelecionada === 'COMPENSANOVO'" class="flex-container">
                    <v-row justify="space-around" class="mt-5 mb-2">
                      <v-table>
                        <thead>
                            <tr>
                              <th class="text-center header-cell2 bg-lightprimary" style="color: black; font-size: 16px; border: 0px;" colspan="4">
                                Relatório para verificar as informações da unidade consumidora individualmente.
                              </th>
                            </tr>  

                            <tr>
                                <th class="text-center header-cell">CATEGORIA</th>
                                <th class="text-center header-cell">UNIDADE</th>
                                <th class="text-center header-cell">ANO</th>
                                <th class="text-center header-cell">🔎</th>
                            </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td class="header-cell2" style="padding: 10px;">
                              <v-chip-group  mandatory @click="pesquisarPredios" v-model="unidadeSelecionado"  selected-class="text-success">
                                <v-chip value="E">Educação</v-chip>
                                <v-chip value="S">Saúde</v-chip>
                                <v-chip value="O">Outros</v-chip>
                                <v-chip value="I">IP</v-chip>
                                <v-chip value="P">Praça</v-chip>
                              </v-chip-group> 
                            </td>

                            <td class="header-cell2" style="padding: 10px;">
                              <select v-model="selectedUnidade" class="custom-select">
                                <option disabled value="">Selecione...</option>
                                <option v-for="unidade in CompensaPrediosSelecionados" :key="unidade.id" :value="unidade.id">
                                    {{ unidade.uc }} - {{ unidade.nome }}
                                </option>
                              </select>
                            </td>

                            <td class="header-cell2"> 
                              <select  v-model="anoSelecionado" class="custom-select" style="width: 100%">
                                <option disabled value="">Selecione...</option>
                                <option value="2026">2026</option>
                                <option value="2025">2025</option>
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                            </select>
                            </td>

                            <td class="header-cell2">
                              <div v-if="unidadeSelecionado && selectedUnidade && anoSelecionado" class="flex-item " style="padding: 15px;">
                                  <v-btn @click="handlePesquisar" size="40" icon color="primary" dark :loading="isLoading" >
                                      <v-avatar size="30" class="text-white">
                                          <SearchIcon size="17" />
                                      </v-avatar>
                                  <v-tooltip activator="parent" location="bottom">Gerar Relatório</v-tooltip>
                                  </v-btn>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </v-row>
                  </div>
                  
                  <!-- RELATORIOS GERAL -->
                  <div v-if="cateSelecionada === 'GERAL' " class="flex-container">
                    <v-row justify="space-around" class="mt-5 mb-2">
                      <v-table>
                        <thead>
                            <tr>
                              <th class="text-center header-cell2 bg-lightprimary" style="color: black; font-size: 16px; border: 0px;" colspan="4">
                                Relatório GERAL com todas as estatísticas das usinas e unidades.
                              </th>
                            </tr>  
                            <tr>
                                <th class="text-center header-cell">ANO</th> 
                                <th class="text-center header-cell">🔎</th>
                            </tr>
                            <tr>
                              <td style="padding: 10px;" class="header-cell2">
                                <select  v-model="selectedYearGeral" class="custom-select" style="width: 100%">
                                    <option disabled value="">Selecione...</option>
                                    <option value="2026">2026</option>
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
                                    <option value="2023">2023</option>
                                </select>   
                              </td>
                              <td class="header-cell2 text-center">
                                <v-btn v-if="selectedYearGeral" @click="pesquisarGeral" size="40" icon color="primary" dark :loading="isLoading">
                                    <v-avatar size="30" class="text-white">
                                        <SearchIcon size="17" />
                                    </v-avatar>
                                <v-tooltip activator="parent" location="bottom">Gerar Relatório</v-tooltip>
                                </v-btn>
                              </td>
                            </tr>
                        </thead>
                      </v-table>
                    </v-row>
                  </div>
                </div>
                
                <v-divider></v-divider>
                <br>

                <!-- RELATÓRIOS CONSUMO PRÉDIOS PÚBLICOS (FINALIZADO) -->
                <v-card elevation="0" v-if="preSelecionado && selectedYearConsumo && cateSelecionada === 'CONSUMO'">
                    <div class="text-center mb-5">
                        <h2 v-if="!preSelecionado || !selectedYearConsumo">Gerando Relatório</h2>
                        <h2 v-else>Relatório Gerado</h2>
                        <h5>{{ getStatusLabel(preSelecionado) + ' - ' + selectedYearConsumo }} </h5>
                    </div>
                    <v-divider></v-divider>
                    <v-card-text>
                      <v-table class="bordered">
                        <template v-slot:default>
                          <thead>
                            <tr>
                              <th colspan="3"></th>
                              <td v-for="mes in mesesConsumoIrregular[preSelecionado][selectedYearConsumo]" :key="mes" style="padding: 0px; border: 0px">
                                <div class="v-col-sm-12 v-col-md-12 v-col-lg-12  v-col-12">
                                  <div
                                    class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightwarning"
                                  >
                                    <div class="bg-lightwarning">
                                      <AlertTriangleIcon size="30" class="text-warning" />
                                      <div
                                        class="text-subtitle-1 font-weight-bold mt-3 text-warning"
                                      >
                                        Alertas de Consumo <br> <span style="font-size: 12px;">Unidades</span>
                                      </div>
                                      <h4 class="text-h4 mt-1 text-warning">{{ mes.qtdAcima }}</h4>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            <tr>
                                <th colspan="3" style="height: 40px; font-size: 15px;">
                                    <div class="text-center" style="width: 300px;">
                                        Dados
                                    </div>
                                </th>
                                <td style="padding: 0px; width: 200px;" v-for="mes in mesesNomes" :key="mes" rowspan="5">
                                        <div  class="header-cell" style="width: 200px; border: 1px solid #ddd; font-weight: bold; background-color: #f2f2f2; padding: 8px; ">
                                          {{ monthNumberToName(mes) }}
                                        </div>
                                        <div style="display: flex;">
                                            <div  class="header-cell" style="width: 100px; border: 1px solid #ddd; font-weight: bold; background-color: #f2f2f2; padding: 8px;">kWh</div>
                                            <div  class="header-cell" style="width: 100px; border: 1px solid #ddd; font-weight: bold; background-color: #f2f2f2; padding: 8px;">R$</div>
                                        </div>
                                </td>
                            </tr>
                            <tr>
                              <th class="header-cell text-center" rowspan="2" style="height: 40px;">UC</th>
                              <th class="header-cell text-center" rowspan="2" style="height: 40px;">Nome</th>
                              <!-- <th class="header-cell text-center" rowspan="2" style="height: 40px;">Médio</th> -->
                              <th class="header-cell text-center" rowspan="2" style="height: 40px;">Informações</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="predio in prediosEscolhidos" :key="predio.id">
                              <td>{{ predio.uc }}</td>
                              <td>{{ predio.nome }}</td>
                              <!-- <td>{{ calcularMedia(relatorios.filter(item => item.idUnidadeCompensa === predio.id && item.ano === selectedYearConsumo)) }}</td> -->
                              <td  class="sticky-cell" style="padding: 5px; text-align: right">
                                <tr>
                                    <th style="  ">Consumo</th>
                                    <td style="border: none">➔</td>
                                </tr>
                                <tr>
                                    <th style="  ">Status</th>
                                    <td style="border: none">➔</td>
                                </tr>
                                <tr>
                                    <th style="  ">Qtd (R$)</th>
                                    <td style="border: none">➔</td>
                                </tr>
                              </td>

                              <td style="padding-left: 0px; padding-right: 0px;" v-for="(mes, index) in mesesNomes" :key="mes">
                                <div v-for="rela in relatorios.filter(item => item.mes === mes && item.idUnidadeCompensa === predio.id)" :key="rela.id" :style="'background-color: ' + getBG(rela, index, predio.id, predio.secretaria)">
                                    <div style="display: flex;">
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px;">{{ rela.consumokWh }}</div>
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px;">{{ rela.consumoReais }}</div>
                                    </div>
                                    <div style="display: flex;">
                                        <div style="width: 200px; border: 1px solid #ddd; padding: 8px;">
                                          <v-avatar :class="getAvatarClass(rela, index, predio.id)" class="text-center" size="30">
                                              <template v-if="getAvatarClass(rela, index, predio.id) === 'bg-lighterror text-error'">
                                                  <ArrowUpRightIcon size="20" />
                                              </template>
                                              <template v-else-if="getAvatarClass(rela, index, predio.id) === 'bg-lightsuccess text-success'">
                                                  <ArrowDownRightIcon size="20" />
                                              </template>
                                              <template v-else>
                                                  <CheckIcon size="20" />
                                              </template>
                                          </v-avatar>
                                        </div> 
                                    </div>
                                    <div style="display: flex;">
                                        <b><div style="width: 200px; border: 1px solid #ddd; padding: 8px; font-size: 16px;">{{ getQuantidadeConsumo(rela, index, predio.id)}}</div></b> 
                                    </div>
                                </div>
                              </td>

                            </tr>
                          </tbody>
                        </template>
                      </v-table>
                    </v-card-text>
                </v-card>

                <!-- RELATÓRIOS INJETADO USINAS  (FINALIZADO)-->
                <v-card elevation="0" v-if="usinaEscolhidaInjetado && selectedYearInjetado && cateSelecionada === 'INJETADO'">
                    <div class="text-center mb-5">
                        <h2>Relatório Gerado</h2>
                        <h5>{{ usinaEscolhidaInjetado.nome }} - {{ selectedYearInjetado }}</h5>
                    </div>
                    <v-divider></v-divider>
                    <!-- TABELA -->
                    <v-card-text>
                      <v-table class="bordered">
                        <template v-slot:default>
                          <thead>
                            
                            <tr>
                                <th colspan="3" style="height: 40px; font-size: 15px;">
                                    <div class="text-center" style="width: 250px;">
                                        Dados
                                    </div>
                                </th>
                                <td style="padding: 0px; width: 200px;" v-for="mes in mesesNomes" :key="mes" rowspan="5">
                                        <div  class="header-cell" style="width: 200px; border: 1px solid #ddd; font-weight: bold; background-color: #f2f2f2; padding: 8px; ">
                                          {{ monthNumberToName(mes) }}
                                        </div>
                                        <div style="display: flex;">
                                            <div  class="header-cell" style="width: 100px; border: 1px solid #ddd; font-weight: bold; background-color: #f2f2f2; padding: 8px;">kWh</div>
                                            <div  class="header-cell" style="width: 100px; border: 1px solid #ddd; font-weight: bold; background-color: #f2f2f2; padding: 8px;">R$</div>
                                        </div>
                                </td>
                            </tr>
                            <tr>
                              <th class="header-cell text-center" rowspan="2" style="height: 40px;">UC</th>
                              <th class="header-cell text-center" rowspan="2" style="height: 40px;">Nome</th>
                              <th class="header-cell text-center" rowspan="2" style="height: 40px;">Informações</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{{ usinaEscolhidaInjetado.uc }}</td>
                              <td>{{ usinaEscolhidaInjetado.nome }}</td>
                              <td  class="sticky-cell" style="text-align: right; padding: 0px;">
                                  <div style="width: 200px; height: 39px; padding: 8px;">
                                    <strong>Consumo (conta)</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 39px; padding: 8px; color:#5D87FF">
                                    <strong>Geração Projetada</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 39px; padding: 8px; color: #13DEB9">
                                    <strong>Geração Real</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 39px; padding: 8px; color: #FA896B">
                                    <strong>Consumo (geração)</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 39px; padding: 8px; color: #FFAE1F">
                                    <strong>Quantidade Injetada</strong> ➔
                                  </div>
                                  <div style="width: 200px; padding: 8px;">
                                      <v-avatar class="text-center" size="30"></v-avatar>
                                    <strong>Status Injetada</strong> ➔
                                  </div> 
                                  <div style="width: 200px; height: 39px; padding: 8px; color: #e009e8">
                                    <strong>Quantidade Análise</strong> ➔
                                  </div>
                              </td>

                              <td style="padding-left: 0px; padding-right: 0px;" v-for="mes in mesesNomes" :key="mes">
                                <div v-for="rela in relatoriosInjetado.filter(item => item.mes === mes)" :key="rela.id">
                                  <div style="display: flex;" v-if="rela.consumoKWH !== 0 && rela.consumoReais !== 0">
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px;">{{ rela.consumoKWH }}</div>
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px;">{{ rela.consumoReais }}</div>
                                  </div>
                                  <div v-else>
                                    <div style="width: 200px; border: 1px solid #ddd; padding: 6px;">
                                      <v-chip color="success" variant="tonal" style="font-size: 12px; height: 25px;">
                                            Compensando Total
                                      </v-chip>
                                    </div>
                                  </div>
                                  <div style="display: flex;">
                                        <div v-for="projetado in projetadoUsinaInjetada.filter(item => item.mes === mes)" :key="projetado.id" style="width: 200px; border: 1px solid #ddd; padding: 8px; color: #5D87FF">
                                              {{ projetado.projecao }} kWh
                                        </div>
                                    </div>
                                  <div style="display: flex;">
                                        <div v-for="geracao in geracaoUsinaInjetada.filter(item => item.mes === mes)" :key="geracao.id" style="width: 200px; border: 1px solid #ddd; padding: 8px; color: #13DEB9">
                                          {{ geracao.geracao }} kWh
                                        </div>
                                  </div>

                                  <div style="display: flex;">
                                    <div v-for="geracao in geracaoUsinaInjetada.filter(item => item.mes === mes)" :key="geracao.id" style="width: 200px; border: 1px solid #ddd; padding: 8px; color: #FA896B ">
                                      {{ Math.abs(Number(geracao.geracao) - (Number(rela.injetadoPonta) + Number(rela.injetadoFPonta))) }} kWh
                                    </div>
                                  </div>

                                  <div style="display: flex;">
                                        <div style="width: 200px; border: 1px solid #ddd; padding: 8px; color: #FFAE1F">{{ (Number(rela.injetadoPonta) + Number(rela.injetadoFPonta))}} kWh</div>
                                    </div>
                                    <div style="display: flex;">
                                        <div style="width: 200px; border: 1px solid #ddd; padding: 8px;" v-for="injetadoDetalhe in relatoriosInjetado.filter(item => item.mes === mes)" :key="injetadoDetalhe.id">
                                        
                                        <v-avatar size="30" v-if="Number(injetadoDetalhe.injetadoPonta) + Number(injetadoDetalhe.injetadoFPonta) > relatoriosInjetado.filter(item => item.mes === mes-1).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)" class="bg-lightsuccess text-success">
                                            <ArrowUpRightIcon size="20" />
                                        </v-avatar>

                                        <!-- Verifica se a quantidade atual é menor que a do mês anterior -->
                                        <v-avatar size="30" v-else-if="Number(injetadoDetalhe.injetadoPonta) + Number(injetadoDetalhe.injetadoFPonta) < relatoriosInjetado.filter(item => item.mes === mes-1).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)" class="bg-lighterror text-error" >
                                            <ArrowDownRightIcon size="20" />
                                        </v-avatar>

                                        <v-avatar size="30" v-else-if="Number(injetadoDetalhe.injetadoPonta) + Number(injetadoDetalhe.injetadoFPonta) === 0" class="bg-lighterror text-error">
                                            <CircleXIcon size="20" />
                                        </v-avatar>

                                        <!-- Se não for nem maior nem menor, é igual -->
                                        <v-avatar v-else class="bg-lightsecondary text-secondary" size="30">
                                            <CheckIcon size="20" />
                                        </v-avatar>
                                        </div> 
                                    </div>
                                    <div style="display: flex;">
                                        <div style="width: 200px; border: 1px solid #ddd; padding: 8px; color: #e009e8">
                                        {{ (Number(rela.injetadoPonta) + Number(rela.injetadoFPonta)) - (relatoriosInjetado.filter(item => item.mes === mes-1).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)) }}
                                        </div>  
                                    </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </template>
                      </v-table>
                    </v-card-text>
                    <div class="text-center mb-5">
                        <h2>Gráfico</h2>
                    </div>
                    <RelatorioUsina :idUsina="usinaEscolhidaInjetado.id" :ano="selectedYearInjetado"/>
                </v-card>

                <!-- RELATORIOS COMPENSAÇÃO UNIDADE (FINALIZADO)-->
                <v-card elevation="0" v-if="projecaoUsinaEscolhida && cateSelecionada === 'COMPENSA'">
                    <div v-if="projecaoUsinaEscolhida.value.length > 1" class="text-center mb-5">
                        <h2>Relatório Gerado</h2>
                        <h5>{{ usinaEscolhida.value.nome }} - {{ selectedYear }}</h5>
                    </div>
                    <v-divider></v-divider>
                    <v-card-text>
                      <v-table class="bordered">
                        <template v-slot:default>
                          <thead>
                            <tr>
                                <th class="text-center" colspan="4" style="height: 30px; font-size: 15px; position: sticky; top: 0" >Geração Projetada (kWh)</th>
                                <td style="padding: 0px; width: 200px;" v-for="projecao in projecaoUsinaEscolhida.value" :key="projecao.mes" rowspan="5">
                                    <template v-if="projecaoUsinaEscolhida.value.length === 12">
                                        <div  class="header-cell" style="width: 200px; border: 1px solid #ddd; font-weight: bold; background-color: #f2f2f2; padding: 8px; ">
                                            {{ projecao.projecao }}
                                        </div>
                                        <div  class="header-cell" style="width: 200px; border: 1px solid #ddd; font-weight: bold; background-color: #f2f2f2; padding: 8px; " v-for="geracao in geracaoUsinaEscolhida.value.filter((geracao) => geracao.mes === projecao.mes && geracao.ano === projecao.ano)" :key="geracao.mes">
                                            {{ geracao.geracao }}
                                        </div> 
                                        <div  class="header-cell" style="width: 200px; border: 1px solid #ddd; font-weight: bold; background-color: #f2f2f2; padding: 8px; ">
                                            {{ monthNumberToName(projecao.mes) }}
                                        </div>
                                        <div style="display: flex;">
                                            <div style="width: 100px;  font-weight: bold; background: linear-gradient(to bottom, #0249fd, #479be4); color: white; padding: 8px; font-size: 15px;">kWh</div>
                                            <div style="width: 100px;  font-weight: bold; background: linear-gradient(to bottom, #0249fd, #479be4); color: white; padding: 8px; font-size: 15px;">R$</div>
                                        </div>
                                    </template>

                                </td>
                            </tr>
                            <tr>
                                <th  class="sticky-cell" colspan="4" style="text-align: center; height: 40px; font-size: 15px;" >Geração Real (kWh)</th>
                            </tr>  
                            <tr>
                                <th colspan="4" style="text-align: center; height: 40px; font-size: 15px;">
                                    <div>
                                      Dados
                                    </div>
                                </th>
                            </tr>
                            <tr>
                              <th class="header-cell text-center" rowspan="2" style="height: 40px;">UC</th>
                              <th class="header-cell text-center" rowspan="2" style="height: 40px;">Nome</th>
                              <!-- <th class="header-cell text-center" rowspan="2" style="height: 40px;">Médio</th> -->
                              <th class="header-cell text-center" rowspan="2" style="height: 40px;">Porcento(%)</th>
                              <th class="header-cell text-center" rowspan="2" style="height: 40px;">Informações</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="unidade in uniCompUsina" :key="unidade.id">
                              <td>{{ unidade.uc }}</td>
                              <td>{{ unidade.nome }}</td>
                              <!-- <td>{{ unidade.mediaConsumo }}</td> -->
                              <td>
                                <span v-for="porcento in todasPorcento" :key="porcento.id">{{
                                  porcento.idUnidadeCompensa === unidade.id && porcento.idGeradora === usinaEscolhida.value.id ? porcento.porcentagem : ''
                              }}</span>%
                              </td>
                              <td class="sticky-cell text-right" style="padding: 0;">
                                  <div style="width: 200px; height: 39px; padding: 8px;">
                                    <strong>Consumo</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 39px; padding: 8px;">
                                    <strong>Saldo Energia (Crédito)</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 39px; padding: 8px;">
                                    <strong>Inj-TUSD</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 39px; padding: 8px;">
                                    <strong>Inj-TE</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 39px; padding: 8px;">
                                    <strong>Real Injetado</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 39px; padding: 8px;">
                                    <strong>Proj. Injetado	</strong> ➔
                                  </div>
                                  <div style="width: 200px; padding: 8px;">
                                      <v-avatar class="text-center" size="30"></v-avatar>
                                    <strong>Status Injetado</strong> ➔
                                  </div> 
                                  <div style="width: 200px; height: 39px; padding: 8px;">
                                    <strong>Quantidade Análise</strong> ➔
                                  </div>
                              </td>

                              <td style="padding-left: 0px; padding-right: 0px;" v-for="projecao in projecaoUsinaEscolhida.value" :key="projecao.mes">
                                <div v-for="rela in relaIndividual.value.filter(item => item.mes === projecao.mes && item.idUnidadeCompensa === unidade.id && item.ano === projecao.ano)" :key="rela.id">
                                    <!-- CONSUMO -->  
                                    <div style="display: flex;">
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px; color:#FA896B">{{ rela.consumokWh }}</div>
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px; color:#FA896B">{{ rela.consumoReais }}</div>
                                    </div>
                                    <!--SALDO ENERGIA-->
                                    <div style="display: flex;">
                                        <div style="width: 200px; border: 1px solid #ddd; padding: 8px; color:#13DEB9">{{ rela.saldoEnergia ? rela.saldoEnergia : 0 }}</div>
                                    </div>
                                    <!-- INJ TUSD-->  
                                    <div style="display: flex;">
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px; color:#5D87FF ">{{ parseInt(rela.enerInjTUSD) }}</div>
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px; color:#13DEB9 ">{{ rela.valorInjTUSD }}</div>
                                    </div>
                                    <!-- INJ TE -->  
                                    <div style="display: flex;">
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px; color:#5D87FF  ">{{ parseInt(rela.enerInjTE) }}</div>
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px; color:#13DEB9 ">{{ rela.valorInjTE }}</div>
                                    </div>
                                    <!-- REAL INJ-->  
                                    <div style="display: flex;">
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px; color:#5D87FF  ">{{ parseInt(rela.enerInjTE) +  parseInt(rela.enerInjTUSD)}}</div>
                                        <div style="width: 100px; border: 1px solid #ddd; padding: 8px; color:#13DEB9 ">{{ (Number(rela.valorInjTE) + Number(rela.valorInjTUSD)).toFixed(2)}}</div>
                                    </div>

                                    <!-- PROJ INJ. -->
                                    <div style="display: flex;">
                                        <div style="width: 200px; border: 1px solid #ddd; padding: 8px;">
                                          <span v-if="projecao.mes === 1">
                                            <span style="color: #5D87FF" v-for="porcento in todasPorcento.filter(item => item.idUnidadeCompensa === unidade.id && item.idGeradora === usinaEscolhida.value.id)" :key="porcento.id">
                                              {{  
                                               ((porcento.porcentagem / 100) * ((todasInjecoes.filter(item => item.mes === 12 && item.ano === rela.ano-1).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)))).toFixed(2) + " kWh"
                                                                                      
                                              }} 
                                              
                                              <span style="color: #13DEB9; font-size: 11px;">
                                                {{ 
                                                  '(dez/' + getAno(rela.ano-1) + ')'
                                                }}
                                              </span>
                                              
                                            </span>
                                          </span>

                                          <span v-else>
                                            <span style="color: #5D87FF" v-for="porcento in todasPorcento.filter(item => item.idUnidadeCompensa === unidade.id && item.idGeradora === usinaEscolhida.value.id)" :key="porcento.id">
                                              {{  
                                                ((porcento.porcentagem / 100) * ((injecoes.filter(item => item.mes === projecao.mes-1 && item.ano === projecao.ano).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)))).toFixed(2) + " kWh" 
                                              }} 

                                              <span style="color: #13DEB9; font-size: 11px;">
                                                {{ 
                                                  '(' + getMes(rela.mes-1)+ '/' + getAno(rela.ano) + ')'
                                                }}
                                              </span>
                                            </span>
                                          </span>
                                        </div>
                                    </div>

                                    <!-- STATUS E QTD ANÁLISE -->
                                    <div v-if="projecao.mes === 1">
                                      <div v-for="porcento in todasPorcento.filter(item => item.idUnidadeCompensa === unidade.id && item.idGeradora === usinaEscolhida.value.id)" :key="porcento.id">
                                        <div style="display: flex;">
                                            <div style="width: 200px; border: 1px solid #ddd; padding: 8px;"
                                                :style="{ color: (parseInt(rela.enerInjTE) +  parseInt(rela.enerInjTUSD)) < ((porcento.porcentagem / 100) * ((todasInjecoes.filter(item => item.mes === 12 && item.ano === rela.ano-1).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)))).toFixed(2)  ? 'red' : 'green' }">
                                                
                                                <v-chip variant="flat" :color="rela.enerInjTE +  rela.enerInjTUSD < ((porcento.porcentagem / 100) * ((todasInjecoes.filter(item => item.mes === 12 && item.ano === rela.ano-1).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)))).toFixed(2)  ? 'error' : 'success'">
                                                    {{ (parseInt(rela.enerInjTE) +  parseInt(rela.enerInjTUSD)) < ((porcento.porcentagem / 100) * ((todasInjecoes.filter(item => item.mes === 12 && item.ano === rela.ano-1).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)))).toFixed(2)  ? 'Abaixo' : 'Acima' }}
                                                </v-chip>
                                            </div>
                                        </div> 
                                        <div style="display: flex;">
                                            <div style="width: 200px; border: 1px solid #ddd; padding: 8px;">
                                              <!-- {{  parseInt((rela.enerInjTE +  rela.enerInjTUSD) - ((porcento.porcentagem / 100) * ((todasInjecoes.filter(item => item.mes === 12 && item.ano === rela.ano-1).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)))).toFixed(2)) }} kWh -->
                                              {{ calcularResultadoInjecao((parseInt(rela.enerInjTE) +  parseInt(rela.enerInjTUSD)), ((porcento.porcentagem / 100) * ((todasInjecoes.filter(item => item.mes === 12 && item.ano === rela.ano-1).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)))).toFixed(2), usinaEscolhida.value.id, projecao.mes, projecao.ano, rela.id) }} kWh
                                              <!--#SOMA DAR INJECOES, CALCULO DA PROJ INJECAO  -->
                                            </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div v-else>
                                      <div v-for="porcento in todasPorcento.filter(item => item.idUnidadeCompensa === unidade.id && item.idGeradora === usinaEscolhida.value.id)" :key="porcento.id">
                                        <div style="display: flex;">
                                            <div style="width: 200px; border: 1px solid #ddd; padding: 8px;"
                                                :style="{ color:(parseInt(rela.enerInjTE) +  parseInt(rela.enerInjTUSD)) < ((porcento.porcentagem / 100) * ((injecoes.filter(item => item.mes === projecao.mes-1 && item.ano === projecao.ano).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)))).toFixed(2)  ? 'red' : 'green' }">
                                                
                                                <v-chip variant="flat" :color="(parseInt(rela.enerInjTE) +  parseInt(rela.enerInjTUSD)) < ((porcento.porcentagem / 100) * ((injecoes.filter(item => item.mes === projecao.mes-1 && item.ano === projecao.ano).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)))).toFixed(2)  ? 'error' : 'success'">
                                                    {{ (parseInt(rela.enerInjTE) +  parseInt(rela.enerInjTUSD)) < ((porcento.porcentagem / 100) * ((injecoes.filter(item => item.mes === projecao.mes-1 && item.ano === projecao.ano).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)))).toFixed(2)  ? 'Abaixo' : 'Acima' }}
                                                </v-chip>
                                            </div>
                                        </div> 
                                        <div style="display: flex;">
                                            <div style="width: 200px; border: 1px solid #ddd; padding: 8px;">
                                              {{ calcularResultadoInjecao(((parseInt(rela.enerInjTE) +  parseInt(rela.enerInjTUSD))), ((porcento.porcentagem / 100) * ((todasInjecoes.filter(item => item.mes === projecao.mes-1 && item.ano === rela.ano).reduce((total, item) => total + Number(item.injetadoPonta) + Number(item.injetadoFPonta), 0)))).toFixed(2), usinaEscolhida.value.id, projecao.mes, projecao.ano, rela.id) }} kWh

                                            </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <th  class="sticky-cell" colspan="4" style="text-align: center; height: 40px; font-size: 15px; background: linear-gradient(to bottom, #0249fd, #479be4); color: white;" >
                                Injeção de outras usinas  (kWh)
                              </th>
                              <td v-for="mes in mesesNomes" :key="mes" style="padding: 0;" class="text-center">
                                <div style="width: 200px; padding: 8px; color:#13DEB9; font-size: 18px;">
                                  <strong>
                                    {{ injetadoSoma.filter(item => item.mes === mes && item.ano == ano).reduce((total, inj) => total + inj.calculo, 0) }}
                                  </strong>
                                </div>
                              </td>
                            </tr> 
                            <tr>
                              <th  class="sticky-cell" colspan="4" style="text-align: center; height: 40px; font-size: 15px; background: linear-gradient(to bottom, #fd0202, #eb6464); color: white;" >
                                Abaixo do esperado (kWh)
                              </th>
                              <td v-for="mes in mesesNomes" :key="mes" style="padding: 0;" class="text-center" >
                                <div style="width: 200px; padding: 8px; color:#FA896B; font-size: 18px;">
                                  <strong>
                                    {{ Math.abs(injetadoFalta.filter(item => item.mes === mes && item.ano == ano).reduce((total, inj) => total + inj.calculo, 0)) }}
                                  </strong>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </template>
                      </v-table>
                    </v-card-text>
                </v-card>

                <!-- RELATORIOS COMPENSAÇÃO NOVO UNIDADE (FINALIZADO)-->
                <v-card elevation="0" v-if="pesquisaCarregada && cateSelecionada === 'COMPENSANOVO'">
                    <div class="text-center mb-5" id="titulo">
                        <h2>Relatório Gerado</h2>
                        <h5>{{ anoSelecionado }}</h5>
                    </div>
                    <v-divider></v-divider>

                    <!-- CARD MESES -->
                    <!-- <v-row justify="space-around" class="mt-5 mb-2"> 
                        <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
                          <div
                            class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightprimary"
                          >
                            <div class="bg-lightprimary">
                              <ArrowBigUpLineIcon size="30" class="text-primary" />
                              <div
                                class="text-subtitle-1 font-weight-bold mt-3 text-primary"
                              >
                                Acima do Projetado <br> <span style="font-size: 12px;">Mês</span>
                              </div>
                              <h4 class="text-h4 mt-1 text-primary">{{ parseInt(0) }}</h4>
                            </div>
                          </div>
                        </div> 

                        <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
                          <div
                            class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lighterror"
                          >
                            <div class="bg-lighterror">
                              <ArrowBigDownLineIcon size="30" class="text-error" />
                              <div
                                class="text-subtitle-1 font-weight-bold mt-3 text-error"
                              >
                                Abaixo do Projetado <br> <span style="font-size: 12px;">Mês</span>
                              </div>
                              <h4 class="text-h4 mt-1 text-error">{{ parseInt(0) }}</h4>
                            </div>
                          </div>
                        </div>
                    </v-row> -->

                    <!-- TABELA COM ESTATISTICAS -->
                    <v-card-text>
                      <v-table id="tabelaCompensa" class="bordered">
                        <template v-slot:default>
                          <thead>
                            <tr>
                                <th colspan="7" style="font-weight: bold; background: linear-gradient(to bottom, #0249fd, #479be4); color: white; padding: 8px; font-size: 15px; text-align: center; position: relative;">
                                  <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%);">
                                    <v-btn @click="diminuirMes()" size="40" icon color="primary" dark  >
                                        <v-avatar size="30" class="text-white">
                                            <ArrowLeftIcon size="17" />
                                        </v-avatar>
                                      <v-tooltip activator="parent" location="bottom">Voltar Mês</v-tooltip>
                                    </v-btn>
                                  </span>
                                  <span style="font-size: 20px;">
                                    {{ labelMes() }}
                                  </span>
                                  <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%);">
                                    <v-btn @click="somarMes()" size="40" icon color="primary" dark  >
                                        <v-avatar size="30" class="text-white">
                                            <ArrowRightIcon size="17" />
                                        </v-avatar>
                                      <v-tooltip activator="parent" location="bottom">Próximo Mês</v-tooltip>
                                    </v-btn>
                                  </span>
                                </th>
                            </tr>
                            <tr>
                                <th  class="sticky-cell"  style="text-align: center;  font-size: 15px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff);" >Informações Geradoras ➔</th>
                                <th class="text-center" colspan="2" style="padding: 15px; height: 40px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff); font-size: 16px;">Usina</th>
                                <th class="text-center" style="height: 40px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff); font-size: 16px;">%</th>
                                <th class="text-center" style="height: 40px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff); font-size: 14px;">Injetado <br>Mês Anterior (kWh)</th>
                                <th class="text-center" style="height: 40px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff); font-size: 14px;">Projeção <br>Injeção (kWh)</th>
                            </tr>
                            
                            <tr v-for="usina in infoUsinas" :key="usina.id"> 
                              <td>{{ usina.uc }}</td>
                              <td colspan="2">{{ usina.nome }}</td>
                              <td>{{usina.porcentagem.porcentagem}}%</td>
                              <!-- <td   style="padding: 0px;">  
                                <span v-for="porcento in usina.porcentagem" :key="porcento.id">
                                  {{ porcento.porcentagem }}%
                                </span>  
                              </td> -->
                              <td>
                                {{procurarInjecao(usina.id, infoUnidade.id, 1)}}
                              </td>
                              <td>
                                {{ (Number(procurarInjecao(usina.id, 0, 2) / 100) * usina.porcentagem.porcentagem).toFixed(2) }}
                              </td>
                              <!-- <td>
                                <span v-for="porcento in usina.porcentagem" :key="porcento.id">
                                  <div>
                                    {{ (Number(procurarInjecao(usina.id, 0, 2) / 100) * porcento.porcentagem).toFixed(2) }}
                                  </div>
                                </span>
                              </td> -->
                            </tr>

                            <tr>
                              <th style="height: 30px;" colspan="7">
                                <v-divider :thickness="10" class="border-opacity-"></v-divider>
                              </th>
                            </tr>
                            <tr>
                                <th colspan="3" style="text-align: center; height: 40px; font-size: 15px;">
                                    <div>
                                      Dados
                                    </div>
                                </th>
                                <th colspan="2" style="text-align: center; height: 40px; font-size: 15px;">Total Projetado P/ Injeção</th>
                                <th colspan="2" style="text-align: center; height: 40px; font-size: 20px; color: #5D87FF">{{ totalProjetoInjetado}} kWh</th>
                            </tr>
                            <tr>
                              <th class="header-cell text-center" style="height: 40px;">UC</th>
                              <th class="header-cell text-center" style="height: 40px;">Unidade</th>  
                              <th class="header-cell text-center" style="height: 40px;">Informações</th>
                              <th class="header-cell text-center" colspan="2" style="height: 40px; font-size: 17px; padding-right: 110px;">kWh</th>
                              <th class="header-cell text-center" colspan="2" style="height: 40px; font-size: 17px; padding-right: 100px;">R$</th>
                            </tr>
                          </thead>

                          <tbody>
                            <td>{{infoUnidade.uc}}</td>
                            <td>{{infoUnidade.nome}}</td>
                            <td class="sticky-cell text-right" style="padding: 0; width:150px;">
                                  <div style="width: 200px; height: 42px; padding: 8px;">
                                    <strong>Consumo</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 42px; padding: 8px;">
                                    <strong>Saldo Energia (Crédito)</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 42px; padding: 8px;">
                                    <strong>Inj-TUSD</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 42px; padding: 8px;">
                                    <strong>Inj-TE</strong> ➔
                                  </div>
                                  <div style="width: 200px; height: 42px; padding: 8px;">
                                    <strong>Total Injetado</strong> ➔
                                  </div> 
                                  <div style="width: 200px; padding: 8px;">
                                      <v-avatar class="text-center" size="30"></v-avatar>
                                    <strong>Status Injetado</strong> ➔
                                  </div> 
                                  <div style="width: 200px; height: 42px; padding: 8px;">
                                    <strong>Quantidade Análise</strong> ➔
                                  </div>
                              </td>

                              <td colspan="4" style="padding: 0px">
                                <div v-for="rela in relatorioUnidadeCompensaIndividual" :key="rela.id">  
                                  <div style="display: flex;">
                                      <div style="width: 300px; border: 3px solid #ddd; padding: 8px;">{{ rela.consumokWh }}</div>
                                      <div style="width: 300px; border: 3px solid #ddd; padding: 8px;">{{ rela.consumoReais }}</div>
                                  </div>

                                  <div style="display: flex;">
                                      <div style="width: 600px; border: 3px solid #ddd; padding: 8px;">{{ rela.saldoEnergia ? rela.saldoEnergia : 0 }}</div> 
                                  </div> 

                                  <div style="display: flex;">
                                      <div style="width: 300px; border: 3px solid #ddd; padding: 8px;">{{parseInt(rela.enerInjTUSD)}}</div>
                                      <div style="width: 300px; border: 3px solid #ddd; padding: 8px;">{{rela.valorInjTUSD}}</div>
                                  </div>

                                  <div style="display: flex;">
                                      <div style="width: 300px; border: 3px solid #ddd; padding: 8px;">{{parseInt(rela.enerInjTE) }}</div>
                                      <div style="width: 300px; border: 3px solid #ddd; padding: 8px;">{{ rela.valorInjTE }}</div>
                                  </div>

                                  <div style="display: flex;">
                                      <div style="width: 300px; border: 3px solid #ddd; padding: 8px;">{{ parseInt(rela.enerInjTE) +  parseInt(rela.enerInjTUSD) }}</div>
                                      <div style="width: 300px; border: 3px solid #ddd; padding: 8px;">{{  (Number(rela.valorInjTE) + Number(rela.valorInjTUSD)).toFixed(2) }}</div>
                                  </div>

                                  <div style="display: flex;">
                                      <div style="width: 600px; border: 3px solid #ddd; padding: 8px;"> 
                                            <v-chip variant="flat" :color="(parseInt(rela.enerInjTE)) < totalProjetoInjetado  ? 'error' : 'success'">
                                                {{ (parseInt(rela.enerInjTE)) < totalProjetoInjetado  ? 'Abaixo' : 'Acima'}}
                                            </v-chip> 
                                      </div> 
                                  </div>

                                  <div style="display: flex;">
                                      <div style="width: 600px; border: 3px solid #ddd; padding: 8px;"> 
                                        <strong>{{ Math.abs((parseInt(rela.enerInjTE)) - totalProjetoInjetado).toFixed(2) }} kWh</strong>
                                      </div> 
                                  </div>
                                </div>
                              </td>
                          </tbody>
                        </template>
                      </v-table>
                      <v-row justify="space-around" style="margin:15px;">
                        <v-btn @click="baixarPDF('CompensaIndi')" color="error">
                          <v-avatar size="30" class="text-white">
                              <FileTextIcon  />
                          </v-avatar>
                          Gerar PDF
                        </v-btn>
                      </v-row>
                    </v-card-text>
                </v-card>

                <!-- RELATÓRIO GERAL -->
                <v-card elevation="0" v-if="totalProjetado && cateSelecionada === 'GERAL'">
                  <div>
                    <div id="titulo">
                      <div class="text-center mb-5">
                        <br>
                        <br> 
                        <br> 
                        <h2 v-if=" !selectedYearGeral">Gerando Relatório</h2>
                        <h2 v-else>Relatório Gerado</h2>
                        <h5>{{selectedYearGeral }} </h5>
                      </div>
                      <div class="footer">
                        PEE Horto - Administrativo
                        <p>Informações geradas no dia: {{ dataAtual }}</p>
                      </div>  
                    </div>
                    
                    <v-divider></v-divider>
                    <!-- INFOS GERAIS -->
                    <v-row class="pa-5" id="tabelaGeral">
                    <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
                      <div
                        class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightprimary"
                      >
                        <div class="bg-lightprimary">
                          <BoltIcon size="30" class="text-primary" />
                          <div
                            class="text-subtitle-1 font-weight-bold mt-3 text-primary"
                          >
                            Projetada <br> <span style="font-size: 12px;">kWh</span>
                          </div>
                          <h4 class="text-h4 mt-1 text-primary">{{ parseInt(totalProjetado) }}</h4>
                        </div>
                      </div>
                    </div>
                    <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
                      <div
                        class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightsuccess"
                      >
                        <div class="bg-lightsuccess">
                          <SettingsIcon size="30" class="text-success" />
                          <div
                            class="text-subtitle-1  font-weight-bold mt-3 text-success"
                          >
                            Real <br> <span style="font-size: 12px;">kWh</span>
                          </div>
                          <h4 class="text-h4 mt-1 text-success">{{ parseInt(totalReal) }}</h4>
                        </div>
                      </div>
                    </div>
                    <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
                      <div
                        class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightwarning"
                      >
                        <div class="bg-lightwarning">
                          <NetworkIcon size="30" class="text-warning" />
                          <div
                            class="text-subtitle-1 font-weight-bold mt-3 text-warning"
                          >
                            Injetado <br> <span style="font-size: 12px;">kWh</span>
                          </div>
                          <h4 class="text-h4 mt-1 text-warning">{{ parseInt(totalInjetado) }}</h4>
                        </div>
                      </div>
                    </div>


                    <div class="v-col-sm-4 v-col-md-4 v-col-lg-3 v-col-12">
                      <div
                        class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightsecondary"
                      >
                        <div class="bg-lightsecondary">
                          <BuildingIcon size="30" class="text-secondary" />
                          <div
                            class="text-subtitle-1  font-weight-bold mt-3 text-secondary"
                          >
                            Compensado <br> <span style="font-size: 12px;">kWh</span>
                          </div>
                          <h4 class="text-h4 mt-1 text-secondary">{{ parseInt(totalCompensado) }}</h4>
                        </div>
                      </div>
                    </div>
                     
                    </v-row>
                  </div>

                  <!-- BOTOES PDF E VIZUALIZAÇÃO -->
                  <v-row justify="space-around">
                      
                    <v-btn @click="baixarPDF('Geral')" color="error">
                      <v-avatar size="30" class="text-white">
                          <FileTextIcon  />
                      </v-avatar>
                      PDF Geral
                    </v-btn>
                    <v-btn @click="mudarVisu === 0 ? mudarVisu = 1 : mudarVisu = 0" size="40" icon class="bg-primary mt-2 ml-5 mr-5 mb-2">
                        <v-avatar size="30" class="text-white">
                            <ExchangeIcon size="20" />
                        </v-avatar>
                        <v-tooltip activator="parent" location="bottom">Trocar visualização</v-tooltip>
                    </v-btn>
                    <v-btn @click="baixarPDF('Mensal')" color="error">
                      <v-avatar size="30" class="text-white">
                          <FileTextIcon  />
                      </v-avatar>
                      PDF Mensal
                    </v-btn>
                  </v-row>
                    
                    
                     <!-- TABELA GERAL MENSAL -->
                     <v-card-text v-if="mudarVisu == 0" id="tabelaMensalGeral">
                      <v-table class="bordered">
                        <template v-slot:default>
                          <thead>
                            <tr>
                                <th colspan="8" style="font-weight: bold; background: linear-gradient(to bottom, #0249fd, #479be4); color: white; padding: 8px; font-size: 15px; text-align: center; position: relative;">
                                  <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%);">
                                    <v-btn @click="diminuirMesGeral()" size="40" icon color="primary" dark  >
                                        <v-avatar size="30" class="text-white">
                                            <ArrowLeftIcon size="17" />
                                        </v-avatar>
                                      <v-tooltip activator="parent" location="bottom">Voltar Mês</v-tooltip>
                                    </v-btn>
                                  </span>
                                  <span style="font-size: 20px;">
                                    {{ labelMes() }}
                                  </span>
                                  <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%);">
                                    <v-btn @click="somarMesGeral()" size="40" icon color="primary" dark  >
                                        <v-avatar size="30" class="text-white">
                                            <ArrowRightIcon size="17" />
                                        </v-avatar>
                                      <v-tooltip activator="parent" location="bottom">Próximo Mês</v-tooltip>
                                    </v-btn>
                                  </span>
                                </th>
                            </tr>
                            <tr>
                                <th class="sticky-cell" style="text-align: center;  font-size: 15px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff);" >Projetada<span style="font-size: 10px; margin: 0; display: block;">kWh</span></th>
                                <th class="text-center" style="padding: 15px; height: 40px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff); font-size: 16px;">Real<span style="font-size: 10px; margin: 0; display: block;">kWh</span></th>
                                <th class="text-center" style="height: 40px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff); font-size: 16px;">Injetado<span style="font-size: 10px; margin: 0; display: block;">kWh</span></th>
                                <th class="text-center" style="height: 40px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff); font-size: 14px;">Saldo<span style="font-size: 10px; margin: 0; display: block;">kWh</span></th>
                                <th class="text-center" style="height: 40px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff); font-size: 14px;">Compensado<span style="font-size: 10px; margin: 0; display: block;">kWh</span></th>
                                <th class="text-center" style="height: 40px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff); font-size: 14px;">Status Compensado</th>
                                <th class="text-center" style="height: 40px; background: linear-gradient(to bottom, #8fb9ff, #b0d4ff); font-size: 14px;">Crédito Comp./Inj<span style="font-size: 10px; margin: 0; display: block;">kWh</span></th>
                            </tr>
                            
                            <tr> 
                              <td>{{somaProjecao[mesSelecionado]}}</td>
                              <td>{{somaReal[mesSelecionado]}}</td>
                              <td>{{somaInjetado[mesSelecionado]}}</td>
                              <td>{{somaSaldoEnergia[mesSelecionado]}}</td>
                              <td>{{somaCompensado[mesSelecionado]}}</td>
                              <td> 
                                <span v-if="mesSelecionado == 1">
                                  <span v-if="somaCompensado[mesSelecionado] - somaInjetadoAnterior[12]"> 
                                    <v-avatar :class="parseInt(somaCompensado[mesSelecionado] - somaInjetadoAnterior[12]) > 0 ? 'bg-lightsuccess text-success' : 'bg-lighterror text-error'" class="text-center" size="30">
                                        <template v-if="parseInt(somaCompensado[mesSelecionado] - somaInjetadoAnterior[12]) > 0">
                                            <ArrowUpRightIcon size="20" />
                                        </template>
                                        <template v-else>
                                            <ArrowDownRightIcon size="20" />
                                        </template> 
                                    </v-avatar>  
                                  </span>
                                  <span v-else>
                                    s/inj. dez.
                                  </span>
                                </span>
                                <v-avatar v-else :class="parseInt(somaCompensado[mesSelecionado] - somaInjetado[mesSelecionado-1]) > 0 ? 'bg-lightsuccess text-success' : 'bg-lighterror text-error'" class="text-center" size="30">
                                    <template v-if="parseInt(somaCompensado[mesSelecionado] - somaInjetado[mesSelecionado-1]) > 0">
                                        <ArrowUpRightIcon size="20" />
                                    </template>
                                    <template v-else>
                                        <ArrowDownRightIcon size="20" />
                                    </template> 
                                </v-avatar>
                              </td>
                              <td>
                                 <span v-if="mesSelecionado == 1">
                                  <span v-if="somaCompensado[mesSelecionado] - somaInjetadoAnterior[12]">
                                    <v-chip color="secondary" variant="flat" class="pa-2"> 
                                      {{ parseInt(somaCompensado[mesSelecionado] - somaInjetadoAnterior[12]) }}
                                    </v-chip>
                                    
                                  </span>
                                  <span v-else>
                                    s/inj. dez.
                                  </span>
                                 </span> 
                                 <span v-else>
                                    <v-chip color="secondary" variant="flat" class="pa-2">
                                      {{ Math.abs(parseInt(somaCompensado[mesSelecionado] - somaInjetado[mesSelecionado-1])) }}  
                                    </v-chip>
                                 </span>
                                </td>
                               
                            </tr>
                          </thead>
                        </template>
                      </v-table> 
                    </v-card-text>

                    <!-- TABELA GERAL ANUAL -->
                    <v-card-text v-if="mudarVisu == 1">
                      <v-table class="bordered">
                        <template v-slot:default>
                          <thead>
                            
                            <tr>
                                <th  style="height: 40px; font-size: 15px;">
                                    <div class="text-center"  >
                                        Dados
                                    </div>
                                </th>
                                <td style="padding: 0px; width: 200px; border: none;" v-for="mes in mesesNomes" :key="mes">
                                        <div  class="header-cell" style="width: 200px; border: 1px solid #ddd; font-weight: bold; background-color: #f2f2f2; padding: 8px; ">
                                          {{ monthNumberToName(mes) }}
                                        </div>
                                </td>
                            </tr>
                            
                          </thead>
                          <tbody>
                            <tr>
                              <td class="sticky-cell text-right" style="padding: 0;" rowspan="8">
                                <div class="header-cell2" style="width: 200px; height: 39px; padding: 8px; color: #5D87FF">
                                    <strong>Geração Projetada</strong> ➔
                                </div>  
                                <div class="header-cell2" style="width: 200px; height: 39px; padding: 8px; color: #13DEB9">
                                    <strong>Geração Real</strong> ➔
                                  </div>
                                  <div class="header-cell2" style="width: 200px; height: 39px; padding: 8px; color: #FFAE1F">
                                    <strong>Injetado</strong> ➔
                                  </div>
                                  
                                  <div class="header-cell2" style="width: 200px; height: 39px; padding: 8px; color: #000000">
                                    <strong>Saldo Energia</strong> ➔
                                  </div>
                                  <div class="header-cell2" style="width: 200px; height: 39px; padding: 8px; color: #e009e8">
                                    <strong>Compensado</strong> ➔
                                  </div>
                                  <div class="header-cell" style="width: 200px; height: 39px; padding: 8px;">
                                    <strong>Status Compensado</strong> ➔
                                  </div>
                                  <div class="header-cell" style="width: 200px; height: 39px; padding: 8px;">
                                    <strong>Crédito Comp./Inj.</strong> ➔
                                  </div>
                                </td>
                              </tr>
                              <tr>
                                <td v-for="mesProjecao in somaProjecao" :key="mesProjecao" style="height: 39px; color: #5D87FF ">
                                  <span>{{ parseInt(mesProjecao) }}</span>  
                                </td>
                              </tr>
                              <tr>
                                <td v-for="mesReal in somaReal" :key="mesReal" style="height: 39px; color: #13DEB9">
                                  <span>{{ parseInt(mesReal) }}</span>
                                </td>
                              </tr>
                              <tr>
                                <td v-for="mesInjetado in somaInjetado" :key="mesInjetado" style="height: 39px; color: #FFAE1F">
                                  <span>{{ parseInt(mesInjetado) }}</span>
                                </td>
                              </tr>
                              <tr>
                                <td v-for="mesSaldo in somaSaldoEnergia" :key="mesSaldo" style="height: 39px; color: #000000">
                                  <span>{{ parseInt(mesSaldo) }}</span>
                                </td>
                              </tr>
                              <tr>
                                <td v-for="mesCompensado in somaCompensado" :key="mesCompensado" style="height: 39px; color: #e009e8">
                                  <span>{{ parseInt(mesCompensado) }}</span>
                                </td>
                              </tr>
                              <tr>
                                <td v-for="(mesCompensado, index) in somaCompensado" :key="mesCompensado" style="height: 39px; background-color: #afc6ff">
                                 <span v-if="index == 1">
                                  <span v-if="mesCompensado - somaInjetadoAnterior[12]"> 
                                    <v-avatar :class="parseInt(mesCompensado - somaInjetadoAnterior[12]) > 0 ? 'bg-lightsuccess text-success' : 'bg-lighterror text-error'" class="text-center" size="30">
                                        <template v-if="parseInt(mesCompensado - somaInjetadoAnterior[12]) > 0">
                                            <ArrowUpRightIcon size="20" />
                                        </template>
                                        <template v-else>
                                            <ArrowDownRightIcon size="20" />
                                        </template> 
                                    </v-avatar>  
                                  </span>
                                  <span v-else>
                                    s/inj. dez.
                                  </span>
                                 </span>  


                                 <v-avatar v-else :class="parseInt(mesCompensado - somaInjetado[index-1]) > 0 ? 'bg-lightsuccess text-success' : 'bg-lighterror text-error'" class="text-center" size="30">
                                      <template v-if="parseInt(mesCompensado - somaInjetado[index-1]) > 0">
                                          <ArrowUpRightIcon size="20" />
                                      </template>
                                      <template v-else>
                                          <ArrowDownRightIcon size="20" />
                                      </template> 
                                  </v-avatar>
                                </td>

                              </tr>
                              <tr>
                                <td v-for="(mesCompensado, index) in somaCompensado" :key="mesCompensado" style="height: 39px; background-color: #c3d3fa;">
                                 <span v-if="index == 1">
                                  <span v-if="mesCompensado - somaInjetadoAnterior[12]">
                                    {{ parseInt(mesCompensado - somaInjetadoAnterior[12]) }}
                                  </span>
                                  <span v-else>
                                    s/inj. dez.
                                  </span>
                                 </span> 
                                 <span v-else>
                                    <v-chip color="secondary" variant="flat" class="pa-2">
                                      {{ Math.abs(parseInt(mesCompensado - somaInjetado[index-1])) }}  
                                    </v-chip>
                                 </span>
                                </td>
                              </tr>
                          </tbody>
                        </template>
                      </v-table> 

                    </v-card-text>
                </v-card>

            </UiParentCard>
        </v-col>
    </v-row>
</template>
<style scoped>
    .custom-select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ced4da;
    border-radius: 5px;
    font-size: 16px;
    color: #495057;
    background-color: #fff;
    background-image: none;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }

  .custom-select:focus {
    border-color: #80bdff;
    outline: 0;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }

  .custom-btn {
    margin-left: 15px;
  }

  .button-container {
    display: flex;
    align-items: center;
  }

  .bordered td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: center;
  }

  .header-cell { 
  padding: 8px;
  background: linear-gradient(to bottom, #4d7fff, #1e73be);
  color: white;
  font-weight: bold;
}
  .header-cell2 { 
    border: 2px solid #afc6ff;
    padding: 8px;  
    font-weight: bold;
  }

  .footer {
  text-align: center;
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  margin: auto;
  font-size: 12px;
  color: #000;
}
</style>