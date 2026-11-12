<script setup>
import { ref, computed } from 'vue';
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import { statusChecklistDe } from '~/composables/useAlertasUsinas';

useHead({ title: 'Checklist' });
definePageMeta({ middleware: 'sidebase-auth' });

const { data: usinas, pending: pUsinas } = useLazyFetch(`${API_BASE_URL}/usina/`);
const { data: checklists, pending: pCheck, refresh: recarregar } = useLazyFetch(`${API_BASE_URL}/checklist/`);
const carregando = computed(() => pUsinas.value || pCheck.value);

const lUsinas = computed(() => [...(usinas.value ?? [])].sort((a, b) => String(a.nome).localeCompare(String(b.nome))));
const lChecks = computed(() => checklists.value ?? []);

// ─── Situações ───
const SIT = {
  O: { txt: 'Ótimo', c: 'var(--green)' },
  B: { txt: 'Bom', c: 'var(--teal)' },
  R: { txt: 'Ruim', c: 'var(--orange)' },
  Q: { txt: 'Quebrado', c: 'var(--red)' },
  M: { txt: 'Manutenção', c: 'var(--purple)' },
};
const sit = (s) => SIT[s] ?? { txt: 'Desconhecido', c: 'var(--mut)' };
const ITENS = [
  { k: 'placa', txt: 'Situação das placas' },
  { k: 'inversor', txt: 'Situação do inversor' },
  { k: 'roteador', txt: 'Situação do sinal Wi-Fi' },
];

// ─── Mês corrente ───
const hoje = new Date();
const doMesAtual = (c) => { const d = new Date(c.data); return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear(); };
const MES_TXT = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const usinasFeitasMes = computed(() => new Set(lChecks.value.filter(doMesAtual).map(c => String(c.idUsina))));
const status = (idUsina) => statusChecklistDe(lChecks.value, idUsina);

const resumo = computed(() => {
  const feitas = lUsinas.value.filter(u => usinasFeitasMes.value.has(String(u.id))).length;
  return {
    aFazer: lUsinas.value.length - feitas,
    feitas,
    total: lChecks.value.length,
    verificar: lUsinas.value.filter(u => status(u.id).txt === 'Verificar').length,
  };
});

// ─── Tabela de usinas ───
const aba = ref('lista');
const busca = ref('');
const filtroMes = ref('T');
const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const porUsina = computed(() => {
  const m = new Map();
  lChecks.value.forEach(c => {
    const k = String(c.idUsina);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(c);
  });
  m.forEach(l => l.sort((a, b) => String(b.data).localeCompare(String(a.data))));
  return m;
});
const linhas = computed(() => {
  const q = normalizar(busca.value.trim());
  return lUsinas.value
    .filter(u => !q || normalizar(u.nome).includes(q) || String(u.uc ?? '').includes(q))
    .filter(u => filtroMes.value === 'T' || (filtroMes.value === 'F') === usinasFeitasMes.value.has(String(u.id)))
    .map(u => { const l = porUsina.value.get(String(u.id)) ?? []; return { u, qtd: l.length, ultimo: l[0] ?? null, st: status(u.id) }; });
});
const mesAno = (d) => { const dt = new Date(d); return isNaN(dt) ? '—' : `${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`; };
const dataBR = (d) => { const dt = new Date(d); return isNaN(dt) ? '—' : dt.toLocaleDateString('pt-BR'); };

// ─── Novo checklist (mesma regra de antes: um por usina por mês) ───
const usinaSel = ref('');
const resp = ref({ placa: '', inversor: '', roteador: '' });
const comentario = ref('');
const tentou = ref(false);
const enviando = ref(false);
const aviso = ref(null); // { tipo: 'ok'|'err'|'warn', txt }

const faltando = computed(() => ({
  usina: !usinaSel.value,
  placa: !resp.value.placa, inversor: !resp.value.inversor, roteador: !resp.value.roteador,
  comentario: !String(comentario.value).trim(),
}));
const invalido = (k) => tentou.value && faltando.value[k];
const jaFeitoMes = computed(() => !!usinaSel.value && usinasFeitasMes.value.has(String(usinaSel.value)));

