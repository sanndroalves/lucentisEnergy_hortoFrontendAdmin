<script setup>
import { useHead  } from '@vueuse/head'
import { API_BASE_URL } from '~/base/link'
import { ref, computed } from 'vue'

useHead({ title: 'Relatórios' })
definePageMeta({ middleware: 'sidebase-auth' })

import UiParentCard     from '@/components/shared/UiParentCard.vue'
import RelatorioUsina   from '~~/components/dashboard/RelatorioUsina.vue'
import RelatorioConclusivo from '~~/components/relatorios/conclusivo.vue'

// ── dados globais ─────────────────────────────────────────────────
const { data: usinas      } = await useFetch(`${API_BASE_URL}/usina/`)
const { data: todosPredios} = await useFetch(`${API_BASE_URL}/unidadecompensacao/`)
const { data: todosRela   } = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`)

// ── UI state ──────────────────────────────────────────────────────
const cateSelecionada     = ref('')
const vistaConsumo        = ref('mensal')   // 'mensal' | 'anual'
const vistaGeral          = ref('mensal')

// ── CONSUMO ───────────────────────────────────────────────────────
const preSelecionado      = ref('')
const selectedYearConsumo = ref('')
const prediosEscolhidos   = ref(null)
const relatorios          = ref([])
const mesesNomes          = [1,2,3,4,5,6,7,8,9,10,11,12]
const mesSelecionadoC     = ref(1)          // mês exibido na vista mensal consumo

const ANOS = ['2023','2024','2025','2026','2027','2028']

const pesquisarConsumo = async () => {
  if (!selectedYearConsumo.value || !preSelecionado.value) return
  const { data: rP } = await useFetch(`${API_BASE_URL}/relatoriocompensacao?ano=${selectedYearConsumo.value}`)
  const { data: pD } = await useFetch(`${API_BASE_URL}/unidadecompensacao?categoria=${preSelecionado.value}`)
  relatorios.value       = rP._rawValue ?? rP.value ?? []
  prediosEscolhidos.value = pD.value?.filter(i => i.status === 'L' || i.status === 'D') ?? []
}

const getAvatarClass = (rela, index, predioId) => {
  const ca = rela.consumoReais
  let cm
  if (rela.mes === 1)
    cm = todosRela.value?.find(i => i.mes===12 && i.ano===(rela.ano-1) && i.idUnidadeCompensa===predioId)?.consumoReais
  else
    cm = relatorios.value?.find(i => i.mes===mesesNomes[index-1] && i.idUnidadeCompensa===predioId)?.consumoReais
  if (parseInt(ca) > parseInt(cm)) return 'err'
  if (parseInt(ca) < parseInt(cm)) return 'ok'
  return 'neu'
}

const getStatusLabel = (s) => ({ err:'↑ Maior', ok:'↓ Menor', neu:'→ Igual' }[s] ?? '—')

const getQuantidadeConsumo = (rela, index, predioId) => {
  let cm
  if (rela.mes === 1)
    cm = todosRela.value?.find(i => i.mes===12 && i.ano===(rela.ano-1) && i.idUnidadeCompensa===predioId)?.consumoReais
  else
    cm = relatorios.value?.find(i => i.mes===mesesNomes[index-1] && i.idUnidadeCompensa===predioId)?.consumoReais
  if (cm != null) return Math.abs((Number(rela.consumoReais)-Number(cm)).toFixed(2))
  return '—'
}

const mesesConsumoIrregular = ref(
  Object.fromEntries(['E','S','O','P','I'].map(s => [s,
    Object.fromEntries(ANOS.map(a => [a,
      Array.from({length:12},(_,i)=>({mes:i+1,qtdAcima:0,unidades:[]}))
    ]))
  ]))
)

const adicionarQtdAcima = (mesAtual, anoAtual, predioId, cat) => {
  const c = mesesConsumoIrregular.value[cat]
  if (!c || !c[anoAtual]) return
  const m = c[anoAtual][mesAtual-1]
  if (!m.unidades.includes(predioId)) { m.unidades.push(predioId); m.qtdAcima++ }
}

const getBG = (rela, index, predioId, cat) => {
  let cm
  if (rela.mes===1)
    cm = todosRela.value?.find(i=>i.mes===12&&i.ano===(rela.ano-1)&&i.idUnidadeCompensa===predioId)?.consumoReais
  else
    cm = relatorios.value?.find(i=>i.mes===mesesNomes[index-1]&&i.idUnidadeCompensa===predioId)?.consumoReais
  if (cm != null && parseInt(rela.consumoReais)>parseInt(cm)) {
    const f = Math.abs(Number(rela.consumoReais)-Number(cm))
    if (f>150&&f<300) return '#FFF3CE'
    if (f>=300&&f<500) return '#FFE0BA'
    if (f>=500&&f<800) return '#FFC79A'
    if (f>=800) { adicionarQtdAcima(rela.mes,selectedYearConsumo.value,predioId,cat); return '#FFA086' }
  }
  return ''
}

// kpi consumo
const kpiConsumoTotal = computed(() =>
  relatorios.value?.filter(i => prediosEscolhidos.value?.some(p=>p.id===i.idUnidadeCompensa))
    .reduce((a,i)=>a+Number(i.consumokWh||0),0) ?? 0
)
const kpiCustoTotal = computed(() =>
  relatorios.value?.filter(i => prediosEscolhidos.value?.some(p=>p.id===i.idUnidadeCompensa))
    .reduce((a,i)=>a+Number(i.consumoReais||0),0) ?? 0
)
const kpiAlertasTotal = computed(() => {
  if (!preSelecionado.value || !selectedYearConsumo.value) return 0
  return mesesConsumoIrregular.value[preSelecionado.value]?.[selectedYearConsumo.value]
    ?.reduce((a,m)=>a+m.qtdAcima,0) ?? 0
})
const kpiUnidadesTotal = computed(() => prediosEscolhidos.value?.length ?? 0)

const alertasPorMes = computed(() => {
  if (!preSelecionado.value || !selectedYearConsumo.value) return []
  return mesesConsumoIrregular.value[preSelecionado.value]?.[selectedYearConsumo.value] ?? []
})
const maxAlerta = computed(() => Math.max(...alertasPorMes.value.map(m=>m.qtdAcima),1))
const barColor = (n) => n===0?'#059669':n<=2?'#D97706':'#E11D48'

// relatorios filtrados por mês (vista mensal)
const relatoriosMes = computed(() =>
  relatorios.value?.filter(i=>i.mes===mesSelecionadoC.value) ?? []
)

// labels helpers
const monthNumberToName = (n) =>
  ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][n-1] ?? ''
const labelMesC = computed(() => monthNumberToName(mesSelecionadoC.value).toUpperCase()+' '+selectedYearConsumo.value)
const navMesC = (dir) => { mesSelecionadoC.value = ((mesSelecionadoC.value-1+dir+12)%12)+1 }

const getStatusLabel2 = (status) => ({ E:'Educação',S:'Saúde',O:'Outros' }[status]??'Desconhecido')

// ── INJETADO ─────────────────────────────────────────────────────
const selectedUsinaInjetado   = ref(null)
const selectedYearInjetado    = ref('')
const usinaEscolhidaInjetado  = ref(null)
const relatoriosInjetado      = ref([])
const geracaoUsinaInjetada    = ref([])
const projetadoUsinaInjetada  = ref([])

const pesquisarInjetado = async () => {
  if (!selectedUsinaInjetado.value || !selectedYearInjetado.value) return
  const { data: rP } = await useFetch(`${API_BASE_URL}/relatoriousina?idGeradora=${selectedUsinaInjetado.value}&ano=${selectedYearInjetado.value}`)
  const { data: uD } = await useFetch(`${API_BASE_URL}/usina/${selectedUsinaInjetado.value}`)
  const { data: pU } = await useFetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${selectedUsinaInjetado.value}&ano=${selectedYearInjetado.value}`)
  const { data: gU } = await useFetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${selectedUsinaInjetado.value}&ano=${selectedYearInjetado.value}`)
  relatoriosInjetado.value     = rP._rawValue ?? rP.value ?? []
  usinaEscolhidaInjetado.value = uD.value
  projetadoUsinaInjetada.value = pU._rawValue ?? pU.value ?? []
  geracaoUsinaInjetada.value   = gU._rawValue ?? gU.value ?? []
}

// ── COMPENSAÇÃO ──────────────────────────────────────────────────
const unidadeSelecionado            = ref('')
const anoSelecionado                = ref('')
const CompensaPrediosSelecionados   = ref(null)
const selectedUnidade               = ref(null)
const pesquisaCarregada             = ref(false)
const totalProjetoInjetado          = ref(0)
const infoUnidade                   = ref(null)
const infoUsinas                    = ref([])
const tamanhoProcurar               = ref(0)
const mesSelecionadoCp              = ref(1)
const relatorioUnidadeComp          = ref([])

const { data: unidades      } = await useFetch(`${API_BASE_URL}/unidadecompensacao`)
const { data: injecoesGeral } = await useFetch(`${API_BASE_URL}/relatoriousina`)
const { data: porcentagens  } = await useFetch(`${API_BASE_URL}/porcentagem`)
const { data: todasPorcento } = await useFetch(`${API_BASE_URL}/porcentagem`)

const pesquisarPredios = async () => {
  if (!unidadeSelecionado.value) return
  const { data: uD } = await useFetch(`${API_BASE_URL}/unidadecompensacao?categoria=${unidadeSelecionado.value}`)
  CompensaPrediosSelecionados.value = uD._rawValue ?? uD.value ?? []
}

const filtrarPorcentagensPorMes = (pc, mes) => pc.filter(p => {
  const di = new Date(p.data_inicio)
  const df = p.data_fim ? new Date(p.data_fim) : null
  const ref = new Date(`${anoSelecionado.value}-${String(mes).padStart(2,'0')}-02`)
  return (ref >= di || (ref.getFullYear()===di.getFullYear()&&ref.getMonth()>=di.getMonth())) &&
         (!df || ref <= df || (ref.getFullYear()===df.getFullYear()&&ref.getMonth()<=df.getMonth()))
})

const procurarUsinasGeradores = async () => {
  const ug = []
  const { data: pc } = await useFetch(`${API_BASE_URL}/porcentagem?idUnidadeCompensa=${selectedUnidade.value}`)
  const pf = filtrarPorcentagensPorMes(pc.value ?? [], mesSelecionadoCp.value)
  await Promise.all(pf.map(async p => {
    const { data: u } = await useFetch(`${API_BASE_URL}/usina/${p.idGeradora}`)
    ug.push({ ...u._rawValue, porcentagem: p })
  }))
  return ug
}

const pesquisarRelatorio = async () => {
  const { data: rm } = await useFetch(
    `${API_BASE_URL}/relatoriocompensacao?ano=${anoSelecionado.value}&mes=${mesSelecionadoCp.value}&idUnidadeCompensa=${selectedUnidade.value}`
  )
  relatorioUnidadeComp.value = rm._rawValue ?? rm.value ?? []
}

const pesquisarCompensaNovo = async () => {
  pesquisaCarregada.value = true
  infoUnidade.value       = unidades.value?.find(i=>i.id===selectedUnidade.value)
  infoUsinas.value        = await procurarUsinasGeradores()
  tamanhoProcurar.value   = infoUsinas.value.length
  totalProjetoInjetado.value = 0
  await pesquisarRelatorio()
}

const procurarInjecao = (idUsina, idUnidade, idSolicitacao) => {
  const mesAnt = mesSelecionadoCp.value===1 ? 12 : mesSelecionadoCp.value-1
  const anoFn  = mesSelecionadoCp.value===1 ? anoSelecionado.value-1 : anoSelecionado.value
  const ri = injecoesGeral.value?.filter(i=>i.idGeradora===idUsina&&i.mes===mesAnt&&i.ano==anoFn)
  const total = ri?.length ? Number(ri[0].injetadoPonta)+Number(ri[0].injetadoFPonta) : 0
  const pp = porcentagens.value?.filter(i=>i.idGeradora===idUsina&&i.idUnidadeCompensa===idUnidade)
  if (idSolicitacao===1 && pp?.length && tamanhoProcurar.value>0) {
    totalProjetoInjetado.value = (Number(totalProjetoInjetado.value)+Number((total/100*pp[0].porcentagem).toFixed(2))).toFixed(2)
    tamanhoProcurar.value--
  }
  return total
}

const labelMesCp = computed(() => monthNumberToName(mesSelecionadoCp.value).toUpperCase()+' '+anoSelecionado.value)
const navMesCp = async (dir) => {
  mesSelecionadoCp.value = ((mesSelecionadoCp.value-1+dir+12)%12)+1
  totalProjetoInjetado.value = 0
  tamanhoProcurar.value = infoUsinas.value.length
  await pesquisarCompensaNovo()
}

// ── GERAL ─────────────────────────────────────────────────────────
const selectedYearGeral  = ref('')
const somaProjecao       = ref({})
const somaReal           = ref({})
const somaInjetadoG      = ref({})
const somaInjetadoAnt    = ref({})
const somaCompensado     = ref({})
const somaSaldoEnergia   = ref({})
const totalProjetado     = ref(0)
const totalRealG         = ref(0)
const totalInjetadoG2    = ref(0)
const totalCompensadoG   = ref(0)
const mesSelecionadoG    = ref(1)
const labelMesG          = computed(()=>monthNumberToName(mesSelecionadoG.value).toUpperCase()+' '+selectedYearGeral.value)
const navMesG = (dir) => { mesSelecionadoG.value = ((mesSelecionadoG.value-1+dir+12)%12)+1 }

const { data: projecao   } = await useFetch(`${API_BASE_URL}/projecaogeracao`)
const { data: realData   } = await useFetch(`${API_BASE_URL}/relatoriogeracao`)
const { data: injetadoD  } = await useFetch(`${API_BASE_URL}/relatoriousina`)
const { data: compensadoD} = await useFetch(`${API_BASE_URL}/relatoriocompensacao`)

const somarPorMes = (arr, ano, campo) =>
  arr?.filter(i=>i.ano===parseInt(ano)).reduce((acc,i)=>{
    acc[i.mes]=parseFloat(((acc[i.mes]||0)+Number(i[campo]||0)).toFixed(2)); return acc
  },{}) ?? {}

const pesquisarGeral = async () => {
  const a = selectedYearGeral.value
  somaProjecao.value    = somarPorMes(projecao.value,a,'projecao')
  somaReal.value        = somarPorMes(realData.value,a,'geracao')
  somaInjetadoG.value   = compensadoD.value?.filter(i=>i.ano===parseInt(a)).reduce((acc,i)=>{
    acc[i.mes]=parseFloat(((acc[i.mes]||0)+Number(i.injetadoPonta||0)+Number(i.injetadoFPonta||0)).toFixed(2)); return acc
  },{}) ?? {}
  // usa relatoriousina para injetado geral
  const inj = injetadoD.value?.filter(i=>i.ano===parseInt(a)).reduce((acc,i)=>{
    acc[i.mes]=parseFloat(((acc[i.mes]||0)+Number(i.injetadoPonta||0)+Number(i.injetadoFPonta||0)).toFixed(2)); return acc
  },{}) ?? {}
  somaInjetadoG.value   = inj
  somaInjetadoAnt.value = injetadoD.value?.filter(i=>i.ano===parseInt(a)-1).reduce((acc,i)=>{
    acc[i.mes]=parseFloat(((acc[i.mes]||0)+Number(i.injetadoPonta||0)+Number(i.injetadoFPonta||0)).toFixed(2)); return acc
  },{}) ?? {}
  somaCompensado.value  = compensadoD.value?.filter(i=>i.ano===parseInt(a)).reduce((acc,i)=>{
    acc[i.mes]=parseFloat(((acc[i.mes]||0)+Number(i.enerInjTUSD||0)).toFixed(2)); return acc
  },{}) ?? {}
  somaSaldoEnergia.value= compensadoD.value?.filter(i=>i.ano===parseInt(a)).reduce((acc,i)=>{
    acc[i.mes]=parseFloat(((acc[i.mes]||0)+Number(i.saldoEnergia||0)).toFixed(2)); return acc
  },{}) ?? {}
  totalProjetado.value   = Object.values(somaProjecao.value).reduce((a,v)=>a+v,0)
  totalRealG.value       = Object.values(somaReal.value).reduce((a,v)=>a+v,0)
  totalInjetadoG2.value  = Object.values(somaInjetadoG.value).reduce((a,v)=>a+v,0)
  totalCompensadoG.value = Object.values(somaCompensado.value).reduce((a,v)=>a+v,0)
}

const statusGeral = (mes) => {
  const comp = somaCompensado.value[mes] ?? 0
  const inj  = mes===1 ? (somaInjetadoAnt.value[12]??0) : (somaInjetadoG.value[mes-1]??0)
  if (comp>inj) return 'ok'
  if (comp<inj) return 'err'
  return 'neu'
}
const creditoGeral = (mes) => {
  const comp = somaCompensado.value[mes] ?? 0
  const inj  = mes===1 ? (somaInjetadoAnt.value[12]??0) : (somaInjetadoG.value[mes-1]??0)
  return Math.abs(parseInt(comp-inj))
}

// ── PDF ───────────────────────────────────────────────────────────
import html2pdf from 'html2pdf.js'
const dataAtual = ref(new Date().toLocaleDateString('pt-BR'))
const baixarPDF = (id, titulo) => {
  const el = document.getElementById(id)
  if (!el) return
  html2pdf(el,{margin:.5,filename:`relatorio-${titulo}.pdf`,html2canvas:{scale:3},jsPDF:{unit:'in',format:'a3',orientation:'landscape'}})
}

// ── helpers UI ────────────────────────────────────────────────────
const mudouCategoria = () => {
  preSelecionado.value=null; selectedYearConsumo.value=''; prediosEscolhidos.value=null
  selectedUsinaInjetado.value=null; selectedYearInjetado.value=''
  unidadeSelecionado.value=''; anoSelecionado.value=''; CompensaPrediosSelecionados.value=null
  selectedUnidade.value=null; pesquisaCarregada.value=false
  selectedYearGeral.value=''; totalProjetado.value=0
}

// opções de categoria
const catOptions = [
  { val:'E', label:'Educação', desc:'Escolas e CEIs',     bg:'#ECFDF5', color:'#059669', txtColor:'#047857' },
  { val:'S', label:'Saúde',    desc:'UBS e postos',       bg:'#EEF2FF', color:'#4F46E5', txtColor:'#3730A3' },
  { val:'O', label:'Outros',   desc:'Órgãos municipais',  bg:'#FFFBEB', color:'#D97706', txtColor:'#92400E' },
  { val:'P', label:'Praças',   desc:'Espaços públicos',   bg:'#F5F3FF', color:'#7C3AED', txtColor:'#5B21B6' },
  { val:'I', label:'IP',       desc:'Iluminação pública', bg:'#FFF1F2', color:'#E11D48', txtColor:'#9F1239' },
]
const selectedCatOption = computed(() => catOptions.find(c=>c.val===preSelecionado.value) ?? null)

// dropdown aberto
const catDropOpen  = ref(false)
const yearDropOpen = ref({})
const toggleYearDrop = (key) => {
  const v = yearDropOpen.value[key]
  yearDropOpen.value = {}
  yearDropOpen.value[key] = !v
}
const closeDrop = () => { catDropOpen.value=false; yearDropOpen.value={} }
</script>

<template>
  <div class="rp-root" @click="closeDrop">

    <!-- ══════════════════════════════════════════
         HEADER
    ══════════════════════════════════════════ -->
    <div class="rp-header">
      <div class="rp-header-inner">
        <div class="rp-header-left">
          <div class="rp-header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div>
            <nav class="rp-breadcrumb">
              <a href="/">Gerenciamento</a><span>›</span><span>Relatórios</span>
            </nav>
            <h1 class="rp-title">Relatórios</h1>
            <p class="rp-sub">Estatísticas detalhadas de usinas e unidades consumidoras</p>
          </div>
        </div>
        <img src="https://i.imgur.com/9rJgHQv.png" class="rp-header-img" alt="">
      </div>
    </div>

    <div class="rp-body">

      <!-- ══════════════════════════════════════════
           TABS DE CATEGORIA
      ══════════════════════════════════════════ -->
      <p class="rp-cat-lbl">Tipo de relatório</p>
      <div class="rp-cat-tabs">
        <button
          v-for="tab in [
            { val:'CONSUMO',     label:'Consumo',     sub:'Prédios públicos', color:'green',  icon:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
            { val:'INJETADO',    label:'Injetado',    sub:'Por usina',        color:'indigo', icon:'M13 10V3L4 14h7v7l9-11h-7z' },
            { val:'COMPENSANOVO',label:'Compensação', sub:'Por unidade',      color:'amber',  icon:'M22 12h-4l-3 9L9 3l-3 9H2' },
            { val:'GERAL',       label:'Geral',       sub:'Todas usinas',     color:'violet', icon:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
            { val:'CONCLUSIVO',  label:'Conclusivo',  sub:'Resumo final',     color:'rose',   icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
          ]"
          :key="tab.val"
          class="rp-cat-tab"
          :class="[`tab-${tab.color}`, { active: cateSelecionada===tab.val }]"
          @click.stop="cateSelecionada=tab.val; mudouCategoria()"
        >
          <div class="tab-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path :d="tab.icon"/>
            </svg>
          </div>
          <div class="tab-txt">
            <span class="tab-name">{{ tab.label }}</span>
            <span class="tab-sub">{{ tab.sub }}</span>
          </div>
        </button>
      </div>

      <!-- divisor gradiente -->
      <div v-if="cateSelecionada" class="rp-divider"></div>

      <!-- ══════════════════════════════════════════
           FILTROS — CONSUMO
      ══════════════════════════════════════════ -->
      <transition name="rp-slide">
        <div v-if="cateSelecionada==='CONSUMO'" class="rp-filter-card" @click.stop>
          <div class="rp-filter-row">

            <!-- SELECT CATEGORIA customizado -->
            <div class="rp-fg">
              <div class="rp-flbl">Categoria</div>
              <div class="csd-wrap">
                <div class="csd-trigger" :class="{ open: catDropOpen }" @click.stop="catDropOpen=!catDropOpen">
                  <div class="csd-trigger-icon"
                    :style="selectedCatOption ? { background: selectedCatOption.bg, color: selectedCatOption.color } : {}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    </svg>
                  </div>
                  <div class="csd-trigger-txt">
                    <span class="csd-trigger-label">Secretaria</span>
                    <span class="csd-trigger-val" :style="selectedCatOption?{color:selectedCatOption.txtColor}:{}">
                      {{ selectedCatOption?.label ?? 'Selecione…' }}
                    </span>
                  </div>
                  <svg class="csd-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <transition name="drop">
                  <div v-if="catDropOpen" class="csd-dropdown">
                    <div
                      v-for="opt in catOptions" :key="opt.val"
                      class="csd-option"
                      :class="{ selected: preSelecionado===opt.val }"
                      @click.stop="preSelecionado=opt.val; catDropOpen=false"
                    >
                      <div class="csd-opt-icon" :style="{ background: opt.bg, color: opt.color }">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                        </svg>
                      </div>
                      <div class="csd-opt-txt">
                        <span class="csd-opt-name" :style="{ color: opt.txtColor }">{{ opt.label }}</span>
                        <span class="csd-opt-desc">{{ opt.desc }}</span>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <!-- SELECT ANO customizado -->
            <div class="rp-fg">
              <div class="rp-flbl">Ano</div>
              <div class="ysd-wrap">
                <div class="ysd-trigger" :class="{ open: yearDropOpen['c'] }" @click.stop="toggleYearDrop('c')">
                  <div class="ysd-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div class="ysd-txt">
                    <span class="ysd-label">Ano</span>
                    <span class="ysd-val">{{ selectedYearConsumo || '—' }}</span>
                  </div>
                  <svg class="csd-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <transition name="drop">
                  <div v-if="yearDropOpen['c']" class="ysd-dropdown">
                    <div v-for="y in ANOS" :key="y" class="ysd-option"
                      :class="{ selected: selectedYearConsumo===y }"
                      @click.stop="selectedYearConsumo=y; yearDropOpen={}">
                      <span class="ysd-opt-dot"></span>{{ y }}
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <div class="rp-fg rp-fg-action">
              <div class="rp-flbl">&nbsp;</div>
              <button class="rp-btn-go" @click="pesquisarConsumo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                Gerar relatório
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- FILTROS — INJETADO -->
      <transition name="rp-slide">
        <div v-if="cateSelecionada==='INJETADO'" class="rp-filter-card" @click.stop>
          <div class="rp-filter-row">
            <div class="rp-fg" style="flex:2">
              <div class="rp-flbl">Usina</div>
              <select v-model="selectedUsinaInjetado" class="rp-sel">
                <option disabled value="">Selecione a usina…</option>
                <option v-for="u in usinas" :key="u.id" :value="u.id">{{ u.uc }} — {{ u.nome }}</option>
              </select>
            </div>
            <div class="rp-fg">
              <div class="rp-flbl">Ano</div>
              <div class="ysd-wrap">
                <div class="ysd-trigger" :class="{ open: yearDropOpen['i'] }" @click.stop="toggleYearDrop('i')">
                  <div class="ysd-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                  <div class="ysd-txt"><span class="ysd-label">Ano</span><span class="ysd-val">{{ selectedYearInjetado || '—' }}</span></div>
                  <svg class="csd-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <transition name="drop">
                  <div v-if="yearDropOpen['i']" class="ysd-dropdown">
                    <div v-for="y in ANOS" :key="y" class="ysd-option" :class="{ selected: selectedYearInjetado===y }"
                      @click.stop="selectedYearInjetado=y; yearDropOpen={}">
                      <span class="ysd-opt-dot"></span>{{ y }}
                    </div>
                  </div>
                </transition>
              </div>
            </div>
            <div class="rp-fg rp-fg-action">
              <div class="rp-flbl">&nbsp;</div>
              <button class="rp-btn-go" :disabled="!selectedUsinaInjetado||!selectedYearInjetado" @click="pesquisarInjetado">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                Gerar
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- FILTROS — COMPENSAÇÃO -->
      <transition name="rp-slide">
        <div v-if="cateSelecionada==='COMPENSANOVO'" class="rp-filter-card" @click.stop>
          <div class="rp-fg" style="margin-bottom:14px">
            <div class="rp-flbl">Categoria</div>
            <div class="csd-wrap">
              <div class="csd-trigger" :class="{ open: catDropOpen }" @click.stop="catDropOpen=!catDropOpen">
                <div class="csd-trigger-icon" :style="catOptions.find(c=>c.val===unidadeSelecionado)?{background:catOptions.find(c=>c.val===unidadeSelecionado).bg,color:catOptions.find(c=>c.val===unidadeSelecionado).color}:{}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                </div>
                <div class="csd-trigger-txt">
                  <span class="csd-trigger-label">Secretaria</span>
                  <span class="csd-trigger-val" :style="catOptions.find(c=>c.val===unidadeSelecionado)?{color:catOptions.find(c=>c.val===unidadeSelecionado).txtColor}:{}">
                    {{ catOptions.find(c=>c.val===unidadeSelecionado)?.label ?? 'Selecione…' }}
                  </span>
                </div>
                <svg class="csd-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <transition name="drop">
                <div v-if="catDropOpen" class="csd-dropdown">
                  <div v-for="opt in catOptions" :key="opt.val" class="csd-option" :class="{ selected: unidadeSelecionado===opt.val }"
                    @click.stop="unidadeSelecionado=opt.val; catDropOpen=false; pesquisarPredios()">
                    <div class="csd-opt-icon" :style="{ background: opt.bg, color: opt.color }">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                    </div>
                    <div class="csd-opt-txt">
                      <span class="csd-opt-name" :style="{ color: opt.txtColor }">{{ opt.label }}</span>
                      <span class="csd-opt-desc">{{ opt.desc }}</span>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>
          <div class="rp-filter-row">
            <div class="rp-fg" style="flex:2">
              <div class="rp-flbl">Unidade</div>
              <select v-model="selectedUnidade" class="rp-sel">
                <option disabled value="">Selecione a unidade…</option>
                <option v-for="u in CompensaPrediosSelecionados" :key="u.id" :value="u.id">{{ u.uc }} — {{ u.nome }}</option>
              </select>
            </div>
            <div class="rp-fg">
              <div class="rp-flbl">Ano</div>
              <div class="ysd-wrap">
                <div class="ysd-trigger" :class="{ open: yearDropOpen['cp'] }" @click.stop="toggleYearDrop('cp')">
                  <div class="ysd-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                  <div class="ysd-txt"><span class="ysd-label">Ano</span><span class="ysd-val">{{ anoSelecionado || '—' }}</span></div>
                  <svg class="csd-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <transition name="drop">
                  <div v-if="yearDropOpen['cp']" class="ysd-dropdown">
                    <div v-for="y in ANOS" :key="y" class="ysd-option" :class="{ selected: anoSelecionado===y }"
                      @click.stop="anoSelecionado=y; yearDropOpen={}">
                      <span class="ysd-opt-dot"></span>{{ y }}
                    </div>
                  </div>
                </transition>
              </div>
            </div>
            <div class="rp-fg rp-fg-action">
              <div class="rp-flbl">&nbsp;</div>
              <button class="rp-btn-go" :disabled="!unidadeSelecionado||!selectedUnidade||!anoSelecionado" @click="pesquisarCompensaNovo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                Gerar
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- FILTROS — GERAL -->
      <transition name="rp-slide">
        <div v-if="cateSelecionada==='GERAL'" class="rp-filter-card" @click.stop>
          <div class="rp-filter-row">
            <div class="rp-fg">
              <div class="rp-flbl">Ano</div>
              <div class="ysd-wrap">
                <div class="ysd-trigger" :class="{ open: yearDropOpen['g'] }" @click.stop="toggleYearDrop('g')">
                  <div class="ysd-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                  <div class="ysd-txt"><span class="ysd-label">Ano</span><span class="ysd-val">{{ selectedYearGeral || '—' }}</span></div>
                  <svg class="csd-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <transition name="drop">
                  <div v-if="yearDropOpen['g']" class="ysd-dropdown">
                    <div v-for="y in ANOS" :key="y" class="ysd-option" :class="{ selected: selectedYearGeral===y }"
                      @click.stop="selectedYearGeral=y; yearDropOpen={}">
                      <span class="ysd-opt-dot"></span>{{ y }}
                    </div>
                  </div>
                </transition>
              </div>
            </div>
            <div class="rp-fg rp-fg-action">
              <div class="rp-flbl">&nbsp;</div>
              <button class="rp-btn-go" :disabled="!selectedYearGeral" @click="pesquisarGeral">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                Gerar
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- ══════════════════════════════════════════
           RESULTADO — CONSUMO
      ══════════════════════════════════════════ -->
      <transition name="rp-fade">
        <div v-if="prediosEscolhidos&&cateSelecionada==='CONSUMO'" class="rp-result" id="res-consumo">
          <div class="rp-res-hd">
            <span class="rp-badge rp-badge-green">✓ Gerado</span>
            <span class="rp-badge rp-badge-indigo">{{ getStatusLabel2(preSelecionado) }}</span>
            <h2 class="rp-res-title">Consumo · {{ selectedYearConsumo }}</h2>
          </div>

          <!-- KPI -->
          <div class="rp-kpi-grid">
            <div class="rp-kpi kpi-green">
              <div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
              <div class="rp-kpi-lbl">Consumo Total</div>
              <div class="rp-kpi-val">{{ parseInt(kpiConsumoTotal).toLocaleString('pt-BR') }}</div>
              <div class="rp-kpi-unit">kWh no ano</div>
            </div>
            <div class="rp-kpi kpi-amber">
              <div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
              <div class="rp-kpi-lbl">Custo Total</div>
              <div class="rp-kpi-val">R$ {{ parseInt(kpiCustoTotal).toLocaleString('pt-BR') }}</div>
              <div class="rp-kpi-unit">gasto no ano</div>
            </div>
            <div class="rp-kpi kpi-violet">
              <div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg></div>
              <div class="rp-kpi-lbl">Alertas</div>
              <div class="rp-kpi-val">{{ kpiAlertasTotal }}</div>
              <div class="rp-kpi-unit">unidades irregulares</div>
            </div>
            <div class="rp-kpi kpi-indigo">
              <div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg></div>
              <div class="rp-kpi-lbl">Unidades</div>
              <div class="rp-kpi-val">{{ kpiUnidadesTotal }}</div>
              <div class="rp-kpi-unit">prédios ativos</div>
            </div>
          </div>

          <!-- Gráfico de barras alertas por mês -->
          <div class="rp-section-lbl">Alertas de consumo irregular por mês</div>
          <div class="rp-bar-wrap">
            <div v-for="m in alertasPorMes" :key="m.mes" class="rp-bar-row">
              <span class="rp-bar-lbl">{{ monthNumberToName(m.mes).slice(0,3) }}</span>
              <div class="rp-bar-track">
                <div class="rp-bar-fill"
                  :style="{ width: m.qtdAcima===0 ? '4px' : Math.max(4,(m.qtdAcima/maxAlerta*100))+'%',
                            background: barColor(m.qtdAcima), minWidth:'4px' }">
                  <span v-if="m.qtdAcima>0">{{ m.qtdAcima }}</span>
                </div>
              </div>
              <span class="rp-bar-num">{{ m.qtdAcima }}</span>
            </div>
          </div>

          <!-- Toggle mensal/anual -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
            <div class="rp-section-lbl" style="margin:0">Dados por unidade</div>
            <div class="rp-vista-toggle">
              <button class="rp-vista-btn" :class="{ on: vistaConsumo==='mensal' }" @click="vistaConsumo='mensal'">Vista Mensal</button>
              <button class="rp-vista-btn" :class="{ on: vistaConsumo==='anual'  }" @click="vistaConsumo='anual'">Vista Anual</button>
            </div>
          </div>

          <!-- VISTA MENSAL -->
          <div v-if="vistaConsumo==='mensal'">
            <div class="rp-mnav">
              <button class="rp-mnav-btn" @click="navMesC(-1)">‹</button>
              <span class="rp-mnav-lbl">{{ labelMesC }}</span>
              <button class="rp-mnav-btn" @click="navMesC(1)">›</button>
            </div>

            <div class="rp-tbl-scroll">
              <table class="rp-table">
                <thead class="thead-green">
                  <tr>
                    <th class="rp-th th-sticky">UC</th>
                    <th class="rp-th">Nome</th>
                    <th class="rp-th" style="text-align:right">kWh</th>
                    <th class="rp-th" style="text-align:right">R$</th>
                    <th class="rp-th" style="text-align:center">Status</th>
                    <th class="rp-th" style="text-align:right">Dif. (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="predio in prediosEscolhidos" :key="predio.id">
                    <tr v-for="rela in relatorios.filter(i=>i.mes===mesSelecionadoC&&i.idUnidadeCompensa===predio.id)" :key="rela.id" class="rp-tr">
                      <td class="rp-td rp-mono">{{ predio.uc }}</td>
                      <td class="rp-td" style="font-weight:700">{{ predio.nome }}</td>
                      <td class="rp-td" style="text-align:right;font-weight:700"
                          :style="getBG(rela,mesSelecionadoC-1,predio.id,predio.secretaria)?{background:getBG(rela,mesSelecionadoC-1,predio.id,predio.secretaria)}:{}">
                        {{ rela.consumokWh }}
                      </td>
                      <td class="rp-td" style="text-align:right;font-weight:700"
                          :style="getBG(rela,mesSelecionadoC-1,predio.id,predio.secretaria)?{background:getBG(rela,mesSelecionadoC-1,predio.id,predio.secretaria)}:{}">
                        {{ rela.consumoReais }}
                      </td>
                      <td class="rp-td" style="text-align:center">
                        <span class="rp-pill" :class="getAvatarClass(rela,mesSelecionadoC-1,predio.id)">
                          {{ getStatusLabel(getAvatarClass(rela,mesSelecionadoC-1,predio.id)) }}
                        </span>
                      </td>
                      <td class="rp-td" style="text-align:right;font-weight:700"
                          :class="getAvatarClass(rela,mesSelecionadoC-1,predio.id)==='err'?'rp-td-red':getAvatarClass(rela,mesSelecionadoC-1,predio.id)==='ok'?'rp-td-green':''">
                        {{ getQuantidadeConsumo(rela,mesSelecionadoC-1,predio.id) }}
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>

          <!-- VISTA ANUAL -->
          <div v-if="vistaConsumo==='anual'" class="rp-tbl-scroll">
            <table class="rp-table">
              <thead class="thead-green">
                <tr>
                  <th class="rp-th th-sticky" rowspan="2" style="vertical-align:middle;min-width:90px">UC</th>
                  <th class="rp-th" rowspan="2" style="vertical-align:middle;min-width:140px">Nome</th>
                  <th v-for="mes in mesesNomes" :key="mes" colspan="2" class="rp-th th-month">
                    <div class="th-month-name">{{ monthNumberToName(mes).slice(0,3) }}</div>
                    <div class="th-month-cols">
                      <span>kWh</span><span>R$</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="predio in prediosEscolhidos" :key="predio.id" class="rp-tr">
                  <td class="rp-td rp-mono th-sticky" style="background:#fff">{{ predio.uc }}</td>
                  <td class="rp-td" style="font-weight:700;font-size:12px">{{ predio.nome }}</td>
                  <template v-for="(mes, index) in mesesNomes" :key="mes">
                    <td colspan="2" class="rp-td-month"
                      v-for="rela in relatorios.filter(i=>i.mes===mes&&i.idUnidadeCompensa===predio.id)" :key="rela.id"
                      :style="getBG(rela,index,predio.id,predio.secretaria)?{background:getBG(rela,index,predio.id,predio.secretaria)}:{}">
                      <div class="mc">
                        <div class="mc-val" :class="getAvatarClass(rela,index,predio.id)==='err'?'mc-red':getAvatarClass(rela,index,predio.id)==='ok'?'mc-green':''">
                          {{ rela.consumokWh }}
                        </div>
                        <div class="mc-val">{{ rela.consumoReais }}</div>
                        <div class="mc-bottom">
                          <span class="rp-pill" :class="getAvatarClass(rela,index,predio.id)" style="font-size:9px">
                            {{ getStatusLabel(getAvatarClass(rela,index,predio.id)) }}
                          </span>
                          <span class="mc-dif">{{ getQuantidadeConsumo(rela,index,predio.id) }}</span>
                        </div>
                      </div>
                    </td>
                    <!-- célula vazia se não houver rela -->
                    <td v-if="!relatorios.filter(i=>i.mes===mes&&i.idUnidadeCompensa===predio.id).length" colspan="2" class="rp-td-month">
                      <div class="mc"><div class="mc-val" style="color:#94a3b8">—</div><div class="mc-val" style="color:#94a3b8">—</div><div class="mc-bottom"></div></div>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="rp-actions">
            <button class="rp-btn-pdf" @click="baixarPDF('res-consumo','consumo')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Exportar PDF
            </button>
          </div>
        </div>
      </transition>

      <!-- ══════════════════════════════════════════
           RESULTADO — INJETADO
      ══════════════════════════════════════════ -->
      <transition name="rp-fade">
        <div v-if="usinaEscolhidaInjetado&&cateSelecionada==='INJETADO'" class="rp-result" id="res-injetado">
          <div class="rp-res-hd">
            <span class="rp-badge rp-badge-indigo">✓ Gerado</span>
            <h2 class="rp-res-title">{{ usinaEscolhidaInjetado.nome }} · {{ selectedYearInjetado }}</h2>
          </div>

          <div class="rp-kpi-grid">
            <div class="rp-kpi kpi-indigo"><div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div><div class="rp-kpi-lbl">Projetado</div><div class="rp-kpi-val">{{ parseInt(projetadoUsinaInjetada.reduce((a,i)=>a+Number(i.projecao||0),0)).toLocaleString('pt-BR') }}</div><div class="rp-kpi-unit">kWh</div></div>
            <div class="rp-kpi kpi-green"><div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="rp-kpi-lbl">Geração Real</div><div class="rp-kpi-val">{{ parseInt(geracaoUsinaInjetada.reduce((a,i)=>a+Number(i.geracao||0),0)).toLocaleString('pt-BR') }}</div><div class="rp-kpi-unit">kWh</div></div>
            <div class="rp-kpi kpi-amber"><div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div><div class="rp-kpi-lbl">Total Injetado</div><div class="rp-kpi-val">{{ parseInt(relatoriosInjetado.reduce((a,i)=>a+Number(i.injetadoPonta||0)+Number(i.injetadoFPonta||0),0)).toLocaleString('pt-BR') }}</div><div class="rp-kpi-unit">kWh</div></div>
            <div class="rp-kpi kpi-violet"><div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg></div><div class="rp-kpi-lbl">Autoconsumo</div><div class="rp-kpi-val">{{ parseInt(geracaoUsinaInjetada.reduce((a,i)=>a+Number(i.geracao||0),0)-relatoriosInjetado.reduce((a,i)=>a+Number(i.injetadoPonta||0)+Number(i.injetadoFPonta||0),0)).toLocaleString('pt-BR') }}</div><div class="rp-kpi-unit">kWh</div></div>
          </div>

          <div class="rp-tbl-scroll">
            <table class="rp-table">
              <thead class="thead-indigo">
                <tr>
                  <th class="rp-th th-sticky" colspan="2">Dados</th>
                  <th v-for="mes in mesesNomes" :key="mes" class="rp-th th-month" style="min-width:120px">{{ monthNumberToName(mes).slice(0,3) }}</th>
                </tr>
                <tr class="thead-sub">
                  <th class="rp-th">UC</th>
                  <th class="rp-th">Indicadores</th>
                </tr>
              </thead>
              <tbody>
                <tr class="rp-tr">
                  <td class="rp-td rp-mono">{{ usinaEscolhidaInjetado.uc }}</td>
                  <td class="rp-td rp-td-labels">
                    <div>Consumo (conta)</div>
                    <div class="rp-ci">Geração Projetada</div>
                    <div class="rp-cg">Geração Real</div>
                    <div class="rp-co">Consumo (geração)</div>
                    <div class="rp-ca">Qtd Injetada</div>
                    <div>Status</div>
                    <div class="rp-cv">Qtd Análise</div>
                  </td>
                  <td v-for="mes in mesesNomes" :key="mes" class="rp-td rp-td-data">
                    <div v-for="rela in relatoriosInjetado.filter(i=>i.mes===mes)" :key="rela.id">
                      <div class="rp-drow" v-if="rela.consumoKWH||rela.consumoReais">
                        <span>{{ rela.consumoKWH }}</span><span>{{ rela.consumoReais }}</span>
                      </div>
                      <div class="rp-dfull" v-else><span class="rp-pill ok" style="font-size:9px">Comp. Total</span></div>
                      <div class="rp-dfull rp-ci" v-for="p in projetadoUsinaInjetada.filter(i=>i.mes===mes)" :key="p.id">{{ p.projecao }} kWh</div>
                      <div class="rp-dfull rp-cg" v-for="g in geracaoUsinaInjetada.filter(i=>i.mes===mes)" :key="g.id">{{ g.geracao }} kWh</div>
                      <div class="rp-dfull rp-co" v-for="g in geracaoUsinaInjetada.filter(i=>i.mes===mes)" :key="g.id">{{ Math.abs(Number(g.geracao)-(Number(rela.injetadoPonta)+Number(rela.injetadoFPonta))) }} kWh</div>
                      <div class="rp-dfull rp-ca">{{ Number(rela.injetadoPonta)+Number(rela.injetadoFPonta) }} kWh</div>
                      <div class="rp-dfull">
                        <span class="rp-pill" :class="Number(rela.injetadoPonta)+Number(rela.injetadoFPonta)>relatoriosInjetado.filter(i=>i.mes===mes-1).reduce((t,i)=>t+Number(i.injetadoPonta)+Number(i.injetadoFPonta),0)?'ok':'err'" style="font-size:9px">
                          {{ Number(rela.injetadoPonta)+Number(rela.injetadoFPonta)>relatoriosInjetado.filter(i=>i.mes===mes-1).reduce((t,i)=>t+Number(i.injetadoPonta)+Number(i.injetadoFPonta),0)?'↑ Acima':'↓ Abaixo' }}
                        </span>
                      </div>
                      <div class="rp-dfull rp-cv">{{ (Number(rela.injetadoPonta)+Number(rela.injetadoFPonta))-(relatoriosInjetado.filter(i=>i.mes===mes-1).reduce((t,i)=>t+Number(i.injetadoPonta)+Number(i.injetadoFPonta),0)) }}</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="rp-section-lbl">Gráfico de geração</div>
          <RelatorioUsina v-if="usinaEscolhidaInjetado.id&&selectedYearInjetado"
            :idUsina="usinaEscolhidaInjetado.id" :ano="selectedYearInjetado"
            :key="usinaEscolhidaInjetado.id+'-'+selectedYearInjetado"/>

          <div class="rp-actions">
            <button class="rp-btn-pdf" @click="baixarPDF('res-injetado','injetado')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Exportar PDF
            </button>
          </div>
        </div>
      </transition>

      <!-- ══════════════════════════════════════════
           RESULTADO — COMPENSAÇÃO
      ══════════════════════════════════════════ -->
      <transition name="rp-fade">
        <div v-if="pesquisaCarregada&&cateSelecionada==='COMPENSANOVO'" class="rp-result" id="res-compensacao">
          <div class="rp-res-hd">
            <span class="rp-badge rp-badge-amber">✓ Gerado</span>
            <h2 class="rp-res-title">Compensação · {{ anoSelecionado }}</h2>
          </div>

          <div class="rp-mnav">
            <button class="rp-mnav-btn" @click="navMesCp(-1)">‹</button>
            <span class="rp-mnav-lbl">{{ labelMesCp }}</span>
            <button class="rp-mnav-btn" @click="navMesCp(1)">›</button>
          </div>

          <div class="rp-section-lbl">Usinas geradoras</div>
          <div class="rp-gen-grid">
            <div v-for="usina in infoUsinas" :key="usina.id" class="rp-gen-card">
              <div class="rp-gen-head">
                <span class="rp-mono" style="font-size:11px;color:#64748b">{{ usina.uc }}</span>
                <span class="rp-pct-badge">{{ usina.porcentagem.porcentagem }}%</span>
              </div>
              <div class="rp-gen-name">{{ usina.nome }}</div>
              <div class="rp-gen-stats">
                <div><span class="rp-gen-lbl">Injetado mês ant.</span><span class="rp-gen-val">{{ procurarInjecao(usina.id, infoUnidade?.id, 1) }} kWh</span></div>
                <div><span class="rp-gen-lbl">Proj. injeção</span><span class="rp-gen-val">{{ (Number(procurarInjecao(usina.id,0,2))/100*usina.porcentagem.porcentagem).toFixed(2) }} kWh</span></div>
              </div>
            </div>
          </div>

          <div class="rp-total-banner">
            <span class="rp-total-lbl">Total projetado para injeção neste mês</span>
            <span class="rp-total-val">{{ totalProjetoInjetado }} kWh</span>
          </div>

          <div class="rp-section-lbl">Dados da unidade — {{ infoUnidade?.nome }}</div>
          <div v-for="rela in relatorioUnidadeComp" :key="rela.id" class="rp-ud-grid">
            <div class="rp-ud-card"><div class="rp-ud-lbl">Consumo</div><div class="rp-ud-pair"><span>{{ rela.consumokWh }} kWh</span><span>R$ {{ rela.consumoReais }}</span></div></div>
            <div class="rp-ud-card ud-green"><div class="rp-ud-lbl">Saldo Energia</div><div class="rp-ud-big">{{ rela.saldoEnergia ?? 0 }}</div></div>
            <div class="rp-ud-card ud-indigo"><div class="rp-ud-lbl">Inj-TUSD</div><div class="rp-ud-pair"><span>{{ parseInt(rela.enerInjTUSD) }} kWh</span><span>R$ {{ rela.valorInjTUSD }}</span></div></div>
            <div class="rp-ud-card ud-indigo"><div class="rp-ud-lbl">Inj-TE</div><div class="rp-ud-pair"><span>{{ parseInt(rela.enerInjTE) }} kWh</span><span>R$ {{ rela.valorInjTE }}</span></div></div>
            <div class="rp-ud-card ud-indigo"><div class="rp-ud-lbl">Total Injetado</div><div class="rp-ud-pair"><span>{{ parseInt(rela.enerInjTE)+parseInt(rela.enerInjTUSD) }} kWh</span><span>R$ {{ (Number(rela.valorInjTE)+Number(rela.valorInjTUSD)).toFixed(2) }}</span></div></div>
            <div class="rp-ud-card" :class="parseInt(rela.enerInjTE)<totalProjetoInjetado?'ud-red':'ud-green'">
              <div class="rp-ud-lbl">Status</div>
              <div class="rp-ud-status">{{ parseInt(rela.enerInjTE)<totalProjetoInjetado?'Abaixo do esperado':'Acima do esperado' }}</div>
            </div>
            <div class="rp-ud-card ud-violet"><div class="rp-ud-lbl">Diferença</div><div class="rp-ud-big">{{ Math.abs(parseInt(rela.enerInjTE)-totalProjetoInjetado).toFixed(2) }} kWh</div></div>
          </div>

          <div class="rp-actions">
            <button class="rp-btn-pdf" @click="baixarPDF('res-compensacao','compensacao')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Exportar PDF
            </button>
          </div>
        </div>
      </transition>

      <!-- ══════════════════════════════════════════
           RESULTADO — GERAL
      ══════════════════════════════════════════ -->
      <transition name="rp-fade">
        <div v-if="totalProjetado&&cateSelecionada==='GERAL'" class="rp-result" id="res-geral">
          <div class="rp-res-hd">
            <span class="rp-badge rp-badge-violet">✓ Gerado</span>
            <h2 class="rp-res-title">Geral · {{ selectedYearGeral }}</h2>
            <span style="font-size:11px;color:#94a3b8;margin-left:auto">Gerado em {{ dataAtual }}</span>
          </div>

          <div class="rp-kpi-grid">
            <div class="rp-kpi kpi-indigo"><div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div><div class="rp-kpi-lbl">Projetado</div><div class="rp-kpi-val">{{ parseInt(totalProjetado).toLocaleString('pt-BR') }}</div><div class="rp-kpi-unit">kWh no ano</div></div>
            <div class="rp-kpi kpi-green"><div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="rp-kpi-lbl">Real</div><div class="rp-kpi-val">{{ parseInt(totalRealG).toLocaleString('pt-BR') }}</div><div class="rp-kpi-unit">kWh no ano</div></div>
            <div class="rp-kpi kpi-amber"><div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div><div class="rp-kpi-lbl">Injetado</div><div class="rp-kpi-val">{{ parseInt(totalInjetadoG2).toLocaleString('pt-BR') }}</div><div class="rp-kpi-unit">kWh no ano</div></div>
            <div class="rp-kpi kpi-violet"><div class="rp-kpi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg></div><div class="rp-kpi-lbl">Compensado</div><div class="rp-kpi-val">{{ parseInt(totalCompensadoG).toLocaleString('pt-BR') }}</div><div class="rp-kpi-unit">kWh no ano</div></div>
          </div>

          <div class="rp-actions">
            <button class="rp-btn-pdf" @click="baixarPDF('res-geral-geral','geral')">PDF Geral</button>
            <button class="rp-btn-outline" @click="vistaGeral=vistaGeral==='mensal'?'anual':'mensal'">
              {{ vistaGeral==='mensal' ? 'Vista Anual' : 'Vista Mensal' }}
            </button>
            <button class="rp-btn-pdf" @click="baixarPDF('res-geral-mensal','geral-mensal')">PDF Mensal</button>
          </div>

          <!-- VISTA MENSAL GERAL -->
          <div v-if="vistaGeral==='mensal'" id="res-geral-mensal">
            <div class="rp-mnav">
              <button class="rp-mnav-btn" @click="navMesG(-1)">‹</button>
              <span class="rp-mnav-lbl">{{ labelMesG }}</span>
              <button class="rp-mnav-btn" @click="navMesG(1)">›</button>
            </div>
            <div class="rp-mensal-grid">
              <div class="rp-mc rp-mc-indigo"><div class="rp-mc-lbl">Projetada</div><div class="rp-mc-val">{{ somaProjecao[mesSelecionadoG] ?? '—' }}</div><div class="rp-mc-unit">kWh</div></div>
              <div class="rp-mc rp-mc-green"><div class="rp-mc-lbl">Real</div><div class="rp-mc-val">{{ somaReal[mesSelecionadoG] ?? '—' }}</div><div class="rp-mc-unit">kWh</div></div>
              <div class="rp-mc rp-mc-amber"><div class="rp-mc-lbl">Injetado</div><div class="rp-mc-val">{{ somaInjetadoG[mesSelecionadoG] ?? '—' }}</div><div class="rp-mc-unit">kWh</div></div>
              <div class="rp-mc"><div class="rp-mc-lbl">Saldo</div><div class="rp-mc-val">{{ somaSaldoEnergia[mesSelecionadoG] ?? '—' }}</div><div class="rp-mc-unit">kWh</div></div>
              <div class="rp-mc rp-mc-violet"><div class="rp-mc-lbl">Compensado</div><div class="rp-mc-val">{{ somaCompensado[mesSelecionadoG] ?? '—' }}</div><div class="rp-mc-unit">kWh</div></div>
              <div class="rp-mc"><div class="rp-mc-lbl">Status</div><div style="margin-top:8px"><span class="rp-pill" :class="statusGeral(mesSelecionadoG)">{{ getStatusLabel(statusGeral(mesSelecionadoG)) }}</span></div></div>
              <div class="rp-mc"><div class="rp-mc-lbl">Crédito Comp./Inj.</div><div style="margin-top:8px"><span class="rp-pill neu">{{ creditoGeral(mesSelecionadoG) }}</span></div></div>
            </div>
          </div>

          <!-- VISTA ANUAL GERAL -->
          <div v-if="vistaGeral==='anual'" id="res-geral-geral">
            <div class="rp-tbl-scroll">
              <table class="rp-table">
                <thead class="thead-indigo">
                  <tr>
                    <th class="rp-th th-sticky" style="min-width:120px">Indicador</th>
                    <th v-for="mes in mesesNomes" :key="mes" class="rp-th" style="text-align:right;min-width:70px">{{ monthNumberToName(mes).slice(0,3) }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="rp-tr"><td class="rp-td rp-ci" style="font-weight:700">Projetada</td><td v-for="v in somaProjecao" :key="v" class="rp-td rp-ci" style="text-align:right;font-size:12px">{{ parseInt(v) }}</td></tr>
                  <tr class="rp-tr"><td class="rp-td rp-cg" style="font-weight:700">Real</td><td v-for="v in somaReal" :key="v" class="rp-td rp-cg" style="text-align:right;font-size:12px">{{ parseInt(v) }}</td></tr>
                  <tr class="rp-tr"><td class="rp-td rp-ca" style="font-weight:700">Injetado</td><td v-for="v in somaInjetadoG" :key="v" class="rp-td rp-ca" style="text-align:right;font-size:12px">{{ parseInt(v) }}</td></tr>
                  <tr class="rp-tr"><td class="rp-td" style="font-weight:700">Saldo Energia</td><td v-for="v in somaSaldoEnergia" :key="v" class="rp-td" style="text-align:right;font-size:12px">{{ parseInt(v) }}</td></tr>
                  <tr class="rp-tr"><td class="rp-td rp-cv" style="font-weight:700">Compensado</td><td v-for="v in somaCompensado" :key="v" class="rp-td rp-cv" style="text-align:right;font-size:12px">{{ parseInt(v) }}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </transition>

      <!-- ══════════════════════════════════════════
           RESULTADO — CONCLUSIVO
      ══════════════════════════════════════════ -->
      <transition name="rp-fade">
        <div v-if="cateSelecionada==='CONCLUSIVO'" class="rp-result">
          <div class="rp-res-hd">
            <span class="rp-badge rp-badge-rose">Relatório</span>
            <h2 class="rp-res-title">Conclusivo</h2>
          </div>
          <RelatorioConclusivo />
        </div>
      </transition>

    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* ═══════════════ ROOT ═══════════════ */
.rp-root { min-height: 100vh !important; background: #F0FDF9 !important; font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important; color: #0f172a !important; }
.rp-root * { box-sizing: border-box !important; }

/* ═══════════════ HEADER ═══════════════ */
.rp-header { background: linear-gradient(135deg, #ECFDF5 0%, #EEF2FF 100%) !important; border-bottom: 1px solid #E2E8F0 !important; padding: 24px 28px 20px !important; margin-bottom: 28px !important; }
.rp-header-inner { display: flex !important; align-items: center !important; justify-content: space-between !important; max-width: 1400px !important; margin: 0 auto !important; }
.rp-header-left { display: flex !important; align-items: center !important; gap: 16px !important; }
.rp-header-icon { width: 48px !important; height: 48px !important; border-radius: 13px !important; background: #059669 !important; color: #fff !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: 0 4px 14px rgba(5,150,105,.3) !important; flex-shrink: 0 !important; }
.rp-header-icon svg { stroke: #fff !important; }
.rp-breadcrumb { display: flex !important; align-items: center !important; gap: 6px !important; font-size: 12px !important; color: #94A3B8 !important; margin-bottom: 3px !important; }
.rp-breadcrumb a { color: #059669 !important; text-decoration: none !important; font-weight: 600 !important; }
.rp-title { font-size: 28px !important; font-weight: 900 !important; letter-spacing: -.03em !important; line-height: 1 !important; color: #0f172a !important; margin: 0 !important; }
.rp-sub { font-size: 13px !important; color: #475569 !important; margin-top: 4px !important; }
.rp-header-img { height: 100px !important; opacity: .85 !important; }

/* ═══════════════ BODY ═══════════════ */
.rp-body { max-width: 1400px !important; margin: 0 auto !important; padding: 0 28px 40px !important; }
.rp-cat-lbl { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .14em !important; text-transform: uppercase !important; color: #94A3B8 !important; margin-bottom: 10px !important; display: block !important; }

/* ═══════════════ TABS DE CATEGORIA ═══════════════ */
.rp-cat-tabs { display: flex !important; background: #ffffff !important; border: 1px solid #E2E8F0 !important; border-radius: 14px !important; padding: 5px !important; gap: 4px !important; margin-bottom: 28px !important; flex-wrap: wrap !important; box-shadow: 0 1px 4px rgba(0,0,0,.05) !important; }
.rp-cat-tab { flex: 1 !important; min-width: 110px !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; padding: 11px 14px !important; border-radius: 10px !important; border: none !important; background: transparent !important; cursor: pointer !important; font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important; transition: all .16s !important; color: #64748b !important; }
.rp-cat-tab:hover { background: #f8fafc !important; color: #0f172a !important; }
.tab-icon { width: 30px !important; height: 30px !important; border-radius: 8px !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; transition: all .16s !important; }
.tab-txt { display: flex !important; flex-direction: column !important; align-items: flex-start !important; gap: 1px !important; }
.tab-name { font-size: 13px !important; font-weight: 800 !important; line-height: 1 !important; }
.tab-sub { font-size: 10px !important; opacity: .6 !important; font-weight: 500 !important; }

/* Tab Green */
.tab-green .tab-icon { background: #ECFDF5 !important; color: #059669 !important; }
.tab-green .tab-icon svg { stroke: #059669 !important; }
.tab-green.active { background: #ECFDF5 !important; color: #047857 !important; }
.tab-green.active .tab-name { color: #047857 !important; }
.tab-green.active .tab-icon { background: #059669 !important; color: #fff !important; }
.tab-green.active .tab-icon svg { stroke: #fff !important; }
/* Tab Indigo */
.tab-indigo .tab-icon { background: #EEF2FF !important; color: #4F46E5 !important; }
.tab-indigo .tab-icon svg { stroke: #4F46E5 !important; }
.tab-indigo.active { background: #EEF2FF !important; color: #3730A3 !important; }
.tab-indigo.active .tab-name { color: #3730A3 !important; }
.tab-indigo.active .tab-icon { background: #4F46E5 !important; }
.tab-indigo.active .tab-icon svg { stroke: #fff !important; }
/* Tab Amber */
.tab-amber .tab-icon { background: #FFFBEB !important; color: #D97706 !important; }
.tab-amber .tab-icon svg { stroke: #D97706 !important; }
.tab-amber.active { background: #FFFBEB !important; color: #92400E !important; }
.tab-amber.active .tab-name { color: #92400E !important; }
.tab-amber.active .tab-icon { background: #D97706 !important; }
.tab-amber.active .tab-icon svg { stroke: #fff !important; }
/* Tab Violet */
.tab-violet .tab-icon { background: #F5F3FF !important; color: #7C3AED !important; }
.tab-violet .tab-icon svg { stroke: #7C3AED !important; }
.tab-violet.active { background: #F5F3FF !important; color: #5B21B6 !important; }
.tab-violet.active .tab-name { color: #5B21B6 !important; }
.tab-violet.active .tab-icon { background: #7C3AED !important; }
.tab-violet.active .tab-icon svg { stroke: #fff !important; }
/* Tab Rose */
.tab-rose .tab-icon { background: #FFF1F2 !important; color: #E11D48 !important; }
.tab-rose .tab-icon svg { stroke: #E11D48 !important; }
.tab-rose.active { background: #FFF1F2 !important; color: #9F1239 !important; }
.tab-rose.active .tab-name { color: #9F1239 !important; }
.tab-rose.active .tab-icon { background: #E11D48 !important; }
.tab-rose.active .tab-icon svg { stroke: #fff !important; }

/* ═══════════════ DIVIDER ═══════════════ */
.rp-divider { height: 2px !important; background: linear-gradient(90deg, #059669, #4F46E5 50%, transparent) !important; border-radius: 2px !important; margin: 4px 0 28px !important; opacity: .35 !important; }

/* ═══════════════ FILTER CARD ═══════════════ */
.rp-filter-card { background: #ffffff !important; border: 1px solid #E2E8F0 !important; border-radius: 16px !important; padding: 20px 22px !important; margin-bottom: 24px !important; box-shadow: 0 1px 6px rgba(0,0,0,.05) !important; }
.rp-filter-row { display: flex !important; gap: 16px !important; align-items: flex-end !important; flex-wrap: wrap !important; }
.rp-fg { display: flex !important; flex-direction: column !important; gap: 6px !important; }
.rp-fg-action { flex-shrink: 0 !important; }
.rp-flbl { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .1em !important; text-transform: uppercase !important; color: #94A3B8 !important; display: block !important; }

/* ═══════════════ CUSTOM SELECT CATEGORIA ═══════════════ */
.csd-wrap { position: relative !important; display: inline-block !important; min-width: 200px !important; }
.csd-trigger { display: flex !important; align-items: center !important; gap: 10px !important; padding: 10px 40px 10px 12px !important; border-radius: 11px !important; border: 2px solid #E2E8F0 !important; background: #ffffff !important; cursor: pointer !important; transition: border-color .14s !important; user-select: none !important; }
.csd-trigger:hover, .csd-trigger.open { border-color: #059669 !important; }
.csd-trigger-icon { width: 28px !important; height: 28px !important; border-radius: 8px !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; background: #f1f5f9 !important; color: #94A3B8 !important; }
.csd-trigger-txt { display: flex !important; flex-direction: column !important; flex: 1 !important; }
.csd-trigger-label { font-size: 9px !important; font-weight: 700 !important; letter-spacing: .1em !important; text-transform: uppercase !important; color: #94A3B8 !important; line-height: 1 !important; margin-bottom: 2px !important; display: block !important; }
.csd-trigger-val { font-size: 13px !important; font-weight: 800 !important; color: #0f172a !important; line-height: 1 !important; display: block !important; }
.csd-arr { position: absolute !important; right: 12px !important; top: 50% !important; transform: translateY(-50%) !important; color: #94A3B8 !important; }
.csd-dropdown { position: absolute !important; top: calc(100% + 6px) !important; left: 0 !important; right: 0 !important; background: #ffffff !important; border: 1px solid #E2E8F0 !important; border-radius: 12px !important; box-shadow: 0 8px 24px rgba(0,0,0,.12) !important; z-index: 9999 !important; overflow: hidden !important; }
.csd-option { display: flex !important; align-items: center !important; gap: 10px !important; padding: 10px 14px !important; cursor: pointer !important; transition: background .12s !important; }
.csd-option:hover { background: #f8fafc !important; }
.csd-option.selected { background: #ECFDF5 !important; }
.csd-opt-icon { width: 28px !important; height: 28px !important; border-radius: 8px !important; display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; }
.csd-opt-txt { display: flex !important; flex-direction: column !important; }
.csd-opt-name { font-size: 13px !important; font-weight: 700 !important; }
.csd-opt-desc { font-size: 10px !important; color: #94A3B8 !important; font-weight: 500 !important; }

/* ═══════════════ CUSTOM SELECT ANO ═══════════════ */
.ysd-wrap { position: relative !important; display: inline-block !important; }
.ysd-trigger { display: flex !important; align-items: center !important; gap: 8px !important; padding: 10px 40px 10px 12px !important; border-radius: 11px !important; border: 2px solid #E2E8F0 !important; background: #ffffff !important; cursor: pointer !important; min-width: 130px !important; transition: border-color .14s !important; user-select: none !important; }
.ysd-trigger:hover, .ysd-trigger.open { border-color: #059669 !important; }
.ysd-icon { width: 28px !important; height: 28px !important; border-radius: 8px !important; background: #ECFDF5 !important; display: flex !important; align-items: center !important; justify-content: center !important; color: #059669 !important; flex-shrink: 0 !important; }
.ysd-icon svg { stroke: #059669 !important; }
.ysd-txt { display: flex !important; flex-direction: column !important; }
.ysd-label { font-size: 9px !important; font-weight: 700 !important; letter-spacing: .1em !important; text-transform: uppercase !important; color: #94A3B8 !important; line-height: 1 !important; margin-bottom: 2px !important; display: block !important; }
.ysd-val { font-size: 16px !important; font-weight: 900 !important; color: #0f172a !important; letter-spacing: -.02em !important; line-height: 1 !important; display: block !important; }
.ysd-dropdown { position: absolute !important; top: calc(100% + 6px) !important; left: 0 !important; background: #ffffff !important; border: 1px solid #E2E8F0 !important; border-radius: 12px !important; box-shadow: 0 8px 24px rgba(0,0,0,.12) !important; z-index: 9999 !important; min-width: 130px !important; overflow: hidden !important; }
.ysd-option { display: flex !important; align-items: center !important; gap: 8px !important; padding: 9px 14px !important; cursor: pointer !important; transition: all .12s !important; font-size: 14px !important; font-weight: 800 !important; color: #475569 !important; letter-spacing: -.01em !important; }
.ysd-option:hover { background: #f8fafc !important; color: #0f172a !important; }
.ysd-option.selected { background: #059669 !important; color: #ffffff !important; }
.ysd-opt-dot { width: 8px !important; height: 8px !important; border-radius: 50% !important; background: currentColor !important; opacity: .4 !important; flex-shrink: 0 !important; }

.rp-sel { font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important; font-size: 13px !important; font-weight: 600 !important; padding: 10px 14px !important; border: 2px solid #CBD5E1 !important; border-radius: 10px !important; background: #f8fafc !important; color: #0f172a !important; outline: none !important; min-width: 220px !important; transition: border-color .14s !important; cursor: pointer !important; }
.rp-sel:focus { border-color: #059669 !important; }

/* ═══════════════ BOTÃO GERAR ═══════════════ */
.rp-btn-go { display: flex !important; align-items: center !important; gap: 8px !important; font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important; font-size: 13px !important; font-weight: 800 !important; background: #059669 !important; color: #ffffff !important; border: none !important; border-radius: 10px !important; padding: 10px 22px !important; cursor: pointer !important; box-shadow: 0 3px 10px rgba(5,150,105,.35) !important; transition: all .14s !important; }
.rp-btn-go svg { stroke: #ffffff !important; }
.rp-btn-go:hover { background: #047857 !important; transform: translateY(-1px) !important; }
.rp-btn-go:disabled { opacity: .5 !important; cursor: not-allowed !important; transform: none !important; }

/* ═══════════════ RESULTADO ═══════════════ */
.rp-result { animation: rpIn .28s ease both !important; }
@keyframes rpIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
.rp-res-hd { display: flex !important; align-items: center !important; gap: 12px !important; flex-wrap: wrap !important; margin-bottom: 22px !important; }
.rp-res-title { font-size: 22px !important; font-weight: 900 !important; letter-spacing: -.03em !important; color: #0f172a !important; margin: 0 !important; }

/* ═══════════════ BADGES ═══════════════ */
.rp-badge { font-size: 10px !important; font-weight: 800 !important; letter-spacing: .1em !important; text-transform: uppercase !important; padding: 4px 12px !important; border-radius: 20px !important; display: inline-block !important; }
.rp-badge-green  { background: #ECFDF5 !important; color: #065F46 !important; border: 1px solid #A7F3D0 !important; }
.rp-badge-indigo { background: #EEF2FF !important; color: #3730A3 !important; border: 1px solid #C7D2FE !important; }
.rp-badge-amber  { background: #FFFBEB !important; color: #92400E !important; border: 1px solid #FDE68A !important; }
.rp-badge-violet { background: #F5F3FF !important; color: #5B21B6 !important; border: 1px solid #DDD6FE !important; }
.rp-badge-rose   { background: #FFF1F2 !important; color: #9F1239 !important; border: 1px solid #FECDD3 !important; }

/* ═══════════════ KPI CARDS ═══════════════ */
.rp-kpi-grid { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important; gap: 12px !important; margin-bottom: 22px !important; }
.rp-kpi { background: #ffffff !important; border: 1px solid #E2E8F0 !important; border-radius: 16px !important; padding: 18px !important; position: relative !important; overflow: hidden !important; box-shadow: 0 1px 4px rgba(0,0,0,.06) !important; transition: transform .18s, box-shadow .18s !important; }
.rp-kpi:hover { transform: translateY(-3px) !important; box-shadow: 0 6px 20px rgba(0,0,0,.1) !important; }
.rp-kpi::before { content: '' !important; position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; height: 3px !important; }
.kpi-green::before  { background: #059669 !important; }
.kpi-indigo::before { background: #4F46E5 !important; }
.kpi-amber::before  { background: #D97706 !important; }
.kpi-violet::before { background: #7C3AED !important; }

.rp-kpi-icon { width: 36px !important; height: 36px !important; border-radius: 10px !important; display: flex !important; align-items: center !important; justify-content: center !important; margin-bottom: 10px !important; }
.kpi-green  .rp-kpi-icon { background: #ECFDF5 !important; color: #059669 !important; }
.kpi-green  .rp-kpi-icon svg { stroke: #059669 !important; }
.kpi-indigo .rp-kpi-icon { background: #EEF2FF !important; color: #4F46E5 !important; }
.kpi-indigo .rp-kpi-icon svg { stroke: #4F46E5 !important; }
.kpi-amber  .rp-kpi-icon { background: #FFFBEB !important; color: #D97706 !important; }
.kpi-amber  .rp-kpi-icon svg { stroke: #D97706 !important; }
.kpi-violet .rp-kpi-icon { background: #F5F3FF !important; color: #7C3AED !important; }
.kpi-violet .rp-kpi-icon svg { stroke: #7C3AED !important; }

.rp-kpi-lbl  { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .1em !important; text-transform: uppercase !important; color: #94A3B8 !important; margin-bottom: 4px !important; display: block !important; }
.rp-kpi-val  { font-size: 24px !important; font-weight: 900 !important; letter-spacing: -.03em !important; color: #0f172a !important; line-height: 1 !important; display: block !important; }
.rp-kpi-unit { font-size: 11px !important; color: #94A3B8 !important; margin-top: 2px !important; display: block !important; }

/* ═══════════════ SECTION LABEL ═══════════════ */
.rp-section-lbl { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .12em !important; text-transform: uppercase !important; color: #94A3B8 !important; margin-bottom: 10px !important; display: block !important; }

/* ═══════════════ BAR CHART ═══════════════ */
.rp-bar-wrap { background: #ffffff !important; border: 1px solid #E2E8F0 !important; border-radius: 14px !important; padding: 16px 18px !important; margin-bottom: 20px !important; box-shadow: 0 1px 4px rgba(0,0,0,.05) !important; }
.rp-bar-row { display: flex !important; align-items: center !important; gap: 8px !important; margin-bottom: 7px !important; }
.rp-bar-lbl { font-size: 11px !important; font-weight: 600 !important; color: #64748b !important; min-width: 32px !important; text-align: right !important; }
.rp-bar-track { flex: 1 !important; height: 22px !important; background: #f1f5f9 !important; border-radius: 6px !important; overflow: hidden !important; }
.rp-bar-fill { height: 100% !important; border-radius: 6px !important; display: flex !important; align-items: center !important; padding-left: 8px !important; transition: width .6s cubic-bezier(.34,1.56,.64,1) !important; }
.rp-bar-fill span { font-size: 11px !important; font-weight: 700 !important; color: #ffffff !important; }
.rp-bar-num { font-size: 12px !important; font-weight: 800 !important; color: #0f172a !important; min-width: 22px !important; }

/* ═══════════════ VISTA TOGGLE ═══════════════ */
.rp-vista-toggle { display: flex !important; background: #f1f5f9 !important; border-radius: 10px !important; padding: 3px !important; gap: 3px !important; }
.rp-vista-btn { padding: 7px 18px !important; border-radius: 8px !important; border: none !important; background: transparent !important; font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important; font-size: 12px !important; font-weight: 700 !important; color: #64748b !important; cursor: pointer !important; transition: all .14s !important; }
.rp-vista-btn.on { background: #ffffff !important; color: #0f172a !important; box-shadow: 0 1px 4px rgba(0,0,0,.08) !important; }

/* ═══════════════ MONTH NAV ═══════════════ */
.rp-mnav { display: flex !important; align-items: center !important; justify-content: space-between !important; background: linear-gradient(135deg, #059669, #4F46E5) !important; border-radius: 14px !important; padding: 13px 20px !important; margin-bottom: 16px !important; }
.rp-mnav-lbl { font-size: 16px !important; font-weight: 900 !important; letter-spacing: .08em !important; color: #ffffff !important; }
.rp-mnav-btn { width: 34px !important; height: 34px !important; border-radius: 9px !important; border: 1.5px solid rgba(255,255,255,.35) !important; background: rgba(255,255,255,.18) !important; color: #ffffff !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 18px !important; font-family: inherit !important; transition: background .14s !important; }
.rp-mnav-btn:hover { background: rgba(255,255,255,.28) !important; }

/* ═══════════════ TABLE ═══════════════ */
.rp-tbl-scroll { overflow-x: auto !important; border-radius: 14px !important; border: 1px solid #E2E8F0 !important; box-shadow: 0 1px 6px rgba(0,0,0,.05) !important; margin-bottom: 20px !important; }
.rp-table { width: 100% !important; border-collapse: collapse !important; font-size: 12px !important; font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important; background: #ffffff !important; }
.thead-green th { background: #059669 !important; color: #ffffff !important; }
.thead-indigo th { background: #4F46E5 !important; color: #ffffff !important; }
.thead-sub th { background: #f3f4f6 !important; color: #475569 !important; }
.rp-th { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .07em !important; text-transform: uppercase !important; padding: 11px 13px !important; text-align: left !important; white-space: nowrap !important; border-bottom: 1px solid #E2E8F0 !important; color: inherit !important; }
.th-sticky { position: sticky !important; left: 0 !important; z-index: 2 !important; }
.thead-green .th-sticky { background: #059669 !important; color: #ffffff !important; }
.thead-indigo .th-sticky { background: #4F46E5 !important; color: #ffffff !important; }

/* Cabeçalho mês vista anual */
.th-month { text-align: center !important; padding: 0 !important; min-width: 160px !important; }
.th-month-name { font-size: 11px !important; font-weight: 800 !important; text-align: center !important; padding: 8px 6px 4px !important; color: #ffffff !important; display: block !important; }
.th-month-cols { display: grid !important; grid-template-columns: 1fr 1fr !important; border-top: 1px solid rgba(255,255,255,.2) !important; padding: 4px 6px 6px !important; }
.th-month-cols span { font-size: 9px !important; font-weight: 700 !important; text-align: center !important; opacity: .85 !important; letter-spacing: .04em !important; color: #ffffff !important; }

/* Linhas da tabela */
.rp-tr:nth-child(even) td { background: #F9FFFE !important; }
.rp-tr:hover td { background: #ECFDF5 !important; }
.rp-td { padding: 10px 13px !important; border-bottom: 1px solid #f1f5f9 !important; vertical-align: middle !important; color: #0f172a !important; }
.rp-mono { font-family: monospace !important; font-size: 11px !important; color: #64748b !important; }
.rp-td-red { color: #E11D48 !important; }
.rp-td-green { color: #059669 !important; }

/* Célula mês vista anual */
.rp-td-month { padding: 0 !important; border-bottom: 1px solid #f1f5f9 !important; vertical-align: top !important; }
.mc { display: grid !important; grid-template-columns: 1fr 1fr !important; }
.mc-val { padding: 7px 9px !important; text-align: center !important; font-size: 12px !important; font-weight: 700 !important; color: #0f172a !important; border-right: 1px solid #f1f5f9 !important; }
.mc-val:last-of-type { border-right: none !important; }
.mc-red { color: #E11D48 !important; }
.mc-green { color: #059669 !important; }
.mc-bottom { grid-column: 1/-1 !important; display: flex !important; align-items: center !important; gap: 6px !important; justify-content: center !important; padding: 4px 8px 6px !important; border-top: 1px solid #f1f5f9 !important; }
.mc-dif { font-size: 10px !important; font-weight: 700 !important; color: #475569 !important; }

/* Labels da tabela injetado */
.rp-td-labels { text-align: right !important; white-space: nowrap !important; font-size: 11px !important; font-weight: 600 !important; color: #475569 !important; }
.rp-td-labels div { padding: 5px 10px !important; border-bottom: 1px solid #f1f5f9 !important; }
.rp-td-data { padding: 0 !important; vertical-align: top !important; }
.rp-drow { display: flex !important; align-items: center !important; justify-content: center !important; gap: 4px !important; padding: 5px 8px !important; border-bottom: 1px solid #f1f5f9 !important; font-size: 11px !important; }
.rp-drow span { min-width: 64px !important; text-align: center !important; }
.rp-dfull { padding: 5px 8px !important; border-bottom: 1px solid #f1f5f9 !important; text-align: center !important; font-size: 11px !important; }

/* ═══════════════ PILLS ═══════════════ */
.rp-pill { display: inline-flex !important; align-items: center !important; gap: 3px !important; padding: 2px 8px !important; border-radius: 20px !important; font-size: 10px !important; font-weight: 700 !important; }
.rp-pill.ok   { background: #ECFDF5 !important; color: #065F46 !important; border: 1px solid #A7F3D0 !important; }
.rp-pill.err  { background: #FFF1F2 !important; color: #9F1239 !important; border: 1px solid #FECDD3 !important; }
.rp-pill.neu  { background: #EEF2FF !important; color: #3730A3 !important; border: 1px solid #C7D2FE !important; }
.rp-pill.warn { background: #FFFBEB !important; color: #92400E !important; border: 1px solid #FDE68A !important; }

/* ═══════════════ COMPENSAÇÃO — CARDS USINAS ═══════════════ */
.rp-gen-grid { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important; gap: 12px !important; margin-bottom: 16px !important; }
.rp-gen-card { background: #ffffff !important; border: 1px solid #E2E8F0 !important; border-left: 4px solid #059669 !important; border-radius: 0 16px 16px 0 !important; padding: 14px 16px !important; box-shadow: 0 1px 4px rgba(0,0,0,.05) !important; }
.rp-gen-head { display: flex !important; align-items: center !important; justify-content: space-between !important; margin-bottom: 5px !important; }
.rp-pct-badge { background: #ECFDF5 !important; color: #047857 !important; border: 1px solid #A7F3D0 !important; font-size: 12px !important; font-weight: 800 !important; padding: 3px 10px !important; border-radius: 20px !important; display: inline-block !important; }
.rp-gen-name { font-size: 13px !important; font-weight: 700 !important; color: #0f172a !important; margin-bottom: 7px !important; }
.rp-gen-stats { display: flex !important; gap: 12px !important; }
.rp-gen-lbl { font-size: 9px !important; font-weight: 700 !important; letter-spacing: .08em !important; text-transform: uppercase !important; color: #94A3B8 !important; display: block !important; }
.rp-gen-val { font-size: 13px !important; font-weight: 800 !important; color: #0f172a !important; }

/* ═══════════════ BANNER TOTAL ═══════════════ */
.rp-total-banner { display: flex !important; align-items: center !important; justify-content: space-between !important; background: #EEF2FF !important; border: 1.5px solid #C7D2FE !important; border-radius: 12px !important; padding: 14px 20px !important; margin: 14px 0 20px !important; }
.rp-total-lbl { font-size: 13px !important; font-weight: 700 !important; color: #4F46E5 !important; }
.rp-total-val { font-size: 20px !important; font-weight: 900 !important; color: #4F46E5 !important; }

/* ═══════════════ UD CARDS ═══════════════ */
.rp-ud-grid { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)) !important; gap: 10px !important; margin-bottom: 20px !important; }
.rp-ud-card { background: #ffffff !important; border: 1px solid #E2E8F0 !important; border-radius: 12px !important; padding: 14px 16px !important; box-shadow: 0 1px 3px rgba(0,0,0,.05) !important; }
.rp-ud-card.ud-green  { border-left: 4px solid #059669 !important; background: #ECFDF5 !important; border-radius: 0 12px 12px 0 !important; }
.rp-ud-card.ud-indigo { border-left: 4px solid #4F46E5 !important; background: #EEF2FF !important; border-radius: 0 12px 12px 0 !important; }
.rp-ud-card.ud-violet { border-left: 4px solid #7C3AED !important; background: #F5F3FF !important; border-radius: 0 12px 12px 0 !important; }
.rp-ud-card.ud-red    { border-left: 4px solid #E11D48 !important; background: #FFF1F2 !important; border-radius: 0 12px 12px 0 !important; }
.rp-ud-lbl    { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .08em !important; text-transform: uppercase !important; color: #64748b !important; margin-bottom: 6px !important; display: block !important; }
.rp-ud-pair   { display: flex !important; flex-direction: column !important; gap: 2px !important; font-size: 13px !important; font-weight: 700 !important; color: #0f172a !important; }
.rp-ud-big    { font-size: 18px !important; font-weight: 900 !important; color: #0f172a !important; }
.rp-ud-status { font-size: 13px !important; font-weight: 800 !important; color: #0f172a !important; margin-top: 4px !important; }

/* ═══════════════ GERAL MENSAL GRID ═══════════════ */
.rp-mensal-grid { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important; gap: 12px !important; margin-bottom: 22px !important; }
.rp-mc { background: #ffffff !important; border: 1px solid #E2E8F0 !important; border-radius: 16px !important; padding: 15px !important; box-shadow: 0 1px 4px rgba(0,0,0,.05) !important; }
.rp-mc-green  { border-top: 3px solid #059669 !important; }
.rp-mc-indigo { border-top: 3px solid #4F46E5 !important; }
.rp-mc-amber  { border-top: 3px solid #D97706 !important; }
.rp-mc-violet { border-top: 3px solid #7C3AED !important; }
.rp-mc-lbl  { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .09em !important; text-transform: uppercase !important; color: #94A3B8 !important; margin-bottom: 4px !important; display: block !important; }
.rp-mc-val  { font-size: 19px !important; font-weight: 900 !important; letter-spacing: -.03em !important; color: #0f172a !important; line-height: 1 !important; display: block !important; }
.rp-mc-unit { font-size: 11px !important; color: #94A3B8 !important; margin-top: 2px !important; display: block !important; }

/* ═══════════════ CORES UTILITÁRIAS ═══════════════ */
.rp-ci { color: #4F46E5 !important; }
.rp-cg { color: #059669 !important; }
.rp-ca { color: #D97706 !important; }
.rp-cv { color: #7C3AED !important; }
.rp-co { color: #EA580C !important; }

/* ═══════════════ BOTÕES DE AÇÃO ═══════════════ */
.rp-actions { display: flex !important; gap: 10px !important; flex-wrap: wrap !important; margin: 16px 0 24px !important; }
.rp-btn-pdf { display: flex !important; align-items: center !important; gap: 7px !important; font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important; font-size: 12px !important; font-weight: 800 !important; background: #E11D48 !important; color: #ffffff !important; border: none !important; border-radius: 10px !important; padding: 9px 18px !important; cursor: pointer !important; box-shadow: 0 2px 8px rgba(225,29,72,.3) !important; transition: all .14s !important; }
.rp-btn-pdf svg { stroke: #ffffff !important; }
.rp-btn-pdf:hover { filter: brightness(1.1) !important; }
.rp-btn-outline { display: flex !important; align-items: center !important; gap: 7px !important; font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important; font-size: 12px !important; font-weight: 800 !important; background: #ffffff !important; color: #4F46E5 !important; border: 2px solid #4F46E5 !important; border-radius: 10px !important; padding: 9px 18px !important; cursor: pointer !important; transition: all .14s !important; }
.rp-btn-outline:hover { background: #EEF2FF !important; }

/* ═══════════════ TRANSIÇÕES ═══════════════ */
.rp-slide-enter-active { transition: all .22s ease !important; }
.rp-slide-leave-active { transition: all .16s ease !important; }
.rp-slide-enter-from, .rp-slide-leave-to { opacity: 0 !important; transform: translateY(-8px) !important; }
.rp-fade-enter-active { transition: all .28s ease !important; }
.rp-fade-leave-active { transition: all .18s ease !important; }
.rp-fade-enter-from, .rp-fade-leave-to { opacity: 0 !important; transform: translateY(10px) !important; }
.drop-enter-active { transition: all .18s ease !important; }
.drop-leave-active { transition: all .14s ease !important; }
.drop-enter-from, .drop-leave-to { opacity: 0 !important; transform: translateY(-6px) !important; }

/* ═══════════════ MOBILE ═══════════════ */
@media (max-width: 640px) {
  .rp-body { padding: 0 16px 32px !important; }
  .rp-header { padding: 16px 20px !important; }
  .rp-header-img { display: none !important; }
  .rp-title { font-size: 22px !important; }
  .rp-cat-tab { min-width: 80px !important; padding: 8px 10px !important; }
  .tab-sub { display: none !important; }
  .rp-filter-row { flex-direction: column !important; }
  .rp-kpi-grid { grid-template-columns: 1fr 1fr !important; }
  .rp-ud-grid, .rp-mensal-grid { grid-template-columns: 1fr 1fr !important; }
}
</style>