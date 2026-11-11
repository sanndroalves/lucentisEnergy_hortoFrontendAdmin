<script setup>
// components/home/EnergyFlowHero.vue
//
// Centro visual da home: um "reator" mostrando energia fluindo das usinas
// (nós externos) para os prédios/consumo municipal (núcleo central).
// Todo número exibido vem de props — nenhum dado é gerado aqui, só a
// animação. Os nós externos representam as categorias reais de unidade
// (Educação/Saúde/Outros/Iluminação); o raio de cada um não tem significado
// quantitativo (não vale usar como gráfico), é só composição visual.

const props = defineProps({
  geracaoMes: { type: String, required: true },   // já formatado (ex: "412,3 MWh")
  autossuficiencia: { type: Number, required: true },
  economiaMes: { type: String, required: true },
  co2Ton: { type: String, required: true },
  paybackPct: { type: Number, default: null },
  usinasCount: { type: Number, required: true },
  prediosCount: { type: Number, required: true },
});
</script>

<template>
  <div class="efh-root">

    <div class="efh-reactor">
      <svg class="efh-svg" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="efh-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#34d399" stop-opacity=".35" />
            <stop offset="100%" stop-color="#34d399" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Anel orbital de referência -->
        <circle cx="200" cy="200" r="150" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1" stroke-dasharray="2 6" />

        <!-- Caminhos usina -> núcleo -->
        <path id="efh-path-0" d="M 200,50  Q 200,125 200,200" fill="none" stroke="rgba(79,139,255,.25)" stroke-width="1.5" />
        <path id="efh-path-1" d="M 350,200 Q 275,200 200,200" fill="none" stroke="rgba(34,211,238,.25)" stroke-width="1.5" />
        <path id="efh-path-2" d="M 200,350 Q 200,275 200,200" fill="none" stroke="rgba(52,211,153,.25)" stroke-width="1.5" />
        <path id="efh-path-3" d="M 50,200  Q 125,200 200,200" fill="none" stroke="rgba(255,174,31,.25)" stroke-width="1.5" />

        <!-- Partículas de energia fluindo para o núcleo -->
        <circle r="3.4" fill="#4f8bff" class="efh-particle" style="offset-path:path('M 200,50 Q 200,125 200,200'); animation-delay:0s" />
        <circle r="3.4" fill="#4f8bff" class="efh-particle" style="offset-path:path('M 200,50 Q 200,125 200,200'); animation-delay:.9s" />
        <circle r="3.4" fill="#22d3ee" class="efh-particle" style="offset-path:path('M 350,200 Q 275,200 200,200'); animation-delay:.3s" />
        <circle r="3.4" fill="#22d3ee" class="efh-particle" style="offset-path:path('M 350,200 Q 275,200 200,200'); animation-delay:1.2s" />
        <circle r="3.4" fill="#34d399" class="efh-particle" style="offset-path:path('M 200,350 Q 200,275 200,200'); animation-delay:.6s" />
        <circle r="3.4" fill="#34d399" class="efh-particle" style="offset-path:path('M 200,350 Q 200,275 200,200'); animation-delay:1.5s" />
        <circle r="3.4" fill="#ffae1f" class="efh-particle" style="offset-path:path('M 50,200 Q 125,200 200,200'); animation-delay:0s" />
        <circle r="3.4" fill="#ffae1f" class="efh-particle" style="offset-path:path('M 50,200 Q 125,200 200,200'); animation-delay:.9s" />

        <!-- Glow do núcleo -->
        <circle cx="200" cy="200" r="95" fill="url(#efh-core-glow)" class="efh-glow-pulse" />
      </svg>

      <!-- Nós externos (usinas por categoria) -->
      <div class="efh-node efh-node-top"    style="--nc:#4f8bff"><span class="efh-node-dot"></span><span class="efh-node-lbl">Educação</span></div>
      <div class="efh-node efh-node-right"  style="--nc:#22d3ee"><span class="efh-node-dot"></span><span class="efh-node-lbl">Saúde</span></div>
      <div class="efh-node efh-node-bottom" style="--nc:#34d399"><span class="efh-node-dot"></span><span class="efh-node-lbl">Outros</span></div>
      <div class="efh-node efh-node-left"   style="--nc:#ffae1f"><span class="efh-node-dot"></span><span class="efh-node-lbl">Ilum. Pública</span></div>

      <!-- Núcleo: prédios / consumo municipal -->
      <div class="efh-core">
        <span class="efh-core-eyebrow">GERAÇÃO PARA OS PRÉDIOS</span>
        <span class="efh-core-val">{{ geracaoMes }}</span>
        <span class="efh-core-sub">{{ usinasCount }} usinas → {{ prediosCount }} unidades</span>
      </div>
    </div>

    <!-- Chips orbitando com os indicadores reais -->
    <div class="efh-chips">
      <div class="efh-chip">
        <span class="efh-chip-lbl">Autossuficiência</span>
        <span class="efh-chip-val" style="color:#34d399">{{ autossuficiencia.toFixed(1) }}%</span>
      </div>
      <div class="efh-chip">
        <span class="efh-chip-lbl">Economia no mês</span>
        <span class="efh-chip-val" style="color:#22d3ee">{{ economiaMes }}</span>
      </div>
      <div class="efh-chip">
        <span class="efh-chip-lbl">CO₂ evitado</span>
        <span class="efh-chip-val" style="color:#4f8bff">{{ co2Ton }}</span>
      </div>
      <div class="efh-chip" v-if="paybackPct !== null">
        <span class="efh-chip-lbl">Payback acumulado</span>
        <span class="efh-chip-val" style="color:#ffae1f">{{ paybackPct.toFixed(1) }}%</span>
      </div>
    </div>

    <!-- CTAs -->
    <div class="efh-actions">
      <a href="/mapa" class="efh-btn efh-btn-primary">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/></svg>
        Ver Mapa Territorial
      </a>
      <a href="/painel" class="efh-btn efh-btn-secondary">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Painel em Tempo Real
      </a>
    </div>

  </div>