const novoChecklist = (idUsina = '') => {
  usinaSel.value = idUsina ? String(idUsina) : '';
  resp.value = { placa: '', inversor: '', roteador: '' };
  comentario.value = '';
  tentou.value = false;
  aviso.value = null;
  aba.value = 'novo';
};

const enviarCheck = async () => {
  tentou.value = true;
  aviso.value = null;
  if (Object.values(faltando.value).some(Boolean)) { aviso.value = { tipo: 'err', txt: 'Preencha todos os campos antes de enviar o checklist.' }; return; }
  enviando.value = true;
  try {
    // confere de novo no servidor, caso alguém tenha lançado agora
    const daUsina = await $fetch(`${API_BASE_URL}/checklist?idUsina=${usinaSel.value}`);
    if ((daUsina ?? []).some(doMesAtual)) {
      aviso.value = { tipo: 'warn', txt: 'O checklist dessa usina já foi preenchido neste mês.' };
    } else {
      await $fetch(`${API_BASE_URL}/checklist/`, {
        method: 'POST',
        body: { idUsina: Number(usinaSel.value), sitPlaca: resp.value.placa, sitInversor: resp.value.inversor, sitRoteador: resp.value.roteador, comentario: comentario.value },
      });
      aviso.value = { tipo: 'ok', txt: 'Checklist enviado com sucesso.' };
      resp.value = { placa: '', inversor: '', roteador: '' };
      comentario.value = '';
      tentou.value = false;
      await recarregar();
    }
  } catch (e) {
    console.error(e);
    aviso.value = { tipo: 'err', txt: 'Erro ao enviar o checklist.' };
  }
  enviando.value = false;
};

// ─── Histórico de uma usina ───
const dialog = ref(false);
const usinaDlg = ref(null);
const checksDlg = computed(() => (usinaDlg.value ? porUsina.value.get(String(usinaDlg.value.id)) ?? [] : []));
const abrirHistorico = (u) => { usinaDlg.value = u; dialog.value = true; };

const excluindo = ref(null);
const deleteCheck = async (check) => {
  if (!confirm(`Excluir o checklist de ${mesAno(check.data)}?`)) return;
  excluindo.value = check.id;
  try {
    await $fetch(`${API_BASE_URL}/checklist/${check.id}`, { method: 'DELETE' });
    await recarregar();
  } catch (e) {
    console.error(e);
    alert('Erro ao excluir o checklist.');
  }
  excluindo.value = null;
};
</script>

