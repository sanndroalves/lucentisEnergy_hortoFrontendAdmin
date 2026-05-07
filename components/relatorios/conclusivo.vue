<script setup>
import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import * as XLSX from "xlsx";

useHead ({ title: 'Conclusivo' });
definePageMeta({ middleware: 'sidebase-auth' })

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
        const relatoriosOrdenados = relatoriosDaUnidade.sort((a, b) => {
          if (b.ano === a.ano) return b.mes - a.mes;
          return b.ano - a.ano;
        });
        const ultimos6Relatorios = relatoriosOrdenados.slice(0, 6);
        const somaConsumo = ultimos6Relatorios.reduce((soma, item) => soma + parseFloat(item.consumokWh || 0), 0);
        const mediaConsumo = somaConsumo / ultimos6Relatorios.length; 
        unidade.mediaConsumo = mediaConsumo.toFixed(2);
        const ultimos3Relatorios = relatoriosOrdenados.slice(0, 3);
        const saldoEnergiaPreenchido = ultimos3Relatorios.every(item => parseFloat(item.saldoEnergia || 0) !== 0);
        const saldoEnergiaStatus = saldoEnergiaPreenchido ? "True" : "False";
        unidadesComMediaConsumo.value.push({ uc: unidade.uc, nome: unidade.nome, mediaConsumo: unidade.mediaConsumo, saldoEnergia: saldoEnergiaStatus, status: unidade.status, tensao: unidade.tensao, endereco: unidade.endereco });
      } else {
        unidade.mediaConsumo = 0;
        unidadesComMediaConsumo.value.push({ uc: unidade.uc, nome: unidade.nome, mediaConsumo: unidade.mediaConsumo, saldoEnergia: "False", status: unidade.status, tensao: unidade.tensao, endereco: unidade.endereco });
      }
    } 
    unidadesComMediaConsumo.value.sort((a, b) => b.mediaConsumo - a.mediaConsumo);
  };

  onMounted(async () => { await fetchData(); });

  const exportarParaExcel = async (tipo) => {
    await calcularMediaConsumo(tipo);
    if (unidadesComMediaConsumo.value.length === 0) { alert("Nenhum dado disponível para exportar."); return; }
    const dados = unidadesComMediaConsumo.value.map(unidade => ({ UC: unidade.uc, Nome: unidade.nome, "Consumo Médio (kWh)": unidade.mediaConsumo, "Saldo": unidade.saldoEnergia, "Status": unidade.status, "Tensão": unidade.tensao, "Endereço": unidade.endereco }));
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Unidades");
    if(tipo == 'PREDIO'){ XLSX.writeFile(workbook, "UC_Predios.xlsx"); } else { XLSX.writeFile(workbook, "UC_CIP.xlsx"); }
  };

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
      if (!totalPorMesAno[chave]) { totalPorMesAno[chave] = { energiaTotal: 0, valorTotal: 0, saldoEnergiaTotal: 0 }; }
      totalPorMesAno[chave].energiaTotal += energiaTotal;
      totalPorMesAno[chave].valorTotal += valorTotal;
      totalPorMesAno[chave].saldoEnergiaTotal += saldoEnergia;
    });
    for (const chave in totalPorMesAno) {
      totalPorMesAno[chave].energiaTotal = parseFloat(totalPorMesAno[chave].energiaTotal.toFixed(2));
      totalPorMesAno[chave].valorTotal = parseFloat(totalPorMesAno[chave].valorTotal.toFixed(2));
      totalPorMesAno[chave].saldoEnergiaTotal = parseFloat(totalPorMesAno[chave].saldoEnergiaTotal.toFixed(2));
    }
    return totalPorMesAno;
  };

  const exportarParaExcel2 = async () => {
    const totalPorMesAno = await somarIndividualCompensado();
    const dados = Object.entries(totalPorMesAno).map(([chave, valores]) => ({ "Ano-Mês": chave, "Energia Compensada (kWh)": valores.energiaTotal, "Valor Compensado (R$)": valores.valorTotal, "Saldo de Energia (kWh)": valores.saldoEnergiaTotal })).sort((a, b) => { const valorA = parseInt(a["Ano-Mês"].replace("-", "")); const valorB = parseInt(b["Ano-Mês"].replace("-", "")); return valorB - valorA; });
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resumo Mensal");
    XLSX.writeFile(workbook, "Resumo_Mensal_Compensado.xlsx");
  };

  const extrairEExportar6meses = async (tipo) => {
    const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`); 
    if (tipo === 'PREDIO') { unidades.value = unidades.value.filter(item => (item.secretaria === 'E' || item.secretaria === 'S' || item.secretaria === 'O') && (item.status === 'L' || item.status === 'D')); }
    else if (tipo === 'IP') { unidades.value = unidades.value.filter(item => item.secretaria === 'I' || item.secretaria === 'P'); }
    const dadosParaExportar = [];
    const nomeMes = (num) => { const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; return meses[num - 1] || '??'; };
    for (const unidade of unidades.value) {
      const relatoriosDaUnidade = relatorios.value.filter(item => item.idUnidadeCompensa === unidade.id); 
      if (relatoriosDaUnidade.length > 0) {
        const relatoriosOrdenados = relatoriosDaUnidade.sort((a, b) => { if (b.ano === a.ano) return b.mes - a.mes; return b.ano - a.ano; });
        const ultimos6Relatorios = relatoriosOrdenados.slice(0, 13); 
        const linha = { UC: unidade.uc, Nome: unidade.nome, Status: unidade.status, Endereço: unidade.endereco, Tensão: unidade.tensao, Secretaria: unidade.secretaria, MédioAPI: unidade.mediaConsumo || 0 };
        let consumoMaisAntigo = 0; let consumoMaisRecente = 0; let somaConsumo = 0; let totalConsumos = 0; let maiorConsumo = 0;
        ultimos6Relatorios.forEach((r, idx) => {
          const chave = `${nomeMes(r.mes)}/${r.ano}`; const consumo = Number(r.consumokWh) || 0; linha[chave] = consumo;
          somaConsumo += consumo; totalConsumos++; if (consumo > maiorConsumo) maiorConsumo = consumo;
          if (idx === ultimos6Relatorios.length - 1) consumoMaisAntigo = consumo; if (idx === 0) consumoMaisRecente = consumo;
        });
        const media = totalConsumos > 0 ? somaConsumo / totalConsumos : 0; linha["MédioSistema"] = `${media.toFixed(2)} kWh`; linha["MaiorConsumo"] = `${maiorConsumo} kWh`;
        let variacao = 0; if (consumoMaisAntigo > 0) { variacao = ((consumoMaisRecente - consumoMaisAntigo) / consumoMaisAntigo) * 100; }
        linha["Variação %"] = consumoMaisAntigo === 0 ? 'N/A' : `${variacao.toFixed(1)}%`;
        if (variacao > 25) { linha["Alerta"] = "AUMENTO ALTO"; } else if (variacao < -20) { linha["Alerta"] = "REDUÇÃO SIGNIFICATIVA"; } else { linha["Alerta"] = "OK"; }
        dadosParaExportar.push(linha);
      }
    }
    const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Últimos 8 Meses"); XLSX.writeFile(workbook, `Consumo_8_Meses_${tipo}.xlsx`);
  };

  const { data: geracoes } = await useFetch(`${API_BASE_URL}/relatoriogeracao`); 
  const { data: projecoes } = await useFetch(`${API_BASE_URL}/projecaogeracao`); 
  const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao`); 
  const { data: relatorio_usinas } = await useFetch(`${API_BASE_URL}/relatoriousina`);
  const { data: usinas_conclusivo } = await useFetch(`${API_BASE_URL}/usina/`);

  const mesAnoSelecionado = ref(null)
  const dialogRelatorioPDF = ref(false)
  const periodo_mes = ref(null)
  const periodo_ano = ref(null)
  const projecao_total = ref(null)
  const geracao_total = ref(null)
  const consumo_total = ref(null)
  const saldo_liquido = ref(null)
  const economia_total = ref(null)
  const co2_evitado = ref(0)
  const arvores_equivalente = ref(0)
  const energia_compensada = ref(0)
  const energia_injetada = ref(0)
  const taxa_autossuficiencia_predios = ref(0)
  const taxa_autossuficiencia_ip = ref(0)
  const custo_evitado_total = ref(0)
  const custo_autoconsumo_total = ref(0)
  const economia_ate_hoje = ref(0)
  const economia_do_ano = ref(0)
  const payback_acumulado = ref(0)
  const ranking_mais_compensacao = ref([]);
  const ranking_mais_consumo = ref([]);
  const ranking_mais_economia = ref([]);
  const ranking_mais_geracao = ref([]);
  const ranking_mais_saldo = ref([]);
  const ranking_maior_aumento_consumo = ref([]);
  const ranking_maior_reducao_consumo = ref([]);
  const co2_evitado_acumulado = ref(0)
  const usinas_desempenho = ref([]);
  const projecao_geracao = ref(0);

  const abrirDialog = () =>{ 
    dialogRelatorioPDF.value = true
    const [ano, mes] = mesAnoSelecionado.value.split('-')
    periodo_ano.value = Number(ano)
    periodo_mes.value = Number(mes)
    projecao_total.value = somarProjecoesPorMesAno(Number(ano), Number(mes))
    geracao_total.value = somarGeracaoPorMesAno(Number(ano), Number(mes))
    consumo_total.value = somarConsumoPorMesAno(Number(ano), Number(mes))
    saldo_liquido.value = somarSaldoPorMesAno(Number(ano), Number(mes))
    economia_total.value = somarEconomiaPorMesAno(Number(ano), Number(mes))
    co2_evitado.value = calcularCo2Evitado()
    arvores_equivalente.value = calcularArvoresEquivalente()
    energia_compensada.value = calcularEnergiaCompensada(Number(ano), Number(mes))
    energia_injetada.value = calcularEnergiaInjetada(Number(ano), Number(mes)) 
    const custoEvitadoTotal = calcularCustoAutoconsumoMes(Number(ano), Number(mes))
    custo_autoconsumo_total.value = Number(custoEvitadoTotal.toFixed(2));
    custo_evitado_total.value = (custo_autoconsumo_total.value + Number(economia_total.value || 0)).toFixed(2);
    taxa_autossuficiencia_predios.value = calcularTaxaAutossuficienciaPredios(Number(ano), Number(mes))
    taxa_autossuficiencia_ip.value = calcularTaxaAutossuficienciaIP(Number(ano), Number(mes))
    ranking_mais_compensacao.value = top5MaisReceberamEnergia(Number(ano), Number(mes))
    ranking_mais_consumo.value = top5MaisConsumiuEnergia(Number(ano), Number(mes))
    ranking_mais_economia.value = top5MaisEconomizou(Number(ano), Number(mes))
    ranking_mais_geracao.value = top5Geracoes(Number(ano), Number(mes))
    ranking_mais_saldo.value = top5MaisSaldo(Number(ano), Number(mes))
    ranking_maior_aumento_consumo.value = top5MaiorAumentoConsumo(Number(ano), Number(mes))
    ranking_maior_reducao_consumo.value = top5MaiorReducaoConsumo(Number(ano), Number(mes))
    calcularCustoEvitadoTodosMeses();
    economia_ate_hoje.value = somarEconomiaMeses(Number(ano), Number(mes)).toFixed(2);
    economia_do_ano.value = somarEconomiaAno(Number(ano), Number(mes)).toFixed(2);
    payback_acumulado.value = calcularPayback(economia_ate_hoje.value);
    co2_evitado_acumulado.value = calcularCo2EvitadoTotal(Number(ano), Number(mes));
    usinas_desempenho.value = calcularDesempenhoUsinas(Number(ano), Number(mes));
    projecao_geracao.value = somarProjecoesProximoMes(Number(ano), Number(mes));
  }

  const somarProjecoesPorMesAno = (ano, mes) => { if (!projecoes.value) return 0; const filtrados = projecoes.value.filter(item => item.ano === ano && item.mes === mes); const soma = filtrados.reduce((acc, item) => acc + Number(item.projecao || 0), 0); return Number(soma.toFixed(2)) }
  const somarGeracaoPorMesAno = (ano, mes) => { if (!geracoes.value) return 0; const filtrados = geracoes.value.filter(item => item.ano === ano && item.mes === mes); const soma = filtrados.reduce((acc, item) => acc + Number(item.geracao || 0), 0); return Number(soma.toFixed(2)) }
  const somarConsumoPorMesAno = (ano, mes) => { if (!relatorios.value) return 0; const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes); const soma = filtrados.reduce((acc, item) => acc + Number(item.consumokWh || 0), 0); return Number(soma.toFixed(2)) }
  const somarSaldoPorMesAno = (ano, mes) => { if (!relatorios.value) return 0; const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes); const soma = filtrados.reduce((acc, item) => acc + Number(item.saldoEnergia || 0), 0); return Number(soma.toFixed(2)) }
  const somarEconomiaPorMesAno = (ano, mes) => { if (!relatorios.value) return 0; const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes); const totalTUSD = filtrados.reduce((acc, item) => acc + Number(item.valorInjTUSD || 0), 0); const totalTE = filtrados.reduce((acc, item) => acc + Number(item.valorInjTE || 0), 0); return Number((totalTUSD + totalTE).toFixed(2)) }
  const calcularCo2Evitado = () => { const fatorCo2 = 0.00005; return Number(geracao_total.value * fatorCo2).toFixed(2) }
  const calcularArvoresEquivalente = () => { const CAPTURA_ARVORE = 0.165; return Math.round(co2_evitado.value / CAPTURA_ARVORE) }
  const calcularEnergiaCompensada = (ano, mes) => { if (!relatorios.value) return 0; const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes); const totalTUSD = filtrados.reduce((acc, item) => acc + Number(item.enerInjTUSD || 0), 0); return Number(totalTUSD.toFixed(2)) }
  const calcularEnergiaInjetada = (ano, mes) => { if (!relatorio_usinas.value) return 0; const filtrados = relatorio_usinas.value.filter(item => item.ano === ano && item.mes === mes); const totalPONTA = filtrados.reduce((acc, item) => acc + Number(item.injetadoPonta || 0), 0); const totalFPONTA = filtrados.reduce((acc, item) => acc + Number(item.injetadoFPonta || 0), 0); return Number((totalPONTA + totalFPONTA).toFixed(2)) }
  const buscarConsumoMedio = () => { let consumoMedio = 0; usinas.value.forEach(usina => { const unidadeCorrespondente = unidades.value.find(unidade => unidade.uc === usina.uc); if (unidadeCorrespondente) { consumoMedio += Number(unidadeCorrespondente.mediaConsumo || 0) } }); return Number((consumoMedio).toFixed(2)) }
  const calcularEnergiaCompensadaPredios = (ano, mes) => { if (!relatorios.value || !unidades.value) return 0; const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes); const filtradosSecretaria = filtrados.filter(item => { const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa); return unidade && ['E', 'S', 'O'].includes(unidade.secretaria) }); const totalTUSD = filtradosSecretaria.reduce((acc, item) => acc + Number(item.enerInjTUSD || 0), 0); return Number(totalTUSD.toFixed(2)) }
  const somarConsumoPorMesAnoEspecial = (ano, mes) => { if (!relatorios.value || !geracoes.value || !unidades.value) return 0; const UCsEspeciais = ['4000266381', '37068768']; const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes); const filtradosSecretaria = filtrados.filter(item => { const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa); return unidade && ['E', 'S', 'O'].includes(unidade.secretaria) }); const soma = filtradosSecretaria.reduce((acc, item) => { if (UCsEspeciais.includes(String(item.uc))) { const geracaoUC = geracoes.value.find(g => g.uc === item.uc && g.ano === ano && g.mes === mes); const valorGeracao = geracaoUC ? Number(geracaoUC.geracao || 0) : 0; return acc + Number(item.consumokWh || 0) + valorGeracao } else { return acc + Number(item.consumokWh || 0) } }, 0); return Number(soma.toFixed(2)) }
  const calcularTaxaAutossuficienciaPredios = (ano, mes) => { const consumoMedioUsinas = buscarConsumoMedio(); const consumoMedioUnidadesPredios = somarConsumoPorMesAnoEspecial(ano, mes); const energia_compensadaPredios = calcularEnergiaCompensadaPredios(ano, mes); const totalCompensado = energia_compensadaPredios + (geracao_total.value - energia_injetada.value); const totalConsumo = consumoMedioUnidadesPredios + consumoMedioUsinas; const taxaAutossuficiencia = (totalCompensado / totalConsumo) * 100; return Number(taxaAutossuficiencia.toFixed(2)) }
  const calcularEnergiaIP = (ano, mes) => { if (!relatorios.value || !unidades.value) return { consumoTotal: 0, energiaCompensada: 0 }; const filtrados = relatorios.value.filter(item => item.ano === ano && item.mes === mes); const filtradosSecretaria = filtrados.filter(item => { const unidade = unidades.value.find(u => u.id === item.idUnidadeCompensa); return unidade && ['I', 'P'].includes(unidade.secretaria) && (unidade.uc) !== 12877638 }); const consumoTotal = filtradosSecretaria.reduce((acc, item) => acc + Number(item.consumokWh || 0), 0); const energiaCompensada = filtradosSecretaria.reduce((acc, item) => acc + Number(item.enerInjTUSD || 0), 0); return { consumoTotal: Number(consumoTotal.toFixed(2)), energiaCompensada: Number(energiaCompensada.toFixed(2)) } }
  const calcularTaxaAutossuficienciaIP = (ano, mes) => { const dadosUnidades = calcularEnergiaIP(ano, mes); const totalCompensado = dadosUnidades.energiaCompensada; const totalConsumo = dadosUnidades.consumoTotal; const taxaAutossuficiencia = (totalCompensado / totalConsumo) * 100; return Number(taxaAutossuficiencia.toFixed(2)) }
  const TARIFA_BT = 0.88;
  const MT_TARIFAS = { TUSD_ponta: 1.66642019, TE_ponta: 0.57222160, TUSD_forap: 0.14734841, TE_forap: 0.34908095 };
  function tarifaMediaMTParaUsina(idUsina) { const minima = Number(MT_TARIFAS.TUSD_forap || 0) + Number(MT_TARIFAS.TE_forap || 0); const maxima = Number(MT_TARIFAS.TUSD_ponta || 0) + Number(MT_TARIFAS.TE_ponta || 0); return (minima + maxima) / 2; }
  const calcularCustoAutoconsumoMes = (ano, mes) => { let total = 0; (usinas.value || []).forEach(u => { const geraMes = geracoes.value.find(r => r.idGeradora === u.id && r.mes === mes && r.ano === ano); const injeMes = relatorio_usinas.value.filter(r => r.idGeradora === u.id && r.mes === mes && r.ano === ano).reduce((s, r) => s + Number(r.injetadoFPonta || 0) + Number(r.injetadoPonta || 0), 0); let autoconsumo_kWh = Number(geraMes?.geracao || 0) - Number(injeMes || 0); autoconsumo_kWh = autoconsumo_kWh > 0 ? autoconsumo_kWh : 0; let tarifa_RpkWh = 0; if ((u.tensao || '').toUpperCase() === 'BT') { tarifa_RpkWh = TARIFA_BT; } else { tarifa_RpkWh = tarifaMediaMTParaUsina(u.id); } const custo_evitado_R$ = autoconsumo_kWh * tarifa_RpkWh; total += custo_evitado_R$; }); (usinas_conclusivo.value || []).filter(u => u.id === 19 || u.id === 20).forEach(u => { const geraMes = geracoes.value.find(r => r.idGeradora === u.id && r.mes === mes && r.ano === ano); let autoconsumo_kWh = Number(geraMes?.geracao || 0); autoconsumo_kWh = autoconsumo_kWh > 0 ? autoconsumo_kWh : 0; let tarifa_RpkWh = 0; if ((u.tensao || '').toUpperCase() === 'BT') { tarifa_RpkWh = TARIFA_BT; } else { tarifa_RpkWh = tarifaMediaMTParaUsina(u.id); } const custo_evitado_R$ = autoconsumo_kWh * tarifa_RpkWh; total += custo_evitado_R$; }); return total; };
  const calcularCustoEvitadoTodosMeses = () => { const resultados = []; const chaves = new Set([...geracoes.value.map(g => `${g.ano}-${g.mes}`), ...relatorio_usinas.value.map(r => `${r.ano}-${r.mes}`)]); for (const chave of chaves) { const [ano, mes] = chave.split("-").map(Number); const economia_total = somarEconomiaPorMesAno(Number(ano), Number(mes)); const resultado = calcularCustoAutoconsumoMes(Number(ano), Number(mes)); const custo_autoconsumo_total = Number(resultado || 0); const custo_evitado_total = (Number(custo_autoconsumo_total) + Number(economia_total)).toFixed(2); resultados.push({ ano, mes, custo_evitado_total }); } return resultados.sort((a, b) => a.ano - b.ano || a.mes - b.mes); }
  const totalInvestido = ref(Number(8854468.32) + Number(8005328.88) + Number(7021350.76));
  const somarEconomiaMeses = (ano, mes) => { const resultados = calcularCustoEvitadoTodosMeses(); const resultadosFiltrados = resultados.filter(item => item.ano < ano || (item.ano === ano && item.mes <= mes)); return resultadosFiltrados.reduce((acc, item) => acc + Number(item.custo_evitado_total || 0), 0); };
  const somarEconomiaAno = (ano, mes) => { const resultados = calcularCustoEvitadoTodosMeses(); const resultadosFiltrados = resultados.filter(item => item.ano === ano && item.mes <= mes); return resultadosFiltrados.reduce((acc, item) => acc + Number(item.custo_evitado_total || 0), 0); };
  const calcularPayback = (economia) => { if (totalInvestido.value === 0) return 0; return ((economia / totalInvestido.value) * 100).toFixed(2); };
  const top5MaisReceberamEnergia = (ano, mes) => { const ucsUsinas = usinas_conclusivo.value.map(u => u.uc); const idsUnidadesParaExcluir = unidades.value.filter(un => ucsUsinas.includes(un.uc)).map(un => un.id); const relatoriosFiltrados = relatorios.value.filter(r => r.ano === ano && r.mes === mes && !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)).sort((a, b) => (b.enerInjTUSD || 0) - (a.enerInjTUSD || 0)).slice(0, 5); return relatoriosFiltrados.map(r => { const unidade = unidades.value.find(u => u.id === r.idUnidadeCompensa); return { uc: unidade?.uc || "N/A", nome: unidade?.nome || "N/A", enerInjTUSD: r.enerInjTUSD || 0 }; }); }
  const top5MaisConsumiuEnergia = (ano, mes) => { const ucsUsinas = usinas_conclusivo.value.map(u => u.uc); const idsUnidadesParaExcluir = unidades.value.filter(un => ucsUsinas.includes(un.uc)).map(un => un.id); const relatoriosFiltrados = relatorios.value.filter(r => r.ano === ano && r.mes === mes && !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)).sort((a, b) => (b.consumokWh || 0) - (a.consumokWh || 0)).slice(0, 5); return relatoriosFiltrados.map(r => { const unidade = unidades.value.find(u => u.id === r.idUnidadeCompensa); return { uc: unidade?.uc || "N/A", nome: unidade?.nome || "N/A", consumokWh: r.consumokWh || 0 }; }); }
  const top5MaisEconomizou = (ano, mes) => { const ucsUsinas = usinas_conclusivo.value.map(u => u.uc); const idsUnidadesParaExcluir = unidades.value.filter(un => ucsUsinas.includes(un.uc)).map(un => un.id); const relatoriosFiltrados = relatorios.value.filter(r => r.ano === ano && r.mes === mes && !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)).sort((a, b) => { const totalA = (Number(b.valorInjTUSD) || 0) + (Number(b.valorInjTE) || 0); const totalB = (Number(a.valorInjTUSD) || 0) + (Number(a.valorInjTE) || 0); return totalA - totalB; }).slice(0, 5); return relatoriosFiltrados.map(r => { const unidade = unidades.value.find(u => u.id === r.idUnidadeCompensa); return { uc: unidade?.uc || "N/A", nome: unidade?.nome || "N/A", energiaInjetada: (Number(r.valorInjTUSD) || 0) + (Number(r.valorInjTE) || 0) }; }); };
  const top5Geracoes = (ano, mes) => { const geracoesFiltradas = geracoes.value.filter(g => g.ano === ano && g.mes === mes).sort((a, b) => (b.geracao || 0) - (a.geracao || 0)).slice(0, 5); return geracoesFiltradas.map(g => { const usina = usinas_conclusivo.value.find(u => u.id === g.idGeradora); return { uc: usina?.uc || "N/A", nome: usina?.nome || "N/A", geracao: g.geracao || 0 }; }); };
  const top5MaisSaldo = (ano, mes) => { const ucsUsinas = usinas_conclusivo.value.map(u => u.uc); const idsUnidadesParaExcluir = unidades.value.filter(un => ucsUsinas.includes(un.uc)).map(un => un.id); const relatoriosFiltrados = relatorios.value.filter(r => r.ano === ano && r.mes === mes && !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)).sort((a, b) => (b.saldoEnergia || 0) - (a.saldoEnergia || 0)).slice(0, 5); return relatoriosFiltrados.map(r => { const unidade = unidades.value.find(u => u.id === r.idUnidadeCompensa); return { uc: unidade?.uc || "N/A", nome: unidade?.nome || "N/A", saldoEnergia: r.saldoEnergia || 0 }; }); }
  const top5MaiorAumentoConsumo = (ano, mes) => { let mesAnterior = mes - 1; let anoAnterior = ano; if (mesAnterior === 0) { mesAnterior = 12; anoAnterior = ano - 1; } const ucsUsinas = usinas_conclusivo.value.map(u => u.uc); const idsUnidadesParaExcluir = unidades.value.filter(un => ucsUsinas.includes(un.uc)).map(un => un.id); const relatoriosAtual = relatorios.value.filter(r => r.ano === ano && r.mes === mes && !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)); const relatoriosAnterior = relatorios.value.filter(r => r.ano === anoAnterior && r.mes === mesAnterior && !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)); const consumoAnteriorMap = {}; relatoriosAnterior.forEach(r => { consumoAnteriorMap[r.idUnidadeCompensa] = r.consumokWh || 0; }); const aumentos = relatoriosAtual.map(r => { const consumoAtual = r.consumokWh || 0; const consumoAnterior = consumoAnteriorMap[r.idUnidadeCompensa] || 0; const aumento = consumoAtual - consumoAnterior; return { idUnidadeCompensa: r.idUnidadeCompensa, aumento: aumento > 0 ? aumento : 0 }; }); const top5 = aumentos.sort((a, b) => b.aumento - a.aumento).slice(0, 5); return top5.map(a => { const unidade = unidades.value.find(u => u.id === a.idUnidadeCompensa); return { uc: unidade?.uc || "N/A", nome: unidade?.nome || "N/A", aumento_kWh: a.aumento }; }); };
  const top5MaiorReducaoConsumo = (ano, mes) => { let mesAnterior = mes - 1; let anoAnterior = ano; if (mesAnterior === 0) { mesAnterior = 12; anoAnterior = ano - 1; } const ucsUsinas = usinas_conclusivo.value.map(u => u.uc); const idsUnidadesParaExcluir = unidades.value.filter(un => ucsUsinas.includes(un.uc)).map(un => un.id); const relatoriosAtual = relatorios.value.filter(r => r.ano === ano && r.mes === mes && !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)); const relatoriosAnterior = relatorios.value.filter(r => r.ano === anoAnterior && r.mes === mesAnterior && !idsUnidadesParaExcluir.includes(r.idUnidadeCompensa)); const consumoAnteriorMap = {}; relatoriosAnterior.forEach(r => { consumoAnteriorMap[r.idUnidadeCompensa] = r.consumokWh || 0; }); const reducoes = relatoriosAtual.map(r => { const consumoAtual = r.consumokWh || 0; const consumoAnterior = consumoAnteriorMap[r.idUnidadeCompensa] || 0; const reducao = consumoAnterior - consumoAtual; return { idUnidadeCompensa: r.idUnidadeCompensa, reducao: reducao > 0 ? reducao : 0 }; }); const top5 = reducoes.sort((a, b) => b.reducao - a.reducao).slice(0, 5); return top5.map(a => { const unidade = unidades.value.find(u => u.id === a.idUnidadeCompensa); return { uc: unidade?.uc || "N/A", nome: unidade?.nome || "N/A", reducao_kWh: a.reducao }; }); };
  const somarGeracaoGeral = () => { if (!geracoes.value) return 0; const soma = geracoes.value.reduce((acc, item) => acc + Number(item.geracao || 0), 0); return Number(soma.toFixed(2)) }
  const calcularCo2EvitadoTotal = () => { const geracaoTotal = somarGeracaoGeral(); const co2PorKwh = 0.0005; return Number((geracaoTotal * co2PorKwh).toFixed(2)); }
  const calcularDesempenhoUsinas = (ano, mes) => { return usinas_conclusivo.value.map(u => { const geracao = geracoes.value.find(g => g.idGeradora === u.id && g.ano === ano && g.mes === mes); const geracaoReal = Number(geracao?.geracao || 0); const projecao = projecoes.value.find(p => p.idGeradora === u.id && p.ano === ano && p.mes === mes); const geracaoProjetada = Number(projecao?.projecao || 0); const desempenhoPct = geracaoProjetada > 0 ? (geracaoReal / geracaoProjetada) * 100 : 0; const desempenho = Number.isFinite(desempenhoPct) ? Number(desempenhoPct.toFixed(2)) : 0; return { uc: u.uc || "N/A", nome: u.nome || "N/A", geracaoReal, desempenho }; }); };
  const somarProjecoesProximoMes = (ano, mes) => { let proximoMes = mes + 1; let anoProximoMes = ano; if (proximoMes === 13) { proximoMes = 1; anoProximoMes = ano + 1; } const projecoesFiltradas = projecoes.value.filter(p => p.ano === anoProximoMes && p.mes === proximoMes); const totalProjetado = projecoesFiltradas.reduce((acc, p) => acc + Number(p.projecao || 0), 0); return Number(totalProjetado.toFixed(2)); };

  import html2pdf from 'html2pdf.js';
  const baixarPDF = () => {
    const element = document.getElementById("conteudo-pdf");
    if (!element) { console.error("Elemento #conteudo-pdf não encontrado!"); return; }
    const opt = { margin: 0, filename: "relatorio-usinas.pdf", image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: "in", format: "a4", orientation: "portrait" } };
    html2pdf().set(opt).from(element).save();
  };

  // helpers
  const fmtNum = (v, dec = 2) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  const fmtKwh = (v) => `${fmtNum(v)} kWh`
  const fmtBrl = (v) => `R$ ${fmtNum(v)}`
  const mesNome = (n) => ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][n-1] ?? ''
  const desempenhoColor = (pct) => pct >= 90 ? '#059669' : pct >= 70 ? '#D97706' : '#E11D48'
  const desempenhoLabel = (pct) => pct >= 90 ? 'Excelente' : pct >= 70 ? 'Bom' : 'Abaixo'
