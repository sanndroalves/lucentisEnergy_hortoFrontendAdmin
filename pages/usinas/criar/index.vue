<script setup>
import { ref, computed } from 'vue';
import { useHead } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';
import { useEnergyFormat } from '~/composables/useEnergyFormat';

useHead({ title: 'Nova Usina' });
definePageMeta({ middleware: 'sidebase-auth' });

const { numero } = useEnergyFormat();

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
const enviando = ref(false);
const tentou = ref(false);

const STATUS = {
  L: { txt: 'Ligada', c: 'var(--green)' },
  D: { txt: 'Desligada', c: 'var(--red)' },
  M: { txt: 'Manutenção', c: 'var(--orange)' },
};

// campos obrigatórios (mesma regra de antes; tensão é opcional)
const faltando = computed(() => ({
  uc: !ucUsina.value,
  nome: !nomeUsina.value,
  data: !dataInicioUsina.value,
  potencia: !potenciaUsina.value,
  endereco: !enderecoUsina.value,
  status: !statusUsina.value,
}));
const invalido = (campo) => tentou.value && faltando.value[campo];

const dataBR = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : '—');

const sendUsina = async () => {
  tentou.value = true;
  showErrorAlert.value = false;
  showSuccessAlert.value = false;
  if (Object.values(faltando.value).some(Boolean)) { showErrorCampo.value = true; return; }
  showErrorCampo.value = false;
  enviando.value = true;
  try {
    const response = await useFetch(`${API_BASE_URL}/usina/`, {
      method: 'POST',
      body: { uc: ucUsina.value, nome: nomeUsina.value, dataInicio: dataInicioUsina.value, potencia: potenciaUsina.value, endereco: enderecoUsina.value, status: statusUsina.value, tensao: tensaoUsina.value },
      key: 'usinaPost',
    });
    if (response && !response.error?.value) showSuccessAlert.value = true;
    else showErrorAlert.value = true;
  } catch (error) {
    console.error(error);
    showErrorAlert.value = true;
  }
  enviando.value = false;
};

const novoCadastro = () => {
  ucUsina.value = ''; nomeUsina.value = ''; dataInicioUsina.value = ''; potenciaUsina.value = '';
  enderecoUsina.value = ''; statusUsina.value = ''; tensaoUsina.value = '';
  showSuccessAlert.value = false; showErrorAlert.value = false; showErrorCampo.value = false; tentou.value = false;
};
</script>

