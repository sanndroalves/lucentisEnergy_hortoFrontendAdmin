<script setup>
import { computed, ref } from 'vue'
import { useHead } from '@vueuse/head'
import { API_BASE_URL } from '~/base/link'
import RelatorioGeracao from '~~/components/dashboard/RelatorioGeracao.vue'
import GeracaoDinheiro from '@/components/dashboard/GeracaoDinheiro.vue'
import AnaliseGeracao from '~~/components/dashboard/AnaliseGeracao.vue'
import Irregular from '@/components/dashboard/Irregular.vue'

useHead({ title: 'Centro de Operações Energéticas' })
definePageMeta({ middleware: 'sidebase-auth' })

const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`)
const { data: unidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao`)
const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`)
const { data: manutencoes } = await useFetch(`${API_BASE_URL}/manutencao/`)
const { data: projecoes } = await useFetch(`${API_BASE_URL}/projecaogeracao`)
const { data: geracoes } = await useFetch(`${API_BASE_URL}/relatoriogeracao`)

const arr = value => Array.isArray(value) ? value : []
const listaUsinas = computed(() => arr(usinas.value))
const listaUnidades = computed(() => arr(unidades.value))
const listaRelatorios = computed(() => arr(relatorios.value))
const listaManutencoes = computed(() => arr(manutencoes.value))
const listaProjecoes = computed(() => arr(projecoes.value))
const listaGeracoes = computed(() => arr(geracoes.value))

const valorIluminacao = computed(() => listaUnidades.value.filter(i => ['I','P'].includes(i.secretaria)))
const valoresPredios = computed(() => listaUnidades.value.filter(i => ['E','S','O'].includes(i.secretaria) && i.status === 'L'))
const valoresCompensacao = computed(() => listaUnidades.value.filter(i => i.status === 'L'))

const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const anoAtual = new Date().getFullYear()
const chaveData = item => Number(item.ano) * 100 + Number(item.mes)

const ultimoPeriodoReal = computed(() => {
  const chave = [...new Set(listaGeracoes.value
    .filter(i => Number(i.geracao) > 0 && Number(i.ano) > 0 && Number(i.mes) > 0)
    .map(chaveData))].sort((a,b) => b-a)[0]
  if (!chave) return null
  return { ano: Math.floor(chave / 100), mes: chave % 100 }
})

const geracaoPorMes = ano => {
  const valores = Array(12).fill(0)
  listaGeracoes.value.filter(i => Number(i.ano) === ano).forEach(i => {
    const mes = Number(i.mes)
    if (mes >= 1 && mes <= 12) valores[mes - 1] += Number(i.geracao) || 0
  })
  return valores
}
const projecaoPorMes = ano => {
  const valores = Array(12).fill(0)
  listaProjecoes.value.filter(i => Number(i.ano) === ano).forEach(i => {
    const mes = Number(i.mes)
    if (mes >= 1 && mes <= 12) valores[mes - 1] += Number(i.projecao) || 0
  })
  return valores
}

const anoAnalise = computed(() => ultimoPeriodoReal.value?.ano || anoAtual)
const geracaoMensal = computed(() => geracaoPorMes(anoAnalise.value))
const projecaoMensal = computed(() => projecaoPorMes(anoAnalise.value))
const totalGerado = computed(() => geracaoMensal.value.reduce((a,b) => a+b, 0))
const totalProjetado = computed(() => projecaoMensal.value.reduce((a,b) => a+b, 0))
const eficiencia = computed(() => totalProjetado.value ? totalGerado.value / totalProjetado.value * 100 : null)
const ultimoMesIndex = computed(() => ultimoPeriodoReal.value ? ultimoPeriodoReal.value.mes - 1 : -1)
const ultimoMesReal = computed(() => ultimoMesIndex.value >= 0 ? geracaoMensal.value[ultimoMesIndex.value] : 0)
const ultimoMesProjecao = computed(() => ultimoMesIndex.value >= 0 ? projecaoMensal.value[ultimoMesIndex.value] : 0)
const eficienciaUltimo = computed(() => ultimoMesProjecao.value ? ultimoMesReal.value / ultimoMesProjecao.value * 100 : null)

const manutencoesAtivas = computed(() => listaManutencoes.value.filter(i => {
  const s = String(i.status || i.situacao || '').toLowerCase()
  return s && !['concluida','concluído','finalizada','finalizado','encerrada','encerrado'].includes(s)
}).length)

const format = (v,d=0) => Number.isFinite(Number(v)) ? Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}) : '—'
const mwh = v => `${format(Number(v||0)/1000, Number(v||0) >= 100000 ? 0 : 1)} MWh`
const pct = v => v == null ? '—' : `${format(v,1)}%`

const inteligencia = computed(() => {
  if (!ultimoPeriodoReal.value) return 'Aguardando o primeiro período de geração real.'
  if (eficienciaUltimo.value == null) return `Último dado real disponível: ${meses[ultimoPeriodoReal.value.mes-1]}/${ultimoPeriodoReal.value.ano}. Projeção ainda não disponível para comparação.`
  if (eficienciaUltimo.value < 80) return `O último período ficou em ${format(eficienciaUltimo.value,1)}% da projeção. Recomenda-se investigar as usinas com maior desvio antes do próximo ciclo.`
  if (eficienciaUltimo.value < 100) return `O último período entregou ${format(eficienciaUltimo.value,1)}% da projeção. A operação está abaixo do plano, mas dentro de uma faixa acompanhável.`
  return `O último período superou a projeção em ${format(eficienciaUltimo.value-100,1)}%. A geração registrada está acima do plano.`
})

const navegar = url => { if (process.client) window.open(url, '_blank', 'noopener,noreferrer') }

const chartOptions = computed(() => ({
  chart:{type:'area',toolbar:{show:false},zoom:{enabled:false},fontFamily:'DM Mono, monospace',foreColor:'#63758b',background:'transparent'},
  colors:['#2ff59a','#2785ff'],stroke:{curve:'smooth',width:[3,2],dashArray:[0,6]},
  fill:{type:'gradient',gradient:{shadeIntensity:1,opacityFrom:.24,opacityTo:.01,stops:[0,90,100]}},
  grid:{borderColor:'rgba(100,140,180,.12)',strokeDashArray:3},dataLabels:{enabled:false},markers:{size:0,hover:{size:5}},
  xaxis:{categories:meses,axisBorder:{show:false},axisTicks:{show:false},labels:{style:{colors:'#61758b',fontSize:'10px'}}},
  yaxis:{labels:{style:{colors:'#61758b',fontSize:'10px'},formatter:v=>mwh(v)}},
  legend:{position:'top',horizontalAlign:'right',labels:{colors:'#9bb0c5'},fontSize:'10px'},
  tooltip:{theme:'dark',y:{formatter:v=>format(v)+' kWh'}}
}))
const chartSeries = computed(() => [
  {name:'REAL',data:geracaoMensal.value},
  {name:'PROJEÇÃO',data:projecaoMensal.value}
])
const sparkOptions = {chart:{type:'area',sparkline:{enabled:true}},stroke:{curve:'smooth',width:2},fill:{type:'gradient',gradient:{opacityFrom:.25,opacityTo:.01}},colors:['#2ff59a'],tooltip:{enabled:false}}
const modoExecutivo = ref(false)
const mostrarAbertura = ref(true)
const { data: clima } = await useFetch('https://api.open-meteo.com/v1/forecast?latitude=-22.8525&longitude=-47.2142&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,cloud_cover_mean,shortwave_radiation_sum&timezone=America%2FSao_Paulo&forecast_days=1')
const climaHoje = computed(() => clima.value?.daily ? {
  tempMax: clima.value.daily.temperature_2m_max?.[0],
  tempMin: clima.value.daily.temperature_2m_min?.[0],
  chuva: clima.value.daily.precipitation_probability_max?.[0] ?? 0,
  nuvens: clima.value.daily.cloud_cover_mean?.[0] ?? 0,
  irradiacao: clima.value.daily.shortwave_radiation_sum?.[0] ?? 0,
  codigo: clima.value.daily.weather_code?.[0]
} : null)
const potencialGeracao = computed(() => {
  if (!climaHoje.value) return { nivel:'—', classe:'neutral', texto:'Dados meteorológicos indisponíveis.' }
  const c = climaHoje.value
  const score = Math.max(0, 100 - c.nuvens - c.chuva * .65)
  if (score >= 70) return { nivel:'ALTA', classe:'high', texto:'Condições favoráveis para geração fotovoltaica.' }
  if (score >= 45) return { nivel:'MÉDIA', classe:'medium', texto:'Geração esperada em nível intermediário.' }
  return { nivel:'BAIXA', classe:'low', texto:'Nebulosidade/chuva podem reduzir a geração hoje.' }
})
const investimentoTotal = computed(() => listaUsinas.value.reduce((s,i) => s + Number(i.investimento ?? i.valorInvestimento ?? i.custoImplantacao ?? 0),0))
const economiaAcumulada = computed(() => listaRelatorios.value.reduce((s,i) => s + (Number(i.valorInjTUSD)||0) + (Number(i.valorInjTE)||0),0))
const paybackPercent = computed(() => investimentoTotal.value > 0 ? Math.min(100, economiaAcumulada.value / investimentoTotal.value * 100) : null)
const paybackRestante = computed(() => investimentoTotal.value > economiaAcumulada.value ? investimentoTotal.value - economiaAcumulada.value : 0)
</script>

<template>
<div class="lucentis-home">
  <div class="scanline"></div>
  <header class="topbar">
    <div class="identity"><div class="logo-orbit"><span>ϟ</span></div><div><div class="micro">LUCENTIS // MUNICIPAL ENERGY OS</div><h1>Centro de Operações Energéticas</h1><small>HORTOLÂNDIA · NÚCLEO DE INTELIGÊNCIA ENERGÉTICA</small></div></div>
    <div class="top-actions">
      <div class="live"><i></i><span>LIVE SYSTEM</span><small>última sincronização operacional</small></div>
      <button class="top-btn" @click="navegar('https://mapa.peehorto.com')">MAPA <b>↗</b></button>
      <button class="top-btn primary" @click="navegar('https://painel.peehorto.com')">PAINEL EM TEMPO REAL <b>↗</b></button>
      <button class="exec-btn" @click="modoExecutivo=!modoExecutivo">{{ modoExecutivo ? 'OPERACIONAL' : 'EXECUTIVO' }}</button>
    </div>
  </header>

  <div v-if="mostrarAbertura" class="startup-backdrop">
  <section class="startup-modal">
    <div class="startup-head"><div><span>LUCENTIS / MORNING BRIEFING</span><h2>Estado da operação</h2><small>Resumo automático antes de entrar no centro de comando</small></div><button @click="mostrarAbertura=false">×</button></div>
    <div class="startup-grid">
      <div class="startup-alert"><div class="startup-icon">!</div><div><span>ANOMALIAS OPERACIONAIS</span><strong>{{ manutencoesAtivas }} manutenção(ões) ativa(s)</strong><p>O monitoramento de anomalias permanece disponível no centro após este resumo.</p></div></div>
      <div class="startup-weather"><div class="weather-icon">☀</div><div><span>CLIMA · HORTOLÂNDIA</span><strong>{{ climaHoje ? climaHoje.tempMin+'° — '+climaHoje.tempMax+'°' : '—' }}</strong><p>{{ climaHoje ? climaHoje.chuva+'% chance de chuva · '+climaHoje.nuvens+'% nebulosidade' : 'Consultando previsão...' }}</p></div><div class="weather-level" :class="potencialGeracao.classe"><b>{{ potencialGeracao.nivel }}</b><small>potencial FV</small></div></div>
    </div>
    <div class="startup-intel"><div class="ai-orb"><span>✦</span></div><div><span>LUCENTIS INTELLIGENCE</span><strong>Hoje: potencial de geração {{ potencialGeracao.nivel.toLowerCase() }}</strong><p>{{ potencialGeracao.texto }} {{ climaHoje ? 'Irradiação prevista: '+format(climaHoje.irradiacao,1)+' MJ/m².' : '' }}</p></div><button @click="navegar('https://painel.peehorto.com')">ABRIR PAINEL ↗</button></div>
    <div class="startup-foot"><span>ÚLTIMA GERAÇÃO REAL</span><b>{{ ultimoPeriodoReal ? meses[ultimoPeriodoReal.mes-1]+' / '+ultimoPeriodoReal.ano : '—' }}</b><span>ESC PARA CONTINUAR</span></div>
  </section>
</div>
<main class="command">
    <section class="energy-stage">
      <div class="stage-label left"><span>GRID / 01</span><b>GERAÇÃO</b><small>{{ listaUsinas.length }} usinas conectadas</small></div>
      <div class="stage-label right"><span>GRID / 02</span><b>CONSUMO</b><small>{{ valoresPredios.length }} prédios · {{ valorIluminacao.length }} IP</small></div>
      <div class="energy-visual">
        <div class="energy-halo halo-a"></div><div class="energy-halo halo-b"></div><div class="energy-ring ring-a"></div><div class="energy-ring ring-b"></div>
        <div class="energy-core"><div class="core-grid"></div><span>ϟ</span><small>ENERGY<br>FLOW</small></div>
        <div class="flow flow-1"><i></i><i></i><i></i><i></i><i></i></div><div class="flow flow-2"><i></i><i></i><i></i><i></i><i></i></div><div class="flow flow-3"><i></i><i></i><i></i><i></i><i></i></div><div class="flow flow-4"><i></i><i></i><i></i><i></i><i></i></div>
        <div class="source-cluster"><span>☀</span><b>USINAS FV</b><small>{{ listaUsinas.length }} ATIVOS</small></div>
        <div class="building-cluster"><div class="building"><i></i><i></i><i></i></div><div class="building tall"><i></i><i></i><i></i><i></i></div><div class="building"><i></i><i></i><i></i></div><b>REDE MUNICIPAL</b><small>{{ valoresPredios.length }} PRÉDIOS</small></div>
        <div class="node node-3">ILUMINAÇÃO</div><div class="node node-4">UNIDADES</div>
      </div>
      <div class="energy-main-readout">
        <div class="eyebrow">ÚLTIMA GERAÇÃO REAL</div><strong>{{ mwh(ultimoMesReal) }}</strong>
        <div class="period"><b>{{ ultimoPeriodoReal ? meses[ultimoPeriodoReal.mes-1] : '—' }} / {{ ultimoPeriodoReal?.ano || '—' }}</b><span>· dado efetivamente registrado</span></div>
        <div class="performance" :class="{danger: eficienciaUltimo !== null && eficienciaUltimo < 80}"><i></i>{{ pct(eficienciaUltimo) }} da projeção</div>
      </div>
    </section>

    <section class="command-grid">
      <div class="column">
        <article class="hud-card kpi-card"><div class="payback-strip"><span>PAYBACK ACUMULADO</span><b>{{ paybackPercent === null ? 'DADO DE INVESTIMENTO PENDENTE' : format(paybackPercent,1)+'%' }}</b></div><div class="card-top"><span>ENERGY OUTPUT / YTD</span><b>01</b></div><strong>{{ mwh(totalGerado) }}</strong><small>GERAÇÃO REAL · {{ anoAnalise }}</small><apexchart type="area" height="55" :options="sparkOptions" :series="[{name:'real',data:geracaoMensal}]" /></article>
        <article class="hud-card metric-list"><div class="card-top"><span>INFRAESTRUTURA</span><b>02</b></div><div class="metric"><span>USINAS FV</span><b>{{listaUsinas.length}}</b></div><div class="metric"><span>UNIDADES COMPENSAÇÃO</span><b>{{valoresCompensacao.length}}</b></div><div class="metric"><span>MANUTENÇÕES ATIVAS</span><b>{{manutencoesAtivas}}</b></div></article>
      </div>
      <div class="column center-column">
        <article class="hud-card chart-card"><div class="card-top"><span>ENERGY TELEMETRY / {{ anoAnalise }}</span><b>03</b></div><h2>Real × projeção</h2><p>O sistema usa automaticamente o último período com geração real registrada.</p><apexchart type="area" height="245" :options="chartOptions" :series="chartSeries" /></article>
      </div>
      <div class="column">
        <article class="hud-card intelligence"><div class="ai-orb"><span>✦</span></div><div><div class="card-top"><span>LUCENTIS INTELLIGENCE</span><b>AI</b></div><h2>Leitura operacional</h2><p>{{ inteligencia }}</p></div><div class="ai-line"><i></i><span>ANÁLISE AUTOMÁTICA · SEM DADO INVENTADO</span></div></article>
        <article class="hud-card access"><div class="card-top"><span>NAVEGAÇÃO RÁPIDA</span><b>04</b></div><button @click="navegar('https://mapa.peehorto.com')"><span>◉</span><div><b>MAPA ENERGÉTICO</b><small>infraestrutura geográfica</small></div><em>↗</em></button><button @click="navegar('https://painel.peehorto.com')"><span>◫</span><div><b>PAINEL DE GERAÇÃO</b><small>telemetria em tempo real</small></div><em>↗</em></button></article>
      </div>
    </section>

    <section v-if="!modoExecutivo" class="secondary-grid">
      <article class="hud-card wide"><div class="card-top"><span>FINANCE / IMPACT</span><b>05</b></div><h2>Compensação energética</h2><GeracaoDinheiro /></article>
      <article class="hud-card wide"><div class="card-top"><span>GENERATION / REPORT</span><b>06</b></div><RelatorioGeracao /></article>
      <article class="hud-card wide"><div class="card-top"><span>GENERATION / ANALYSIS</span><b>07</b></div><AnaliseGeracao /></article>
      <article class="hud-card wide"><div class="card-top"><span>ANOMALY / DETECTION</span><b>08</b></div><Irregular /></article>
    </section>
    <footer><span><b>LUCENTIS</b> // MUNICIPAL ENERGY OS</span><span>DATA CORE · {{ new Date().toLocaleDateString('pt-BR') }}</span></footer>
  </main>
</div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
:root{--line:rgba(93,139,170,.17);--green:#2ff59a;--blue:#2785ff;--text:#e9f5f3}
.lucentis-home{min-height:100vh;background:radial-gradient(circle at 50% 28%,rgba(19,86,72,.18),transparent 28%),radial-gradient(circle at 15% 70%,rgba(39,133,255,.08),transparent 28%),#02070b;color:var(--text);font-family:'Plus Jakarta Sans',sans-serif;position:relative;overflow:hidden}.scanline{position:fixed;inset:0;pointer-events:none;opacity:.08;background:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(#000,transparent 82%)}
.topbar{height:78px;padding:0 28px;border-bottom:1px solid var(--line);background:rgba(2,7,11,.84);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:space-between;gap:20px;position:relative;z-index:5}.identity{display:flex;align-items:center;gap:13px}.logo-orbit{width:42px;height:42px;border:1px solid rgba(47,245,154,.35);border-radius:50%;display:grid;place-items:center;position:relative;color:var(--green);box-shadow:0 0 30px rgba(47,245,154,.12)}.logo-orbit:before,.logo-orbit:after{content:'';position:absolute;inset:5px;border:1px dashed rgba(47,245,154,.22);border-radius:50%;animation:spin 8s linear infinite}.logo-orbit:after{inset:-4px;animation:spin 12s linear infinite reverse}.logo-orbit span{font-size:22px}.micro,.card-top,.eyebrow{font:500 9px 'DM Mono';letter-spacing:.16em;color:#668296}.identity h1{font-size:17px;margin:2px 0 1px;letter-spacing:-.03em}.identity small{font:400 8px 'DM Mono';color:#496176}.top-actions{display:flex;align-items:center;gap:8px}.live{padding-right:14px;border-right:1px solid var(--line);font:500 9px 'DM Mono';color:#82a0b5}.live i{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 12px var(--green);margin-right:5px}.live small{display:block;color:#43596b;margin:4px 0 0 11px}.top-btn,.exec-btn{border:1px solid var(--line);background:rgba(9,21,30,.7);color:#91a9bb;padding:10px 12px;border-radius:7px;font:600 9px 'DM Mono';cursor:pointer}.top-btn b{color:var(--green);margin-left:5px}.top-btn.primary{border-color:rgba(47,245,154,.3);color:var(--green);background:rgba(47,245,154,.06)}.exec-btn{color:#70aaff;border-color:rgba(39,133,255,.3)}
.startup-backdrop{position:fixed;inset:0;z-index:100;background:rgba(0,3,6,.78);backdrop-filter:blur(12px);display:grid;place-items:center;padding:20px}.startup-modal{width:min(900px,100%);background:linear-gradient(145deg,#07151d,#03090e);border:1px solid rgba(47,245,154,.25);border-radius:18px;box-shadow:0 30px 100px rgba(0,0,0,.65),0 0 80px rgba(47,245,154,.08);overflow:hidden}.startup-head{display:flex;justify-content:space-between;padding:22px 24px;border-bottom:1px solid var(--line)}.startup-head span,.startup-alert span,.startup-weather span,.startup-intel span{font:500 8px 'DM Mono';letter-spacing:.16em;color:#638093}.startup-head h2{margin:5px 0 2px;font-size:22px}.startup-head small{font-size:9px;color:#536b7c}.startup-head button{width:34px;height:34px;border:1px solid var(--line);background:#07131c;color:#8da4b4;border-radius:8px;font-size:24px;cursor:pointer}.startup-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px 24px}.startup-alert,.startup-weather{border:1px solid rgba(93,139,170,.14);background:rgba(255,255,255,.02);border-radius:11px;padding:16px;display:flex;gap:12px;align-items:flex-start}.startup-icon,.weather-icon{width:42px;height:42px;border-radius:10px;display:grid;place-items:center;font-size:20px;background:rgba(255,189,102,.08);color:#ffbd66;border:1px solid rgba(255,189,102,.16)}.weather-icon{color:#2ff59a;background:rgba(47,245,154,.07);border-color:rgba(47,245,154,.16)}.startup-alert strong,.startup-weather strong,.startup-intel strong{display:block;margin-top:6px;font-size:12px}.startup-alert p,.startup-weather p,.startup-intel p{margin:4px 0 0;color:#637b8c;font-size:9px;line-height:1.6}.weather-level{margin-left:auto;text-align:right}.weather-level b{display:block;font:500 12px 'DM Mono';color:#2ff59a}.weather-level.medium b{color:#ffbd66}.weather-level.low b{color:#ff7070}.weather-level small{font:500 7px 'DM Mono';color:#4e6879}.startup-intel{margin:0 24px 16px;padding:15px;border:1px solid rgba(39,133,255,.2);background:linear-gradient(90deg,rgba(39,133,255,.06),rgba(47,245,154,.03));border-radius:11px;display:flex;align-items:center;gap:12px}.startup-intel .ai-orb{margin:0;flex:none}.startup-intel>div:nth-child(2){flex:1}.startup-intel button{border:1px solid rgba(47,245,154,.3);background:rgba(47,245,154,.06);color:#2ff59a;border-radius:7px;padding:10px 12px;font:500 8px 'DM Mono';cursor:pointer}.startup-foot{display:flex;justify-content:space-between;padding:12px 24px;border-top:1px solid var(--line);font:500 7px 'DM Mono';color:#486275}.startup-foot b{color:#8ea7b7}.payback-strip{display:flex;justify-content:space-between;margin:12px 16px 0;padding:8px;border:1px solid rgba(39,133,255,.14);background:rgba(39,133,255,.035);border-radius:7px;font:500 7px 'DM Mono';color:#537185}.payback-strip b{color:#6faaff}.command{max-width:1540px;margin:auto;padding:20px 28px 32px;position:relative;z-index:1}.energy-stage{height:410px;position:relative;border:1px solid var(--line);background:linear-gradient(180deg,rgba(6,19,26,.75),rgba(2,8,13,.45));border-radius:16px;overflow:hidden;display:grid;place-items:center}.energy-stage:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 52%,rgba(47,245,154,.12),transparent 25%),linear-gradient(90deg,transparent 49.9%,rgba(47,245,154,.07) 50%,transparent 50.1%)}.stage-label{position:absolute;top:22px;display:flex;flex-direction:column;gap:3px;font-family:'DM Mono'}.stage-label.left{left:24px}.stage-label.right{right:24px;text-align:right}.stage-label span{font-size:8px;color:#45667a}.stage-label b{font-size:11px;color:#a9c2d0}.stage-label small{font-size:8px;color:#50697a}.energy-visual{position:absolute;width:500px;height:330px;top:35px;left:50%;transform:translateX(-50%)}.energy-ring,.energy-halo{position:absolute;border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%)}.energy-ring{border:1px solid rgba(47,245,154,.15);animation:pulse 3.8s ease-in-out infinite}.ring-a{width:250px;height:250px}.ring-b{width:355px;height:355px;border-style:dashed;animation:spin 18s linear infinite}.energy-halo{width:220px;height:220px;background:radial-gradient(circle,rgba(47,245,154,.18),transparent 67%);filter:blur(8px);animation:breathe 3s ease-in-out infinite}.halo-b{width:320px;height:320px;background:radial-gradient(circle,rgba(39,133,255,.08),transparent 68%)}.energy-core{position:absolute;width:138px;height:138px;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid rgba(47,245,154,.55);border-radius:50%;background:radial-gradient(circle at 50% 45%,#0d3c31,#03100e 62%);display:grid;place-items:center;box-shadow:0 0 35px rgba(47,245,154,.22),inset 0 0 30px rgba(47,245,154,.12);z-index:3}.energy-core span{font-size:42px;color:var(--green);text-shadow:0 0 25px var(--green);margin-top:14px}.energy-core small{position:absolute;bottom:23px;font:500 6px 'DM Mono';letter-spacing:.2em;color:#77a795;text-align:center}.core-grid{position:absolute;inset:10px;border-radius:50%;border:1px dashed rgba(47,245,154,.18);animation:spin 10s linear infinite}.flow{position:absolute;left:50%;top:50%;height:2px;width:210px;transform-origin:0 50%;z-index:2}.flow-1{transform:rotate(0deg) translateX(68px)}.flow-2{transform:rotate(90deg) translateX(68px)}.flow-3{transform:rotate(180deg) translateX(68px)}.flow-4{transform:rotate(270deg) translateX(68px)}.flow:before{content:'';position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,rgba(47,245,154,.05),rgba(47,245,154,.45),rgba(39,133,255,.05))}.flow i{position:absolute;width:4px;height:4px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:travel 2.2s linear infinite}.flow i:nth-child(2){animation-delay:.4s}.flow i:nth-child(3){animation-delay:.8s}.flow i:nth-child(4){animation-delay:1.2s}.flow i:nth-child(5){animation-delay:1.6s}.node{position:absolute;z-index:4;font:500 7px 'DM Mono';color:#71a08d;border:1px solid rgba(47,245,154,.25);background:#06140f;padding:5px 8px;border-radius:4px}.node-3{left:205px;top:16px}.node-4{left:205px;bottom:6px}.source-cluster{position:absolute;left:18px;top:134px;width:105px;display:flex;flex-direction:column;gap:3px;color:#72a58f;z-index:5}.source-cluster span{font-size:25px;color:#2ff59a;text-shadow:0 0 14px #2ff59a}.source-cluster b,.building-cluster b{font:500 7px 'DM Mono';letter-spacing:.1em}.source-cluster small,.building-cluster small{font:500 6px 'DM Mono';color:#456c61}.building-cluster{position:absolute;right:8px;top:121px;width:115px;height:95px;display:flex;align-items:flex-end;gap:4px;z-index:5;color:#6ea9a0}.building{width:27px;height:48px;border:1px solid rgba(47,245,154,.32);background:linear-gradient(180deg,rgba(47,245,154,.1),rgba(39,133,255,.04));display:flex;flex-direction:column;gap:5px;padding:6px 5px;box-shadow:0 0 18px rgba(47,245,154,.05)}.building.tall{height:70px}.building i{display:block;width:5px;height:5px;background:#2ff59a;opacity:.65;box-shadow:0 0 6px rgba(47,245,154,.6)}.building-cluster>b{position:absolute;bottom:-17px;left:0}.building-cluster>small{position:absolute;bottom:-27px;left:0}.energy-main-readout{position:absolute;bottom:21px;left:50%;transform:translateX(-50%);text-align:center;z-index:5}.energy-main-readout .eyebrow{font-size:8px}.energy-main-readout strong{display:block;font:500 28px 'DM Mono';color:#f2fff9;margin:2px 0}.period{font:400 8px 'DM Mono';color:#587084}.period b{color:#91adbd}.performance{display:inline-flex;align-items:center;gap:5px;margin-top:7px;padding:4px 8px;border:1px solid rgba(47,245,154,.2);border-radius:20px;color:var(--green);font:500 8px 'DM Mono';background:rgba(47,245,154,.04)}.performance i{width:5px;height:5px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)}.performance.danger{color:#ffbd66;border-color:rgba(255,189,102,.25)}.performance.danger i{background:#ffbd66;box-shadow:0 0 8px #ffbd66}
.command-grid{display:grid;grid-template-columns:.75fr 1.55fr .75fr;gap:12px;margin-top:12px}.column{display:flex;flex-direction:column;gap:12px}.hud-card{background:linear-gradient(145deg,rgba(7,18,26,.94),rgba(3,10,16,.94));border:1px solid var(--line);border-radius:12px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.16)}.hud-card>.card-top{display:flex;justify-content:space-between;padding:15px 16px 0}.card-top b{font:500 8px 'DM Mono';color:#31495b}.kpi-card{padding-bottom:3px}.kpi-card>strong{display:block;font:500 29px 'DM Mono';color:var(--green);padding:14px 16px 0}.kpi-card>small{display:block;padding:3px 16px;color:#4e697a;font:500 8px 'DM Mono';letter-spacing:.1em}.metric-list{padding-bottom:8px}.metric{margin:12px 15px 0;padding:9px 0;border-top:1px solid rgba(93,139,170,.09);display:flex;justify-content:space-between}.metric span{font:500 8px 'DM Mono';color:#597285}.metric b{font:500 13px 'DM Mono';color:#c8d9e2}.chart-card{padding-bottom:4px}.chart-card h2,.intelligence h2{font-size:16px;margin:7px 16px 3px}.chart-card>p{margin:0 16px;color:#50687a;font-size:9px}.intelligence{padding-bottom:15px;position:relative}.ai-orb{width:45px;height:45px;margin:14px 16px 0;border-radius:12px;border:1px solid rgba(39,133,255,.3);background:radial-gradient(circle,rgba(39,133,255,.25),rgba(47,245,154,.05));display:grid;place-items:center;color:#73b2ff;box-shadow:0 0 24px rgba(39,133,255,.1)}.ai-orb span{font-size:20px}.intelligence p{margin:0 16px;color:#708797;font-size:9px;line-height:1.7}.ai-line{display:flex;gap:7px;align-items:center;margin:14px 16px 0;font:500 7px 'DM Mono';color:#3f6274}.ai-line i{width:5px;height:5px;border-radius:50%;background:var(--blue);box-shadow:0 0 8px var(--blue)}.access{padding-bottom:8px}.access button{width:calc(100% - 24px);margin:9px 12px 0;padding:11px;border:1px solid rgba(93,139,170,.12);background:rgba(255,255,255,.015);border-radius:8px;color:#9bb0bd;display:flex;align-items:center;gap:9px;text-align:left;cursor:pointer}.access button:hover{border-color:rgba(47,245,154,.3);background:rgba(47,245,154,.035)}.access button>span{font-size:16px;color:var(--green)}.access button div{flex:1}.access button b{display:block;font:600 8px 'DM Mono';color:#a9bec9}.access button small{display:block;margin-top:3px;font-size:8px;color:#4e6879}.access em{font-style:normal;color:#4c6879}.secondary-grid{display:grid;grid-template-columns:1fr 1.35fr;gap:12px;margin-top:12px}.wide{min-height:120px}.wide>h2{font-size:15px;margin:7px 18px}.secondary-grid :deep(.rg-root),.secondary-grid :deep(.ir-root),.secondary-grid :deep(.ag-root){margin-top:8px;background:transparent!important}.secondary-grid :deep(.rg-header),.secondary-grid :deep(.rg-divider){display:none!important}.secondary-grid :deep(.rg-chart){padding-top:0!important}.secondary-grid :deep(.ir-root){border:0!important}.secondary-grid :deep(.ir-header){background:rgba(255,255,255,.02)!important;color:#b7c8d1!important;border-color:var(--line)!important}.secondary-grid :deep(.ir-title),.secondary-grid :deep(.ir-item-nome){color:#b7c8d1!important}.secondary-grid :deep(.ag-header){display:none!important}.secondary-grid :deep(.ag-body){padding-top:4px!important}.lucentis-home footer{display:flex;justify-content:space-between;padding:18px 2px 0;color:#3d5969;font:500 8px 'DM Mono'}.lucentis-home footer b{color:var(--green)}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{transform:translate(-50%,-50%) scale(.96);opacity:.55}50%{transform:translate(-50%,-50%) scale(1.03);opacity:1}}@keyframes breathe{0%,100%{transform:translate(-50%,-50%) scale(.92);opacity:.6}50%{transform:translate(-50%,-50%) scale(1.08);opacity:1}}@keyframes travel{0%{left:0;opacity:0}10%{opacity:1}90%{opacity:1}100%{left:100%;opacity:0}}
@media(max-width:1150px){.command-grid{grid-template-columns:1fr 1.5fr}.command-grid>.column:last-child{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr}.top-actions .live{display:none}}@media(max-width:800px){.startup-grid{grid-template-columns:1fr}.startup-intel{align-items:flex-start}.startup-intel button{display:none}.topbar{height:auto;padding:14px 16px;align-items:flex-start}.top-actions{flex-wrap:wrap;justify-content:flex-end}.identity h1{font-size:14px}.command{padding:12px}.energy-stage{height:380px}.energy-visual{transform:translateX(-50%) scale(.75)}.command-grid,.secondary-grid{grid-template-columns:1fr}.command-grid>.column:last-child{display:flex}.energy-main-readout{bottom:16px}.stage-label{display:none}}@media(max-width:520px){.top-btn.primary{display:none}.identity small{display:none}.energy-main-readout strong{font-size:24px}.energy-visual{transform:translateX(-50%) scale(.62)}}
</style>