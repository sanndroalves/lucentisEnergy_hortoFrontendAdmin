<script setup>
// Ações fixas do topo em todas as páginas: marca (opcional), perfil,
// notificação de contas faltando e clima/previsão de geração.
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useClimaHoje } from '~/composables/useClimaHoje';
import { useContasFaltando } from '~/composables/useContasFaltando';
import { useEnergyFormat } from '~/composables/useEnergyFormat';

defineProps({ marca: { type: Boolean, default: true } });

const route = useRoute();
const { numero } = useEnergyFormat();
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_LONGO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// avisos automáticos aparecem uma vez por sessão, não a cada página
const vistos = useState('lx-avisos-vistos', () => ({ clima: false, contas: false }));

// ─── Contas faltando ───
const { garantir, contas: contasFaltando, potenciaKwp } = useContasFaltando();
const contasAberto = ref(false);
let contasTimer, timerContas;
function mostrarContas() {
  contasAberto.value = true;
  clearTimeout(contasTimer);
  contasTimer = setTimeout(() => { contasAberto.value = false; }, 15000);
}
const alternarContas = () => (contasAberto.value ? (contasAberto.value = false) : mostrarContas());
const irRelatorios = () => { contasAberto.value = false; navigateTo('/relatorios/'); };

// ─── Clima ───
const clima = useClimaHoje();
const pushAberto = ref(false);
const gaugeW = ref(0);
let pushTimer, timerClima;
const NIVEL = {
  alta: { lv: 'Ótima', c: '--green' },
  media: { lv: 'Moderada', c: '--orange' },
  baixa: { lv: 'Baixa', c: '--red' },
};
const climaInfo = computed(() => {
  const p = clima.previsao.value;
  const n = NIVEL[clima.nivel.value] ?? { lv: '—', c: '--mut' };
  const rad = clima.radiacaoKwh.value;
  // estimativa: potência instalada (kWp) × horas de sol pleno × PR 0,75
  const estimado = rad != null && potenciaKwp.value ? (potenciaKwp.value * rad * 0.75) / 1000 : null;
  return {
    ...n,
    icone: clima.tempo.value.icone,
    titulo: p ? `${clima.tempo.value.texto}${p.tMax != null ? `, ${numero(p.tMax, 0)} °C` : ''}` : '',
    chuva: p?.chuvaPct,
    w: rad != null ? Math.min(100, Math.round((rad / 7.2) * 100)) : 0,
    rad: rad != null ? numero(rad, 1) : '—',
    estimado: estimado != null ? numero(estimado, 1) : '—',
  };
});
function mostrarClima() {
  pushAberto.value = true;
  gaugeW.value = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => { gaugeW.value = climaInfo.value.w; }));
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushAberto.value = false; }, 11000);
}
const alternarClima = () => (pushAberto.value ? (pushAberto.value = false) : mostrarClima());

// recarrega a varredura ao trocar de página (respeita o cache de 5 min)
watch(() => route.path, () => garantir());

onMounted(async () => {
  clima.carregar();
  if (!vistos.value.clima) {
    vistos.value.clima = true;
    timerClima = setTimeout(mostrarClima, 1500);
  }
  await garantir();
  if (!vistos.value.contas && contasFaltando.value.total) {
    vistos.value.contas = true;
    timerContas = setTimeout(mostrarContas, 3000);
  }
});
onBeforeUnmount(() => {
  clearTimeout(pushTimer); clearTimeout(timerClima);
  clearTimeout(contasTimer); clearTimeout(timerContas);
});
</script>