<template>
  <div class="lx-page">
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span><span>Fotovoltaico</span><span class="sep">›</span><b>Checklist</b>
        </nav>
        <h1 class="lx-title">Checklist <span class="grad">de vistoria</span></h1>
        <p class="lx-sub">Vistoria mensal em campo de placas, inversor e sinal Wi-Fi de cada usina</p>
      </div>
      <div class="lx-head-actions">
        <button class="lx-btn" style="--c1:var(--teal);--c2:var(--green)" @click="novoChecklist()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo checklist
        </button>
      </div>
    </header>

    <section class="lx-kpis">
      <div class="lx-kpi" style="--c:var(--orange)"><span class="ico">◷</span><span>A fazer no mês</span><b>{{ carregando ? '…' : resumo.aFazer }}</b><small>usinas sem checklist em {{ MES_TXT }}</small></div>
      <div class="lx-kpi" style="--c:var(--green)"><span class="ico">✓</span><span>Feitos no mês</span><b>{{ carregando ? '…' : resumo.feitas }}</b><small>de {{ lUsinas.length }} usinas</small></div>
      <div class="lx-kpi" style="--c:var(--red)"><span class="ico">!</span><span>Para verificar</span><b>{{ carregando ? '…' : resumo.verificar }}</b><small>com item ruim, quebrado ou em manutenção</small></div>
      <div class="lx-kpi" style="--c:var(--purple)"><span class="ico">▦</span><span>Realizados (geral)</span><b>{{ carregando ? '…' : resumo.total }}</b><small>desde o início</small></div>
    </section>

    <div class="lx-seg ck-abas" role="tablist" aria-label="Seções">
      <button role="tab" :aria-selected="aba === 'lista'" :class="{ on: aba === 'lista' }" @click="aba = 'lista'">Usinas</button>
      <button role="tab" :aria-selected="aba === 'novo'" :class="{ on: aba === 'novo' }" style="--c:var(--green)" @click="aba = 'novo'">Novo checklist</button>
    </div>

    <!-- ── Lista de usinas ── -->
    <section v-if="aba === 'lista'" class="lx-panel">
      <div class="lx-panel-hd">
        <div>
          <h3><span class="lx-ic" style="--c:var(--teal)">☀</span>Situação por usina</h3>
          <p>Status calculado pelo checklist de {{ MES_TXT }}</p>
        </div>
        <div class="ck-tools">
          <label class="lx-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="busca" class="lx-input" type="search" placeholder="Buscar por nome ou UC" aria-label="Buscar usina">
          </label>
          <div class="lx-seg" role="group" aria-label="Filtrar pelo mês">
            <button :class="{ on: filtroMes === 'T' }" @click="filtroMes = 'T'">Todas</button>
            <button :class="{ on: filtroMes === 'P' }" style="--c:var(--orange)" @click="filtroMes = 'P'">Pendentes</button>
            <button :class="{ on: filtroMes === 'F' }" style="--c:var(--green)" @click="filtroMes = 'F'">Feitas</button>
          </div>
        </div>
      </div>

      <div v-if="carregando" class="ck-load" role="status"><i class="ck-spin" aria-hidden="true"></i>Carregando checklists…</div>
      <p v-else-if="!linhas.length" class="lx-empty">Nenhuma usina encontrada.</p>
      <div v-else class="lx-tbl-wrap">
        <table class="lx-tbl">
          <thead><tr><th>UC</th><th>Usina</th><th class="c">Checklists</th><th>Último</th><th class="c">Status do mês</th><th class="c">Ações</th></tr></thead>
          <tbody>
            <tr v-for="l in linhas" :key="l.u.id">
              <td class="lx-mono">{{ l.u.uc }}</td>
              <td><NuxtLink :to="`/usinas/${l.u.id}`" class="ck-link">{{ l.u.nome }}</NuxtLink></td>
              <td class="c">{{ l.qtd }}</td>
              <td>{{ l.ultimo ? dataBR(l.ultimo.data) : '—' }}</td>
              <td class="c"><span class="lx-pill" :style="{ '--c': l.st.cor }"><i></i>{{ l.st.txt }}</span></td>
              <td class="c">
                <div class="ck-acts">
                  <button class="lx-icon-btn" style="--c:var(--teal)" title="Ver checklists" :aria-label="`Ver checklists de ${l.u.nome}`" @click="abrirHistorico(l.u)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  </button>
                  <button v-if="!usinasFeitasMes.has(String(l.u.id))" class="lx-icon-btn" style="--c:var(--green)" title="Fazer checklist" :aria-label="`Fazer checklist de ${l.u.nome}`" @click="novoChecklist(l.u.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ── Novo checklist ── -->
    <section v-else class="lx-panel accent" style="--c:var(--green)">
      <div class="lx-panel-hd">
        <div>
          <h3><span class="lx-ic" style="--c:var(--green)">✓</span>Novo checklist</h3>
          <p>Um checklist por usina por mês · {{ MES_TXT }}</p>
        </div>
      </div>

      <div v-if="aviso" class="lx-alert" :class="aviso.tipo">{{ aviso.txt }}</div>

      <form class="lx-form" @submit.prevent="enviarCheck">
        <div class="lx-field full" :class="{ inv: invalido('usina') }">
          <label for="ck-usina">Usina *</label>
          <select id="ck-usina" v-model="usinaSel" class="lx-input" :disabled="carregando">
            <option value="" disabled>{{ carregando ? 'Carregando usinas…' : 'Selecione a usina' }}</option>
            <option v-for="u in lUsinas" :key="u.id" :value="String(u.id)">{{ u.nome }}{{ usinasFeitasMes.has(String(u.id)) ? ' (já feito este mês)' : '' }}</option>
          </select>
          <small v-if="jaFeitoMes" class="ck-warn">Essa usina já tem checklist em {{ MES_TXT }}.</small>
        </div>

        <div v-for="it in ITENS" :key="it.k" class="lx-field full" :class="{ inv: invalido(it.k) }">
          <label>{{ it.txt }} *</label>
          <div class="lx-seg" role="radiogroup" :aria-label="it.txt">
            <button v-for="(s, k) in SIT" :key="k" type="button" role="radio" :aria-checked="resp[it.k] === k" :class="{ on: resp[it.k] === k }" :style="{ '--c': s.c }" @click="resp[it.k] = k">{{ s.txt }}</button>
          </div>
        </div>

        <div class="lx-field full" :class="{ inv: invalido('comentario') }">
          <label for="ck-com">Comentário *</label>
          <textarea id="ck-com" v-model="comentario" rows="3" class="lx-input" placeholder="Observações da vistoria"></textarea>
        </div>

        <div class="ck-ft full">
          <button type="button" class="lx-btn-ghost" @click="aba = 'lista'">Voltar para a lista</button>
          <button type="submit" class="lx-btn" style="--c1:var(--teal);--c2:var(--green)" :disabled="enviando || carregando">{{ enviando ? 'Enviando…' : 'Enviar checklist' }}</button>
        </div>
      </form>
    </section>

    <!-- ── Histórico da usina ── -->
    <LxDialog v-model="dialog" titulo="Checklists realizados" :subtitulo="usinaDlg?.nome" icone="✓" cor="var(--teal)" :largura="960">
      <div v-if="usinaDlg" class="ck-dlg-st">
        <span>Status em {{ MES_TXT }}</span>
        <span class="lx-pill" :style="{ '--c': status(usinaDlg.id).cor }"><i></i>{{ status(usinaDlg.id).txt }}</span>
      </div>
      <p v-if="!checksDlg.length" class="lx-empty">Nenhum checklist para essa usina.</p>
      <div v-else class="lx-tbl-wrap">
        <table class="lx-tbl">
          <thead><tr><th>Mês</th><th class="c">Placas</th><th class="c">Inversor</th><th class="c">Wi-Fi</th><th>Comentário</th><th class="c">Ações</th></tr></thead>
          <tbody>
            <tr v-for="c in checksDlg" :key="c.id">
              <td class="lx-mono">{{ mesAno(c.data) }}</td>
              <td class="c"><span class="lx-pill" :style="{ '--c': sit(c.sitPlaca).c }">{{ sit(c.sitPlaca).txt }}</span></td>
              <td class="c"><span class="lx-pill" :style="{ '--c': sit(c.sitInversor).c }">{{ sit(c.sitInversor).txt }}</span></td>
              <td class="c"><span class="lx-pill" :style="{ '--c': sit(c.sitRoteador).c }">{{ sit(c.sitRoteador).txt }}</span></td>
              <td class="ck-com">{{ c.comentario || '—' }}</td>
              <td class="c">
                <button class="lx-icon-btn" style="--c:var(--red)" title="Excluir checklist" aria-label="Excluir checklist" :disabled="excluindo === c.id" @click="deleteCheck(c)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dialog = false">Fechar</button>
      </template>
    </LxDialog>
  </div>
