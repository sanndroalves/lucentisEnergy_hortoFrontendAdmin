<script setup>
// Manutenções. Nada aqui bloqueia a abertura da página: todas as listas vêm
// por useLazyFetch. A lista de manutenções aparece assim que /manutencao e
// /usina chegam; os alertas (que dependem de geração, projeção e checklist)
// aparecem quando essas listas chegarem, sem segurar o resto da tela.
import { ref, computed } from 'vue';
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import { useAlertasUsinas } from '~/composables/useAlertasUsinas';

useHead({ title: 'Manutenções' });
definePageMeta({ middleware: 'sidebase-auth' });

const { data: manutencoes, pending: pManu } = useLazyFetch(`${API_BASE_URL}/manutencao/`);
const { data: usinas, pending: pUsinas } = useLazyFetch(`${API_BASE_URL}/usina/`);
const { data: geracoes, pending: pGer } = useLazyFetch(`${API_BASE_URL}/relatoriogeracao/`);
const { data: projecoes, pending: pProj } = useLazyFetch(`${API_BASE_URL}/projecaogeracao`);
const { data: checklists, pending: pCheck } = useLazyFetch(`${API_BASE_URL}/checklist/`);

const carregandoLista = computed(() => pManu.value || pUsinas.value);
const carregandoAlertas = computed(() => pUsinas.value || pGer.value || pProj.value || pCheck.value);

// ─── Alertas (mesma lógica da tela Início) ───
const { alertas, referencia } = useAlertasUsinas({ usinas, geracoes, projecoes, checklists });
const MR = computed(() => `${String(referencia.value.mes).padStart(2, '0')}/${referencia.value.ano}`);

// ─── Manutenções ───
const STATUS = {
  '1': { txt: 'Programada', c: 'var(--teal)' },
  '2': { txt: 'Em andamento', c: 'var(--orange)' },
  '3': { txt: 'Realizada', c: 'var(--green)' },
};
const statusInfo = (s) => STATUS[s] ?? { txt: 'Desconhecido', c: 'var(--mut)' };

const lManu = computed(() => manutencoes.value ?? []);
const usinaPorId = computed(() => new Map((usinas.value ?? []).map(u => [String(u.id), u])));
const usinaDe = (id) => usinaPorId.value.get(String(id));

const contagem = computed(() => ({
  '1': lManu.value.filter(m => m.status === '1').length,
  '2': lManu.value.filter(m => m.status === '2').length,
  '3': lManu.value.filter(m => m.status === '3').length,
}));

// última manutenção REALIZADA de cada usina
const ultimaRealizada = computed(() => {
  const m = new Map();
  lManu.value.forEach(x => {
    if (x.status !== '3' || !x.data) return;
    const k = String(x.idGeradora);
    if (!m.has(k) || x.data > m.get(k)) m.set(k, x.data);
  });
  return m;
});

const dataBR = (d) => {
  if (!d) return '—';
  const dt = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d);
  return isNaN(dt) ? '—' : dt.toLocaleDateString('pt-BR');
};

// ─── Filtro / busca ───
const filtro = ref('1');
const busca = ref('');
const FILTROS = [
  { v: 'A', txt: 'Alertas', c: 'var(--red)' },
  { v: '1', txt: 'Programadas', c: 'var(--teal)' },
  { v: '2', txt: 'Em andamento', c: 'var(--orange)' },
  { v: '3', txt: 'Realizadas', c: 'var(--green)' },
  { v: 'T', txt: 'Todas', c: 'var(--purple)' },
];
const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const casa = (q, ...campos) => !q || campos.some(c => normalizar(c).includes(q));

const lista = computed(() => {
  const q = normalizar(busca.value.trim());
  const itens = lManu.value
    .filter(m => filtro.value === 'T' || m.status === filtro.value)
    .filter(m => { const u = usinaDe(m.idGeradora); return casa(q, u?.nome, u?.uc, m.empresa, m.descricao); });
  // programadas: a mais próxima primeiro; as demais: a mais recente primeiro
  const asc = filtro.value === '1';
  return itens.sort((a, b) => (asc ? 1 : -1) * String(a.data ?? '').localeCompare(String(b.data ?? '')));
});
const listaAlertas = computed(() => {
  const q = normalizar(busca.value.trim());
  return alertas.value.filter(a => casa(q, a.nome, a.usina?.uc));
});
</script>

