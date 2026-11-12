<script setup lang="ts">
useHead({ title: 'Login • Lucentis' });
definePageMeta({ layout: 'blank' });
</script>

<template>
  <div class="lx-page lg">
    <div class="lg-shell">
      <!-- Marca -->
      <section class="lg-marca">
        <div class="lg-orb">
          <LxNebulosa class="lg-neb" :particulas="60" :velocidade="0.6" />
          <img src="https://i.imgur.com/qZ92wWu.png" alt="LUCENTIS" class="lg-logo">
        </div>
        <div class="lg-tx">
          <span class="lg-eyebrow"><i></i>Hortolândia · SP</span>
          <h1>Sistema de monitoramento <span class="grad">energético</span></h1>
          <p>Plataforma oficial de gestão da energia solar e do consumo das unidades públicas do município.</p>
        </div>
      </section>

      <!-- Formulário -->
      <section class="lg-card" aria-labelledby="lg-tt">
        <header class="lg-card-hd">
          <span class="lg-card-ic">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </span>
          <div>
            <small>Área restrita</small>
            <h2 id="lg-tt">Acesso ao sistema</h2>
          </div>
        </header>
        <AuthLoginForm />
        <p class="lg-card-ft">Desenvolvido por <b>Lucentis</b> · hortolandia.energy.lucentis.com.br</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.lg {
  min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 32px 20px; background-color: var(--bg);
  background-image:
    radial-gradient(circle at 15% 10%, rgba(34, 197, 224, .16), transparent 40%),
    radial-gradient(circle at 90% 90%, rgba(168, 85, 247, .18), transparent 45%),
    linear-gradient(rgba(255, 255, 255, .025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, .025) 1px, transparent 1px);
  background-size: auto, auto, 44px 44px, 44px 44px;
}
.lg-shell { width: min(1100px, 100%); display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 420px); gap: 56px; align-items: center; }
.lg-shell > * { min-width: 0; }

/* ── Marca ── */
.lg-marca { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 22px; }
.lg-orb { position: relative; width: min(440px, 80vw); aspect-ratio: 1; display: grid; place-items: center; isolation: isolate; }
.lg-neb { position: absolute; inset: 0; z-index: -1; opacity: .55; -webkit-mask-image: radial-gradient(circle, #000 35%, transparent 68%); mask-image: radial-gradient(circle, #000 35%, transparent 68%); }
.lg-logo { width: 62%; filter: drop-shadow(0 2px 10px rgba(3, 6, 15, .85)); }
.lg-tx { max-width: 460px; display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: -40px; }
.lg-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--mut); }
.lg-eyebrow i { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green); }
.lg-tx h1 { font-size: clamp(24px, 2.8vw, 34px); font-weight: 700; letter-spacing: -.02em; line-height: 1.15; }
.lg-tx .grad { background: linear-gradient(90deg, var(--teal), var(--purple)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lg-tx p { font-size: 13.5px; color: var(--mut); line-height: 1.6; }

/* ── Card ── */
.lg-card {
  position: relative; overflow: hidden; padding: 28px; border-radius: 26px;
  background: rgba(13, 19, 48, .78); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--line); box-shadow: 0 30px 80px -24px rgba(0, 0, 0, .8), 0 0 60px -28px var(--teal);
}
.lg-card::before { content: ""; position: absolute; left: 24px; right: 24px; top: 0; height: 2px; border-radius: 2px; background: linear-gradient(90deg, var(--teal), var(--purple)); box-shadow: 0 0 14px var(--teal); }
.lg-card-hd { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.lg-card-ic { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--teal), var(--purple)); box-shadow: 0 10px 26px -10px var(--teal); flex: none; }
.lg-card-hd small { display: block; font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--mut); }
.lg-card-hd h2 { font-size: 21px; font-weight: 700; letter-spacing: -.01em; }
.lg-card-ft { margin-top: 22px; text-align: center; font-size: 11.5px; color: var(--mut); overflow-wrap: anywhere; }
.lg-card-ft b { color: var(--teal); font-weight: 600; }

@media (max-width: 900px) {
  .lg-shell { grid-template-columns: minmax(0, 1fr); gap: 8px; max-width: 440px; }
  .lg-card { padding: 22px 18px; }
  .lg-orb { width: min(280px, 70vw); }
  .lg-tx { margin-top: -30px; }
  .lg-tx p { display: none; }
}
</style>
