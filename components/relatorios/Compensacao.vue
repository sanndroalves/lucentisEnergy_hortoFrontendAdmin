<script setup>
// Relatório de COMPENSAÇÃO por unidade e mês: quais usinas geram para a
// unidade (porcentagens vigentes no mês), quanto cada uma injetou no mês
// anterior, a injeção projetada para a unidade e o que a fatura compensou.
//
// Antes o total projetado era somado durante a pintura dos cartões (com um
// contador de controle); agora é a soma dos cartões, calculada uma vez.
import { ref, computed } from 'vue';
import { API_BASE_URL } from '~/base/link';
import { MESES, ANOS_REL, SECRETARIAS, nf, mesAnterior, esperarPintura, exportarPDF, gerandoPDF } from '~/composables/useRelatorios';

const secretaria = ref('');
const unidades = ref([]);
const carregandoUnidades = ref(false);
const unidadeSel = ref('');
const ano = ref(new Date().getFullYear());
const mes = ref(new Date().getMonth() + 1);

const carregando = ref(false);
const erro = ref('');
const base = ref(null); // { usinas, injecoes } (carregados uma vez)
const dados = ref(null); // { unidade, ano, porcentagens, relatorios }
const resultado = ref(null);

const escolherSecretaria = async (s) => {
  secretaria.value = s;
  unidadeSel.value = '';
  carregandoUnidades.value = true;
  try {
    const u = await $fetch(`${API_BASE_URL}/unidadecompensacao?categoria=${s}`);
    unidades.value = [...(u ?? [])].sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
  } catch (e) { console.error(e); unidades.value = []; }
  carregandoUnidades.value = false;
};

const gerar = async () => {
  if (!unidadeSel.value || carregando.value) return;
  carregando.value = true;
  erro.value = '';
  await esperarPintura();
  try {
    const id = Number(unidadeSel.value), a = Number(ano.value);
    const [porc, rels, usinas, injecoes] = await Promise.all([
      $fetch(`${API_BASE_URL}/porcentagem?idUnidadeCompensa=${id}`),
      $fetch(`${API_BASE_URL}/relatoriocompensacao?ano=${a}&idUnidadeCompensa=${id}`),
      base.value ? base.value.usinas : $fetch(`${API_BASE_URL}/usina/`),
      base.value ? base.value.injecoes : $fetch(`${API_BASE_URL}/relatoriousina`),
    ]);
    base.value = { usinas: usinas ?? [], injecoes: injecoes ?? [] };
    dados.value = {
      unidade: unidades.value.find(u => u.id === id),
      ano: a,
      porcentagens: (porc ?? []).filter(p => p.idUnidadeCompensa == id),
      relatorios: (rels ?? []).filter(r => r.idUnidadeCompensa == id && Number(r.ano) === a),
    };
  } catch (e) {
    console.error(e);
    erro.value = 'Não foi possível gerar o relatório. Verifique a conexão com o servidor e tente de novo.';
  }
  carregando.value = false;
};

// porcentagens vigentes no mês (mesma regra de antes)
const vigentes = (lista, a, m) => lista.filter(p => {
  const di = new Date(p.data_inicio);
  const df = p.data_fim ? new Date(p.data_fim) : null;
  const ref = new Date(`${a}-${String(m).padStart(2, '0')}-02`);
  return (ref >= di || (ref.getFullYear() === di.getFullYear() && ref.getMonth() >= di.getMonth())) &&
    (!df || ref <= df || (ref.getFullYear() === df.getFullYear() && ref.getMonth() <= df.getMonth()));
});

const mesSel = computed(() => {
  const d = dados.value;
  if (!d || !base.value) return null;
  const ant = mesAnterior(d.ano, mes.value);
  const geradoras = vigentes(d.porcentagens, d.ano, mes.value).map(p => {
    const usina = base.value.usinas.find(u => u.id === p.idGeradora);
    const r = base.value.injecoes.find(i => i.idGeradora === p.idGeradora && Number(i.mes) === ant.mes && Number(i.ano) === ant.ano);
    const injetadoAnt = r ? Number(r.injetadoPonta) + Number(r.injetadoFPonta) : 0;
    const pct = Number(p.porcentagem);
    return { id: p.id, usina, pct, injetadoAnt, projecao: Number((injetadoAnt / 100 * pct).toFixed(2)) };
  });
  const total = Number(geradoras.reduce((s, x) => s + x.projecao, 0).toFixed(2));
  const faturas = d.relatorios.filter(r => Number(r.mes) === mes.value).map(r => {
    const te = parseInt(r.enerInjTE);
    return { r, abaixo: te < total, dif: Math.abs(te - total) };
  });
  return { geradoras, total, faturas, ant };
});