</script>

<template>
  <div class="cl-root">

    <!-- ══════════════════════════════════════════════════
         PÁGINA PRINCIPAL — EXPORTAÇÕES
    ══════════════════════════════════════════════════ -->
    <div class="cl-header">
      <div class="cl-header-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </div>
      <div>
        <p class="cl-header-eyebrow">Gerenciamento · Relatórios</p>
        <h1 class="cl-header-title">Relatório Conclusivo</h1>
        <p class="cl-header-sub">Exportações e geração do relatório oficial de desempenho energético</p>
      </div>
    </div>

    <!-- Cards de exportação -->
    <div class="cl-export-grid">

      <div class="cl-export-card">
        <div class="cl-export-icon" style="background:#ECFDF5;color:#059669">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        </div>
        <div class="cl-export-txt">
          <span class="cl-export-title">Dados Prédios</span>
          <span class="cl-export-desc">UC + média consumo + saldo (Educação, Saúde, Outros)</span>
        </div>
        <button class="cl-export-btn cl-btn-green" @click="exportarParaExcel('PREDIO')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar .xlsx
        </button>
      </div>

      <div class="cl-export-card">
        <div class="cl-export-icon" style="background:#EEF2FF;color:#4F46E5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/></svg>
        </div>
        <div class="cl-export-txt">
          <span class="cl-export-title">Dados CIP</span>
          <span class="cl-export-desc">UC + média consumo + saldo (Iluminação Pública e Praças)</span>
        </div>
        <button class="cl-export-btn cl-btn-indigo" @click="exportarParaExcel('IP')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar .xlsx
        </button>
      </div>

      <div class="cl-export-card">
        <div class="cl-export-icon" style="background:#FFFBEB;color:#D97706">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        </div>
        <div class="cl-export-txt">
          <span class="cl-export-title">Consumo 6 Meses — Prédios</span>
          <span class="cl-export-desc">Histórico mensal, variação e alertas de consumo</span>
        </div>
        <button class="cl-export-btn cl-btn-amber" @click="extrairEExportar6meses('PREDIO')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar .xlsx
        </button>
      </div>

      <div class="cl-export-card">
        <div class="cl-export-icon" style="background:#FFF1F2;color:#E11D48">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        </div>
        <div class="cl-export-txt">
          <span class="cl-export-title">Consumo 6 Meses — IP</span>
          <span class="cl-export-desc">Histórico mensal, variação e alertas de iluminação pública</span>
        </div>
        <button class="cl-export-btn cl-btn-rose" @click="extrairEExportar6meses('IP')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar .xlsx
        </button>
      </div>

      <div class="cl-export-card">
        <div class="cl-export-icon" style="background:#F5F3FF;color:#7C3AED">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
        </div>
        <div class="cl-export-txt">
          <span class="cl-export-title">Dados Compensados</span>
          <span class="cl-export-desc">Energia e valor compensado consolidado por mês/ano</span>
        </div>
        <button class="cl-export-btn cl-btn-violet" @click="exportarParaExcel2()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar .xlsx
        </button>
      </div>

    </div>

    <!-- Gerador do relatório conclusivo -->
    <div class="cl-conclusivo-gen">
      <div class="cl-conclusivo-gen-left">
        <div class="cl-conclusivo-gen-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div>
          <h3 class="cl-conclusivo-gen-title">Relatório Conclusivo Oficial</h3>
          <p class="cl-conclusivo-gen-sub">Selecione o período e gere o relatório para envio à prefeitura</p>
        </div>
      </div>
      <div class="cl-conclusivo-gen-right">
        <div class="cl-month-wrap">
          <label class="cl-month-label">Período de referência</label>
          <input type="month" v-model="mesAnoSelecionado" class="cl-month-input" />
        </div>
        <button class="cl-btn-conclusivo" :disabled="!mesAnoSelecionado" @click="abrirDialog()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Gerar Conclusivo
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════
         DIALOG — RELATÓRIO OFICIAL PDF
    ══════════════════════════════════════════════════ -->
    <v-dialog v-model="dialogRelatorioPDF" fullscreen :scrim="false" content-class="cl-dialog-fullscreen">
      <div class="pdf-shell">

        <!-- Barra de ação (fora do PDF) -->
        <div class="pdf-action-bar">
          <div class="pdf-action-left">
            <button class="pdf-close-btn" @click="dialogRelatorioPDF=false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Fechar
            </button>
          </div>
          <div class="pdf-action-center">
            <span class="pdf-action-title">Relatório Conclusivo · {{ mesNome(periodo_mes) }} {{ periodo_ano }}</span>
          </div>
          <div class="pdf-action-right">
            <button class="pdf-download-btn" @click="baixarPDF()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar PDF
            </button>
          </div>
        </div>

        <!-- Conteúdo PDF -->
        <div class="pdf-scroll">
          <div id="conteudo-pdf" class="pdf-doc">

            <!-- ── CAPA ───────────────────────────────────── -->
            <div class="pdf-cover">
              <div class="pdf-cover-bg"></div>
              <div class="pdf-cover-inner">
                <div class="pdf-cover-logos">
                  <img src="/images/logo_lucentis.png" alt="Lucentis" class="pdf-logo-main" onerror="this.style.display='none'">
                  <div class="pdf-cover-divider-v"></div>
                  <div class="pdf-cover-org">
                    <span class="pdf-cover-org-label">Sistema LUCENTIS - Hortolândia</span>
                    <span class="pdf-cover-org-sub">Monitoramento Energético Municipal</span>
                  </div>
                </div>
                <div class="pdf-cover-body">
                  <p class="pdf-cover-eyebrow">Documento Oficial · Uso Restrito</p>
                  <h1 class="pdf-cover-title">Relatório Conclusivo de Desempenho Energético</h1>
                  <div class="pdf-cover-period">
                    <div class="pdf-cover-period-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {{ mesNome(periodo_mes) }} / {{ periodo_ano }}
                    </div>
                  </div>
                  <div class="pdf-cover-stats">
                    <div class="pdf-cover-stat">
                      <span class="pdf-cover-stat-val">{{ fmtNum(geracao_total, 0) }}</span>
                      <span class="pdf-cover-stat-lbl">kWh Gerados</span>
                    </div>
                    <div class="pdf-cover-stat-div"></div>
                    <div class="pdf-cover-stat">
                      <span class="pdf-cover-stat-val">{{ fmtBrl(custo_evitado_total) }}</span>
                      <span class="pdf-cover-stat-lbl">Custo Evitado</span>
                    </div>
                    <div class="pdf-cover-stat-div"></div>
                    <div class="pdf-cover-stat">
                      <span class="pdf-cover-stat-val">{{ payback_acumulado }}%</span>
                      <span class="pdf-cover-stat-lbl">Payback Acumulado</span>
                    </div>
                  </div>
                </div>
                <div class="pdf-cover-footer">
                  <span>hortolandia.energy.lucentis.com.br</span>
                  <span>Gerado em {{ new Date().toLocaleDateString('pt-BR') }}</span>
                </div>
              </div>
            </div>

            <!-- ── SEÇÃO 1 — SUMÁRIO EXECUTIVO ─────────── -->
            <div class="pdf-section">
              <div class="pdf-section-header" style="--sec-color:#059669;--sec-bg:#ECFDF5">
                <div class="pdf-sec-num">01</div>
                <div>
                  <h2 class="pdf-sec-title">Sumário Executivo</h2>
                  <p class="pdf-sec-sub">Visão geral dos indicadores do período</p>
                </div>
              </div>

              <!-- KPI grid principal -->
              <div class="pdf-kpi-grid">
                <div class="pdf-kpi" style="--k:#059669;--klt:#ECFDF5">
                  <div class="pdf-kpi-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  </div>
                  <span class="pdf-kpi-lbl">Projeção do Mês</span>
                  <span class="pdf-kpi-val">{{ fmtKwh(projecao_total) }}</span>
                </div>
                <div class="pdf-kpi" style="--k:#4F46E5;--klt:#EEF2FF">
                  <div class="pdf-kpi-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <span class="pdf-kpi-lbl">Geração Real</span>
                  <span class="pdf-kpi-val">{{ fmtKwh(geracao_total) }}</span>
                </div>
                <div class="pdf-kpi" style="--k:#D97706;--klt:#FFFBEB">
                  <div class="pdf-kpi-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>
                  </div>
                  <span class="pdf-kpi-lbl">Consumo Total</span>
                  <span class="pdf-kpi-val">{{ fmtKwh(consumo_total) }}</span>
                </div>
                <div class="pdf-kpi" style="--k:#7C3AED;--klt:#F5F3FF">
                  <div class="pdf-kpi-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  </div>
                  <span class="pdf-kpi-lbl">Custo Evitado Total</span>
                  <span class="pdf-kpi-val">{{ fmtBrl(custo_evitado_total) }}</span>
                </div>
                <div class="pdf-kpi" style="--k:#059669;--klt:#ECFDF5">
                  <div class="pdf-kpi-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6l9-4 9 4v6c0 5-4 9-9 10C7 21 3 17 3 12V6z"/></svg>
                  </div>
                  <span class="pdf-kpi-lbl">Saldo Líquido</span>
                  <span class="pdf-kpi-val">{{ fmtKwh(saldo_liquido) }}</span>
                </div>
                <div class="pdf-kpi" style="--k:#059669;--klt:#ECFDF5">
                  <div class="pdf-kpi-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4.5 8-11.8A8 8 0 004 10.2C4 17.5 12 22 12 22z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <span class="pdf-kpi-lbl">CO₂ Evitado</span>
                  <span class="pdf-kpi-val">{{ co2_evitado }} t</span>
                  <span class="pdf-kpi-note">≈ {{ arvores_equivalente }} árvores</span>
                </div>
              </div>

              <!-- Tabela resumo executivo -->
              <table class="pdf-table">
                <thead>
                  <tr><th colspan="2" class="pdf-th-section" style="background:#059669">Indicadores do Período — {{ mesNome(periodo_mes) }}/{{ periodo_ano }}</th></tr>
                  <tr class="pdf-th-row"><th>Indicador</th><th>Valor</th></tr>
                </thead>
                <tbody>
                  <tr class="pdf-tr"><td>Projeção total de geração</td><td class="pdf-td-val">{{ fmtKwh(projecao_total) }}</td></tr>
                  <tr class="pdf-tr pdf-tr-alt"><td>Geração real no mês</td><td class="pdf-td-val">{{ fmtKwh(geracao_total) }}</td></tr>
                  <tr class="pdf-tr"><td>Consumo total das unidades</td><td class="pdf-td-val">{{ fmtKwh(consumo_total) }}</td></tr>
                  <tr class="pdf-tr pdf-tr-alt"><td>Saldo líquido de energia</td><td class="pdf-td-val">{{ fmtKwh(saldo_liquido) }}</td></tr>
                  <tr class="pdf-tr"><td>Custo evitado total (unidades + usinas)</td><td class="pdf-td-val pdf-td-green">{{ fmtBrl(custo_evitado_total) }}</td></tr>
                  <tr class="pdf-tr pdf-tr-alt"><td>CO₂ evitado no mês</td><td class="pdf-td-val">{{ co2_evitado }} toneladas</td></tr>
                  <tr class="pdf-tr"><td>Equivalente em árvores plantadas</td><td class="pdf-td-val">{{ arvores_equivalente }} árvores</td></tr>
                </tbody>
              </table>
            </div>

            <!-- ── SEÇÃO 2 — INDICADORES GLOBAIS ──────── -->
            <div class="pdf-section">
              <div class="pdf-section-header" style="--sec-color:#4F46E5;--sec-bg:#EEF2FF">
                <div class="pdf-sec-num" style="background:#4F46E5">02</div>
                <div>
                  <h2 class="pdf-sec-title">Indicadores Globais do Sistema</h2>
                  <p class="pdf-sec-sub">Energia compensada, injetada e autossuficiência por categoria</p>
                </div>
              </div>

              <div class="pdf-two-col">
                <!-- col 1 -->
                <table class="pdf-table">
                  <thead>
                    <tr><th colspan="2" class="pdf-th-section" style="background:#4F46E5">Balanço Energético</th></tr>
                    <tr class="pdf-th-row"><th>Indicador</th><th>Valor</th></tr>
                  </thead>
                  <tbody>
                    <tr class="pdf-tr"><td>Energia Compensada</td><td class="pdf-td-val pdf-td-indigo">{{ fmtKwh(energia_compensada) }}</td></tr>
                    <tr class="pdf-tr pdf-tr-alt"><td>Energia Injetada</td><td class="pdf-td-val">{{ fmtKwh(energia_injetada) }}</td></tr>
                    <tr class="pdf-tr"><td>Autoconsumo Evitado</td><td class="pdf-td-val pdf-td-green">{{ fmtBrl(custo_autoconsumo_total) }}</td></tr>
                    <tr class="pdf-tr pdf-tr-alt"><td>Economia Compensada</td><td class="pdf-td-val pdf-td-green">{{ fmtBrl(economia_total) }}</td></tr>
                  </tbody>
                </table>

                <!-- col 2 — autossuficiência -->
                <div class="pdf-autossuf-box">
                  <h4 class="pdf-autossuf-title">Taxa de Autossuficiência</h4>
                  <div class="pdf-autossuf-item">
                    <div class="pdf-autossuf-label">
                      <span class="pdf-autossuf-cat" style="background:#ECFDF5;color:#059669">Prédios Públicos</span>
                      <span class="pdf-autossuf-pct" style="color:#059669">{{ taxa_autossuficiencia_predios }}%</span>
                    </div>
                    <div class="pdf-progress-track">
                      <div class="pdf-progress-fill" :style="{width: Math.min(taxa_autossuficiencia_predios,100)+'%', background:'#059669'}"></div>
                    </div>
                    <span class="pdf-autossuf-note">Educação, Saúde e Outros</span>
                  </div>
                  <div class="pdf-autossuf-item">
                    <div class="pdf-autossuf-label">
                      <span class="pdf-autossuf-cat" style="background:#EEF2FF;color:#4F46E5">Iluminação Pública</span>
                      <span class="pdf-autossuf-pct" style="color:#4F46E5">{{ taxa_autossuficiencia_ip }}%</span>
                    </div>
                    <div class="pdf-progress-track">
                      <div class="pdf-progress-fill" :style="{width: Math.min(taxa_autossuficiencia_ip,100)+'%', background:'#4F46E5'}"></div>
                    </div>
                    <span class="pdf-autossuf-note">IP e Praças</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── SEÇÃO 3 — RANKINGS DO MÊS ─────────── -->
            <div class="pdf-section">
              <div class="pdf-section-header" style="--sec-color:#D97706;--sec-bg:#FFFBEB">
                <div class="pdf-sec-num" style="background:#D97706">03</div>
                <div>
                  <h2 class="pdf-sec-title">Rankings do Mês</h2>
                  <p class="pdf-sec-sub">Top 5 unidades e usinas por categoria de destaque</p>
                </div>
              </div>

              <div class="pdf-rankings-grid">

                <div v-for="ranking in [
                  { title:'Mais Receberam Energia Compensada', unit:'kWh', icon:'M13 10V3L4 14h7v7l9-11h-7z', color:'#059669', bg:'#ECFDF5', data: ranking_mais_compensacao, key:'enerInjTUSD' },
                  { title:'Maior Geração de Energia', unit:'kWh', icon:'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', color:'#4F46E5', bg:'#EEF2FF', data: ranking_mais_geracao, key:'geracao' },
                  { title:'Mais Consumiram Energia', unit:'kWh', icon:'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z', color:'#D97706', bg:'#FFFBEB', data: ranking_mais_consumo, key:'consumokWh' },
                  { title:'Maior Economia Gerada', unit:'R$', icon:'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', color:'#7C3AED', bg:'#F5F3FF', data: ranking_mais_economia, key:'energiaInjetada' },
                  { title:'Maior Saldo de Energia', unit:'kWh', icon:'M3 6l9-4 9 4v6c0 5-4 9-9 10C7 21 3 17 3 12V6z', color:'#059669', bg:'#ECFDF5', data: ranking_mais_saldo, key:'saldoEnergia' },
                  { title:'Maior Aumento de Consumo', unit:'kWh', icon:'M12 19V5M5 12l7-7 7 7', color:'#E11D48', bg:'#FFF1F2', data: ranking_maior_aumento_consumo, key:'aumento_kWh' },
                  { title:'Maior Redução de Consumo', unit:'kWh', icon:'M12 5v14M5 12l7 7 7-7', color:'#059669', bg:'#ECFDF5', data: ranking_maior_reducao_consumo, key:'reducao_kWh' },
                ]" :key="ranking.title" class="pdf-rank-card">
                  <div class="pdf-rank-header" :style="{background: ranking.color}">
                    <div class="pdf-rank-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path :d="ranking.icon"/></svg>
                    </div>
                    <span class="pdf-rank-title">🏆 {{ ranking.title }}</span>
                  </div>
                  <div class="pdf-rank-body">
                    <div v-for="(item, idx) in ranking.data" :key="item.uc" class="pdf-rank-row" :class="{'pdf-rank-first': idx===0}">
                      <span class="pdf-rank-pos" :style="idx===0?{background:ranking.color,color:'#fff'}:{}">{{ idx + 1 }}</span>
                      <div class="pdf-rank-info">
                        <span class="pdf-rank-nome">{{ item.nome }}</span>
                        <span class="pdf-rank-uc">UC {{ item.uc }}</span>
                      </div>
                      <span class="pdf-rank-value" :style="{color: ranking.color}">
                        {{ ranking.unit === 'R$' ? fmtBrl(item[ranking.key]) : fmtNum(item[ranking.key]) + ' kWh' }}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- ── SEÇÃO 4 — EFICIÊNCIA ECONÔMICA ─────── -->
            <div class="pdf-section">
              <div class="pdf-section-header" style="--sec-color:#7C3AED;--sec-bg:#F5F3FF">
                <div class="pdf-sec-num" style="background:#7C3AED">04</div>
                <div>
                  <h2 class="pdf-sec-title">Eficiência Econômica</h2>
                  <p class="pdf-sec-sub">Retorno financeiro acumulado e projeção de payback</p>
                </div>
              </div>

              <div class="pdf-economia-grid">
                <div class="pdf-economia-card" style="--ec:#7C3AED;--eclt:#F5F3FF">
                  <div class="pdf-ec-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  </div>
                  <span class="pdf-ec-lbl">Economia Até Hoje</span>
                  <span class="pdf-ec-val">{{ fmtBrl(economia_ate_hoje) }}</span>
                  <span class="pdf-ec-note">Desde o início do projeto</span>
                </div>
                <div class="pdf-economia-card" style="--ec:#059669;--eclt:#ECFDF5">
                  <div class="pdf-ec-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <span class="pdf-ec-lbl">Economia do Ano</span>
                  <span class="pdf-ec-val">{{ fmtBrl(economia_do_ano) }}</span>
                  <span class="pdf-ec-note">Acumulado em {{ periodo_ano }}</span>
                </div>
                <div class="pdf-economia-card" style="--ec:#4F46E5;--eclt:#EEF2FF">
                  <div class="pdf-ec-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  </div>
                  <span class="pdf-ec-lbl">Payback Acumulado</span>
                  <span class="pdf-ec-val">{{ payback_acumulado }}%</span>
                  <span class="pdf-ec-note">Do total investido</span>
                </div>
              </div>

              <!-- barra de payback -->
              <div class="pdf-payback-bar-wrap">
                <div class="pdf-payback-bar-labels">
                  <span>Retorno do Investimento</span>
                  <span>{{ payback_acumulado }}% de {{ fmtBrl(totalInvestido) }}</span>
                </div>
                <div class="pdf-payback-track">
                  <div class="pdf-payback-fill" :style="{width: Math.min(payback_acumulado,100)+'%'}">
                    <span>{{ payback_acumulado }}%</span>
                  </div>
                </div>
              </div>

              <table class="pdf-table">
                <thead>
                  <tr><th colspan="2" class="pdf-th-section" style="background:#7C3AED">Resumo Econômico</th></tr>
                  <tr class="pdf-th-row"><th>Indicador</th><th>Valor</th></tr>
                </thead>
                <tbody>
                  <tr class="pdf-tr"><td>Total investido no projeto</td><td class="pdf-td-val">{{ fmtBrl(totalInvestido) }}</td></tr>
                  <tr class="pdf-tr pdf-tr-alt"><td>Economia acumulada até {{ mesNome(periodo_mes) }}/{{ periodo_ano }}</td><td class="pdf-td-val pdf-td-green">{{ fmtBrl(economia_ate_hoje) }}</td></tr>
                  <tr class="pdf-tr"><td>Economia acumulada em {{ periodo_ano }}</td><td class="pdf-td-val pdf-td-green">{{ fmtBrl(economia_do_ano) }}</td></tr>
                  <tr class="pdf-tr pdf-tr-alt"><td>Payback percentual acumulado</td><td class="pdf-td-val pdf-td-indigo"><strong>{{ payback_acumulado }}%</strong></td></tr>
                </tbody>
              </table>
            </div>

            <!-- ── SEÇÃO 5 — IMPACTO AMBIENTAL ─────────── -->
            <div class="pdf-section">
              <div class="pdf-section-header" style="--sec-color:#059669;--sec-bg:#ECFDF5">
                <div class="pdf-sec-num">05</div>
                <div>
                  <h2 class="pdf-sec-title">Impacto Ambiental</h2>
                  <p class="pdf-sec-sub">CO₂ evitado e equivalências ambientais do sistema</p>
                </div>
              </div>

              <div class="pdf-ambiental-grid">
                <div class="pdf-amb-card">
                  <div class="pdf-amb-icon" style="background:#ECFDF5;color:#059669">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4.5 8-11.8A8 8 0 004 10.2C4 17.5 12 22 12 22z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div class="pdf-amb-vals">
                    <span class="pdf-amb-big">{{ co2_evitado }} t</span>
                    <span class="pdf-amb-lbl">CO₂ Evitado no Mês</span>
                  </div>
                </div>
                <div class="pdf-amb-card">
                  <div class="pdf-amb-icon" style="background:#ECFDF5;color:#059669">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a9 9 0 019 9c0 4.97-9 13-9 13S3 15.97 3 11a9 9 0 019-9z"/></svg>
                  </div>
                  <div class="pdf-amb-vals">
                    <span class="pdf-amb-big">{{ arvores_equivalente }}</span>
                    <span class="pdf-amb-lbl">Árvores Equivalentes (mês)</span>
                  </div>
                </div>
                <div class="pdf-amb-card">
                  <div class="pdf-amb-icon" style="background:#FFFBEB;color:#D97706">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/></svg>
                  </div>
                  <div class="pdf-amb-vals">
                    <span class="pdf-amb-big">{{ co2_evitado_acumulado }} t</span>
                    <span class="pdf-amb-lbl">CO₂ Evitado Acumulado</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── SEÇÃO 6 — DESEMPENHO DAS USINAS ─────── -->
            <div class="pdf-section">
              <div class="pdf-section-header" style="--sec-color:#4F46E5;--sec-bg:#EEF2FF">
                <div class="pdf-sec-num" style="background:#4F46E5">06</div>
                <div>
                  <h2 class="pdf-sec-title">Desempenho das Usinas</h2>
                  <p class="pdf-sec-sub">Geração real vs. projetada por unidade geradora</p>
                </div>
              </div>

              <div class="pdf-usinas-grid">
                <div v-for="usina in usinas_desempenho" :key="usina.uc" class="pdf-usina-card">
                  <div class="pdf-usina-head">
                    <div class="pdf-usina-icon" :style="{background: desempenhoColor(usina.desempenho)+'22', color: desempenhoColor(usina.desempenho)}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <div class="pdf-usina-info">
                      <span class="pdf-usina-nome">{{ usina.nome }}</span>
                      <span class="pdf-usina-uc">UC {{ usina.uc }}</span>
                    </div>
                    <span class="pdf-usina-badge" :style="{background: desempenhoColor(usina.desempenho)+'22', color: desempenhoColor(usina.desempenho), borderColor: desempenhoColor(usina.desempenho)+'44'}">
                      {{ desempenhoLabel(usina.desempenho) }}
                    </span>
                  </div>
                  <div class="pdf-usina-stats">
                    <div class="pdf-usina-stat">
                      <span class="pdf-usina-stat-lbl">Geração Real</span>
                      <span class="pdf-usina-stat-val">{{ fmtKwh(usina.geracaoReal) }}</span>
                    </div>
                    <div class="pdf-usina-stat">
                      <span class="pdf-usina-stat-lbl">Desempenho</span>
                      <span class="pdf-usina-stat-val" :style="{color: desempenhoColor(usina.desempenho)}">{{ usina.desempenho }}%</span>
                    </div>
                  </div>
                  <div class="pdf-usina-bar-track">
                    <div class="pdf-usina-bar-fill" :style="{width: Math.min(usina.desempenho,100)+'%', background: desempenhoColor(usina.desempenho)}"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── SEÇÃO 7 — PROJEÇÃO PRÓXIMO MÊS ─────── -->
            <div class="pdf-section">
              <div class="pdf-section-header" style="--sec-color:#D97706;--sec-bg:#FFFBEB">
                <div class="pdf-sec-num" style="background:#D97706">07</div>
                <div>
                  <h2 class="pdf-sec-title">Projeção para o Próximo Mês</h2>
                  <p class="pdf-sec-sub">Estimativa de geração baseada no histórico das usinas</p>
                </div>
              </div>

              <div class="pdf-projecao-box">
                <div class="pdf-projecao-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div class="pdf-projecao-content">
                  <span class="pdf-projecao-lbl">Geração esperada para o próximo período</span>
                  <span class="pdf-projecao-val">{{ fmtKwh(projecao_geracao) }}</span>
                  <span class="pdf-projecao-note">Baseado nas médias históricas e capacidade instalada das {{ usinas_desempenho.length }} usinas</span>
                </div>
              </div>
            </div>

            <!-- ── RODAPÉ DO DOCUMENTO ──────────────────── -->
            <div class="pdf-doc-footer">
              <div class="pdf-doc-footer-left">
                <img src="/images/logo_lucentis.png" alt="Lucentis" class="pdf-footer-logo" onerror="this.style.display='none'">
                <div class="pdf-doc-footer-txt">
                  <span class="pdf-doc-footer-brand">LUCENTIS ENERGY</span>
                  <span class="pdf-doc-footer-sub">Sistema LUCENTIS - Hortolândia · Monitoramento Energético Municipal</span>
                </div>
              </div>
              <div class="pdf-doc-footer-right">
                <span>Relatório gerado automaticamente em {{ new Date().toLocaleDateString('pt-BR') }}</span>
                <span>hortolandia.energy.lucentis.com.br</span>
              </div>
            </div>

          </div><!-- /pdf-doc -->
        </div><!-- /pdf-scroll -->
      </div><!-- /pdf-shell -->
    </v-dialog>

  </div><!-- /cl-root -->
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

