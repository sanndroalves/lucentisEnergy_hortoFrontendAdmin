<script setup>
// Formulário de login. Regra mantida: só usuários com cargo "AD" entram.
// Antes havia uma espera fixa de 3 s antes de tentar o login; agora o botão
// mostra "Entrando…" só pelo tempo real da autenticação.
import { ref, reactive } from 'vue';
import { API_BASE_URL } from '~/base/link';

const { signIn } = useAuth();

const credentials = reactive({ username: '', password: '' });
const erro = ref('');
const showPassword = ref(false);
const entrando = ref(false);

const submitLogin = async () => {
  if (entrando.value) return;
  erro.value = '';
  if (!credentials.username.trim() || !credentials.password) { erro.value = 'Informe o usuário e a senha.'; return; }
  entrando.value = true;
  try {
    const usuarios = await $fetch(`${String(API_BASE_URL).replace(/\/+$/, '')}/usuarios`, { query: { username: credentials.username } }).catch(() => []);
    const u = Array.isArray(usuarios) ? usuarios[0] : null;
    if (u && u.cargo !== 'AD') { erro.value = 'Este usuário não tem permissão de acesso.'; return; }
    await signIn(credentials, { redirect: false });
    await navigateTo('/');
  } catch (e) {
    console.log('Error when trying to login: ', e);
    erro.value = 'Usuário e/ou senha incorretos.';
  } finally {
    entrando.value = false;
  }
};
</script>

<template>
  <form class="lf" novalidate @submit.prevent="submitLogin">
    <Transition name="lf-al">
      <div v-if="erro" class="lx-alert err" role="alert">{{ erro }}</div>
    </Transition>

    <div class="lx-field">
      <label for="lf-user">Usuário</label>
      <div class="lf-in">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <input id="lf-user" v-model="credentials.username" class="lx-input" type="text" placeholder="Digite seu usuário" autocomplete="username" autofocus />
      </div>
    </div>

    <div class="lx-field">
      <label for="lf-pass">Senha</label>
      <div class="lf-in">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        <input id="lf-pass" v-model="credentials.password" class="lx-input" :type="showPassword ? 'text' : 'password'" placeholder="••••••••" autocomplete="current-password" />
        <button class="lf-eye" type="button" :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'" @click="showPassword = !showPassword">
          <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </button>
      </div>
    </div>

    <button class="lx-btn lf-sub" style="--c1:var(--teal);--c2:var(--purple)" type="submit" :disabled="entrando">
      <span v-if="entrando" class="lx-spin"></span>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
      {{ entrando ? 'Entrando…' : 'Entrar no sistema' }}
    </button>
  </form>
</template>

<style scoped>
.lf { display: flex; flex-direction: column; gap: 16px; }
.lf .lx-alert { margin: 0; }
.lf-in { position: relative; }
.lf-in > svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--mut); pointer-events: none; }
.lf-in .lx-input { padding: 12px 42px 12px 40px; font-size: 14px; }
.lf-in .lx-input::placeholder { color: rgba(154, 167, 204, .6); }
.lf-eye { all: unset; cursor: pointer; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: var(--mut); }
.lf-eye svg { width: 16px; height: 16px; }
.lf-eye:hover { color: var(--tx); background: rgba(255, 255, 255, .06); }
.lf-eye:focus-visible { outline: 2px solid #fff; }
.lf-sub { width: 100%; padding: 13px 18px; font-size: 14px; margin-top: 4px; }
.lf-al-enter-active, .lf-al-leave-active { transition: opacity .2s, transform .2s; }
.lf-al-enter-from, .lf-al-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
