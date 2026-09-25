<script setup>
import { computed, ref } from 'vue'
import { useHead } from '@vueuse/head'
import { API_BASE_URL } from '~/base/link'
import RelatorioGeracao from '~~/components/dashboard/RelatorioGeracao.vue'
import AnaliseGeracao from '~~/components/dashboard/AnaliseGeracao.vue'
import GeracaoDinheiro from '@/components/dashboard/GeracaoDinheiro.vue'
import { defineAsyncComponent } from 'vue'

const Irregular = defineAsyncComponent(() => import('@/components/dashboard/Irregular.vue'))
useHead({ title: 'Centro de Operações Energéticas' })
definePageMeta({ middleware: 'sidebase-auth' })

const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`)
const { data: unidades } = await useFetch(`${API_BASE_URL}/unidadecompensacao`)
const { data: relatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`)
const { data: manutencoes } = await useFetch(`${API_BASE_URL}/manutencao/`)
const { data: projecoesGeracao } = await useFetch(`${API_BASE_URL}/projecaogeracao`)
const { data: relatoriosGeracao } = await useFetch(`${API_BASE_URL}/relatoriogeracao`)

const modoExecutivo = ref(false)
const lista = v => Array.isArray(v) ? v : []
const listaUsinas = computed(() => lista(usinas.value))
const listaUnidades = computed(() => lista(unidades.value))
const listaRelatorios = computed(() => lista(relatorios.value))
const listaManutencoes = computed(() => lista(manutencoes.value))
const listaProjecoes = computed(() => lista(projecoesGeracao.value))
const listaGeracao = computed(() => lista(relatoriosGeracao.value))

const valorIluminacao = computed(() => listaUnidades.value.filter(i => i.secretaria === 'I' || i.secretaria === 'P'))
const valoresPredios = computed(() => listaUnidades.value.filter(i => ['E','S','O'].includes(i.secretaria) && i.status === 'L'))
const valoresCompensacao = computed(() => listaUnidades.value.filter(i => i.status === 'L'))

const anoAtual = new Date().getFullYear()
const mesAtual = new Date().getMonth() + 1
const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const porMes = (items, campo) => {
  const values = Array(12).fill(0)
  items.filter(i => Number(i.ano) === anoAtual).forEach(i => {
    const mes = Number(i.mes)
    if (mes >= 1 && mes <= 12) values[mes - 1] += Number(i[campo]) || 0
  })
  return values
}
const geracaoMensal = computed(() => porMes(listaGeracao.value, 'geracao'))
const projecaoMensal = computed(() => porMes(listaProjecoes.value, 'projecao'))
const totalGerado = computed(() => geracaoMensal.value.reduce((a,b) => a+b, 0))
const totalProjetado = computed(() => projecaoMensal.value.reduce((a,b) => a+b, 0))
const eficiencia = computed(() => totalProjetado.value ? totalGerado.value / totalProjetado.value * 100 : null)
const ultimoIndice = computed(() => {
  for (let i = Math.min(mesAtual, 12) - 1; i >= 0; i--) if (geracaoMensal.value[i] > 0) return i
  return -1
})
const ultimoMes = computed(() => ultimoIndice.value >= 0 ? geracaoMensal.value[ultimoIndice.value] : 0)
const projecaoUltimo = computed(() => ultimoIndice.value >= 0 ? projecaoMensal.value[ultimoIndice.value] : 0)
const eficienciaUltimo = computed(() => projecaoUltimo.value ? ultimoMes.value / projecaoUltimo.value * 100 : null)

const format = (v, d=0) => Number.isFinite(Number(v)) ? Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}) : '—'
const mwh = v => `${format(Number(v||0)/1000, Number(v||0) >= 100000 ? 0 : 1)} MWh`
const pct = v => v == null ? '—' : `${format(v,1)}%`

const manutencoesAtivas = computed(() => listaManutencoes.value.filter(i => {
  const s = String(i.status || i.situacao || '').toLowerCase()
  return s && !['concluida','concluído','concluida','finalizada','finalizado','encerrada','encerrado'].includes(s)
}).length)

