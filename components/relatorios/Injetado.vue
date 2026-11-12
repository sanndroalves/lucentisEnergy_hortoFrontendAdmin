<script setup>
// Relatório de INJEÇÃO por usina e ano (mesma lógica da versão antiga:
// consumo da conta da usina, geração projetada e real, autoconsumo,
// quantidade injetada e comparação com o mês anterior).
import { ref, computed } from 'vue';
import { API_BASE_URL } from '~/base/link';
import { MESES, MESES_CURTO, ANOS_REL, DOZE, nf, esperarPintura, exportarPDF, gerandoPDF } from '~/composables/useRelatorios';

const { data: usinas, pending: pUsinas } = useLazyFetch(`${API_BASE_URL}/usina/`);
const lUsinas = computed(() => [...(usinas.value ?? [])].sort((a, b) => String(a.nome).localeCompare(String(b.nome))));

const usinaSel = ref('');
const ano = ref(new Date().getFullYear());
const carregando = ref(false);
const erro = ref('');
const dados = ref(null); // { usina, ano, inj, proj, ger }
const resultado = ref(null);

const gerar = async () => {
  if (!usinaSel.value || carregando.value) return;
  carregando.value = true;
  erro.value = '';
  await esperarPintura();
  try {
    const id = usinaSel.value, a = Number(ano.value);
    const [inj, usina, proj, ger] = await Promise.all([
      $fetch(`${API_BASE_URL}/relatoriousina?idGeradora=${id}&ano=${a}`),
      $fetch(`${API_BASE_URL}/usina/${id}`),
      $fetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${id}&ano=${a}`),
      $fetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${id}&ano=${a}`),
    ]);
    const filtra = (l) => (l ?? []).filter(x => x.idGeradora == id && Number(x.ano) === a);
    dados.value = { usina, ano: a, inj: filtra(inj), proj: filtra(proj), ger: filtra(ger) };
  } catch (e) {
    console.error(e);
    erro.value = 'Não foi possível gerar o relatório. Verifique a conexão com o servidor e tente de novo.';
  }
  carregando.value = false;
};

const injetado = (r) => Number(r?.injetadoPonta || 0) + Number(r?.injetadoFPonta || 0);

const meses = computed(() => {
  const d = dados.value;
  if (!d) return [];
  const injMes = (m) => d.inj.filter(i => Number(i.mes) === m).reduce((t, i) => t + injetado(i), 0);
  return DOZE.map(m => {
    const rela = d.inj.find(i => Number(i.mes) === m) ?? null;
    const proj = d.proj.find(i => Number(i.mes) === m);
    const ger = d.ger.find(i => Number(i.mes) === m);
    const inj = rela ? injetado(rela) : null;
    const injAnt = injMes(m - 1); // como antes: janeiro compara com 0
    return {
      m,
      rela,
      contaKwh: rela?.consumoKWH, contaReais: rela?.consumoReais,
      compTotal: !!rela && !rela.consumoKWH && !rela.consumoReais,
      proj: proj ? Number(proj.projecao) : null,
      ger: ger ? Number(ger.geracao) : null,
      autoconsumo: rela && ger ? Math.abs(Number(ger.geracao) - inj) : null,
      inj,
      acima: rela ? inj > injAnt : null,
      analise: rela ? inj - injAnt : null,
    };
  });
});

const totais = computed(() => {
  const d = dados.value;
  if (!d) return null;
  const proj = d.proj.reduce((a, i) => a + Number(i.projecao || 0), 0);
  const ger = d.ger.reduce((a, i) => a + Number(i.geracao || 0), 0);
  const inj = d.inj.reduce((a, i) => a + injetado(i), 0);
  return { proj, ger, inj, auto: ger - inj };
});
const maxBarra = computed(() => Math.max(1, ...meses.value.flatMap(x => [x.proj ?? 0, x.ger ?? 0, x.inj ?? 0])));
const alt = (v) => `${v ? Math.max(2, (v / maxBarra.value) * 100) : 0}%`;
const tipLado = (i) => (i < 2 ? 'l' : i > 9 ? 'r' : '');