</template>

<style scoped>
.ck-abas { margin-bottom: 14px; }
.ck-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ck-acts { display: flex; gap: 6px; justify-content: center; }
.ck-link { color: var(--tx); text-decoration: none; font-weight: 600; }
.ck-link:hover { color: var(--teal); }
.ck-load { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 28px 12px; color: var(--mut); font-size: 13px; }
.ck-spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--teal); animation: ckSpin .8s linear infinite; flex: none; }
@keyframes ckSpin { to { transform: rotate(1turn); } }
.ck-warn { font-size: 11.5px; color: var(--orange); }
.ck-ft { display: flex; justify-content: flex-end; gap: 10px; padding-top: 14px; margin-top: 4px; border-top: 1px solid var(--line2); flex-wrap: wrap; }
.lx-field.inv .lx-input, .lx-field.inv .lx-seg { border-color: var(--red); }
.lx-field.inv > label { color: var(--red); }
textarea.lx-input { resize: vertical; min-height: 80px; }
.ck-com { min-width: 220px; color: var(--mut); white-space: normal; }
.ck-dlg-st { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; margin-bottom: 14px; border-radius: 14px; background: rgba(255, 255, 255, .04); font-size: 13px; color: var(--mut); }
@media (max-width: 640px) { .ck-tools, .ck-tools .lx-search { width: 100%; } }
</style>
