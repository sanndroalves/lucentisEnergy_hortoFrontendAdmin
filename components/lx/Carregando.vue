<script setup>
// Bolinha colorida de carregamento entre páginas. Controlada por
// plugins/carregamento.client.ts (estado 'lx-carregando').
const ativo = useState('lx-carregando', () => false);
</script>

<template>
  <Transition name="lxc">
    <div v-if="ativo" class="lxc" role="status" aria-live="polite">
      <div class="lxc-orb" aria-hidden="true">
        <span class="lxc-halo"></span>
        <span class="lxc-anel"></span>
        <span class="lxc-nucleo"></span>
      </div>
      <span class="lxc-tx">Carregando…</span>
    </div>
  </Transition>
</template>

<style scoped>
.lxc {
  position: fixed; inset: 0; z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
  background: rgba(6, 10, 26, .55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  font-family: 'Sora', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
.lxc-orb { position: relative; width: 74px; height: 74px; }
.lxc-orb > span { position: absolute; inset: 0; border-radius: 50%; }

/* brilho colorido girando por trás */
.lxc-halo {
  inset: -18px !important;
  background: conic-gradient(from 0deg, #22c5e0, #34d37a, #ffa12e, #ff6b4a, #a855f7, #22c5e0);
  filter: blur(22px); opacity: .55; animation: lxcGira 2.4s linear infinite;
}
/* anel colorido */
.lxc-anel {
  background: conic-gradient(from 0deg, #22c5e0, #34d37a, #ffa12e, #ff6b4a, #a855f7, #22c5e0);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
  animation: lxcGira 1.1s linear infinite;
}
/* bolinha central pulsando */
.lxc-nucleo {
  inset: 22px !important;
  background: radial-gradient(circle at 35% 30%, #ffffff, #22c5e0 40%, #a855f7 100%);
  box-shadow: 0 0 22px rgba(34, 197, 224, .9), 0 0 44px rgba(168, 85, 247, .6);
  animation: lxcPulsa 1.1s ease-in-out infinite;
}
.lxc-tx { font-size: 12.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #9aa7cc; }

@keyframes lxcGira { to { transform: rotate(1turn); } }
@keyframes lxcPulsa { 50% { transform: scale(.78); opacity: .8; } }

.lxc-enter-active { transition: opacity .18s ease; }
.lxc-leave-active { transition: opacity .3s ease; }
.lxc-enter-from, .lxc-leave-to { opacity: 0; }
.lxc-enter-from .lxc-orb { transform: scale(.85); }
.lxc-orb { transition: transform .25s ease; }

@media (prefers-reduced-motion: reduce) {
  .lxc-halo, .lxc-anel { animation-duration: 4s; }
  .lxc-nucleo { animation: none; }
}
</style>