<template>
  <NuxtLink v-if="marca" to="/" class="lxt-marca" aria-label="Ir para o Início">
    <img src="https://i.imgur.com/gMx96Fc.png" alt="LUCENTIS">
  </NuxtLink>

  <div class="lxt-perfil"><LayoutFullVerticalHeaderProfileDD /></div>
  <button class="lxt-bell lxt-contas" :aria-label="`Contas faltando: ${contasFaltando.total}`"
    :style="{ '--pc': contasFaltando.total ? 'var(--red)' : 'var(--green)' }" @click="alternarContas">
    📋<span v-if="contasFaltando.total" class="lxt-badge">{{ contasFaltando.total > 99 ? '99+' : contasFaltando.total }}</span><i v-else></i>
  </button>
  <button class="lxt-bell" aria-label="Clima de hoje e previsão de geração" :style="{ '--pc': `var(${climaInfo.c})` }" @click="alternarClima">🔔<i></i></button>

  <div class="lxt-notifs">
    <Transition name="lxt-slide">
      <div v-if="contasAberto" class="lxt-push" role="status" :style="{ '--pc': contasFaltando.total ? 'var(--orange)' : 'var(--green)' }">
        <div class="lxt-ph">
          <span>{{ !contasFaltando.pronto ? '⏳' : contasFaltando.total ? '📋' : '✅' }}</span>
          <strong v-if="!contasFaltando.pronto">Verificando contas…</strong>
          <strong v-else-if="contasFaltando.total">{{ numero(contasFaltando.total) }} {{ contasFaltando.total === 1 ? 'conta faltando' : 'contas faltando' }} em {{ contasFaltando.ano }}</strong>
          <strong v-else>Todas as contas em dia em {{ contasFaltando.ano }}</strong>
          <button class="lxt-pc" aria-label="Fechar aviso" @click="contasAberto = false">×</button>
        </div>
        <template v-if="contasFaltando.pronto">
          <div class="lxt-pl">Varredura de {{ numero(contasFaltando.ativas) }} unidades ligadas/desligadas, de Jan a {{ MESES_CURTO[contasFaltando.ateMes - 1] }}/{{ contasFaltando.ano }}</div>
          <div v-if="contasFaltando.total" class="lxt-cf">
            <div v-for="m in contasFaltando.porMes" :key="m.mes" class="lxt-cfm">
              <div class="lxt-cfh"><b>{{ MESES_LONGO[m.mes - 1] }}</b><span>{{ m.total }} {{ m.total === 1 ? 'conta' : 'contas' }}</span></div>
              <div class="lxt-cfs"><span v-for="s in m.sec" :key="s.nome">{{ s.nome }} · {{ s.q }}</span></div>
            </div>
          </div>
          <button v-if="contasFaltando.total" class="lxt-cfbtn" @click="irRelatorios">Abrir Relatórios</button>
        </template>
      </div>
    </Transition>

    <Transition name="lxt-slide">
      <div v-if="pushAberto" class="lxt-push" role="status" :style="{ '--pc': `var(${climaInfo.c})` }">
        <div class="lxt-ph">
          <span>{{ clima.carregando.value ? '⏳' : clima.erro.value ? '⚠️' : climaInfo.icone }}</span>
          <strong v-if="clima.carregando.value">Carregando clima de hoje…</strong>
          <strong v-else-if="clima.erro.value">Não foi possível carregar o clima agora</strong>
          <strong v-else>Clima de hoje: {{ climaInfo.titulo }}</strong>
          <button class="lxt-pc" aria-label="Fechar aviso" @click="pushAberto = false">×</button>
        </div>
        <template v-if="!clima.carregando.value && !clima.erro.value">
          <div class="lxt-pl">Previsão de geração: <b>{{ climaInfo.lv }}</b><template v-if="climaInfo.chuva != null"> · chuva {{ climaInfo.chuva }}%</template></div>
          <div class="lxt-gz"><i :style="{ '--w': gaugeW + '%' }"></i></div>
          <div class="lxt-pf">Radiação solar prevista: {{ climaInfo.rad }} kWh/m² · geração estimada hoje: {{ climaInfo.estimado }} MWh</div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style>
