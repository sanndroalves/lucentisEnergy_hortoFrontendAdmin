<script setup>
import { ref, computed } from 'vue';
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import { useEnergyFormat } from '~/composables/useEnergyFormat';

useHead({ title: 'Usinas' });
definePageMeta({ middleware: 'sidebase-auth' });

const { numero } = useEnergyFormat();

const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);

// ─── Status ───
const STATUS = {
  L: { txt: 'Ligada', c: 'var(--green)' },
  D: { txt: 'Desligada', c: 'var(--red)' },
  M: { txt: 'Manutenção', c: 'var(--orange)' },
};
const statusInfo = (s) => STATUS[s] ?? { txt: 'Desconhecido', c: 'var(--mut)' };
const ORDEM = { L: 0, M: 1, D: 2 };

const lista = computed(() => [...(usinas.value ?? [])].sort((a, b) => (ORDEM[a.status] ?? 9) - (ORDEM[b.status] ?? 9) || String(a.nome).localeCompare(String(b.nome))));
const ligadas    = computed(() => lista.value.filter(u => u.status === 'L').length);
const desligadas = computed(() => lista.value.filter(u => u.status === 'D').length);
const manutencao = computed(() => lista.value.filter(u => u.status === 'M').length);
const potenciaKwp = computed(() => lista.value.reduce((s, u) => s + (parseFloat(u.potencia) || 0), 0));
const potenciaTxt = computed(() => (potenciaKwp.value >= 1000 ? `${numero(potenciaKwp.value / 1000, 2)} MWp` : `${numero(potenciaKwp.value, 0)} kWp`));

// ─── Busca / filtro / visualização ───
const busca = ref('');
const filtro = ref('T');
const visao = ref('cards');
const FILTROS = [
  { v: 'T', txt: 'Todas', c: 'var(--teal)' },
  { v: 'L', txt: 'Ligadas', c: 'var(--green)' },
  { v: 'M', txt: 'Manutenção', c: 'var(--orange)' },
  { v: 'D', txt: 'Desligadas', c: 'var(--red)' },
];
const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const filtradas = computed(() => {
  const q = normalizar(busca.value.trim());
  return lista.value.filter(u =>
    (filtro.value === 'T' || u.status === filtro.value) &&
    (!q || normalizar(u.nome).includes(q) || String(u.uc ?? '').includes(q) || normalizar(u.endereco).includes(q)),
  );
});
const dataBR = (d) => {
  if (!d) return '—';
  const dt = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d);
  return isNaN(dt) ? '—' : dt.toLocaleDateString('pt-BR');
};

// ─── Edição (mesma lógica de antes: PUT /usina/:id) ───
const dialog = ref(false);
const usinaId = ref('');
const ucUsina = ref('');
const nomeUsina = ref('');
const dataInicioUsina = ref('');
const potenciaUsina = ref('');
const enderecoUsina = ref('');
const statusUsina = ref('');
const tensaoUsina = ref('');
const showSuccessAlert = ref(false);
const showErrorAlert = ref(false);
const showErrorCampo = ref(false);
const salvando = ref(false);

const openDialog = async (idUsina) => {
  showErrorAlert.value = false; showErrorCampo.value = false; showSuccessAlert.value = false;
  const { data: u } = await useFetch(`${API_BASE_URL}/usina/${idUsina}`);
  ucUsina.value = u.value.uc;
  nomeUsina.value = u.value.nome;
  dataInicioUsina.value = u.value.dataInicio;
  potenciaUsina.value = u.value.potencia;
  enderecoUsina.value = u.value.endereco;
  statusUsina.value = u.value.status;
  tensaoUsina.value = u.value.tensao;
  usinaId.value = idUsina;
  dialog.value = true;
};

const saveChanges = async () => {
  showErrorAlert.value = false; showSuccessAlert.value = false;
  if (!ucUsina.value || !nomeUsina.value || !dataInicioUsina.value || !potenciaUsina.value || !enderecoUsina.value || !statusUsina.value) {
    showErrorCampo.value = true; return;
  }
  showErrorCampo.value = false;
  salvando.value = true;
  try {
    const response = await useFetch(`${API_BASE_URL}/usina/${usinaId.value}`, {
      method: 'PUT',
      body: {
        uc: ucUsina.value, nome: nomeUsina.value, dataInicio: dataInicioUsina.value, potencia: potenciaUsina.value,
        endereco: enderecoUsina.value, status: statusUsina.value, tensao: tensaoUsina.value,
      },
      key: 'usinaPut',
    });
    if (response && !response.error?.value) showSuccessAlert.value = true;
    else showErrorAlert.value = true;
  } catch { showErrorAlert.value = true; }
  const { data: upd } = await useFetch(`${API_BASE_URL}/usina/`);
  usinas.value = upd.value;
  salvando.value = false;
};
</script>

