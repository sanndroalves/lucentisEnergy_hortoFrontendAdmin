<script setup>
// Dock de navegação inferior (padrão LUCENTIS), usado em todas as páginas.
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

const NAV = [
  { n: 'Início', i: '◉', a: '--teal', b: '--green', to: '/', s: [] },
  { n: 'Fotovoltaico', i: '☀', a: '--orange', b: '--red', s: [['Usinas', '/usinas/'], ['Manutenções', '/manutencoes/'], ['Checklist', '/checklist/'], ['Gráficos', '/graficos/']] },
  { n: 'Gerenciamento', i: '▦', a: '--purple', b: '--teal', s: [['Relatórios', '/relatorios/'], ['Lista de Rateio', '/lista/'], ['Dados', '/dados/'], ['Parâmetros', '/parametros/']] },
  { n: 'UCs Públicas', i: '✦', a: '--green', b: '--teal', to: '/predios/', s: [] },
];

// Lê a rota direto do vue-router. O useRoute() do Nuxt, fora de uma página,
// só é atualizado no evento 'page:finish' do <NuxtPage>; como o layout
// default usa <RouterView />, ele ficava parado em "/" e o dock marcava
// sempre "Início".
const router = useRouter();
const caminho = computed(() => router.currentRoute.value.path);
const aberto = ref(-1);

const norm = (p) => '/' + String(p).replace(/^\/+|\/+$/g, '');
const rotaAtiva = (to) => {
  const p = norm(caminho.value), t = norm(to);
  return t === '/' ? p === '/' : p === t || p.startsWith(t + '/');
};
const grupoAtivo = computed(() => NAV.findIndex(n => (n.to ? rotaAtiva(n.to) : n.s.some(s => rotaAtiva(s[1])))));

const clicar = (k) => {
  const n = NAV[k];
  if (!n.s.length) { aberto.value = -1; if (n.to) navigateTo(n.to); return; }
  aberto.value = aberto.value === k ? -1 : k;
};
const ir = (rota) => { aberto.value = -1; navigateTo(rota); };

watch(caminho, () => { aberto.value = -1; });
const tecla = (e) => { if (e.key === 'Escape') aberto.value = -1; };
const fora = (e) => { if (aberto.value >= 0 && !e.target.closest?.('.lxd-dock, .lxd-fly')) aberto.value = -1; };
onMounted(() => { addEventListener('keydown', tecla); addEventListener('pointerdown', fora); });
onBeforeUnmount(() => { removeEventListener('keydown', tecla); removeEventListener('pointerdown', fora); });
</script>

<template>
  <nav class="lxd-dock" aria-label="Navegação principal">
    <button v-for="(n, k) in NAV" :key="n.n" class="lxd-nv" :class="{ on: k === grupoAtivo || aberto === k }"
      :aria-current="k === grupoAtivo ? 'page' : undefined" :aria-expanded="n.s.length ? aberto === k : undefined"
      :style="{ '--c1': `var(${n.a})`, '--c2': `var(${n.b})` }" @click="clicar(k)">
      <span class="lxd-rg"><b>{{ n.i }}</b></span><span class="lxd-lb">{{ n.n }}</span>
    </button>
  </nav>
  <div class="lxd-fly" :class="{ on: aberto > 0 }"
    :style="aberto > 0 ? { '--c1': `var(${NAV[aberto].a})`, '--c2': `var(${NAV[aberto].b})` } : {}">
    <template v-if="aberto > 0">
      <strong>{{ NAV[aberto].n }}</strong>
      <button v-for="s in NAV[aberto].s" :key="s[1]" class="lxd-chip" :class="{ on: rotaAtiva(s[1]) }" @click="ir(s[1])">{{ s[0] }}</button>
    </template>
  </div>
</template>

<style>
.lxd-dock{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));display:flex;gap:4px;padding:7px;border-radius:999px;background:rgba(10,15,40,.8);border:1px solid var(--line);backdrop-filter:blur(16px);z-index:1005;box-shadow:0 16px 50px -14px #000;font-family:var(--font)}
.lxd-nv{all:unset;cursor:pointer;display:flex;align-items:center;gap:9px;padding:5px 16px 5px 5px;border-radius:999px;color:var(--mut);font:600 13px var(--font);transition:background .25s,color .25s;white-space:nowrap}
.lxd-nv:hover,.lxd-nv.on{background:rgba(255,255,255,.09);color:#fff}
.lxd-nv:focus-visible{outline:2px solid #fff;outline-offset:2px}
.lxd-rg{position:relative;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;flex:none}
.lxd-rg::before{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--c1),var(--c2),var(--c1));animation:lxdSpin 4s linear infinite}
.lxd-rg b{position:relative;width:31px;height:31px;border-radius:50%;background:#0b1030;display:grid;place-items:center;font-size:14px;color:#fff;font-weight:400}
.lxd-nv.on .lxd-rg{box-shadow:0 0 20px var(--c1)}
@keyframes lxdSpin{to{transform:rotate(1turn)}}
.lxd-fly{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translate(-50%,16px) scale(.96);opacity:0;pointer-events:none;background:rgba(10,15,40,.94);border:1px solid var(--c1,var(--line));border-radius:22px;padding:14px;backdrop-filter:blur(16px);box-shadow:0 0 44px -10px var(--c1,#000);transition:.3s;z-index:1006;width:min(480px,calc(100vw - 24px));text-align:center;font-family:var(--font);color:var(--tx)}
.lxd-fly.on{transform:translate(-50%,0) scale(1);opacity:1;pointer-events:auto}
.lxd-fly strong{display:block;font-size:14px;margin-bottom:10px}
.lxd-chip{font:600 13px var(--font);border:1px solid var(--line);background:rgba(255,255,255,.07);color:#fff;border-radius:99px;padding:8px 14px;cursor:pointer;margin:3px;transition:background .2s}
.lxd-chip:hover,.lxd-chip.on{background:linear-gradient(120deg,var(--c1),var(--c2));border-color:transparent}
.lxd-chip:focus-visible{outline:2px solid #fff;outline-offset:2px}
@media(max-width:640px){.lxd-nv .lxd-lb{display:none}.lxd-nv{padding:5px}.lxd-nv.on{padding:5px 14px 5px 5px}.lxd-nv.on .lxd-lb{display:inline}}
@media(prefers-reduced-motion:reduce){.lxd-rg::before{animation:none}}
</style>