const chartOptions = computed(() => ({
  chart:{type:'area',toolbar:{show:false},zoom:{enabled:false},fontFamily:'Plus Jakarta Sans, sans-serif',foreColor:'#718096',background:'transparent'},
  colors:['#20d47a','#3182ff'],stroke:{curve:'smooth',width:[3,2],dashArray:[0,5]},
  fill:{type:'gradient',gradient:{shadeIntensity:1,opacityFrom:.28,opacityTo:.02,stops:[0,95,100]}},
  grid:{borderColor:'rgba(255,255,255,.07)',strokeDashArray:4},
  dataLabels:{enabled:false},markers:{size:0,hover:{size:5}},
  xaxis:{categories:meses,axisBorder:{show:false},axisTicks:{show:false},labels:{style:{colors:'#718096',fontSize:'10px'}}},
  yaxis:{labels:{style:{colors:'#718096',fontSize:'10px'},formatter:v=>mwh(v)}},
  legend:{position:'top',horizontalAlign:'right',labels:{colors:'#a9b4c5'},fontSize:'11px',fontWeight:700},
  tooltip:{theme:'dark',y:{formatter:v=>format(v)+' kWh'}}
}))
const chartSeries = computed(() => [
  {name:'Geração real',data:geracaoMensal.value},
  {name:'Projeção',data:projecaoMensal.value}
])
const sparkOptions = {
  chart:{type:'area',sparkline:{enabled:true}},stroke:{curve:'smooth',width:2},
  fill:{type:'gradient',gradient:{opacityFrom:.22,opacityTo:.01}},colors:['#20d47a'],tooltip:{enabled:false}
}
</script>