const navMes = (d) => { mes.value = ((mes.value - 1 + d + 12) % 12) + 1; };
const exportar = () => exportarPDF(resultado.value, `compensacao-${dados.value?.unidade?.uc}-${dados.value?.ano}-${mes.value}`);
</script>

<template>
  <div>
    <section class="lx-panel lx-mb">
      <div class="lx-filtros">
        <div class="lx-field">
          <label>Secretaria</label>
          <div class="lx-seg" role="radiogroup" aria-label="Secretaria">
            <button v-for="s in SECRETARIAS" :key="s.v" role="radio" :aria-checked="secretaria === s.v" :title="s.desc"
              :class="{ on: secretaria === s.v }" :style="{ '--c': s.c }" @click="escolherSecretaria(s.v)">{{ s.txt }}</button>
          </div>
        </div>
        <div class="lx-field grow">
          <label for="cp-un">Unidade</label>
          <select id="cp-un" v-model="unidadeSel" class="lx-input" :disabled="!secretaria || carregandoUnidades">
            <option value="" disabled>{{ !secretaria ? 'Escolha a secretaria primeiro' : carregandoUnidades ? 'Carregando unidades…' : 'Selecione a unidade' }}</option>
            <option v-for="u in unidades" :key="u.id" :value="u.id">{{ u.nome }} · UC {{ u.uc }}</option>
          </select>
        </div>
        <div class="lx-field">
          <label>Ano</label>
          <div class="lx-anos" style="--c:var(--orange)" role="group" aria-label="Ano">
            <button v-for="a in ANOS_REL" :key="a" class="lx-ano" :class="{ on: ano === a }" :aria-pressed="ano === a" @click="ano = a">{{ a }}</button>
          </div>
        </div>
        <button class="lx-btn" style="--c1:var(--orange);--c2:#ff5f6d" :disabled="!unidadeSel || carregando" @click="gerar">
          <span v-if="carregando" class="lx-spin" aria-hidden="true"></span>
          {{ carregando ? 'Gerando…' : 'Gerar relatório' }}
        </button>
      </div>
    </section>

    <div v-if="erro" class="lx-alert err">{{ erro }}</div>

    <section v-if="carregando" class="lx-panel" style="--c:var(--orange)" aria-busy="true">
      <div class="lx-loading" role="status"><span class="lx-spin"></span><b>Gerando relatório de compensação</b><span>Buscando porcentagens, injeções e faturas…</span></div>
    </section>

    <Transition name="lx-fade">
      <div v-if="mesSel && !carregando" ref="resultado">
        <div class="cp-hd">
          <div>
            <span class="lx-pill" style="--c:var(--orange)"><i></i>UC {{ dados.unidade?.uc }}</span>
            <h2>{{ dados.unidade?.nome }}</h2>
          </div>
          <div class="cp-hd-r">
            <div class="lx-mnav">
              <button class="lx-icon-btn no-pdf" style="--c:var(--orange)" aria-label="Mês anterior" @click="navMes(-1)">‹</button>
              <span>{{ MESES[mes - 1].toUpperCase() }} {{ dados.ano }}</span>
              <button class="lx-icon-btn no-pdf" style="--c:var(--orange)" aria-label="Próximo mês" @click="navMes(1)">›</button>
            </div>
            <button class="lx-btn-ghost sm no-pdf" :disabled="gerandoPDF" @click="exportar"><span v-if="gerandoPDF" class="lx-spin"></span>{{ gerandoPDF ? 'Gerando PDF…' : 'Exportar PDF' }}</button>
          </div>
        </div>

        <section class="lx-panel lx-mb">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--orange)">☀</span>Usinas geradoras</h3>
              <p>Porcentagens vigentes em {{ MESES[mes - 1].toLowerCase() }}; injeção de {{ MESES[mesSel.ant.mes - 1].toLowerCase() }}/{{ mesSel.ant.ano }}.</p>
            </div>
          </div>
          <p v-if="!mesSel.geradoras.length" class="lx-empty">Nenhuma usina gerando para essa unidade neste mês.</p>
          <div v-else class="cp-grid">
            <article v-for="x in mesSel.geradoras" :key="x.id" class="cp-card">
              <div class="cp-card-top"><span class="lx-mono">UC {{ x.usina?.uc ?? '—' }}</span><span class="lx-pill" style="--c:var(--orange)">{{ nf(x.pct, 2) }}%</span></div>
              <strong>{{ x.usina?.nome ?? `Usina #${x.id}` }}</strong>
              <div class="cp-meta">
                <div><span>Injetado mês ant.</span><b>{{ nf(x.injetadoAnt, 2) }} kWh</b></div>
                <div><span>Proj. injeção</span><b>{{ nf(x.projecao, 2) }} kWh</b></div>
              </div>
            </article>
          </div>
          <div class="cp-total"><span>Total projetado para injeção neste mês</span><b>{{ nf(mesSel.total, 2) }} kWh</b></div>
        </section>

        <section class="lx-panel">
          <div class="lx-panel-hd"><h3><span class="lx-ic" style="--c:var(--teal)">▦</span>Fatura da unidade</h3></div>
          <p v-if="!mesSel.faturas.length" class="lx-empty">Nenhuma fatura em {{ MESES[mes - 1].toLowerCase() }} de {{ dados.ano }}.</p>
          <div v-for="f in mesSel.faturas" :key="f.r.id" class="cp-ud">
            <div class="cp-c"><span>Consumo</span><b>{{ nf(f.r.consumokWh, 2) }} kWh</b><small>R$ {{ nf(f.r.consumoReais, 2) }}</small></div>
            <div class="cp-c" style="--c:var(--green)"><span>Saldo energia</span><b>{{ nf(f.r.saldoEnergia, 2) }}</b><small>kWh</small></div>
            <div class="cp-c" style="--c:var(--teal)"><span>Inj. TUSD</span><b>{{ nf(parseInt(f.r.enerInjTUSD)) }} kWh</b><small>R$ {{ nf(f.r.valorInjTUSD, 2) }}</small></div>
            <div class="cp-c" style="--c:var(--teal)"><span>Inj. TE</span><b>{{ nf(parseInt(f.r.enerInjTE)) }} kWh</b><small>R$ {{ nf(f.r.valorInjTE, 2) }}</small></div>
            <div class="cp-c" style="--c:var(--purple)"><span>Total injetado</span><b>{{ nf(parseInt(f.r.enerInjTE) + parseInt(f.r.enerInjTUSD)) }} kWh</b><small>R$ {{ nf(Number(f.r.valorInjTE) + Number(f.r.valorInjTUSD), 2) }}</small></div>
            <div class="cp-c" :style="{ '--c': f.abaixo ? 'var(--red)' : 'var(--green)' }"><span>Status</span><b :style="{ color: 'var(--c)' }">{{ f.abaixo ? 'Abaixo do esperado' : 'Acima do esperado' }}</b><small>Inj. TE × projetado</small></div>
            <div class="cp-c" style="--c:var(--orange)"><span>Diferença</span><b>{{ nf(f.dif, 2) }} kWh</b><small>|Inj. TE − projetado|</small></div>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cp-hd { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.cp-hd h2 { font-size: 20px; font-weight: 700; margin-top: 8px; }
.cp-hd-r { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.cp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.cp-card { background: var(--card2); border: 1px solid var(--line); border-radius: 16px; padding: 13px 14px; display: flex; flex-direction: column; gap: 8px; }
.cp-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cp-card strong { font-size: 14px; font-weight: 600; }
.cp-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cp-meta div { background: rgba(255, 255, 255, .04); border-radius: 10px; padding: 7px 9px; display: flex; flex-direction: column; gap: 2px; }
.cp-meta span { font-size: 10.5px; color: var(--mut); }
.cp-meta b { font-size: 12.5px; }
.cp-total { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 14px; padding: 12px 16px; border-radius: 14px;
  background: linear-gradient(120deg, rgba(255, 161, 46, .18), rgba(255, 95, 109, .12)); border: 1px solid rgba(255, 161, 46, .4); }
.cp-total span { font-size: 12.5px; color: var(--mut); }
.cp-total b { font-size: 20px; color: var(--orange); }
.cp-ud { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.cp-ud + .cp-ud { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--line2); }
.cp-c { --c: var(--mut); background: var(--card2); border: 1px solid var(--line); border-left: 3px solid var(--c); border-radius: 14px; padding: 11px 13px; display: flex; flex-direction: column; gap: 3px; }
.cp-c span { font-size: 11px; color: var(--mut); }
.cp-c b { font-size: 15px; font-weight: 700; }
.cp-c small { font-size: 10.5px; color: var(--mut); }
</style>