<template>
  <div class="lx-page">
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span>
          <NuxtLink to="/usinas/">Usinas</NuxtLink><span class="sep">›</span>
          <b>Nova usina</b>
        </nav>
        <h1 class="lx-title">Nova <span class="grad">usina</span></h1>
        <p class="lx-sub">Cadastro de uma nova usina fotovoltaica no sistema</p>
      </div>
      <div class="lx-head-actions">
        <NuxtLink to="/usinas/" class="lx-btn-ghost">← Voltar para usinas</NuxtLink>
      </div>
    </header>

    <div class="nc-grid">
      <!-- Formulário -->
      <section class="lx-panel accent" style="--c:var(--orange)">
        <div class="lx-panel-hd">
          <div>
            <h3><span class="lx-ic" style="--c:var(--orange)">☀</span>Dados da usina</h3>
            <p>Campos com * são obrigatórios</p>
          </div>
        </div>

        <div v-if="showErrorCampo" class="lx-alert err">Preencha todos os campos obrigatórios.</div>
        <div v-if="showErrorAlert" class="lx-alert err">Erro ao cadastrar a usina. Tente novamente.</div>
        <div v-if="showSuccessAlert" class="lx-alert ok nc-ok">
          <span>Usina cadastrada com sucesso.</span>
          <span class="nc-ok-acts">
            <button class="lx-btn-ghost sm" @click="novoCadastro">Cadastrar outra</button>
            <NuxtLink to="/usinas/" class="lx-btn sm">Ver usinas</NuxtLink>
          </span>
        </div>

        <form class="lx-form" @submit.prevent="sendUsina">
          <div class="lx-field" :class="{ inv: invalido('uc') }">
            <label for="nc-uc">UC *</label>
            <input id="nc-uc" v-model="ucUsina" type="number" class="lx-input" placeholder="Número da UC" :aria-invalid="invalido('uc')">
          </div>
          <div class="lx-field" :class="{ inv: invalido('nome') }">
            <label for="nc-nome">Nome *</label>
            <input id="nc-nome" v-model="nomeUsina" class="lx-input" placeholder="Nome da usina" :aria-invalid="invalido('nome')">
          </div>
          <div class="lx-field" :class="{ inv: invalido('data') }">
            <label for="nc-data">Data de início *</label>
            <input id="nc-data" v-model="dataInicioUsina" type="date" class="lx-input" :aria-invalid="invalido('data')">
          </div>
          <div class="lx-field" :class="{ inv: invalido('potencia') }">
            <label for="nc-pot">Potência (kWp) *</label>
            <input id="nc-pot" v-model="potenciaUsina" type="number" step="0.01" min="0" class="lx-input" placeholder="Ex.: 150" :aria-invalid="invalido('potencia')">
          </div>
          <div class="lx-field full" :class="{ inv: invalido('endereco') }">
            <label for="nc-end">Endereço *</label>
            <input id="nc-end" v-model="enderecoUsina" class="lx-input" placeholder="Endereço completo da usina" :aria-invalid="invalido('endereco')">
          </div>
          <div class="lx-field">
            <label>Tensão</label>
            <div class="lx-seg" role="radiogroup" aria-label="Tensão">
              <button v-for="t in ['BT', 'MT']" :key="t" type="button" role="radio" :aria-checked="tensaoUsina === t" :class="{ on: tensaoUsina === t }" @click="tensaoUsina = t">{{ t }}</button>
            </div>
          </div>
          <div class="lx-field" :class="{ inv: invalido('status') }">
            <label>Status *</label>
            <div class="lx-seg" role="radiogroup" aria-label="Status">
              <button v-for="(s, k) in STATUS" :key="k" type="button" role="radio" :aria-checked="statusUsina === k" :class="{ on: statusUsina === k }" :style="{ '--c': s.c }" @click="statusUsina = k">{{ s.txt }}</button>
            </div>
          </div>

          <div class="nc-ft full">
            <NuxtLink to="/usinas/" class="lx-btn-ghost">Cancelar</NuxtLink>
            <button type="submit" class="lx-btn" style="--c1:var(--orange);--c2:#ff5f6d" :disabled="enviando">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              {{ enviando ? 'Cadastrando…' : 'Cadastrar usina' }}
            </button>
          </div>
        </form>
      </section>

      <!-- Prévia -->
      <aside class="lx-panel nc-prev" :style="{ '--c': STATUS[statusUsina]?.c ?? 'var(--teal)' }">
        <div class="lx-panel-hd"><h3><span class="lx-ic" :style="{ '--c': STATUS[statusUsina]?.c ?? 'var(--teal)' }">◉</span>Prévia</h3></div>
        <article class="nc-card">
          <span class="lx-pill" :style="{ '--c': STATUS[statusUsina]?.c ?? 'var(--mut)' }"><i></i>{{ STATUS[statusUsina]?.txt ?? 'Sem status' }}</span>
          <strong class="nc-nome">{{ nomeUsina || 'Nome da usina' }}</strong>
          <p class="nc-end">{{ enderecoUsina || 'Endereço da usina' }}</p>
          <div class="nc-meta">
            <div><span>Potência</span><b>{{ potenciaUsina ? numero(Number(potenciaUsina), 2) : '—' }} <small>kWp</small></b></div>
            <div><span>Tensão</span><b>{{ tensaoUsina || '—' }}</b></div>
            <div><span>UC</span><b class="lx-mono">{{ ucUsina || '—' }}</b></div>
            <div><span>Início</span><b>{{ dataBR(dataInicioUsina) }}</b></div>
          </div>
        </article>
        <p class="nc-dica">É assim que a usina vai aparecer na lista de usinas.</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.nc-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
.nc-ft { display: flex; justify-content: flex-end; gap: 10px; padding-top: 14px; margin-top: 4px; border-top: 1px solid var(--line2); }
.lx-field.inv .lx-input { border-color: var(--red); box-shadow: 0 0 0 3px rgba(255, 107, 74, .15); }
.lx-field.inv > label { color: var(--red); }
.lx-field.inv .lx-seg { border-color: var(--red); }
.nc-ok { justify-content: space-between; flex-wrap: wrap; }
.nc-ok-acts { display: flex; gap: 8px; margin-left: auto; }
.nc-prev { position: sticky; top: 80px; }
.nc-card {
  position: relative; overflow: hidden; background: var(--card2); border: 1px solid var(--line); border-radius: 18px; padding: 15px 16px 14px;
  display: flex; flex-direction: column; gap: 6px;
}
.nc-card::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: var(--c); box-shadow: 0 0 14px var(--c); }
.nc-card .lx-pill { align-self: flex-start; margin-bottom: 4px; }
.nc-nome { font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
.nc-end { font-size: 12px; color: var(--mut); overflow-wrap: anywhere; }
.nc-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }
.nc-meta div { background: rgba(255, 255, 255, .04); border-radius: 10px; padding: 7px 9px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.nc-meta span { font-size: 10.5px; color: var(--mut); }
.nc-meta b { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nc-meta small { font-size: 10.5px; color: var(--mut); font-weight: 400; }
.nc-dica { font-size: 11.5px; color: var(--mut); margin-top: 10px; }
@media (max-width: 960px) { .nc-grid { grid-template-columns: 1fr; } .nc-prev { position: static; } }
</style>
