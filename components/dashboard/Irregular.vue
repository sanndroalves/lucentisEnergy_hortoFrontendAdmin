<script setup>
import { computed } from 'vue'
import { API_BASE_URL } from '~/base/link'

const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`)
const { data: projecoes } = await useFetch(`${API_BASE_URL}/projecaogeracao`)
const { data: geracoes } = await useFetch(`${API_BASE_URL}/relatoriogeracao`)

const arr = v => Array.isArray(v) ? v : []
const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const alertas = computed(() => {
  const p = arr(projecoes.value), g = arr(geracoes.value)
  return arr(usinas.value).map(usina => {
    const porMes = [...new Set(g.filter(x => Number(x.idGeradora) === Number(usina.id) && Number(x.geracao) > 0).map(x => Number(x.ano)*100+Number(x.mes)))]
      .sort((a,b) => b-a)
      .slice(0, 3)
    if (porMes.length < 3) return null
    const deficits = porMes.filter(chave => {
      const ano = Math.floor(chave/100), mes = chave%100
      const real = g.filter(x => Number(x.idGeradora)===Number(usina.id) && Number(x.ano)===ano && Number(x.mes)===mes).reduce((s,x)=>s+(Number(x.geracao)||0),0)
      const proj = p.filter(x => Number(x.idGeradora)===Number(usina.id) && Number(x.ano)===ano && Number(x.mes)===mes).reduce((s,x)=>s+(Number(x.projecao)||0),0)
      return proj > 0 && real < proj
    })
    if (deficits.length < 3) return null
    return { id:usina.id, uc:usina.uc, nome:usina.nome, meses:deficits.map(x=>meses[x%100-1]) }
  }).filter(Boolean)
})

const titulo = computed(() => alertas.value.length ? 'Usinas em atenção' : 'Sistema sem déficits persistentes')
</script>

<template>
  <div class="ir-root">
    <div class="ir-head"><div><span>ANOMALY DETECTION</span><h3>{{ titulo }}</h3><small>Comparação automática dos 3 últimos períodos reais disponíveis</small></div><b>{{ alertas.length }}</b></div>
    <div v-if="!alertas.length" class="ir-ok"><i>✓</i><div><strong>Nenhuma anomalia persistente detectada</strong><small>O núcleo analisou os períodos reais disponíveis sem alterar nenhum dado.</small></div></div>
    <div v-for="item in alertas" :key="item.id" class="ir-item"><div class="warn">!</div><div><small>{{ item.uc || 'USINA' }}</small><strong>{{ item.nome || 'Usina sem nome' }}</strong><em>Déficit em {{ item.meses.join(' · ') }}</em></div><span>ATENÇÃO</span></div>
  </div>
</template>

<style>
.ir-root{font-family:'Plus Jakarta Sans',sans-serif;color:#c9d8df}.ir-head{display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px;border-bottom:1px solid rgba(93,139,170,.12)}.ir-head span{font:500 8px 'DM Mono';letter-spacing:.16em;color:#668296}.ir-head h3{margin:5px 0 3px;font-size:14px}.ir-head small{font-size:8px;color:#50697a}.ir-head>b{font:500 16px 'DM Mono';color:#ffbd66}.ir-ok{margin:12px;padding:13px;border:1px solid rgba(47,245,154,.15);background:rgba(47,245,154,.035);border-radius:8px;display:flex;gap:10px}.ir-ok i{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:rgba(47,245,154,.1);color:#2ff59a;font-style:normal}.ir-ok strong,.ir-ok small{display:block}.ir-ok strong{font-size:9px}.ir-ok small{font-size:8px;color:#587182;margin-top:3px}.ir-item{display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid rgba(93,139,170,.08)}.warn{width:27px;height:27px;border-radius:7px;display:grid;place-items:center;color:#ffbd66;background:rgba(255,189,102,.08);border:1px solid rgba(255,189,102,.16);font-weight:800}.ir-item div:nth-child(2){flex:1}.ir-item small,.ir-item strong,.ir-item em{display:block}.ir-item small{font:500 7px 'DM Mono';color:#50697a}.ir-item strong{font-size:10px;margin:2px 0}.ir-item em{font-size:8px;color:#708797;font-style:normal}.ir-item>span{font:500 7px 'DM Mono';color:#ffbd66}
</style>