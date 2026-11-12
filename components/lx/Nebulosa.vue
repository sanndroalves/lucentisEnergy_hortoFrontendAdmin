<script setup>
// Nebulosa animada em canvas (mesma estética da esfera da Início), para ficar
// atrás de um conteúdo. Ocupa 100% do elemento pai; as bordas somem num
// degradê elíptico, então funciona em caixas largas (ex.: atrás do logo).
//   <div style="position:relative"><LxNebulosa class="fundo" /> conteúdo </div>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  particulas: { type: Number, default: 40 },
  velocidade: { type: Number, default: 1 },
});

const cv = ref(null);
let ctx = null, raf = 0, W = 0, H = 0, parado = false, ro = null;

const CORES = [[34, 197, 224], [52, 211, 122], [255, 161, 46], [168, 85, 247], [255, 95, 109]];
const blobs = CORES.map((c, i) => ({ c, a: Math.random() * 6.28, sp: 0.22 + Math.random() * 0.3, r: 0.32 + Math.random() * 0.12, o: 0.26 + i * 0.04, ph: Math.random() * 6 }));
const parts = Array.from({ length: props.particulas }, () => ({ a: Math.random() * 6.28, d: 0.15 + Math.random() * 0.32, s: 0.1 + Math.random() * 0.35, z: Math.random() * 1.3 + 0.4 }));

function ajustar() {
  const el = cv.value; if (!el || !ctx) return;
  const r = el.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  W = r.width || 1; H = r.height || 1;
  el.width = W * d; el.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  if (parado) desenhar(4000);
}

function desenhar(t) {
  const s = (t / 1000) * props.velocidade;
  const m = Math.min(W, H), cx = W / 2, cy = H / 2;
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  blobs.forEach((b, i) => {
    // os blobs passeiam numa elipse do tamanho da caixa
    const x = cx + Math.cos(s * b.sp + b.a) * W * b.o * 0.6;
    const y = cy + Math.sin(s * b.sp * 1.2 + b.a + b.ph) * H * b.o * 0.6;
    const r = m * (b.r + 0.07 * Math.sin(s * 0.8 + i)) * 1.25;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${b.c},.8)`); g.addColorStop(1, `rgba(${b.c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
  parts.forEach((p) => {
    const a = p.a + s * p.s, k = p.d + 0.05 * Math.sin(s + p.a);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.4 * Math.sin(s * 2 + p.a)})`;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * W * k * 1.2, cy + Math.sin(a) * H * k * 1.2, p.z, 0, 6.283); ctx.fill();
  });
  if (!parado) raf = requestAnimationFrame(desenhar);
}

onMounted(() => {
  ctx = cv.value.getContext('2d');
  parado = matchMedia('(prefers-reduced-motion: reduce)').matches;
  ro = new ResizeObserver(ajustar);
  ro.observe(cv.value);
  ajustar();
  if (!parado) raf = requestAnimationFrame(desenhar);
});
onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect(); });
</script>

<template>
  <canvas ref="cv" class="lx-nebulosa" aria-hidden="true"></canvas>
</template>

<style scoped>
.lx-nebulosa {
  display: block; width: 100%; height: 100%; pointer-events: none;
  -webkit-mask-image: radial-gradient(ellipse at center, #000 30%, transparent 70%);
  mask-image: radial-gradient(ellipse at center, #000 30%, transparent 70%);
}
</style>
