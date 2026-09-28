<script setup>
import { computed, ref } from 'vue'
import { API_BASE_URL } from '~/base/link'

const { data: projecoes } = await useFetch(`${API_BASE_URL}/projecaogeracao`)
const { data: geracoes } = await useFetch(`${API_BASE_URL}/relatoriogeracao`)
const arr=v=>Array.isArray(v)?v:[]
const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const anos=computed(()=>[...new Set([...arr(geracoes.value),...arr(projecoes.value)].map(x=>Number(x.ano)).filter(Boolean))].sort((a,b)=>b-a))
const select=ref(new Date().getFullYear())

const periodoReal=computed(()=>{
  const itens=arr(geracoes.value).filter(x=>Number(x.geracao)>0&&Number(x.ano)>0&&Number(x.mes)>0)
  const chave=[...new Set(itens.map(x=>Number(x.ano)*100+Number(x.mes)))].sort((a,b)=>b-a)[0]
  return chave?{ano:Math.floor(chave/100),mes:chave%100}:null
})
const anoExibicao=computed(()=>Number(select.value)||periodoReal.value?.ano||new Date().getFullYear())
const seriesPorMes=(items,campo)=>Array.from({length:12},(_,i)=>arr(items).filter(x=>Number(x.ano)===anoExibicao.value&&Number(x.mes)===i+1).reduce((s,x)=>s+(Number(x[campo])||0),0))
const real=computed(()=>seriesPorMes(geracoes.value,'geracao'))
const proj=computed(()=>seriesPorMes(projecoes.value,'projecao'))
const totalReal=computed(()=>real.value.reduce((a,b)=>a+b,0))
const totalProj=computed(()=>proj.value.reduce((a,b)=>a+b,0))
const eficiencia=computed(()=>totalProj.value?totalReal.value/totalProj.value*100:null)
const options=computed(()=>({chart:{type:'bar',toolbar:{show:false},background:'transparent',fontFamily:'DM Mono'},plotOptions:{bar:{columnWidth:'48%',borderRadius:4}},colors:['#2785ff','#2ff59a'],dataLabels:{enabled:false},grid:{borderColor:'rgba(93,139,170,.12)',strokeDashArray:3},xaxis:{categories:meses,labels:{style:{colors:'#61758b',fontSize:'9px'}},axisBorder:{show:false},axisTicks:{show:false}},yaxis:{labels:{style:{colors:'#61758b',fontSize:'9px'},formatter:v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}},legend:{labels:{colors:'#9bb0c5'},fontSize:'9px'},tooltip:{theme:'dark',y:{formatter:v=>`${Number(v).toLocaleString('pt-BR')} kWh`}}}))
const series=computed(()=>[{name:'PROJEÇÃO',data:proj.value},{name:'REAL',data:real.value}])
const ultimo= computed(()=>periodoReal.value&&periodoReal.value.ano===anoExibicao.value?real.value[periodoReal.value.mes-1]:null)
const format=v=>Number(v||0).toLocaleString('pt-BR')
</script>

<template>
<div class="rg-root">
  <div class="rg-head"><div><span>GENERATION TELEMETRY</span><h3>Relatório de geração</h3><small>Último período real: <b>{{periodoReal?meses[periodoReal.mes-1]+' / '+periodoReal.ano:'—'}}</b></small></div><select v-model="select"><option v-for="ano in anos" :key="ano" :value="ano">{{ano}}</option></select></div>
  <div class="rg-kpis"><div><small>REAL</small><strong>{{format(totalReal/1000)}} MWh</strong></div><div><small>PROJEÇÃO</small><strong>{{format(totalProj/1000)}} MWh</strong></div><div><small>EFICIÊNCIA</small><strong>{{eficiencia==null?'—':eficiencia.toFixed(1)+'%'}}</strong></div><div><small>ÚLTIMO REAL</small><strong>{{ultimo==null?'—':format(ultimo/1000)+' MWh'}}</strong></div></div>
  <apexchart type="bar" height="250" :options="options" :series="series"/>
</div>
</template>

<style>
.rg-root{font-family:'Plus Jakarta Sans',sans-serif;color:#c9d8df}.rg-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:14px 16px 10px;border-bottom:1px solid rgba(93,139,170,.12)}.rg-head span{font:500 8px 'DM Mono';letter-spacing:.16em;color:#668296}.rg-head h3{margin:5px 0 3px;font-size:14px}.rg-head small{font-size:8px;color:#50697a}.rg-head b{color:#91adbd}.rg-head select{background:#07131c;color:#a9bec9;border:1px solid rgba(93,139,170,.2);border-radius:6px;padding:7px 10px;font:500 9px 'DM Mono'}.rg-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 16px}.rg-kpis div{padding:9px;background:rgba(255,255,255,.018);border:1px solid rgba(93,139,170,.09);border-radius:7px}.rg-kpis small{display:block;font:500 7px 'DM Mono';color:#50697a}.rg-kpis strong{display:block;margin-top:4px;font:500 12px 'DM Mono';color:#d9e6ec}.rg-kpis div:nth-child(3) strong{color:#2ff59a}.rg-kpis div:nth-child(4) strong{color:#2785ff}
@media(max-width:600px){.rg-kpis{grid-template-columns:1fr 1fr}}
</style>