/* ════════════════════════════════════════════
   ROOT DA PÁGINA
════════════════════════════════════════════ */
.cl-root {
  min-height: 100vh !important;
  background: #F0FDF9 !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  color: #0f172a !important;
  padding: 0 0 40px !important;
}

/* ════════════════════════════════════════════
   HEADER DA PÁGINA
════════════════════════════════════════════ */
.cl-header {
  background: linear-gradient(135deg, #ECFDF5 0%, #EEF2FF 100%) !important;
  border-bottom: 1px solid #E2E8F0 !important;
  padding: 24px 28px 20px !important;
  margin-bottom: 28px !important;
  display: flex !important;
  align-items: center !important;
  gap: 16px !important;
}
.cl-header-icon {
  width: 50px !important; height: 50px !important;
  background: #059669 !important; border-radius: 14px !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  box-shadow: 0 4px 14px rgba(5,150,105,.3) !important; flex-shrink: 0 !important;
}
.cl-header-eyebrow { font-size: 11px !important; color: #94A3B8 !important; margin: 0 0 2px !important; }
.cl-header-title { font-size: 26px !important; font-weight: 900 !important; letter-spacing: -.03em !important; color: #0f172a !important; margin: 0 0 3px !important; }
.cl-header-sub { font-size: 13px !important; color: #64748b !important; margin: 0 !important; }

/* ════════════════════════════════════════════
   EXPORT GRID
════════════════════════════════════════════ */
.cl-export-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)) !important;
  gap: 14px !important;
  padding: 0 28px !important;
  margin-bottom: 24px !important;
}
.cl-export-card {
  background: #ffffff !important; border: 1px solid #E2E8F0 !important;
  border-radius: 14px !important; padding: 18px 20px !important;
  display: flex !important; align-items: center !important; gap: 14px !important;
  box-shadow: 0 1px 4px rgba(0,0,0,.05) !important;
  transition: box-shadow .18s, transform .18s !important;
}
.cl-export-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.09) !important; transform: translateY(-2px) !important; }
.cl-export-icon {
  width: 44px !important; height: 44px !important; border-radius: 12px !important;
  display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;
}
.cl-export-txt { display: flex !important; flex-direction: column !important; flex: 1 !important; gap: 2px !important; }
.cl-export-title { font-size: 14px !important; font-weight: 800 !important; color: #0f172a !important; }
.cl-export-desc { font-size: 11px !important; color: #64748b !important; }
.cl-export-btn {
  display: flex !important; align-items: center !important; gap: 6px !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 11px !important; font-weight: 800 !important;
  padding: 8px 14px !important; border-radius: 9px !important; border: none !important;
  cursor: pointer !important; white-space: nowrap !important; flex-shrink: 0 !important;
  transition: filter .14s !important;
}
.cl-export-btn:hover { filter: brightness(1.08) !important; }
.cl-export-btn svg { stroke: #ffffff !important; }
.cl-btn-green  { background: #059669 !important; color: #fff !important; box-shadow: 0 2px 8px rgba(5,150,105,.3) !important; }
.cl-btn-indigo { background: #4F46E5 !important; color: #fff !important; box-shadow: 0 2px 8px rgba(79,70,229,.3) !important; }
.cl-btn-amber  { background: #D97706 !important; color: #fff !important; box-shadow: 0 2px 8px rgba(217,119,6,.3) !important; }
.cl-btn-rose   { background: #E11D48 !important; color: #fff !important; box-shadow: 0 2px 8px rgba(225,29,72,.3) !important; }
.cl-btn-violet { background: #7C3AED !important; color: #fff !important; box-shadow: 0 2px 8px rgba(124,58,237,.3) !important; }

/* ════════════════════════════════════════════
   GERADOR DO CONCLUSIVO
════════════════════════════════════════════ */
.cl-conclusivo-gen {
  margin: 0 28px 8px !important;
  background: linear-gradient(135deg, #0f172a, #1e3a5f) !important;
  border-radius: 16px !important; padding: 24px 28px !important;
  display: flex !important; align-items: center !important; justify-content: space-between !important;
  gap: 20px !important; flex-wrap: wrap !important;
  box-shadow: 0 8px 32px rgba(15,23,42,.25) !important;
}
.cl-conclusivo-gen-left { display: flex !important; align-items: center !important; gap: 14px !important; }
.cl-conclusivo-gen-icon {
  width: 48px !important; height: 48px !important; border-radius: 13px !important;
  background: rgba(255,255,255,.12) !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;
}
.cl-conclusivo-gen-title { font-size: 18px !important; font-weight: 800 !important; color: #ffffff !important; margin: 0 0 3px !important; }
.cl-conclusivo-gen-sub { font-size: 12px !important; color: rgba(255,255,255,.55) !important; margin: 0 !important; }
.cl-conclusivo-gen-right { display: flex !important; align-items: center !important; gap: 12px !important; flex-wrap: wrap !important; }
.cl-month-wrap { display: flex !important; flex-direction: column !important; gap: 4px !important; }
.cl-month-label { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .1em !important; text-transform: uppercase !important; color: rgba(255,255,255,.5) !important; }
.cl-month-input {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 14px !important; font-weight: 700 !important;
  padding: 9px 14px !important; border-radius: 10px !important;
  border: 1.5px solid rgba(255,255,255,.2) !important;
  background: rgba(255,255,255,.1) !important; color: #ffffff !important; outline: none !important;
}
.cl-month-input:focus { border-color: #059669 !important; }
.cl-btn-conclusivo {
  display: flex !important; align-items: center !important; gap: 8px !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 13px !important; font-weight: 800 !important;
  background: #059669 !important; color: #ffffff !important;
  border: none !important; border-radius: 11px !important; padding: 11px 24px !important;
  cursor: pointer !important; box-shadow: 0 4px 14px rgba(5,150,105,.4) !important;
  transition: all .14s !important;
}
.cl-btn-conclusivo:hover { background: #047857 !important; transform: translateY(-1px) !important; }
.cl-btn-conclusivo:disabled { opacity: .4 !important; cursor: not-allowed !important; transform: none !important; }
.cl-btn-conclusivo svg { stroke: #ffffff !important; }

/* ════════════════════════════════════════════
   DIALOG SHELL
════════════════════════════════════════════ */
.pdf-shell {
  display: flex !important; flex-direction: column !important;
  height: 100% !important; min-height: 100vh !important; background: #E5E7EB !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  overflow: hidden !important;
}

/* Barra de ação */
.pdf-action-bar {
  display: flex !important; align-items: center !important; justify-content: space-between !important;
  padding: 12px 20px !important;
  background: #0f172a !important; border-bottom: 1px solid rgba(255,255,255,.08) !important;
  flex-shrink: 0 !important; z-index: 10 !important;
  gap: 12px !important;
}
.pdf-action-left, .pdf-action-right { display: flex !important; align-items: center !important; gap: 8px !important; min-width: 160px !important; }
.pdf-action-right { justify-content: flex-end !important; }
.pdf-action-center { flex: 1 !important; text-align: center !important; }
.pdf-action-title { font-size: 14px !important; font-weight: 700 !important; color: #ffffff !important; }
.pdf-close-btn {
  display: flex !important; align-items: center !important; gap: 6px !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 12px !important; font-weight: 700 !important;
  background: rgba(255,255,255,.1) !important; color: #ffffff !important;
  border: 1px solid rgba(255,255,255,.15) !important; border-radius: 8px !important;
  padding: 7px 14px !important; cursor: pointer !important; transition: all .14s !important;
}
.pdf-close-btn:hover { background: rgba(255,255,255,.18) !important; }
.pdf-close-btn svg { stroke: #ffffff !important; }
.pdf-download-btn {
  display: flex !important; align-items: center !important; gap: 7px !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 12px !important; font-weight: 800 !important;
  background: #059669 !important; color: #ffffff !important;
  border: none !important; border-radius: 8px !important; padding: 8px 18px !important;
  cursor: pointer !important; box-shadow: 0 2px 8px rgba(5,150,105,.4) !important;
  transition: all .14s !important;
}
.pdf-download-btn:hover { background: #047857 !important; }
.pdf-download-btn svg { stroke: #ffffff !important; }

/* Scroll area */
.pdf-scroll {
  flex: 1 1 0 !important;
  overflow-y: scroll !important;
  -webkit-overflow-scrolling: touch !important;
  display: block !important;
  padding: 32px 20px !important;
  min-height: 0 !important;
  height: 0 !important;
}

/* ════════════════════════════════════════════
   DOCUMENTO PDF
════════════════════════════════════════════ */
.pdf-doc {
  width: 100% !important; max-width: 960px !important;
  background: #ffffff !important;
  box-shadow: 0 8px 40px rgba(0,0,0,.18) !important;
  border-radius: 4px !important;
  overflow: hidden !important;
}

/* ── CAPA ─────────────────────────────────── */
.pdf-cover {
  position: relative !important;
  min-height: 420px !important;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f2d1a 100%) !important;
  padding: 0 !important; overflow: hidden !important;
  display: flex !important;
}
.pdf-cover-bg {
  position: absolute !important; inset: 0 !important;
  background: radial-gradient(ellipse at 70% 30%, rgba(5,150,105,.3) 0%, transparent 60%),
              radial-gradient(ellipse at 20% 80%, rgba(79,70,229,.2) 0%, transparent 50%) !important;
  pointer-events: none !important;
}
.pdf-cover-inner {
  position: relative !important; width: 100% !important;
  display: flex !important; flex-direction: column !important;
  padding: 40px 48px !important; gap: 28px !important;
}
.pdf-cover-logos {
  display: flex !important; align-items: center !important; gap: 20px !important;
}
.pdf-logo-main { height: 48px !important; object-fit: contain !important; filter: brightness(0) invert(1) !important; }
.pdf-cover-divider-v { width: 1px !important; height: 40px !important; background: rgba(255,255,255,.2) !important; }
.pdf-cover-org { display: flex !important; flex-direction: column !important; gap: 2px !important; }
.pdf-cover-org-label { font-size: 14px !important; font-weight: 800 !important; color: #ffffff !important; }
.pdf-cover-org-sub { font-size: 11px !important; color: rgba(255,255,255,.5) !important; }
.pdf-cover-body { flex: 1 !important; }
.pdf-cover-eyebrow {
  font-size: 11px !important; font-weight: 700 !important; letter-spacing: .16em !important;
  text-transform: uppercase !important; color: #34D399 !important; margin: 0 0 12px !important;
}
.pdf-cover-title {
  font-size: 36px !important; font-weight: 900 !important; color: #ffffff !important;
  letter-spacing: -.03em !important; line-height: 1.1 !important; margin: 0 0 20px !important;
  max-width: 600px !important;
}
.pdf-cover-period { margin-bottom: 28px !important; }
.pdf-cover-period-badge {
  display: inline-flex !important; align-items: center !important; gap: 8px !important;
  background: rgba(255,255,255,.1) !important; border: 1px solid rgba(255,255,255,.2) !important;
  border-radius: 20px !important; padding: 6px 16px !important;
  font-size: 14px !important; font-weight: 700 !important; color: #ffffff !important;
}
.pdf-cover-period-badge svg { stroke: #34D399 !important; }
.pdf-cover-stats {
  display: flex !important; align-items: center !important; gap: 0 !important;
  background: rgba(255,255,255,.06) !important; border: 1px solid rgba(255,255,255,.12) !important;
  border-radius: 14px !important; width: fit-content !important;
}
.pdf-cover-stat { padding: 16px 28px !important; display: flex !important; flex-direction: column !important; gap: 4px !important; }
.pdf-cover-stat-div { width: 1px !important; height: 40px !important; background: rgba(255,255,255,.15) !important; align-self: center !important; }
.pdf-cover-stat-val { font-size: 20px !important; font-weight: 900 !important; color: #34D399 !important; letter-spacing: -.02em !important; }
.pdf-cover-stat-lbl { font-size: 10px !important; font-weight: 600 !important; color: rgba(255,255,255,.5) !important; text-transform: uppercase !important; letter-spacing: .08em !important; }
.pdf-cover-footer {
  display: flex !important; justify-content: space-between !important;
  font-size: 11px !important; color: rgba(255,255,255,.35) !important;
  border-top: 1px solid rgba(255,255,255,.1) !important; padding-top: 16px !important;
}

/* ── SEÇÕES ───────────────────────────────── */
.pdf-section {
  padding: 36px 48px !important;
  border-bottom: 1px solid #F1F5F9 !important;
}
.pdf-section-header {
  display: flex !important; align-items: center !important; gap: 16px !important;
  margin-bottom: 24px !important;
  background: var(--sec-bg) !important;
  border-radius: 12px !important; padding: 16px 20px !important;
  border-left: 4px solid var(--sec-color) !important;
}
.pdf-sec-num {
  width: 36px !important; height: 36px !important; border-radius: 10px !important;
  background: #059669 !important; color: #ffffff !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  font-size: 13px !important; font-weight: 900 !important; flex-shrink: 0 !important;
}
.pdf-sec-title { font-size: 18px !important; font-weight: 900 !important; color: #0f172a !important; margin: 0 0 2px !important; }
.pdf-sec-sub { font-size: 12px !important; color: #64748b !important; margin: 0 !important; }

/* ── KPI GRID ─────────────────────────────── */
.pdf-kpi-grid {
  display: grid !important; grid-template-columns: repeat(3, 1fr) !important;
  gap: 12px !important; margin-bottom: 24px !important;
}
.pdf-kpi {
  background: #ffffff !important; border: 1px solid #E2E8F0 !important;
  border-radius: 12px !important; padding: 16px !important;
  position: relative !important; overflow: hidden !important;
  display: flex !important; flex-direction: column !important; gap: 4px !important;
}
.pdf-kpi::before {
  content: '' !important; position: absolute !important;
  top: 0 !important; left: 0 !important; right: 0 !important; height: 3px !important;
  background: var(--k) !important;
}
.pdf-kpi-icon {
  width: 32px !important; height: 32px !important; border-radius: 9px !important;
  background: var(--klt) !important; color: var(--k) !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  margin-bottom: 6px !important;
}
.pdf-kpi-icon svg { stroke: var(--k) !important; }
.pdf-kpi-lbl { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .08em !important; text-transform: uppercase !important; color: #94A3B8 !important; }
.pdf-kpi-val { font-size: 18px !important; font-weight: 900 !important; color: #0f172a !important; letter-spacing: -.02em !important; }
.pdf-kpi-note { font-size: 10px !important; color: #64748b !important; }

/* ── TABELAS ──────────────────────────────── */
.pdf-table { width: 100% !important; border-collapse: collapse !important; font-size: 13px !important; margin-bottom: 16px !important; border-radius: 10px !important; overflow: hidden !important; box-shadow: 0 1px 4px rgba(0,0,0,.06) !important; }
.pdf-th-section { padding: 11px 16px !important; color: #ffffff !important; font-size: 11px !important; font-weight: 800 !important; letter-spacing: .08em !important; text-transform: uppercase !important; text-align: left !important; }
.pdf-th-row th { background: #F8FAFC !important; color: #475569 !important; font-size: 11px !important; font-weight: 700 !important; letter-spacing: .06em !important; text-transform: uppercase !important; padding: 9px 16px !important; text-align: left !important; border-bottom: 1px solid #E2E8F0 !important; }
.pdf-tr td { padding: 10px 16px !important; border-bottom: 1px solid #F1F5F9 !important; color: #0f172a !important; font-size: 13px !important; }
.pdf-tr-alt td { background: #F9FFFE !important; }
.pdf-tr:hover td { background: #ECFDF5 !important; }
.pdf-td-val { text-align: right !important; font-weight: 700 !important; font-family: 'DM Mono', monospace !important; }
.pdf-td-green { color: #059669 !important; }
.pdf-td-indigo { color: #4F46E5 !important; }

/* ── TWO COL ──────────────────────────────── */
.pdf-two-col { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 20px !important; margin-bottom: 16px !important; }

/* ── AUTOSSUFICIÊNCIA ─────────────────────── */
.pdf-autossuf-box {
  background: #F8FAFC !important; border: 1px solid #E2E8F0 !important;
  border-radius: 12px !important; padding: 20px !important; display: flex !important; flex-direction: column !important; gap: 16px !important;
}
.pdf-autossuf-title { font-size: 13px !important; font-weight: 800 !important; color: #0f172a !important; margin: 0 0 4px !important; }
.pdf-autossuf-item { display: flex !important; flex-direction: column !important; gap: 6px !important; }
.pdf-autossuf-label { display: flex !important; align-items: center !important; justify-content: space-between !important; }
.pdf-autossuf-cat { font-size: 11px !important; font-weight: 700 !important; padding: 3px 9px !important; border-radius: 20px !important; }
.pdf-autossuf-pct { font-size: 20px !important; font-weight: 900 !important; letter-spacing: -.02em !important; }
.pdf-autossuf-note { font-size: 10px !important; color: #94A3B8 !important; }
.pdf-progress-track { height: 8px !important; background: #E2E8F0 !important; border-radius: 6px !important; overflow: hidden !important; }
.pdf-progress-fill { height: 100% !important; border-radius: 6px !important; transition: width .4s !important; }

/* ── RANKINGS ─────────────────────────────── */
.pdf-rankings-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 16px !important; }
.pdf-rank-card { border: 1px solid #E2E8F0 !important; border-radius: 12px !important; overflow: hidden !important; box-shadow: 0 1px 4px rgba(0,0,0,.05) !important; }
.pdf-rank-header { display: flex !important; align-items: center !important; gap: 10px !important; padding: 10px 14px !important; }
.pdf-rank-icon { width: 26px !important; height: 26px !important; border-radius: 7px !important; background: rgba(255,255,255,.2) !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; }
.pdf-rank-title { font-size: 11px !important; font-weight: 800 !important; color: #ffffff !important; }
.pdf-rank-body { background: #ffffff !important; }
.pdf-rank-row { display: flex !important; align-items: center !important; gap: 10px !important; padding: 8px 14px !important; border-bottom: 1px solid #F1F5F9 !important; }
.pdf-rank-row:last-child { border-bottom: none !important; }
.pdf-rank-first { background: #F9FFFE !important; }
.pdf-rank-pos { width: 22px !important; height: 22px !important; border-radius: 6px !important; background: #F1F5F9 !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 11px !important; font-weight: 800 !important; color: #475569 !important; flex-shrink: 0 !important; }
.pdf-rank-info { flex: 1 !important; display: flex !important; flex-direction: column !important; gap: 1px !important; }
.pdf-rank-nome { font-size: 12px !important; font-weight: 700 !important; color: #0f172a !important; }
.pdf-rank-uc { font-size: 10px !important; color: #94A3B8 !important; font-family: 'DM Mono', monospace !important; }
.pdf-rank-value { font-size: 12px !important; font-weight: 800 !important; white-space: nowrap !important; }

/* ── ECONOMIA ─────────────────────────────── */
.pdf-economia-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 12px !important; margin-bottom: 20px !important; }
.pdf-economia-card {
  background: #ffffff !important; border: 1px solid #E2E8F0 !important;
  border-radius: 12px !important; padding: 18px !important;
  display: flex !important; flex-direction: column !important; gap: 4px !important;
  position: relative !important; overflow: hidden !important;
}
.pdf-economia-card::before { content:'' !important; position:absolute !important; top:0 !important; left:0 !important; right:0 !important; height:3px !important; background: var(--ec) !important; }
.pdf-ec-icon { width: 36px !important; height: 36px !important; border-radius: 10px !important; background: var(--eclt) !important; color: var(--ec) !important; display: flex !important; align-items: center !important; justify-content: center !important; margin-bottom: 8px !important; }
.pdf-ec-icon svg { stroke: var(--ec) !important; }
.pdf-ec-lbl { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .08em !important; text-transform: uppercase !important; color: #94A3B8 !important; }
.pdf-ec-val { font-size: 20px !important; font-weight: 900 !important; color: #0f172a !important; letter-spacing: -.02em !important; }
.pdf-ec-note { font-size: 10px !important; color: #64748b !important; }

.pdf-payback-bar-wrap { margin-bottom: 20px !important; }
.pdf-payback-bar-labels { display: flex !important; justify-content: space-between !important; font-size: 12px !important; color: #64748b !important; margin-bottom: 8px !important; font-weight: 600 !important; }
.pdf-payback-track { height: 20px !important; background: #F1F5F9 !important; border-radius: 10px !important; overflow: hidden !important; }
.pdf-payback-fill { height: 100% !important; background: linear-gradient(90deg, #059669, #4F46E5) !important; border-radius: 10px !important; display: flex !important; align-items: center !important; justify-content: flex-end !important; padding-right: 10px !important; transition: width .6s !important; min-width: 40px !important; }
.pdf-payback-fill span { font-size: 11px !important; font-weight: 800 !important; color: #ffffff !important; }

/* ── AMBIENTAL ────────────────────────────── */
.pdf-ambiental-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 16px !important; }
.pdf-amb-card { background: #F8FAFC !important; border: 1px solid #E2E8F0 !important; border-radius: 12px !important; padding: 20px !important; display: flex !important; align-items: center !important; gap: 14px !important; }
.pdf-amb-icon { width: 52px !important; height: 52px !important; border-radius: 14px !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; }
.pdf-amb-vals { display: flex !important; flex-direction: column !important; gap: 3px !important; }
.pdf-amb-big { font-size: 22px !important; font-weight: 900 !important; color: #0f172a !important; letter-spacing: -.02em !important; }
.pdf-amb-lbl { font-size: 11px !important; color: #64748b !important; font-weight: 600 !important; }

/* ── USINAS ───────────────────────────────── */
.pdf-usinas-grid { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important; gap: 12px !important; }
.pdf-usina-card { background: #ffffff !important; border: 1px solid #E2E8F0 !important; border-radius: 12px !important; padding: 14px 16px !important; box-shadow: 0 1px 4px rgba(0,0,0,.05) !important; }
.pdf-usina-head { display: flex !important; align-items: center !important; gap: 10px !important; margin-bottom: 12px !important; }
.pdf-usina-icon { width: 30px !important; height: 30px !important; border-radius: 8px !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; }
.pdf-usina-icon svg { stroke: currentColor !important; }
.pdf-usina-info { flex: 1 !important; display: flex !important; flex-direction: column !important; gap: 1px !important; }
.pdf-usina-nome { font-size: 12px !important; font-weight: 700 !important; color: #0f172a !important; }
.pdf-usina-uc { font-size: 10px !important; color: #94A3B8 !important; font-family: 'DM Mono', monospace !important; }
.pdf-usina-badge { font-size: 10px !important; font-weight: 700 !important; padding: 3px 9px !important; border-radius: 20px !important; border: 1px solid !important; white-space: nowrap !important; }
.pdf-usina-stats { display: flex !important; gap: 16px !important; margin-bottom: 10px !important; }
.pdf-usina-stat { display: flex !important; flex-direction: column !important; gap: 2px !important; }
.pdf-usina-stat-lbl { font-size: 9px !important; font-weight: 700 !important; letter-spacing: .08em !important; text-transform: uppercase !important; color: #94A3B8 !important; }
.pdf-usina-stat-val { font-size: 14px !important; font-weight: 800 !important; color: #0f172a !important; }
.pdf-usina-bar-track { height: 6px !important; background: #F1F5F9 !important; border-radius: 4px !important; overflow: hidden !important; }
.pdf-usina-bar-fill { height: 100% !important; border-radius: 4px !important; transition: width .4s !important; }

/* ── PROJEÇÃO ─────────────────────────────── */
.pdf-projecao-box {
  background: linear-gradient(135deg, #FFFBEB, #ECFDF5) !important;
  border: 1.5px solid #FDE68A !important; border-radius: 14px !important;
  padding: 24px 28px !important; display: flex !important; align-items: center !important; gap: 20px !important;
}
.pdf-projecao-icon { width: 56px !important; height: 56px !important; border-radius: 14px !important; background: #D97706 !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; }
.pdf-projecao-icon svg { stroke: #ffffff !important; }
.pdf-projecao-content { display: flex !important; flex-direction: column !important; gap: 4px !important; }
.pdf-projecao-lbl { font-size: 11px !important; font-weight: 700 !important; letter-spacing: .08em !important; text-transform: uppercase !important; color: #92400E !important; }
.pdf-projecao-val { font-size: 32px !important; font-weight: 900 !important; color: #0f172a !important; letter-spacing: -.03em !important; }
.pdf-projecao-note { font-size: 12px !important; color: #64748b !important; }

/* ── RODAPÉ DO DOCUMENTO ──────────────────── */
.pdf-doc-footer {
  background: #0f172a !important;
  padding: 20px 48px !important;
  display: flex !important; align-items: center !important; justify-content: space-between !important;
  gap: 16px !important;
}
.pdf-doc-footer-left { display: flex !important; align-items: center !important; gap: 12px !important; }
.pdf-footer-logo { height: 28px !important; object-fit: contain !important; filter: brightness(0) invert(1) !important; }
.pdf-doc-footer-txt { display: flex !important; flex-direction: column !important; gap: 1px !important; }
.pdf-doc-footer-brand { font-size: 12px !important; font-weight: 900 !important; letter-spacing: .1em !important; color: #ffffff !important; }
.pdf-doc-footer-sub { font-size: 10px !important; color: rgba(255,255,255,.4) !important; }
.pdf-doc-footer-right { display: flex !important; flex-direction: column !important; align-items: flex-end !important; gap: 2px !important; font-size: 10px !important; color: rgba(255,255,255,.4) !important; }

/* ════════════════════════════════════════════
   RESPONSIVO
════════════════════════════════════════════ */
@media (max-width: 700px) {
  .cl-export-grid { grid-template-columns: 1fr !important; padding: 0 16px !important; }
  .cl-conclusivo-gen { margin: 0 16px 8px !important; flex-direction: column !important; align-items: flex-start !important; }
  .pdf-kpi-grid { grid-template-columns: 1fr 1fr !important; }
  .pdf-two-col { grid-template-columns: 1fr !important; }
  .pdf-rankings-grid { grid-template-columns: 1fr !important; }
  .pdf-economia-grid { grid-template-columns: 1fr !important; }
  .pdf-ambiental-grid { grid-template-columns: 1fr !important; }
  .pdf-cover-title { font-size: 24px !important; }
  .pdf-cover-stats { flex-direction: column !important; }
  .pdf-section { padding: 24px 20px !important; }
}

/* Vuetify dialog fix — allow scroll inside */
.cl-dialog-fullscreen {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  height: 100vh !important;
  max-height: 100vh !important;
}
.cl-dialog-fullscreen .pdf-shell {
  height: 100vh !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}
.cl-dialog-fullscreen .pdf-action-bar {
  flex-shrink: 0 !important;
  position: sticky !important;
  top: 0 !important;
  z-index: 100 !important;
}
.cl-dialog-fullscreen .pdf-scroll {
  flex: 1 1 0 !important;
  overflow-y: scroll !important;
  -webkit-overflow-scrolling: touch !important;
  min-height: 0 !important;
  display: block !important;
}

</style>