<template>
  <div class="lx-page">
    <!-- Cabeçalho -->
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span><span>Fotovoltaico</span><span class="sep">›</span><b>Usinas</b>
        </nav>
        <h1 class="lx-title">Usinas <span class="grad">fotovoltaicas</span></h1>
        <p class="lx-sub">Gestão e monitoramento das usinas geradoras do município</p>
      </div>
      <div class="lx-head-actions">
        <NuxtLink to="/usinas/criar/" class="lx-btn" style="--c1:var(--orange);--c2:#ff5f6d">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova usina
        </NuxtLink>
      </div>
    </header>

    <!-- KPIs -->
    <section class="lx-kpis">
      <div class="lx-kpi" style="--c:var(--teal)"><span class="ico">☀</span><span>Usinas cadastradas</span><b>{{ lista.length }}</b><small>no sistema</small></div>
      <div class="lx-kpi" style="--c:var(--green)"><span class="ico">⚡</span><span>Ligadas</span><b>{{ ligadas }}</b><small>operando normalmente</small></div>
      <div class="lx-kpi" style="--c:var(--orange)"><span class="ico">⚙</span><span>Em manutenção</span><b>{{ manutencao }}</b><small>temporariamente paradas</small></div>
      <div class="lx-kpi" style="--c:var(--red)"><span class="ico">⏻</span><span>Desligadas</span><b>{{ desligadas }}</b><small>fora de operação</small></div>
      <div class="lx-kpi" style="--c:var(--purple)"><span class="ico">▦</span><span>Potência instalada</span><b>{{ potenciaTxt }}</b><small>soma das usinas</small></div>
    </section>

    <!-- Lista -->
    <section class="lx-panel">
      <div class="lx-panel-hd">
        <div>
          <h3><span class="lx-ic" style="--c:var(--orange)">☀</span>Lista de usinas</h3>
          <p>{{ filtradas.length }} de {{ lista.length }} {{ lista.length === 1 ? 'usina' : 'usinas' }}</p>
        </div>
        <div class="us-tools">
          <label class="lx-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="busca" class="lx-input" type="search" placeholder="Buscar por nome, UC ou endereço" aria-label="Buscar usina">
          </label>
          <div class="lx-seg" role="group" aria-label="Filtrar por status">
            <button v-for="f in FILTROS" :key="f.v" :class="{ on: filtro === f.v }" :style="{ '--c': f.c }" @click="filtro = f.v">{{ f.txt }}</button>
          </div>
          <div class="lx-seg" role="group" aria-label="Visualização">
            <button :class="{ on: visao === 'cards' }" title="Cartões" aria-label="Ver em cartões" @click="visao = 'cards'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            </button>
            <button :class="{ on: visao === 'tabela' }" title="Tabela" aria-label="Ver em tabela" @click="visao = 'tabela'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>
            </button>
          </div>
        </div>
      </div>

      <p v-if="!filtradas.length" class="lx-empty">Nenhuma usina encontrada com esses filtros.</p>

      <!-- Cartões -->
      <div v-else-if="visao === 'cards'" class="us-grid">
        <article v-for="u in filtradas" :key="u.id" class="us-card" :style="{ '--c': statusInfo(u.status).c }">
          <div class="us-card-top">
            <span class="lx-pill" :style="{ '--c': statusInfo(u.status).c }"><i></i>{{ statusInfo(u.status).txt }}</span>
            <div class="us-acts">
              <NuxtLink :to="`/usinas/${u.id}`" class="lx-icon-btn" style="--c:var(--teal)" title="Ver detalhes" :aria-label="`Ver ${u.nome}`">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </NuxtLink>
              <button class="lx-icon-btn" style="--c:var(--purple)" title="Editar" :aria-label="`Editar ${u.nome}`" @click="openDialog(u.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          </div>
          <NuxtLink :to="`/usinas/${u.id}`" class="us-nome">{{ u.nome }}</NuxtLink>
          <p class="us-end" :title="u.endereco">{{ u.endereco || 'Endereço não informado' }}</p>
          <div class="us-meta">
            <div><span>Potência</span><b>{{ numero(parseFloat(u.potencia) || 0, 2) }} <small>kWp</small></b></div>
            <div><span>Tensão</span><b>{{ u.tensao || '—' }}</b></div>
            <div><span>UC</span><b class="lx-mono">{{ u.uc }}</b></div>
            <div><span>Início</span><b>{{ dataBR(u.dataInicio) }}</b></div>
          </div>
        </article>
      </div>

      <!-- Tabela -->
      <div v-else class="lx-tbl-wrap">
        <table class="lx-tbl">
          <thead>
            <tr><th>ID</th><th>UC</th><th>Nome</th><th class="r">Potência (kWp)</th><th class="c">Tensão</th><th>Início</th><th class="c">Status</th><th class="c">Ações</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in filtradas" :key="u.id">
              <td class="lx-mono">{{ u.id }}</td>
              <td class="lx-mono">{{ u.uc }}</td>
              <td><NuxtLink :to="`/usinas/${u.id}`" class="us-link">{{ u.nome }}</NuxtLink></td>
              <td class="r">{{ numero(parseFloat(u.potencia) || 0, 2) }}</td>
              <td class="c">{{ u.tensao || '—' }}</td>
              <td>{{ dataBR(u.dataInicio) }}</td>
              <td class="c"><span class="lx-pill" :style="{ '--c': statusInfo(u.status).c }"><i></i>{{ statusInfo(u.status).txt }}</span></td>
              <td class="c">
                <div class="us-acts c">
                  <NuxtLink :to="`/usinas/${u.id}`" class="lx-icon-btn" style="--c:var(--teal)" title="Ver detalhes" :aria-label="`Ver ${u.nome}`">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </NuxtLink>
                  <button class="lx-icon-btn" style="--c:var(--purple)" title="Editar" :aria-label="`Editar ${u.nome}`" @click="openDialog(u.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Editar usina -->
    <LxDialog v-model="dialog" titulo="Editar usina" :subtitulo="nomeUsina" icone="✎" cor="var(--purple)" :largura="620">
      <div v-if="showErrorCampo" class="lx-alert err">Preencha todos os campos.</div>
      <div v-if="showSuccessAlert" class="lx-alert ok">Usina editada com sucesso.</div>
      <div v-if="showErrorAlert" class="lx-alert err">Erro ao editar a usina.</div>
      <div class="lx-form">
        <div class="lx-field"><label for="us-uc">UC</label><input id="us-uc" v-model="ucUsina" type="number" class="lx-input"></div>
        <div class="lx-field"><label for="us-nome">Nome</label><input id="us-nome" v-model="nomeUsina" class="lx-input"></div>
        <div class="lx-field"><label for="us-ini">Data de início</label><input id="us-ini" v-model="dataInicioUsina" type="date" class="lx-input"></div>
        <div class="lx-field"><label for="us-pot">Potência (kWp)</label><input id="us-pot" v-model="potenciaUsina" type="number" step="0.01" class="lx-input"></div>
        <div class="lx-field full"><label for="us-end">Endereço</label><input id="us-end" v-model="enderecoUsina" class="lx-input"></div>
        <div class="lx-field">
          <label>Tensão</label>
          <div class="lx-seg" role="radiogroup" aria-label="Tensão">
            <button v-for="t in ['BT', 'MT']" :key="t" role="radio" :aria-checked="tensaoUsina === t" :class="{ on: tensaoUsina === t }" @click="tensaoUsina = t">{{ t }}</button>
          </div>
        </div>
        <div class="lx-field">
          <label>Status</label>
          <div class="lx-seg" role="radiogroup" aria-label="Status">
            <button v-for="(s, k) in STATUS" :key="k" role="radio" :aria-checked="statusUsina === k" :class="{ on: statusUsina === k }" :style="{ '--c': s.c }" @click="statusUsina = k">{{ s.txt }}</button>
          </div>
        </div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dialog = false">Cancelar</button>
        <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" :disabled="salvando" @click="saveChanges">{{ salvando ? 'Salvando…' : 'Salvar alterações' }}</button>
      </template>
    </LxDialog>
  </div>
