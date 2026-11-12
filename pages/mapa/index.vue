<script setup>
// Mapa público de eficiência energética (layout "blank", sem dock).
// Painel de estatísticas: público para todos; aba Admin só para o usuário admin.
//
// Correções:
//  • Admin usava sempre o "mês anterior" do relógio, que quase nunca tem dado.
//    Agora cada indicador usa o último mês que tem registro:
//      - geração ............. último mês com geração real (igual à Início)
//      - faturas/consumo ..... último mês com fatura de compensação lançada
//      - indicadores que cruzam os dois (autossuficiência, custo evitado)
//        usam o mais antigo dos dois, para os dois lados existirem.
//  • "Injetado" somava texto (ex.: "120.00" + "30.00" → "0120.0030.00").
//  • Custo evitado usa a tarifa do mês cadastrada em Gerenciamento › Parâmetros.
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import Map from '@/components/Map2.vue';
import { ref, computed } from 'vue';
import { useReferenciaAtual } from '~/composables/useReferenciaAtual';
import { useTarifas, tarifaKwh } from '~/composables/useTarifas';

useHead({ title: 'Mapa Eficiência • Lucentis' });
definePageMeta({ layout: 'blank' });

const { data } = useAuth();
const isAdmin = computed(() => data.value?.username === 'admin');
const { lista: tarifas } = useTarifas();