</template>

<style scoped>
.efh-root { display: flex; flex-direction: column; align-items: center; padding: 20px 0 8px; }
.efh-reactor { position: relative; width: 340px; height: 340px; max-width: 90vw; }
.efh-svg { width: 100%; height: 100%; }

.efh-particle { offset-rotate: 0deg; animation: efh-flow 2.4s linear infinite; filter: drop-shadow(0 0 3px currentColor); }
@keyframes efh-flow { from { offset-distance: 0%; opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } to { offset-distance: 100%; opacity: 0; } }

.efh-glow-pulse { animation: efh-pulse 3.2s ease-in-out infinite; transform-origin: 200px 200px; }
@keyframes efh-pulse { 0%,100% { opacity: .6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }

.efh-core {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 148px; height: 148px; border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, #16283c, #0d1826 75%);
  border: 1px solid rgba(52,211,153,.35);
  box-shadow: 0 0 40px rgba(52,211,153,.15), inset 0 0 30px rgba(0,0,0,.4);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  text-align: center; padding: 10px;
}
.efh-core-eyebrow { font-family: var(--lct-font-mono, monospace); font-size: 8px; letter-spacing: .08em; color: rgba(255,255,255,.4); }
.efh-core-val { font-family: var(--lct-font-display, sans-serif); font-size: 1.55rem; font-weight: 700; color: #fff; line-height: 1.1; }
.efh-core-sub { font-size: 9.5px; color: rgba(255,255,255,.35); }

.efh-node {
  position: absolute; display: flex; flex-direction: column; align-items: center; gap: 5px;
  transform: translate(-50%, -50%);
}
.efh-node-top    { top: 12.5%;  left: 50%; }
.efh-node-right  { top: 50%;    left: 87.5%; }
.efh-node-bottom { top: 87.5%;  left: 50%; }
.efh-node-left   { top: 50%;    left: 12.5%; }
.efh-node-dot {
  width: 14px; height: 14px; border-radius: 50%; background: var(--nc);
  box-shadow: 0 0 12px var(--nc); animation: efh-node-pulse 2.4s ease-in-out infinite;
}
@keyframes efh-node-pulse { 0%,100% { opacity: .75; } 50% { opacity: 1; box-shadow: 0 0 20px var(--nc); } }
.efh-node-lbl { font-family: var(--lct-font-mono, monospace); font-size: 9px; letter-spacing: .04em; color: rgba(255,255,255,.5); white-space: nowrap; }

.efh-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 22px; }
.efh-chip {
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 12px;
  padding: 10px 16px; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 110px;
}
.efh-chip-lbl { font-family: var(--lct-font-mono, monospace); font-size: 8.5px; letter-spacing: .06em; color: rgba(255,255,255,.4); text-transform: uppercase; }
.efh-chip-val { font-family: var(--lct-font-display, sans-serif); font-size: 1.05rem; font-weight: 700; }

.efh-actions { display: flex; gap: 12px; margin-top: 22px; flex-wrap: wrap; justify-content: center; }
.efh-btn {
  display: flex; align-items: center; gap: 8px; text-decoration: none; font-size: 12.5px; font-weight: 700;
  padding: 11px 20px; border-radius: 11px; transition: all .15s;
}
.efh-btn-primary { background: #34d399; color: #0d1826; }
.efh-btn-primary:hover { background: #5be0b4; }
.efh-btn-secondary { background: rgba(255,255,255,.06); color: #fff; border: 1px solid rgba(255,255,255,.1); }
.efh-btn-secondary:hover { background: rgba(255,255,255,.12); }

@media (max-width: 500px) {
  .efh-reactor { width: 280px; height: 280px; }
  .efh-core { width: 118px; height: 118px; }
  .efh-core-val { font-size: 1.25rem; }
}
</style>