</template>

<style scoped>
.us-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.us-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.us-card {
  position: relative; overflow: hidden;
  background: var(--card2); border: 1px solid var(--line); border-radius: 18px; padding: 15px 16px 14px;
  transition: transform .2s, border-color .2s, box-shadow .2s;
}
.us-card::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: var(--c); box-shadow: 0 0 14px var(--c); }
.us-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--c) 55%, transparent); box-shadow: 0 0 34px -14px var(--c); }
.us-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.us-acts { display: flex; gap: 6px; }
.us-acts.c { justify-content: center; }
.us-nome { display: block; font-size: 14.5px; font-weight: 600; color: var(--tx); text-decoration: none; line-height: 1.3; }
.us-nome:hover { color: var(--teal); }
.us-end { font-size: 12px; color: var(--mut); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.us-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
.us-meta div { background: rgba(255, 255, 255, .04); border-radius: 10px; padding: 7px 9px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.us-meta span { font-size: 10.5px; color: var(--mut); }
.us-meta b { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.us-meta small { font-size: 10.5px; color: var(--mut); font-weight: 400; }
.us-link { color: var(--tx); text-decoration: none; font-weight: 600; }
.us-link:hover { color: var(--teal); }
@media (max-width: 640px) { .us-tools, .us-tools .lx-search { width: 100%; } }
</style>