<template>
<div class="ops-root">
  <div class="ops-grid"></div>
  <header class="ops-header">
    <div class="brand">
      <div class="brand-mark">⚡</div>
      <div><span>LUCENTIS / ENERGY OPERATIONS</span><h1>Centro de Operações Energéticas</h1><p>Hortolândia · Monitoramento municipal</p></div>
    </div>
    <div class="header-actions">
      <div class="system"><i></i><strong>OPERACIONAL</strong><small>dados sincronizados</small></div>
      <button class="mode" :class="{active:modoExecutivo}" @click="modoExecutivo=!modoExecutivo">▣ {{ modoExecutivo ? 'Visão operacional' : 'Visão executiva' }}</button>
    </div>
  </header>

  <main class="content">
    <section class="hero">
      <div class="panel hero-main">
        <span class="kicker">VISÃO ENERGÉTICA MUNICIPAL</span>
        <div class="hero-copy">
          <div><h2>Infraestrutura energética<br><em>sob monitoramento.</em></h2><p>Visão consolidada da geração fotovoltaica e das unidades de compensação do município.</p></div>
          <div class="orb">⚡</div>
        </div>
        <div class="hero-strip">
          <div><span>USINAS</span><b>{{listaUsinas.length}}</b></div>
          <div><span>UNIDADES</span><b>{{valoresCompensacao.length}}</b></div>
          <div><span>INFRAESTRUTURA</span><b>{{listaUsinas.length + valorIluminacao.length + valoresPredios.length}}</b></div>
          <div><span>RELATÓRIOS</span><b>{{listaRelatorios.length}}</b></div>
        </div>
      </div>
      <div class="panel hero-kpi">
        <span class="kicker">GERAÇÃO ACUMULADA · {{anoAtual}}</span>
        <strong>{{mwh(totalGerado)}}</strong>
        <div class="meta"><span>● DADOS REAIS</span><small>{{pct(eficiencia)}} da projeção</small></div>
        <apexchart type="area" height="72" :options="sparkOptions" :series="[{name:'Geração',data:geracaoMensal}]" />
        <footer><small>ÚLTIMO MÊS</small><b>{{ultimoIndice>=0?meses[ultimoIndice]:'—'}} · {{mwh(ultimoMes)}}</b></footer>
      </div>
    </section>

    <section class="metrics">
      <article><i class="blue">⚡</i><span>Usinas fotovoltaicas</span><b>{{listaUsinas.length}}</b><small>ativas no cadastro</small></article>
      <article><i class="green">☼</i><span>Iluminação pública</span><b>{{valorIluminacao.length}}</b><small>unidades monitoradas</small></article>
      <article><i class="cyan">▦</i><span>Prédios públicos</span><b>{{valoresPredios.length}}</b><small>unidades ativas</small></article>
      <article><i class="violet">◎</i><span>Compensação</span><b>{{valoresCompensacao.length}}</b><small>unidades vinculadas</small></article>
      <article><i class="amber">↗</i><span>Eficiência anual</span><b>{{pct(eficiencia)}}</b><small>real × projetado</small></article>
      <article><i class="red">◉</i><span>Manutenções</span><b>{{manutencoesAtivas}}</b><small>registros ativos</small></article>
    </section>

    <section class="main-grid">
      <div class="panel chart">
        <div class="panel-head"><div><span class="kicker">PERFORMANCE / {{anoAtual}}</span><h3>Geração real × projeção</h3><p>Desempenho mensal das usinas cadastradas.</p></div><div class="stat"><small>ÚLTIMO MÊS</small><b>{{mwh(ultimoMes)}}</b><span>{{pct(eficienciaUltimo)}} da projeção</span></div></div>
        <apexchart type="area" height="310" :options="chartOptions" :series="chartSeries" />
      </div>

      <div class="side">
        <div class="panel status">
          <div class="panel-head"><div><span class="kicker">STATUS OPERACIONAL</span><h3>Estado da infraestrutura</h3></div><label>● LIVE</label></div>
          <div class="status-center"><div><strong>{{listaUsinas.length}}</strong><small>USINAS</small></div><p>Infraestrutura cadastrada e disponível para acompanhamento operacional.</p></div>
          <ul><li><i class="green-dot"></i>Usinas cadastradas <b>{{listaUsinas.length}}</b></li><li><i class="blue-dot"></i>Unidades compensação <b>{{valoresCompensacao.length}}</b></li><li><i class="amber-dot"></i>Manutenções <b>{{listaManutencoes.length}}</b></li><li><i class="violet-dot"></i>Relatórios <b>{{listaRelatorios.length}}</b></li></ul>
        </div>
        <div class="panel quick"><span class="kicker">INDICADORES DO SISTEMA</span><div class="quick-row"><div><small>GERAÇÃO</small><b>{{format(totalGerado)}} kWh</b></div><div><small>PROJEÇÃO</small><b>{{format(totalProjetado)}} kWh</b></div></div><div class="progress-label"><small>Execução da projeção anual</small><b>{{pct(eficiencia)}}</b></div><div class="track"><i :style="{width:`${Math.min(eficiencia||0,100)}%`}"></i></div></div>
      </div>
    </section>

    <section class="modules">
      <div class="panel module"><div class="panel-title"><span class="kicker">IMPACTO FINANCEIRO</span><h3>Compensação energética</h3></div><GeracaoDinheiro /></div>
      <div class="panel module"><div class="panel-title"><span class="kicker">DESEMPENHO ANUAL</span><h3>Relatório de geração</h3></div><RelatorioGeracao /></div>
    </section>

    <section v-if="!modoExecutivo" class="details">
      <div class="panel module"><div class="panel-title"><span class="kicker">ANÁLISE OPERACIONAL</span><h3>Desempenho energético</h3></div><AnaliseGeracao /></div>
      <div class="panel module"><div class="panel-title"><span class="kicker">ALERTAS / ANOMALIAS</span><h3>Ocorrências do sistema</h3></div><Suspense><template #default><Irregular /></template><template #fallback><div class="loading">Carregando análise...</div></template></Suspense></div>
    </section>

    <footer class="footer"><span><b>LUCENTIS</b> · Centro de Operações Energéticas</span><span>{{anoAtual}} · Hortolândia</span></footer>
  </main>