.lxt-marca{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:16px;z-index:1004;display:block;line-height:0;border-radius:12px}
.lxt-marca img{height:46px;display:block;filter:drop-shadow(0 0 12px rgba(34,197,224,.45)) drop-shadow(0 0 26px rgba(168,85,247,.3));transition:transform .2s}
.lxt-marca:hover img{transform:scale(1.05)}
.lxt-marca:focus-visible{outline:2px solid #fff;outline-offset:3px}
.lxt-perfil{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));right:122px;z-index:1004;line-height:0}
.lxt-bell{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));right:14px;width:46px;height:46px;border-radius:50%;border:1px solid var(--line);background:rgba(10,15,40,.8);backdrop-filter:blur(12px);cursor:pointer;font-size:20px;z-index:1004;color:#fff}
.lxt-bell.lxt-contas{right:68px;font-size:19px}
.lxt-bell i{position:absolute;top:6px;right:6px;width:10px;height:10px;border-radius:50%;background:var(--pc,var(--green));box-shadow:0 0 10px var(--pc,var(--green))}
.lxt-bell:focus-visible,.lxt-pc:focus-visible,.lxt-cfbtn:focus-visible{outline:2px solid #fff;outline-offset:2px}
.lxt-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:99px;background:var(--red);color:#fff;font:700 10.5px/20px var(--font);box-shadow:0 0 12px var(--red);border:2px solid var(--bg)}
.lxt-notifs{position:fixed;top:calc(68px + env(safe-area-inset-top,0px));right:14px;width:min(360px,calc(100vw - 28px));display:flex;flex-direction:column;gap:10px;z-index:1004;pointer-events:none;max-height:calc(100vh - 170px);overflow-y:auto;overflow-x:hidden;font-family:var(--font);color:var(--tx)}
.lxt-push{pointer-events:auto;width:100%;background:rgba(13,19,48,.94);border:1px solid var(--pc);border-radius:20px;padding:14px;backdrop-filter:blur(16px);box-shadow:0 18px 50px -12px rgba(0,0,0,.75),0 0 36px -12px var(--pc)}
.lxt-slide-enter-active,.lxt-slide-leave-active{transition:transform .55s cubic-bezier(.2,.9,.3,1.15),opacity .4s}
.lxt-slide-enter-from,.lxt-slide-leave-to{transform:translateX(125%);opacity:0}
.lxt-ph{display:flex;align-items:center;gap:11px}
.lxt-ph>span{font-size:30px}
.lxt-ph strong{flex:1;font-size:14px;line-height:1.3}
.lxt-pc{background:none;border:0;color:var(--mut);font-size:22px;cursor:pointer}
.lxt-pl{margin:12px 0 7px;font-size:13px;color:var(--mut)}
.lxt-pl b{color:var(--pc);font-size:15px}
.lxt-gz{height:8px;background:rgba(255,255,255,.1);border-radius:9px;overflow:hidden}
.lxt-gz i{display:block;height:100%;width:var(--w);background:linear-gradient(90deg,var(--pc),rgba(255,255,255,.55));border-radius:9px;transition:width 1s ease}
.lxt-pf{margin-top:9px;font-size:12px;color:var(--mut)}
.lxt-cf{display:grid;gap:8px;max-height:240px;overflow-y:auto;padding-right:2px}
.lxt-cfm{background:rgba(255,255,255,.04);border-radius:12px;padding:8px 10px}
.lxt-cfh{display:flex;justify-content:space-between;align-items:baseline;font-size:13px}
.lxt-cfh span{color:var(--pc);font-weight:600;font-size:12px}
.lxt-cfs{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.lxt-cfs span{font-size:11.5px;padding:2px 9px;border-radius:99px;background:rgba(255,255,255,.08);white-space:nowrap}
.lxt-cfbtn{all:unset;box-sizing:border-box;display:block;width:100%;text-align:center;margin-top:12px;padding:9px 14px;border-radius:999px;cursor:pointer;font:600 13px var(--font);color:#fff;background:linear-gradient(120deg,var(--orange),#ff5f6d);box-shadow:0 8px 24px -10px var(--orange)}
@media(max-width:640px){.lxt-marca img{height:38px}}
</style>