<template>
  <div class="lx-page">
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span><span>Fotovoltaico</span><span class="sep">›</span><b>Manutenções</b>
        </nav>
        <h1 class="lx-title">Manutenções <span class="grad">das usinas</span></h1>
        <p class="lx-sub">Manutenções programadas, em andamento e realizadas, e usinas com geração abaixo do esperado</p>
      </div>
      <div class="lx-head-actions">
        <NuxtLink to="/usinas/" class="lx-btn-ghost">Ir para usinas</NuxtLink>
      </div>
    </header>

    <!-- KPIs (clicáveis: filtram a lista) -->
    <section class="lx-kpis">
      <button class="lx-kpi mn-kpi" :class="{ on: filtro === 'A' }" :style="{ '--c': alertas.length ? 'var(--red)' : 'var(--green)' }" @click="filtro = 'A'">
        <span class="ico" :class="{ pulse: !carregandoAlertas && alertas.length > 0 }">!</span>
        <span>Usinas em alerta</span>
        <b v-if="carregandoAlertas" class="mn-calc"><i class="mn-spin" aria-hidden="true"></i>calculando…</b>
        <b v-else>{{ alertas.length }}</b>
        <small>abaixo da projeção em 3+ meses</small>
      </button>
      <button v-for="k in ['1', '2', '3']" :key="k" class="lx-kpi mn-kpi" :class="{ on: filtro === k }" :style="{ '--c': STATUS[k].c }" @click="filtro = k">
        <span class="ico">{{ k === '1' ? '◷' : k === '2' ? '⚙' : '✓' }}</span>
        <span>{{ k === '1' ? 'Programadas' : k === '2' ? 'Em andamento' : 'Realizadas' }}</span>
        <b>{{ carregandoLista ? '…' : contagem[k] }}</b>
        <small>{{ k === '1' ? 'aguardando execução' : k === '2' ? 'sendo executadas' : 'concluídas' }}</small>
      </button>
    </section>

    <section class="lx-panel">
      <div class="lx-panel-hd">
        <div>
          <h3 v-if="filtro === 'A'"><span class="lx-ic" style="--c:var(--red)">!</span>Usinas em alerta</h3>
          <h3 v-else><span class="lx-ic" style="--c:var(--purple)">⚙</span>Lista de manutenções</h3>
          <p v-if="filtro === 'A'">Janela de 12 meses até {{ MR }}. A etiqueta vem do checklist de vistoria deste mês.</p>
          <p v-else>{{ carregandoLista ? 'Carregando…' : `${lista.length} ${lista.length === 1 ? 'manutenção' : 'manutenções'}` }}</p>
        </div>
        <div class="mn-tools">
          <label class="lx-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="busca" class="lx-input" type="search" placeholder="Buscar usina, UC, empresa…" aria-label="Buscar">
          </label>
          <div class="lx-seg" role="group" aria-label="Filtrar">
            <button v-for="f in FILTROS" :key="f.v" :class="{ on: filtro === f.v }" :style="{ '--c': f.c }" :aria-pressed="filtro === f.v" @click="filtro = f.v">{{ f.txt }}</button>
          </div>
        </div>
      </div>

      <!-- Alertas -->
      <template v-if="filtro === 'A'">
        <div v-if="carregandoAlertas" class="mn-load" role="status"><i class="mn-spin" aria-hidden="true"></i>Calculando alertas a partir da geração e da projeção…</div>
        <p v-else-if="!listaAlertas.length" class="lx-empty">
          {{ alertas.length ? 'Nenhuma usina em alerta com essa busca.' : 'Nenhuma usina ficou abaixo da projeção em 3 ou mais meses nos últimos 12 meses.' }}
        </p>
        <div v-else class="lx-tbl-wrap">
          <table class="lx-tbl">
            <thead><tr><th>Usina</th><th>UC</th><th class="c">Meses abaixo</th><th>Últ. manutenção realizada</th><th class="c">Checklist</th><th class="c">Acesso</th></tr></thead>
            <tbody>
              <tr v-for="a in listaAlertas" :key="a.id">
                <td><NuxtLink :to="`/usinas/${a.id}`" class="mn-link">{{ a.nome }}</NuxtLink></td>
                <td class="lx-mono">{{ a.usina?.uc ?? '—' }}</td>
                <td class="c"><span class="lx-pill" style="--c:var(--red)">{{ a.qtd }} de 12</span></td>
                <td>{{ ultimaRealizada.get(String(a.id)) ? dataBR(ultimaRealizada.get(String(a.id))) : 'Nenhuma realizada' }}</td>
                <td class="c"><span class="lx-pill" :style="{ '--c': a.status.cor }"><i></i>{{ a.status.txt }}</span></td>
                <td class="c">
                  <NuxtLink :to="`/usinas/${a.id}`" class="lx-icon-btn" title="Ver usina" :aria-label="`Ver ${a.nome}`">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Manutenções -->
      <template v-else>
        <div v-if="carregandoLista" class="mn-load" role="status"><i class="mn-spin" aria-hidden="true"></i>Carregando manutenções…</div>
        <p v-else-if="!lista.length" class="lx-empty">Nenhuma manutenção encontrada.</p>
        <div v-else class="lx-tbl-wrap">
          <table class="lx-tbl">
            <thead><tr><th>Data</th><th>Usina</th><th>UC</th><th>Empresa</th><th>Descrição</th><th class="c">Status</th><th class="c">Acesso</th></tr></thead>
            <tbody>
              <tr v-for="m in lista" :key="m.id">
                <td class="mn-nw">{{ dataBR(m.data) }}</td>
                <td><NuxtLink :to="`/usinas/${m.idGeradora}`" class="mn-link">{{ usinaDe(m.idGeradora)?.nome ?? `Usina #${m.idGeradora}` }}</NuxtLink></td>
                <td class="lx-mono">{{ usinaDe(m.idGeradora)?.uc ?? '—' }}</td>
                <td>{{ m.empresa || '—' }}</td>
                <td class="mn-desc" :title="m.descricao">{{ m.descricao || '—' }}</td>
                <td class="c"><span class="lx-pill" :style="{ '--c': statusInfo(m.status).c }"><i></i>{{ statusInfo(m.status).txt }}</span></td>
                <td class="c">
                  <NuxtLink :to="`/usinas/${m.idGeradora}`" class="lx-icon-btn" title="Ver página da usina" aria-label="Ver página da usina">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.mn-kpi { font: inherit; color: inherit; text-align: left; cursor: pointer; transition: border-color .2s, box-shadow .2s, transform .2s; }
.mn-kpi:hover { transform: translateY(-2px); }
.mn-kpi.on { border-color: var(--c); box-shadow: 0 0 30px -12px var(--c); }
.mn-kpi:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.mn-calc { display: flex; align-items: center; gap: 8px; font-size: 15px !important; color: var(--mut) !important; font-weight: 600; padding: 5px 0; }
.ico.pulse { animation: mnPulse 1.6s ease-out infinite; }
@keyframes mnPulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 70%, transparent); }
  70% { box-shadow: 0 0 0 10px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}
.mn-spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--teal); animation: mnSpin .8s linear infinite; flex: none; }
@keyframes mnSpin { to { transform: rotate(1turn); } }
.mn-load { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 28px 12px; color: var(--mut); font-size: 13px; }
.mn-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mn-link { color: var(--tx); text-decoration: none; font-weight: 600; }
.mn-link:hover { color: var(--teal); }
.mn-nw { white-space: nowrap; }
.mn-desc { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--mut); }
@media (max-width: 640px) { .mn-tools, .mn-tools .lx-search { width: 100%; } }
</style>
