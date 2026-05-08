<script setup lang="ts">
useHead({ title: 'Login • Lucentis' });
definePageMeta({ layout: "blank" });
</script>

<template>
  <div class="login-root">

    <!-- Mesh gradient background -->
    <div class="login-bg" aria-hidden="true">
      <div class="login-blob login-blob-1"></div>
      <div class="login-blob login-blob-2"></div>
      <div class="login-blob login-blob-3"></div>
    </div>

    <div class="login-shell">

      <!-- Lado esquerdo — branding -->
      <div class="login-left">
        <div class="login-left-inner">

          <!-- Logo + nome -->
          <div class="login-brand">
            <img src="https://i.imgur.com/gHxwN0V.png" class="login-brand-logo" alt="Lucentis" />
          </div>

          <h1 class="login-left-title">
            Sistema de<br>
            <span class="login-left-title-green">Monitoramento</span><br>
            Energético
          </h1>
          <p class="login-left-sub">
            Plataforma oficial de gestão ENERGÉTICA municipal de Hortolândia · SP
          </p>

          <!-- Stats decorativos -->
          <!-- <div class="login-stats">
            <div class="login-stat">
              <span class="login-stat-val">17</span>
              <span class="login-stat-lbl">Usinas</span>
            </div>
            <div class="login-stat-div"></div>
            <div class="login-stat">
              <span class="login-stat-val">172</span>
              <span class="login-stat-lbl">Unidades</span>
            </div>
            <div class="login-stat-div"></div>
            <div class="login-stat">
              <span class="login-stat-val">1.2 MW</span>
              <span class="login-stat-lbl">Capacidade</span>
            </div>
          </div> -->

          <!-- Rodapé esquerdo -->
          <p class="login-left-footer">hortolandia.energy.lucentis.com.br</p>
        </div>
      </div>

      <!-- Lado direito — formulário -->
      <div class="login-right">
        <div class="login-card">

          <!-- Cabeçalho do card -->
          <div class="login-card-header">
            <div class="login-card-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
                <path d="M12 22s8-4.5 8-11.8A8 8 0 004 10.2C4 17.5 12 22 12 22z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <p class="login-card-eyebrow">Área Restrita</p>
              <h2 class="login-card-title">Acesso ao Sistema</h2>
            </div>
          </div>

          <div class="login-card-divider"></div>

          <!-- Formulário -->
          <AuthLoginForm />

          <!-- Rodapé do card -->
          <p class="login-card-footer">
            Desenvolvido por <strong>Lucentis</strong> · Sistema ENERGY
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* ══════ ROOT ══════ */
.login-root {
  min-height: 100vh !important;
  background: #F0FDF9 !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  position: relative !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: stretch !important;
}

/* ══════ BACKGROUND BLOBS ══════ */
.login-bg {
  position: fixed !important; inset: 0 !important;
  pointer-events: none !important; z-index: 0 !important;
  overflow: hidden !important;
}
.login-blob {
  position: absolute !important; border-radius: 50% !important; filter: blur(80px) !important;
}
.login-blob-1 {
  width: 500px !important; height: 500px !important;
  top: -100px !important; left: -100px !important;
  background: radial-gradient(circle, rgba(5,150,105,.2) 0%, transparent 70%) !important;
  animation: blobFloat 14s ease-in-out infinite !important;
}
.login-blob-2 {
  width: 400px !important; height: 400px !important;
  bottom: -80px !important; right: 30% !important;
  background: radial-gradient(circle, rgba(79,70,229,.15) 0%, transparent 70%) !important;
  animation: blobFloat 18s ease-in-out infinite reverse !important;
}
.login-blob-3 {
  width: 300px !important; height: 300px !important;
  top: 40% !important; right: -60px !important;
  background: radial-gradient(circle, rgba(217,119,6,.12) 0%, transparent 70%) !important;
  animation: blobFloat 22s ease-in-out infinite 4s !important;
}
@keyframes blobFloat {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(20px,-30px) scale(1.04); }
  66%      { transform: translate(-15px,15px) scale(0.97); }
}

/* ══════ SHELL ══════ */
.login-shell {
  position: relative !important; z-index: 1 !important;
  display: flex !important; width: 100% !important; min-height: 100vh !important;
}