const { data: geracoes } = await useFetch(`${API_BASE_URL}/relatoriogeracao/`);
const { data: injecoes } = await useFetch(`${API_BASE_URL}/relatoriousina/`);
const { data: compensa } = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`);
const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);
const { data: unidadesRaw } = await useFetch(`${API_BASE_URL}/unidadecompensacao`);

const num = (v) => Number(v) || 0;
const lUsinas = computed(() => usinas.value ?? []);
const lGer = computed(() => geracoes.value ?? []);
const lInj = computed(() => injecoes.value ?? []);
const lComp = computed(() => compensa.value ?? []);
const lUni = computed(() => unidadesRaw.value ?? []);
const uniPorId = computed(() => new globalThis.Map(lUni.value.map(u => [u.id, u])));

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const rotulo = (r) => `${MESES[r.mes - 1]} ${r.ano}`;
const nf = (v, c = 0) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

// ── cabeçalho ──
const SECS = [
  { v: 'E', txt: 'Educação', c: 'var(--green)' },
  { v: 'S', txt: 'Saúde', c: 'var(--teal)' },
  { v: 'O', txt: 'Outros', c: 'var(--orange)' },
];
const usinasPorSec = computed(() => Object.fromEntries(SECS.map(s => [s.v, lUsinas.value.filter(u => u.secretaria === s.v).length])));

// ── público (acumulado) ──
const totalGerado = computed(() => lGer.value.reduce((a, i) => a + num(i.geracao), 0));
const totalInjetado = computed(() => lInj.value.reduce((a, i) => a + num(i.injetadoPonta) + num(i.injetadoFPonta), 0));
const totalCompensa = computed(() => lComp.value.reduce((a, i) => a + num(i.valorInjTUSD) + num(i.valorInjTE), 0));
const totalSaldoJaneiro = computed(() => {
  // regra original mantida: saldo de 3 meses atrás × 0,72
  const hoje = new Date();
  const mesAlvo = hoje.getMonth() + 1 - 3;
  const anoAlvo = hoje.getFullYear() - (mesAlvo <= 0 ? 1 : 0);
  const mesCorrigido = ((mesAlvo + 11) % 12) + 1;
  return lComp.value.reduce((a, i) => (i.mes === mesCorrigido && i.ano === anoAlvo ? a + num(i.saldoEnergia) : a), 0);
});
const totalCompensaSoma = computed(() => totalCompensa.value + totalSaldoJaneiro.value * 0.72);
const totalPlacas = computed(() => lUsinas.value.reduce((a, i) => a + num(i.qtdPlaca), 0));
const totalInvestido = 8854468.32 + 8005328.88 + 7021350.76;
const totalCarbono = computed(() => totalGerado.value * 0.536);
const totalArvores = computed(() => Math.round(totalCarbono.value / 150));

// ── meses de referência (último mês com registro) ──
const { referencia: refGerAuto } = useReferenciaAtual(geracoes);
const refCompAuto = computed(() => {
  let b = null;
  lComp.value.forEach((r) => {
    if (!r.ano || !r.mes || !(num(r.consumokWh) || num(r.valorInjTUSD) || num(r.valorInjTE) || num(r.enerInjTUSD))) return;
    if (!b || r.ano > b.ano || (r.ano === b.ano && r.mes > b.mes)) b = { ano: r.ano, mes: r.mes };
  });
  return b ?? refGerAuto.value;
});
const refMixAuto = computed(() => {
  const a = refGerAuto.value, b = refCompAuto.value;
  return a.ano * 12 + a.mes <= b.ano * 12 + b.mes ? a : b;
});

// mês escolhido no Admin (null = automático: último mês com registro de cada fonte)
const mesEscolhido = ref(null);
const chave = (r) => r.ano * 12 + r.mes - 1;
const deChave = (k) => ({ ano: Math.floor(k / 12), mes: (k % 12) + 1 });
const limites = computed(() => {
  const max = Math.max(chave(refGerAuto.value), chave(refCompAuto.value));
  let min = max;
  for (const r of lGer.value) if (r.ano && r.mes) min = Math.min(min, chave(r));
  for (const r of lComp.value) if (r.ano && r.mes) min = Math.min(min, chave(r));
  return { min, max };
});
const mesAdmin = computed(() => mesEscolhido.value ?? refMixAuto.value);
const mudarMes = (d) => {
  const k = Math.min(limites.value.max, Math.max(limites.value.min, chave(mesAdmin.value) + d));
  mesEscolhido.value = deChave(k);
};
const escolherMes = (v) => { if (!v) return; const [a, m] = v.split('-').map(Number); mesEscolhido.value = { ano: a, mes: m }; };
const inputMes = computed(() => `${mesAdmin.value.ano}-${String(mesAdmin.value.mes).padStart(2, '0')}`);
const fmtInput = (k) => { const r = deChave(k); return `${r.ano}-${String(r.mes).padStart(2, '0')}`; };

// referências efetivas: o mês escolhido vale para tudo; no automático cada fonte usa o seu último mês
const refGer = computed(() => mesEscolhido.value ?? refGerAuto.value);
const refComp = computed(() => mesEscolhido.value ?? refCompAuto.value);
const refMix = computed(() => mesEscolhido.value ?? refMixAuto.value);
const doMes = (lista, r) => lista.filter(i => i.mes === r.mes && i.ano === r.ano);

// ── admin: geral ──
const geracaoMes = computed(() => doMes(lGer.value, refGer.value).reduce((a, i) => a + num(i.geracao), 0));
const saldoMes = computed(() => doMes(lComp.value, refComp.value).reduce((a, i) => a + num(i.saldoEnergia), 0));

const consumoMedioUsinas = computed(() => lUsinas.value.filter(u => u.id !== 19 && u.id !== 20)
  .reduce((t, u) => t + num(lUni.value.find(x => x.uc === u.uc)?.mediaConsumo), 0));
const taxaAutossuficiencia = computed(() => {
  const r = refMix.value;
  const comp = doMes(lComp.value, r).filter(i => ['E', 'S', 'O'].includes(uniPorId.value.get(i.idUnidadeCompensa)?.secretaria));
  const gerMes = doMes(lGer.value, r);
  const compensada = comp.reduce((a, i) => a + num(i.enerInjTUSD), 0);
  const ESPECIAIS = ['4000266381', '37068768'];
  const consumo = comp.reduce((a, i) => {
    const uc = String(uniPorId.value.get(i.idUnidadeCompensa)?.uc ?? '');
    const extra = ESPECIAIS.includes(uc) ? num(gerMes.find(g => String(g.uc) === uc)?.geracao) : 0;
    return a + num(i.consumokWh) + extra;
  }, 0);
  const geracao = gerMes.reduce((a, i) => a + num(i.geracao), 0);
  const injetada = doMes(lInj.value, r).reduce((a, i) => a + num(i.injetadoPonta) + num(i.injetadoFPonta), 0);
  const total = consumo + consumoMedioUsinas.value;
  return total ? ((compensada + (geracao - injetada)) / total) * 100 : 0;
});
const custoEvitado = computed(() => {
  void tarifas.value;
  const { ano, mes } = refMix.value;
  const economia = doMes(lComp.value, refMix.value).reduce((a, i) => a + num(i.valorInjTUSD) + num(i.valorInjTE), 0);
  let auto = 0;
  lUsinas.value.forEach((u) => {
    const g = num(lGer.value.find(x => x.idGeradora == u.id && x.ano == ano && x.mes == mes)?.geracao);
    const inj = lInj.value.filter(x => x.idGeradora == u.id && x.ano == ano && x.mes == mes).reduce((a, x) => a + num(x.injetadoPonta) + num(x.injetadoFPonta), 0);
    const kwh = (u.id == 19 || u.id == 20) ? g : Math.max(0, g - inj);
    auto += kwh * tarifaKwh(u.tensao, ano, mes);
  });
  return economia + auto;
});

// ── admin: secretarias ──
const SEC_ADM = [
  { v: 'E', txt: 'Educação', c: 'var(--green)', ic: '✎' },
  { v: 'S', txt: 'Saúde', c: 'var(--teal)', ic: '✚' },
  { v: 'O', txt: 'Outros', c: 'var(--orange)', ic: '⌂' },
];
const consumoSec = computed(() => {
  const r = Object.fromEntries(SEC_ADM.map(s => [s.v, 0]));
  doMes(lComp.value, refComp.value).forEach((i) => { const s = uniPorId.value.get(i.idUnidadeCompensa)?.secretaria; if (s in r) r[s] += num(i.consumokWh); });
  return r;
});
const consumoTotal = computed(() => Object.values(consumoSec.value).reduce((a, b) => a + b, 0));
const pct = (v) => (consumoTotal.value ? (v / consumoTotal.value) * 100 : 0);

// ── painel ──
const showPanel = ref(false);
const modoPainel = ref('publico');
const adminTab = ref('geral');
</script>

<template>
  <div class="lx-page mp">
    <!-- Cabeçalho flutuante -->
    <header class="mp-hd">
      <NuxtLink to="/" class="mp-marca" aria-label="Ir para o Início">
        <LxNebulosa class="mp-neb" :particulas="18" :velocidade="0.7" />
        <img src="https://i.imgur.com/qZ92wWu.png" alt="LUCENTIS">
      </NuxtLink>
      <div class="mp-hd-tx">
        <span class="mp-eyebrow"><i class="mp-live"></i>Eficiência energética</span>
        <h1>Prefeitura de <span class="grad">Hortolândia</span></h1>
        <div class="mp-chips">
          <span class="mp-chips-lb">Usinas</span>
          <span v-for="s in SECS" :key="s.v" class="lx-pill" :style="{ '--c': s.c }"><i></i>{{ s.txt }} <b>{{ usinasPorSec[s.v] }}</b></span>
        </div>
      </div>
    </header>

    <!-- Mapa -->
    <div class="mp-mapa"><Map /></div>

    <!-- Aba do painel -->
    <button class="mp-tab" :aria-expanded="showPanel" @click="showPanel = !showPanel">
      <span class="mp-tab-handle"></span>
      <span class="mp-tab-tx"><b>Estatísticas</b><small>{{ showPanel ? 'fechar painel' : 'ver dados' }}</small></span>
      <span class="mp-tab-ic">{{ showPanel ? '▾' : '▴' }}</span>
    </button>

    <!-- Painel -->
    <Transition name="mp-sheet">
      <section v-if="showPanel" class="mp-sheet" aria-label="Painel de dados">
        <div class="mp-sheet-hd">
          <div class="mp-sheet-tt"><i></i><b>Painel de dados</b></div>
          <div class="mp-sheet-r">
            <div v-if="isAdmin" class="lx-seg">
              <button :class="{ on: modoPainel === 'publico' }" @click="modoPainel = 'publico'">Público</button>
              <button :class="{ on: modoPainel === 'admin' }" style="--c:var(--orange)" @click="modoPainel = 'admin'">Admin</button>
            </div>
            <button class="lx-dlg-x" aria-label="Fechar painel" @click="showPanel = false">×</button>
          </div>
        </div>

        <!-- Público -->
        <div v-if="modoPainel === 'publico' || !isAdmin" class="mp-body">
          <article class="mp-hero">
            <span class="mp-hero-ic">R$</span>
            <div><small>Total investido pelo município</small><b>R$ {{ nf(totalInvestido, 2) }}</b></div>
          </article>
          <div class="mp-grid">
            <div class="lx-kpi" style="--c:var(--teal)"><span class="ico">⚡</span><span>Usinas</span><b>{{ lUsinas.length }}</b><small>em operação no município</small></div>
            <div class="lx-kpi" style="--c:var(--orange)"><span class="ico">☀</span><span>Placas</span><b>{{ nf(totalPlacas) }}</b><small>módulos fotovoltaicos</small></div>
            <div class="lx-kpi" style="--c:var(--green)"><span class="ico">↑</span><span>Energia gerada</span><b>{{ nf(totalGerado / 1000) }}</b><small>MWh desde o início</small></div>
            <div class="lx-kpi" style="--c:var(--purple)"><span class="ico">⇢</span><span>Energia injetada</span><b>{{ nf(totalInjetado / 1000) }}</b><small>MWh na rede</small></div>
            <div class="lx-kpi mp-wide" style="--c:var(--green)"><span class="ico">$</span><span>Valor compensado</span><b>R$ {{ nf(totalCompensaSoma, 2) }}</b><small>créditos de energia nas faturas da prefeitura</small></div>
          </div>
          <p class="mp-sec-lb">Meio ambiente</p>
          <div class="mp-grid">
            <div class="lx-kpi" style="--c:var(--teal)"><span class="ico">♻</span><span>Carbono evitado</span><b>{{ nf(totalCarbono / 1000, 1) }}</b><small>toneladas de CO₂</small></div>
            <div class="lx-kpi" style="--c:var(--green)"><span class="ico">🌳</span><span>Árvores equivalentes</span><b>{{ nf(totalArvores) }}</b><small>plantadas</small></div>
          </div>
        </div>

        <!-- Admin -->
        <div v-else class="mp-body">
          <div class="mp-adm-bar">
            <div class="lx-seg">
              <button :class="{ on: adminTab === 'geral' }" @click="adminTab = 'geral'">Geral</button>
              <button :class="{ on: adminTab === 'secretarias' }" @click="adminTab = 'secretarias'">Secretarias</button>
            </div>
            <div class="mp-mes" role="group" aria-label="Mês dos dados">
              <button class="lx-icon-btn" aria-label="Mês anterior" :disabled="chave(mesAdmin) <= limites.min" @click="mudarMes(-1)">‹</button>
              <input class="lx-input mp-mes-in" type="month" :value="inputMes" :min="fmtInput(limites.min)" :max="fmtInput(limites.max)"
                aria-label="Escolher mês" @change="escolherMes($event.target.value)" />
              <button class="lx-icon-btn" aria-label="Próximo mês" :disabled="chave(mesAdmin) >= limites.max" @click="mudarMes(1)">›</button>
              <button class="mp-auto-btn" :class="{ on: !mesEscolhido }" :aria-pressed="!mesEscolhido" title="Usar o último mês com registro" @click="mesEscolhido = null">
                {{ mesEscolhido ? 'Voltar ao último mês' : 'Último mês com dados' }}
              </button>
            </div>
          </div>

          <template v-if="adminTab === 'geral'">
            <article class="mp-auto">
              <div class="mp-auto-hd"><span>Taxa de autossuficiência</span><span class="lx-pill" style="--c:var(--teal)">{{ rotulo(refMix) }}</span></div>
              <b>{{ nf(taxaAutossuficiencia, 1) }}<small>%</small></b>
              <div class="mp-bar"><i :style="{ width: Math.min(taxaAutossuficiencia, 100) + '%' }"></i></div>
              <p>Energia compensada + autoconsumo das usinas ÷ consumo dos prédios e das usinas</p>
            </article>
            <div class="mp-grid tres">
              <div class="lx-kpi" style="--c:var(--orange)"><span>Custo evitado</span><b>R$ {{ nf(custoEvitado, 2) }}</b><small>Ref.: {{ rotulo(refMix) }}</small></div>
              <div class="lx-kpi" style="--c:var(--teal)"><span>Geração no mês</span><b>{{ nf(geracaoMes) }} <em>kWh</em></b><small>Ref.: {{ rotulo(refGer) }}</small></div>
              <div class="lx-kpi" style="--c:var(--green)"><span>Saldo de energia</span><b>{{ nf(saldoMes) }} <em>kWh</em></b><small>Ref.: {{ rotulo(refComp) }}</small></div>
            </div>
            <p class="mp-nota">
              <template v-if="mesEscolhido">Todos os indicadores mostram {{ rotulo(mesEscolhido) }}.</template>
              <template v-else>Cada indicador usa o último mês com registro lançado. Indicadores que cruzam geração e faturas usam o mês em que os dois existem.</template>
            </p>
          </template>

          <template v-else>
            <div class="mp-tot"><span>Consumo das unidades · {{ rotulo(refComp) }}</span><b>{{ nf(consumoTotal) }} kWh</b></div>
            <div class="mp-secs">
              <article v-for="s in SEC_ADM" :key="s.v" class="mp-sec" :style="{ '--c': s.c }">
                <div class="mp-sec-hd"><span class="mp-sec-ic">{{ s.ic }}</span><b>{{ s.txt }}</b><span class="mp-sec-pct">{{ nf(pct(consumoSec[s.v]), 1) }}%</span></div>
                <div class="mp-sec-v">{{ nf(consumoSec[s.v]) }} <small>kWh</small></div>
                <div class="mp-bar"><i :style="{ width: pct(consumoSec[s.v]) + '%' }"></i></div>
              </article>
            </div>
          </template>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.mp { position: relative; width: 100%; height: 100dvh; overflow: hidden; background: var(--bg); }
.mp-mapa { position: absolute; inset: 0; }

/* ── Cabeçalho ── */
.mp-hd {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%); z-index: 10; width: min(620px, calc(100vw - 24px));
  display: flex; align-items: center; gap: 16px; padding: 12px 18px; border-radius: 22px;
  background: rgba(13, 19, 48, .82); backdrop-filter: blur(16px); border: 1px solid var(--line);
  box-shadow: 0 18px 50px -18px rgba(0, 0, 0, .75), 0 0 40px -22px var(--teal);
}
.mp-hd::before { content: ""; position: absolute; left: 18px; right: 18px; top: 0; height: 2px; border-radius: 2px; background: linear-gradient(90deg, var(--teal), var(--purple)); box-shadow: 0 0 12px var(--teal); }
.mp-marca { position: relative; display: block; line-height: 0; isolation: isolate; flex: none; }
.mp-neb { position: absolute; left: 50%; top: 50%; width: 220%; height: 260%; transform: translate(-50%, -50%); z-index: -1; opacity: .8; }
.mp-marca img { position: relative; height: 44px; filter: drop-shadow(0 1px 4px rgba(3, 6, 15, .8)); }
.mp-marca:focus-visible { outline: 2px solid #fff; outline-offset: 3px; border-radius: 8px; }
.mp-hd-tx { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.mp-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--mut); }
.mp-live { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: mpLive 2s ease-in-out infinite; }
@keyframes mpLive { 0% { box-shadow: 0 0 0 0 rgba(52, 211, 122, .7); } 70% { box-shadow: 0 0 0 7px rgba(52, 211, 122, 0); } 100% { box-shadow: 0 0 0 0 rgba(52, 211, 122, 0); } }
.mp-hd h1 { font-size: 19px; font-weight: 700; letter-spacing: -.01em; line-height: 1.15; }
.mp-hd .grad { background: linear-gradient(90deg, var(--teal), var(--purple)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.mp-chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.mp-chips-lb { font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--mut); margin-right: 2px; }
.mp-chips b { color: var(--tx); margin-left: 2px; }

/* ── Aba ── */
.mp-tab {
  all: unset; box-sizing: border-box; cursor: pointer; position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); z-index: 15;
  width: min(360px, 84vw); display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px 20px 12px;
  border-radius: 20px 20px 0 0; background: rgba(13, 19, 48, .9); backdrop-filter: blur(14px); border: 1px solid var(--line); border-bottom: 0;
  box-shadow: 0 -10px 34px -12px rgba(0, 0, 0, .7), 0 0 30px -16px var(--teal); transition: border-color .2s;
}
.mp-tab:hover { border-color: rgba(34, 197, 224, .5); }
.mp-tab:focus-visible { outline: 2px solid #fff; }
.mp-tab-handle { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); width: 34px; height: 3px; border-radius: 3px; background: var(--line); }
.mp-tab-tx { display: flex; align-items: baseline; gap: 10px; }
.mp-tab-tx b { font-size: 14px; font-weight: 600; letter-spacing: .02em; }
.mp-tab-tx small { font-size: 11.5px; color: var(--mut); }
.mp-tab-ic { color: var(--teal); font-size: 13px; }

/* ── Painel ── */
.mp-sheet {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 30; max-height: 80vh; overflow-y: auto;
  background: var(--bg2); border-top: 1px solid var(--line); border-radius: 26px 26px 0 0;
  box-shadow: 0 -20px 60px -10px rgba(0, 0, 0, .7);
  background-image: radial-gradient(circle at 10% 0%, rgba(34, 197, 224, .12), transparent 40%), radial-gradient(circle at 90% 100%, rgba(168, 85, 247, .12), transparent 45%);
}
.mp-sheet-hd {
  position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px;
  background: rgba(13, 19, 48, .92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line2); border-radius: 26px 26px 0 0;
}
.mp-sheet-tt { display: flex; align-items: center; gap: 9px; font-size: 14px; }
.mp-sheet-tt i { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 8px var(--teal); }
.mp-sheet-r { display: flex; align-items: center; gap: 10px; }
.mp-body { max-width: 1100px; margin: 0 auto; padding: 18px; display: flex; flex-direction: column; gap: 14px; }

.mp-hero {
  display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-radius: 20px; position: relative; overflow: hidden;
  background: radial-gradient(circle at 100% 0%, rgba(34, 197, 224, .22), transparent 60%), var(--card); border: 1px solid rgba(34, 197, 224, .35);
}
.mp-hero-ic { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; font-weight: 700; color: #fff; background: linear-gradient(135deg, var(--teal), var(--purple)); flex: none; }
.mp-hero small { display: block; font-size: 12px; color: var(--mut); }
.mp-hero b { font: 600 clamp(20px, 3vw, 28px) var(--mono); letter-spacing: -.02em; }
.mp-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.mp-grid.tres { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.mp-grid .lx-kpi b { font-variant-numeric: tabular-nums; }
.mp-grid .lx-kpi b em { font-style: normal; font-size: 12px; color: var(--mut); font-weight: 500; }
.mp-wide { grid-column: 1 / -1; }
.mp-sec-lb { font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--mut); margin-top: 4px; }

.mp-adm-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px 14px; flex-wrap: wrap; }
.mp-mes { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.mp-mes .lx-icon-btn:disabled { opacity: .35; pointer-events: none; }
.mp-mes-in { width: 170px; padding: 7px 10px; }
.mp-auto-btn {
  all: unset; box-sizing: border-box; cursor: pointer; font: 600 11.5px var(--font); padding: 7px 12px; border-radius: 99px;
  color: var(--mut); border: 1px solid var(--line); background: rgba(255, 255, 255, .04); transition: color .2s, background .2s, border-color .2s;
}
.mp-auto-btn:hover { color: var(--tx); }
.mp-auto-btn.on { color: var(--teal); border-color: rgba(34, 197, 224, .45); background: rgba(34, 197, 224, .1); }
.mp-auto-btn:focus-visible { outline: 2px solid #fff; }
.mp-auto { padding: 18px 20px; border-radius: 20px; background: var(--card); border: 1px solid rgba(34, 197, 224, .35); }
.mp-auto-hd { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12.5px; color: var(--mut); }
.mp-auto > b { display: block; font: 700 46px var(--mono); letter-spacing: -.03em; line-height: 1.1; margin: 6px 0 10px; }
.mp-auto > b small { font-size: 22px; color: var(--teal); margin-left: 3px; }
.mp-auto p { font-size: 11.5px; color: var(--mut); margin-top: 8px; }
.mp-bar { height: 6px; border-radius: 99px; background: rgba(255, 255, 255, .07); overflow: hidden; }
.mp-bar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--c, var(--teal)), var(--purple)); box-shadow: 0 0 10px var(--c, var(--teal)); transition: width .8s cubic-bezier(.34, 1.3, .64, 1); }
.mp-nota { font-size: 11.5px; color: var(--mut); }

.mp-tot { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 12.5px; color: var(--mut); }
.mp-tot b { font: 600 16px var(--mono); color: var(--tx); }
.mp-secs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.mp-sec { padding: 16px; border-radius: 18px; background: var(--card); border: 1px solid var(--line); display: flex; flex-direction: column; gap: 10px; }
.mp-sec-hd { display: flex; align-items: center; gap: 10px; }
.mp-sec-ic { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.mp-sec-hd b { font-size: 14px; font-weight: 600; }
.mp-sec-pct { margin-left: auto; font: 600 12px var(--mono); color: var(--c); padding: 3px 9px; border-radius: 99px; background: color-mix(in srgb, var(--c) 14%, transparent); }
.mp-sec-v { font: 600 22px var(--mono); }
.mp-sec-v small { font: 500 12px var(--font); color: var(--mut); }

.mp-sheet-enter-active, .mp-sheet-leave-active { transition: transform .35s cubic-bezier(.2, .8, .2, 1), opacity .25s; }
.mp-sheet-enter-from, .mp-sheet-leave-to { transform: translateY(100%); opacity: .4; }

@media (max-width: 900px) { .mp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .mp-secs, .mp-grid.tres { grid-template-columns: 1fr; } }
@media (max-width: 520px) {
  .mp-hd { gap: 10px; padding: 10px 12px; top: 10px; }
  .mp-marca img { height: 34px; }
  .mp-hd h1 { font-size: 15px; }
  .mp-chips-lb { display: none; }
  .mp-auto > b { font-size: 36px; }
}
</style>