</div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.ops-root{min-height:100vh!important;background:#050a11!important;color:#eef4fa!important;font-family:'Plus Jakarta Sans',sans-serif!important;position:relative!important;overflow:hidden!important;padding-bottom:35px!important}
.ops-grid{position:absolute;inset:0;pointer-events:none;opacity:.24;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:44px 44px;mask-image:linear-gradient(#000,transparent 75%)}
.ops-header,.content{position:relative;z-index:1}.ops-header{min-height:78px;padding:17px 30px;border-bottom:1px solid rgba(126,156,190,.14);background:rgba(5,10,17,.9);backdrop-filter:blur(16px);display:flex;justify-content:space-between;align-items:center;gap:20px}
.brand{display:flex;align-items:center;gap:13px}.brand-mark{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;color:#07110c;background:linear-gradient(135deg,#20d47a,#5eead4);box-shadow:0 0 30px rgba(32,212,122,.18)}.brand span,.kicker{font-size:9px;letter-spacing:.14em;font-weight:800;color:#6d8197}.brand h1{margin:3px 0 2px;font-size:18px;letter-spacing:-.03em}.brand p{margin:0;color:#718096;font-size:11px}
.header-actions{display:flex;align-items:center;gap:14px}.system{padding-right:14px;border-right:1px solid rgba(126,156,190,.14);font-size:10px}.system i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#20d47a;box-shadow:0 0 10px #20d47a;margin-right:6px}.system strong{color:#20d47a}.system small{display:block;color:#607387;margin:4px 0 0 14px}.mode{border:1px solid rgba(49,130,255,.3);background:rgba(49,130,255,.08);color:#8eb9ff;border-radius:9px;padding:9px 12px;cursor:pointer;font:700 10px 'Plus Jakarta Sans'}.mode.active,.mode:hover{background:rgba(49,130,255,.16)}
.content{max-width:1540px;margin:auto;padding:24px 30px}.hero{display:grid;grid-template-columns:1.55fr .75fr;gap:14px}.panel{background:linear-gradient(145deg,rgba(12,22,35,.96),rgba(7,14,23,.92));border:1px solid rgba(126,156,190,.14);border-radius:15px;box-shadow:0 16px 45px rgba(0,0,0,.18);overflow:hidden}
.hero-main{min-height:240px;padding:24px}.hero-copy{display:flex;justify-content:space-between;align-items:center;min-height:135px}.hero-copy h2{margin:0;font-size:31px;line-height:1.08;letter-spacing:-.045em}.hero-copy em{font-style:normal;color:#20d47a}.hero-copy p{max-width:570px;margin:12px 0 0;color:#77879a;font-size:12px;line-height:1.7}.orb{width:145px;height:145px;flex:0 0 145px;border:1px solid rgba(32,212,122,.2);border-radius:50%;display:grid;place-items:center;color:#20d47a;font-size:29px;background:radial-gradient(circle,rgba(32,212,122,.16),transparent 65%);box-shadow:0 0 55px rgba(32,212,122,.1)}
.hero-strip{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(126,156,190,.14);padding-top:16px}.hero-strip div{padding:0 15px;border-right:1px solid rgba(126,156,190,.14)}.hero-strip div:first-child{padding-left:0}.hero-strip div:last-child{border:0}.hero-strip span,.hero-kpi footer small{display:block;font-size:8px;letter-spacing:.12em;color:#607387;font-weight:800}.hero-strip b{display:block;margin-top:4px;font-size:18px}
.hero-kpi{padding:22px;display:flex;flex-direction:column;justify-content:space-between;min-height:240px}.hero-kpi>strong{font:500 36px 'DM Mono';color:#20d47a;letter-spacing:-.05em;margin-top:12px}.meta{display:flex;gap:10px;align-items:center}.meta span{font-size:8px;font-weight:800;color:#20d47a;background:rgba(32,212,122,.08);padding:4px 7px;border-radius:5px}.meta small{color:#708196;font-size:9px}.hero-kpi footer{display:flex;justify-content:space-between;border-top:1px solid rgba(126,156,190,.14);padding-top:11px}.hero-kpi footer b{font-size:10px;color:#aebdcc;text-align:right}
.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:14px}.metrics article{position:relative;min-height:125px;padding:15px;background:rgba(10,19,30,.8);border:1px solid rgba(126,156,190,.14);border-radius:12px;overflow:hidden}.metrics article:after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--c)}.metrics i{width:27px;height:27px;border-radius:7px;display:grid;place-items:center;font-style:normal;margin-bottom:12px;background:rgba(255,255,255,.05);color:var(--c)}.metrics .blue{--c:#3182ff}.metrics .green{--c:#20d47a}.metrics .cyan{--c:#22d3ee}.metrics .violet{--c:#9b8cff}.metrics .amber{--c:#f4b942}.metrics .red{--c:#ff647c}.metrics article>span{display:block;color:#6f8195;font-size:8px;text-transform:uppercase;letter-spacing:.09em;font-weight:800}.metrics article>b{display:block;margin-top:5px;font-size:25px;letter-spacing:-.04em}.metrics article>small{display:block;margin-top:5px;color:#55677b;font-size:9px}
.main-grid{display:grid;grid-template-columns:1.6fr .65fr;gap:14px;margin-top:14px}.panel-head{padding:20px 21px 5px;display:flex;justify-content:space-between;gap:16px}.panel-head h3,.panel-title h3{margin:5px 0 3px;font-size:15px}.panel-head p{margin:0;color:#65778b;font-size:10px}.stat{text-align:right}.stat small{font-size:8px;color:#607387}.stat b{display:block;color:#20d47a;font:500 16px 'DM Mono';margin:3px 0}.stat span{font-size:9px;color:#718096}.side{display:flex;flex-direction:column;gap:14px}.status{flex:1}.panel-head label{font-size:8px;color:#20d47a;font-weight:800}.status-center{display:flex;align-items:center;gap:14px;padding:4px 19px 17px;border-bottom:1px solid rgba(126,156,190,.14)}.status-center>div{width:80px;height:80px;border:1px solid rgba(32,212,122,.26);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(32,212,122,.11),transparent 65%);flex-shrink:0}.status-center strong{font:500 25px 'DM Mono';color:#20d47a}.status-center small{font-size:7px;color:#5e7287}.status-center p{font-size:9px;color:#64778b;line-height:1.5}.status ul{list-style:none;padding:7px 19px 13px;margin:0}.status li{display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(126,156,190,.07);color:#718296;font-size:9px}.status li:last-child{border:0}.status li b{margin-left:auto;color:#cdd8e3;font:500 10px 'DM Mono'}.status li i{width:5px;height:5px;border-radius:50%;margin-top:4px}.green-dot{background:#20d47a}.blue-dot{background:#3182ff}.amber-dot{background:#f4b942}.violet-dot{background:#9b8cff}
.quick{padding:18px 19px}.quick-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.quick-row div{padding:10px;background:rgba(255,255,255,.018);border:1px solid rgba(126,156,190,.08);border-radius:8px}.quick-row small,.progress-label small{display:block;color:#607387;font-size:8px;letter-spacing:.08em;font-weight:800}.quick-row b{display:block;color:#dbe6ef;font:500 11px 'DM Mono';margin-top:4px}.progress-label{display:flex;justify-content:space-between}.progress-label b{color:#20d47a;font:500 10px 'DM Mono'}.track{height:5px;background:#101d2c;border-radius:5px;overflow:hidden;margin-top:7px}.track i{display:block;height:100%;background:linear-gradient(90deg,#3182ff,#20d47a);border-radius:5px}
.modules,.details{display:grid;grid-template-columns:1fr 1.4fr;gap:14px;margin-top:14px}.details{grid-template-columns:1fr 1fr}.module-title,.panel-title{padding:18px 19px 0}.loading{padding:35px;text-align:center;color:#64778b;font-size:10px}.footer{display:flex;justify-content:space-between;padding:20px 2px 0;color:#4d6074;font-size:9px}.footer b{color:#20d47a}
@media(max-width:1200px){.hero,.main-grid{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(3,1fr)}}
@media(max-width:800px){.ops-header{padding:15px 18px;align-items:flex-start}.content{padding:16px}.header-actions{flex-wrap:wrap;justify-content:flex-end}.metrics,.modules,.details{grid-template-columns:1fr 1fr}.hero-copy h2{font-size:25px}.orb{width:105px;height:105px;flex-basis:105px}.hero-strip{grid-template-columns:repeat(2,1fr);gap:12px}.hero-strip div:nth-child(2){border-right:0}}
@media(max-width:560px){.ops-header{flex-direction:column}.system{display:none}.metrics,.modules,.details{grid-template-columns:1fr 1fr}.hero-copy h2{font-size:22px}.orb{display:none}.panel-head{flex-direction:column}.stat{text-align:left}.footer{flex-direction:column;gap:5px}}
</style>