/* ══════ LEFT — BRANDING ══════ */
.login-left {
  flex: 1 !important;
  background: linear-gradient(160deg, #0c1420 0%, #0f2518 50%, #0a1833 100%) !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  padding: 48px !important;
  position: relative !important; overflow: hidden !important;
}
/* decoração de grade pontilhada */
.login-left::before {
  content: '' !important; position: absolute !important; inset: 0 !important;
  background-image: radial-gradient(rgba(255,255,255,.06) 1px, transparent 1px) !important;
  background-size: 28px 28px !important;
  pointer-events: none !important;
}
.login-left-inner {
  position: relative !important; max-width: 440px !important;
  display: flex !important; flex-direction: column !important; gap: 28px !important;
}
.login-brand { display: flex !important; align-items: center !important; gap: 14px !important; }
.login-brand-logo {
  height: 52px !important; object-fit: contain !important;
  filter: brightness(0) invert(1) !important; opacity: .9 !important;
}
.login-left-title {
  font-size: clamp(28px, 4vw, 42px) !important; font-weight: 900 !important;
  color: #ffffff !important; letter-spacing: -.03em !important; line-height: 1.1 !important;
  margin: 0 !important;
}
.login-left-title-green {
  background: linear-gradient(135deg, #34D399, #059669) !important;
  -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
}
.login-left-sub {
  font-size: 14px !important; color: rgba(255,255,255,.45) !important;
  line-height: 1.6 !important; margin: 0 !important; max-width: 360px !important;
}

/* stats decorativos */
.login-stats {
  display: flex !important; align-items: center !important; gap: 0 !important;
  background: rgba(255,255,255,.06) !important;
  border: 1px solid rgba(255,255,255,.1) !important;
  border-radius: 14px !important; width: fit-content !important;
}
.login-stat {
  padding: 14px 24px !important;
  display: flex !important; flex-direction: column !important; gap: 3px !important;
}
.login-stat-val {
  font-size: 20px !important; font-weight: 900 !important;
  color: #34D399 !important; letter-spacing: -.02em !important; line-height: 1 !important;
}
.login-stat-lbl {
  font-size: 10px !important; font-weight: 600 !important;
  color: rgba(255,255,255,.4) !important; text-transform: uppercase !important; letter-spacing: .08em !important;
}
.login-stat-div {
  width: 1px !important; height: 36px !important;
  background: rgba(255,255,255,.12) !important; align-self: center !important;
}
.login-left-footer {
  font-size: 11px !important; color: rgba(255,255,255,.2) !important;
  margin: 0 !important; letter-spacing: .04em !important;
}

/* ══════ RIGHT — FORM ══════ */
.login-right {
  width: 480px !important; flex-shrink: 0 !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  padding: 40px 48px !important;
  background: #ffffff !important;
}
.login-card {
  width: 100% !important; max-width: 380px !important;
}

/* Header do card */
.login-card-header {
  display: flex !important; align-items: center !important; gap: 14px !important;
  margin-bottom: 20px !important;
}
.login-card-icon {
  width: 48px !important; height: 48px !important; border-radius: 13px !important;
  background: #059669 !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  box-shadow: 0 4px 14px rgba(5,150,105,.3) !important; flex-shrink: 0 !important;
}
.login-card-eyebrow {
  font-size: 10px !important; font-weight: 700 !important;
  letter-spacing: .12em !important; text-transform: uppercase !important;
  color: #94A3B8 !important; margin: 0 0 2px !important;
}
.login-card-title {
  font-size: 20px !important; font-weight: 900 !important;
  color: #0f172a !important; letter-spacing: -.02em !important; margin: 0 !important;
}
.login-card-divider {
  height: 1.5px !important; border-radius: 2px !important;
  background: linear-gradient(90deg, #059669, #4F46E5 60%, transparent) !important;
  opacity: .3 !important; margin-bottom: 28px !important;
}
.login-card-footer {
  text-align: center !important; font-size: 11px !important;
  color: #94A3B8 !important; margin-top: 20px !important;
}
.login-card-footer strong { color: #059669 !important; font-weight: 700 !important; }

/* ══════ MOBILE ══════ */
@media (max-width: 768px) {
  .login-shell { flex-direction: column !important; }
  .login-left { display: none !important; }
  .login-right { width: 100% !important; min-height: 100vh !important; padding: 32px 24px !important; }
}
</style>