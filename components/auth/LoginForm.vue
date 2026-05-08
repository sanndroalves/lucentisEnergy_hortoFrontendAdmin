<script setup>
import { ref, reactive, watch } from 'vue';
import { API_BASE_URL } from '~/base/link';

const { signIn } = useAuth();

const overlay = ref(false);
watch(overlay, (val) => {
  if (val) {
    setTimeout(() => {
      overlay.value = false;
      submitLogin();
    }, 3000);
  }
});

const credentials = reactive({ username: '', password: '' });
const showAlertError = ref();
const showAlertErrorPermissao = ref();
const showPassword = ref(false);

const submitLogin = async () => {
  showAlertError.value = false;
  showAlertErrorPermissao.value = false;
  const { data: userPesquisar } = await useFetch(`${API_BASE_URL}/usuarios?username=${credentials.username}`);
  if (userPesquisar._rawValue[0] && userPesquisar._rawValue[0].cargo !== 'AD') {
    showAlertErrorPermissao.value = true;
    showAlertError.value = false;
    return;
  }
  signIn(credentials, { redirect: false })
    .then(() => { console.log("Successfully logged!"); navigateTo('../'); })
    .catch((error) => {
      showAlertErrorPermissao.value = false;
      showAlertError.value = true;
      console.log("Error when trying to login: ", error);
    });
};

const onEnterPress = (event) => {
  if (event.key === 'Enter') overlay.value = true;
};
</script>

<template>
  <div class="lf-root" @keydown="onEnterPress">

    <!-- Alertas -->
    <transition name="lf-alert-slide">
      <div v-if="showAlertErrorPermissao" class="lf-alert lf-alert-err">
        <div class="lf-alert-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <span>Usuário não tem permissão de acesso.</span>
      </div>
    </transition>

    <transition name="lf-alert-slide">
      <div v-if="showAlertError" class="lf-alert lf-alert-err">
        <div class="lf-alert-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <span>Usuário e/ou senha incorretos.</span>
      </div>
    </transition>

    <!-- Campo usuário -->
    <div class="lf-field">
      <label class="lf-label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        Usuário
      </label>
      <div class="lf-input-wrap">
        <input
          v-model="credentials.username"
          class="lf-input"
          type="text"
          placeholder="Digite seu usuário"
          autocomplete="username"
        />
      </div>
    </div>

    <!-- Campo senha -->
    <div class="lf-field">
      <label class="lf-label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        Senha
      </label>
      <div class="lf-input-wrap">
        <input
          v-model="credentials.password"
          class="lf-input"
          :type="showPassword ? 'text' : 'password'"
          placeholder="••••••••"
          autocomplete="current-password"
        />
        <button class="lf-eye-btn" type="button" @click="showPassword = !showPassword" tabindex="-1">
          <svg v-if="!showPassword" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Botão -->
    <button class="lf-submit" @click="overlay = !overlay" type="button">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
      Entrar no sistema
    </button>

  </div>

  <!-- Overlay de loading -->
  <v-overlay :model-value="overlay" class="align-center justify-center" z-index="9999">
    <div class="lf-loading">
      <div class="lf-loading-ring"></div>
      <span class="lf-loading-txt">Autenticando...</span>
    </div>
  </v-overlay>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* ══════ ROOT ══════ */
.lf-root {
  display: flex !important; flex-direction: column !important; gap: 18px !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
}

/* ══════ ALERTAS ══════ */
.lf-alert {
  display: flex !important; align-items: center !important; gap: 10px !important;
  padding: 11px 14px !important; border-radius: 10px !important;
  font-size: 13px !important; font-weight: 600 !important;
}
.lf-alert-err {
  background: #FFF1F2 !important; color: #9F1239 !important;
  border: 1px solid #FECDD3 !important;
}
.lf-alert-icon {
  width: 26px !important; height: 26px !important; border-radius: 7px !important;
  background: #FFE4E6 !important; display: flex !important;
  align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;
}
.lf-alert-icon svg { stroke: #E11D48 !important; }

/* ══════ FIELDS ══════ */
.lf-field { display: flex !important; flex-direction: column !important; gap: 7px !important; }
.lf-label {
  display: flex !important; align-items: center !important; gap: 6px !important;
  font-size: 12px !important; font-weight: 700 !important;
  color: #475569 !important; letter-spacing: .02em !important;
}
.lf-label svg { stroke: #94A3B8 !important; flex-shrink: 0 !important; }

.lf-input-wrap { position: relative !important; }
.lf-input {
  width: 100% !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 14px !important; font-weight: 500 !important;
  color: #0f172a !important;
  background: #F8FAFC !important;
  border: 1.5px solid #E2E8F0 !important;
  border-radius: 11px !important;
  padding: 12px 16px !important;
  outline: none !important;
  transition: border-color .15s, box-shadow .15s !important;
}
.lf-input::placeholder { color: #94A3B8 !important; font-weight: 400 !important; }
.lf-input:focus {
  border-color: #059669 !important;
  background: #ffffff !important;
  box-shadow: 0 0 0 3px rgba(5,150,105,.12) !important;
}

.lf-eye-btn {
  position: absolute !important; right: 12px !important; top: 50% !important;
  transform: translateY(-50%) !important;
  background: transparent !important; border: none !important;
  color: #94A3B8 !important; cursor: pointer !important; padding: 4px !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  transition: color .14s !important;
}
.lf-eye-btn:hover { color: #475569 !important; }
.lf-eye-btn svg { stroke: currentColor !important; }

/* ══════ SUBMIT ══════ */
.lf-submit {
  display: flex !important; align-items: center !important; justify-content: center !important;
  gap: 8px !important; width: 100% !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 14px !important; font-weight: 800 !important;
  color: #ffffff !important;
  background: #059669 !important;
  border: none !important; border-radius: 11px !important;
  padding: 13px !important; cursor: pointer !important;
  box-shadow: 0 4px 16px rgba(5,150,105,.35) !important;
  transition: all .16s !important; margin-top: 4px !important;
  letter-spacing: .02em !important;
}
.lf-submit:hover {
  background: #047857 !important;
  box-shadow: 0 6px 20px rgba(5,150,105,.45) !important;
  transform: translateY(-1px) !important;
}
.lf-submit svg { stroke: #ffffff !important; }

/* ══════ LOADING OVERLAY ══════ */
.lf-loading {
  display: flex !important; flex-direction: column !important;
  align-items: center !important; gap: 16px !important;
}
.lf-loading-ring {
  width: 52px !important; height: 52px !important; border-radius: 50% !important;
  border: 3px solid rgba(255,255,255,.2) !important;
  border-top-color: #34D399 !important;
  animation: lfSpin 0.8s linear infinite !important;
}
@keyframes lfSpin { to { transform: rotate(360deg); } }
.lf-loading-txt {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 14px !important; font-weight: 700 !important;
  color: #ffffff !important; letter-spacing: .04em !important;
}

/* ══════ TRANSIÇÃO ALERTA ══════ */
.lf-alert-slide-enter-active { transition: all .22s ease !important; }
.lf-alert-slide-leave-active { transition: all .16s ease !important; }
.lf-alert-slide-enter-from, .lf-alert-slide-leave-to { opacity: 0 !important; transform: translateY(-6px) !important; }
</style>