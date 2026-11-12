<script setup>
// Relatórios. Cada bloco é um componente em components/relatorios:
//   Consumo.vue · Injetado.vue · Geral.vue · conclusivo.vue · Compensacao.vue
// A página só escolhe o bloco. Nada é buscado aqui: cada bloco carrega os
// próprios dados quando é aberto, então a página abre na hora.
// O bloco aberto fica na URL (?aba=...), e os blocos já abertos guardam o
// relatório gerado ao trocar de aba (KeepAlive).
import { computed } from 'vue';
import { useHead } from '@vueuse/head';
import RelatoriosConsumo from '~/components/relatorios/Consumo.vue';
import RelatoriosInjetado from '~/components/relatorios/Injetado.vue';
import RelatoriosGeral from '~/components/relatorios/Geral.vue';
import RelatoriosConclusivo from '~/components/relatorios/conclusivo.vue';
import RelatoriosCompensacao from '~/components/relatorios/Compensacao.vue';

useHead({ title: 'Relatórios' });
definePageMeta({ middleware: 'sidebase-auth' });

const ABAS = [
  { v: 'consumo', txt: 'Consumo', sub: 'Prédios públicos por secretaria', ic: '⌂', c: '--green', c2: '--teal', comp: RelatoriosConsumo },
  { v: 'injetado', txt: 'Injetado', sub: 'Geração e injeção por usina', ic: '⚡', c: '--teal', c2: '--purple', comp: RelatoriosInjetado },
  { v: 'geral', txt: 'Geral', sub: 'Todas as usinas no ano', ic: '▦', c: '--purple', c2: '--teal', comp: RelatoriosGeral },
  { v: 'conclusivo', txt: 'Conclusivo', sub: 'Relatório oficial e planilhas', ic: '✓', c: '--orange', c2: '--red', comp: RelatoriosConclusivo },
];
const COMPENSACAO = { v: 'compensacao', txt: 'Compensação por unidade', comp: RelatoriosCompensacao };

const route = useRoute();
const router = useRouter();
const aba = computed({
  get: () => String(router.currentRoute.value.query.aba ?? route.query.aba ?? ''),
  set: (v) => router.replace({ query: { ...router.currentRoute.value.query, aba: v || undefined } }),
});
const atual = computed(() => ABAS.find(a => a.v === aba.value) ?? (aba.value === COMPENSACAO.v ? COMPENSACAO : null));
</script>

<template>
  <div class="lx-page">
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span><span>Gerenciamento</span><span class="sep">›</span>
          <NuxtLink v-if="atual" :to="{ query: {} }">Relatórios</NuxtLink><b v-else>Relatórios</b>
          <template v-if="atual"><span class="sep">›</span><b>{{ atual.txt }}</b></template>
        </nav>
        <h1 class="lx-title">Relatórios <span class="grad">energéticos</span></h1>
        <p class="lx-sub">Estatísticas detalhadas de usinas e unidades consumidoras</p>
      </div>
      <div class="lx-head-actions">
        <button class="rl-escondido" :class="{ on: aba === COMPENSACAO.v }" :aria-pressed="aba === COMPENSACAO.v"
          title="Relatório de compensação por unidade" @click="aba = COMPENSACAO.v">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Compensação
        </button>
      </div>
    </header>

    <!-- Abas -->
    <nav class="rl-abas" :class="{ compacto: atual }" aria-label="Tipo de relatório">
      <button v-for="a in ABAS" :key="a.v" class="rl-aba" :class="{ on: aba === a.v }" :aria-current="aba === a.v ? 'page' : undefined"
        :style="{ '--c': `var(${a.c})`, '--c2': `var(${a.c2})` }" @click="aba = a.v">
        <span class="rl-aba-ic">{{ a.ic }}</span>
        <span class="rl-aba-tx"><b>{{ a.txt }}</b><small>{{ a.sub }}</small></span>
      </button>
    </nav>

    <p v-if="!atual" class="rl-vazio">Escolha um tipo de relatório acima para começar.</p>

    <div v-if="aba === COMPENSACAO.v" class="rl-comp-hd">
      <span class="lx-pill" style="--c:var(--orange)"><i></i>Compensação por unidade</span>
      <button class="lx-btn-ghost sm" @click="aba = ''">Fechar</button>
    </div>

    <KeepAlive>
      <component :is="atual.comp" v-if="atual" :key="atual.v" />
    </KeepAlive>
  </div>
</template>

<style scoped>
.rl-abas { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.rl-aba {
  all: unset; box-sizing: border-box; cursor: pointer; position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 18px;
  background: var(--card); border: 1px solid var(--line); backdrop-filter: blur(10px);
  transition: transform .2s, border-color .2s, box-shadow .2s, padding .25s;
}
.rl-aba::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, var(--c), var(--c2)); opacity: .5; transition: opacity .2s; }
.rl-aba:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.rl-aba.on { border-color: var(--c); box-shadow: 0 0 36px -14px var(--c); background: linear-gradient(135deg, color-mix(in srgb, var(--c) 16%, transparent), var(--card) 70%); }
.rl-aba.on::before { opacity: 1; box-shadow: 0 0 14px var(--c); }
.rl-aba:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.rl-aba-ic { width: 40px; height: 40px; border-radius: 13px; display: grid; place-items: center; flex: none; font-size: 18px; color: #fff; background: linear-gradient(135deg, var(--c), var(--c2)); transition: width .25s, height .25s; }
.rl-aba-tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rl-aba-tx b { font-size: 14.5px; font-weight: 600; color: var(--tx); }
.rl-aba-tx small { font-size: 11.5px; color: var(--mut); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rl-abas.compacto .rl-aba { padding: 10px 14px; }
.rl-abas.compacto .rl-aba-ic { width: 32px; height: 32px; font-size: 15px; border-radius: 10px; }

/* botão discreto da Compensação */
.rl-escondido {
  all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
  font: 500 12px var(--font); color: var(--mut); padding: 6px 10px; border-radius: 999px; opacity: .7;
  transition: opacity .2s, color .2s, background .2s;
}
.rl-escondido:hover, .rl-escondido.on { opacity: 1; color: var(--orange); background: rgba(255, 161, 46, .08); }
.rl-escondido:focus-visible { outline: 2px solid #fff; opacity: 1; }

.rl-vazio { text-align: center; color: var(--mut); font-size: 13px; padding: 40px 12px; }
.rl-comp-hd { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }

@media (max-width: 900px) { .rl-abas { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .rl-aba-tx small { display: none; } .rl-aba { padding: 12px; } }
</style>