const exportar = () => exportarPDF(resultado.value, `injetado-${dados.value?.usina?.nome ?? ''}-${dados.value?.ano}`);
</script>

<template>
  <div>
    <section class="lx-panel lx-mb">
      <div class="lx-filtros">
        <div class="lx-field grow">
          <label for="ri-usina">Usina</label>
          <select id="ri-usina" v-model="usinaSel" class="lx-input" :disabled="pUsinas">
            <option value="" disabled>{{ pUsinas ? 'Carregando usinas…' : 'Selecione a usina' }}</option>
            <option v-for="u in lUsinas" :key="u.id" :value="u.id">{{ u.nome }} · UC {{ u.uc }}</option>
          </select>
        </div>
        <div class="lx-field">
          <label>Ano</label>
          <div class="lx-anos" style="--c:var(--teal)" role="group" aria-label="Ano">
            <button v-for="a in ANOS_REL" :key="a" class="lx-ano" :class="{ on: ano === a }" :aria-pressed="ano === a" @click="ano = a">{{ a }}</button>
          </div>
        </div>
        <button class="lx-btn" style="--c1:var(--teal);--c2:var(--purple)" :disabled="!usinaSel || carregando" @click="gerar">
          <span v-if="carregando" class="lx-spin" aria-hidden="true"></span>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          {{ carregando ? 'Gerando…' : 'Gerar relatório' }}
        </button>
      </div>
    </section>

    <div v-if="erro" class="lx-alert err">{{ erro }}</div>

    <section v-if="carregando" class="lx-panel" style="--c:var(--teal)" aria-busy="true">
      <div class="lx-loading" role="status"><span class="lx-spin"></span><b>Gerando relatório de injeção</b><span>Buscando geração, projeção e injeção de {{ ano }}…</span></div>
    </section>

    <Transition name="lx-fade">
      <div v-if="dados && !carregando" ref="resultado">
        <div class="ri-hd">
          <div>
            <span class="lx-pill" style="--c:var(--teal)"><i></i>UC {{ dados.usina.uc }}</span>
            <h2>{{ dados.usina.nome }} · {{ dados.ano }}</h2>
          </div>
          <button class="lx-btn-ghost sm no-pdf" :disabled="gerandoPDF" @click="exportar">
            <span v-if="gerandoPDF" class="lx-spin"></span>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {{ gerandoPDF ? 'Gerando PDF…' : 'Exportar PDF' }}
          </button>
        </div>

        <section class="lx-kpis">
          <div class="lx-kpi" style="--c:var(--orange)"><span class="ico">◎</span><span>Projetado</span><b>{{ nf(totais.proj) }}</b><small>kWh no ano</small></div>
          <div class="lx-kpi" style="--c:var(--teal)"><span class="ico">☀</span><span>Geração real</span><b>{{ nf(totais.ger) }}</b><small>kWh no ano</small></div>
          <div class="lx-kpi" style="--c:var(--purple)"><span class="ico">⇢</span><span>Total injetado</span><b>{{ nf(totais.inj) }}</b><small>kWh na rede</small></div>
          <div class="lx-kpi" style="--c:var(--green)"><span class="ico">⌂</span><span>Autoconsumo</span><b>{{ nf(totais.auto) }}</b><small>kWh (geração − injeção)</small></div>
        </section>

        <section class="lx-panel lx-mb">
          <div class="lx-panel-hd">
            <h3><span class="lx-ic" style="--c:var(--teal)">⚡</span>Geração e injeção por mês (kWh)</h3>
            <div class="lx-leg"><span><i class="lp"></i>Projetada</span><span><i style="background:var(--teal)"></i>Real</span><span><i style="background:var(--purple)"></i>Injetada</span></div>
          </div>
          <div class="lx-bc">
            <div v-for="(x, i) in meses" :key="x.m" class="lx-bcol" tabindex="0">
              <span class="lx-bv">{{ x.ger ? nf(x.ger / 1000, 1) + 'k' : '' }}</span>
              <div class="lx-bbars">
                <i class="lx-b-proj ri-b" :style="{ height: alt(x.proj) }"></i>
                <i class="lx-b-real ri-b" :style="{ height: alt(x.ger) }"></i>
                <i class="lx-b-real ri-b" style="background:var(--purple)" :style="{ height: alt(x.inj) }"></i>
              </div>
              <span class="lx-bl">{{ MESES_CURTO[i] }}</span>
              <div class="lx-btip" :class="tipLado(i)">
                <strong>{{ MESES[i] }}/{{ dados.ano }}</strong>
                <div><span>Projetada</span><b>{{ x.proj == null ? '—' : nf(x.proj, 2) + ' kWh' }}</b></div>
                <div><span>Real</span><b>{{ x.ger == null ? '—' : nf(x.ger, 2) + ' kWh' }}</b></div>
                <div><span>Injetada</span><b>{{ x.inj == null ? '—' : nf(x.inj, 2) + ' kWh' }}</b></div>
              </div>
            </div>
          </div>
        </section>

        <section class="lx-panel">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--purple)">▦</span>Indicadores mensais</h3>
              <p>Status compara a injeção do mês com a do mês anterior.</p>
            </div>
          </div>
          <div class="lx-tbl-wrap">
            <table class="lx-tbl">
              <thead>
                <tr><th>Mês</th><th class="r">Consumo conta (kWh)</th><th class="r">Consumo conta (R$)</th><th class="r">Projetada</th><th class="r">Real</th><th class="r">Autoconsumo</th><th class="r">Injetada</th><th class="c">Status</th><th class="r">Qtd. análise</th></tr>
              </thead>
              <tbody>
                <tr v-for="x in meses" :key="x.m" :class="{ 'ri-vazio': !x.rela && x.ger == null }">
                  <td><b>{{ MESES_CURTO[x.m - 1] }}</b></td>
                  <template v-if="x.compTotal"><td colspan="2" class="r"><span class="lx-pill" style="--c:var(--green)">Compensação total</span></td></template>
                  <template v-else>
                    <td class="r">{{ x.rela ? nf(x.contaKwh, 0) : '—' }}</td>
                    <td class="r">{{ x.rela ? nf(x.contaReais, 2) : '—' }}</td>
                  </template>
                  <td class="r" style="color:var(--orange)">{{ x.proj == null ? '—' : nf(x.proj, 2) }}</td>
                  <td class="r" style="color:var(--teal)">{{ x.ger == null ? '—' : nf(x.ger, 2) }}</td>
                  <td class="r" style="color:var(--green)">{{ x.autoconsumo == null ? '—' : nf(x.autoconsumo, 2) }}</td>
                  <td class="r" style="color:var(--purple)">{{ x.inj == null ? '—' : nf(x.inj, 2) }}</td>
                  <td class="c">
                    <span v-if="x.acima != null" class="lx-pill" :style="{ '--c': x.acima ? 'var(--green)' : 'var(--red)' }">{{ x.acima ? '↑ Acima' : '↓ Abaixo' }}</span>
                    <span v-else class="ri-mut">—</span>
                  </td>
                  <td class="r b" :style="{ color: x.analise == null ? 'var(--mut)' : x.analise >= 0 ? 'var(--green)' : 'var(--red)' }">{{ x.analise == null ? '—' : nf(x.analise, 2) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr><td>Total</td><td colspan="2"></td><td class="r">{{ nf(totais.proj, 2) }}</td><td class="r">{{ nf(totais.ger, 2) }}</td><td class="r">{{ nf(totais.auto, 2) }}</td><td class="r">{{ nf(totais.inj, 2) }}</td><td colspan="2"></td></tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ri-hd { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.ri-hd h2 { font-size: 20px; font-weight: 700; margin-top: 8px; }
.lx-leg i.lp { border: 1px dashed var(--orange); }
.ri-b { width: 28%; }
.ri-vazio td { color: rgba(154, 167, 204, .5); }
.ri-mut { color: var(--mut); }
.b { font-weight: 700; }
.lx-tbl { white-space: nowrap; }
</style>
