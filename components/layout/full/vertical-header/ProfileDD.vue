<script setup lang="ts">
const { signOut, data } = useAuth();

const submitLogout = () => {
    signOut({ redirect: false }).then(() => {
        navigateTo('/auth/login');
    }).catch((error) => {
        console.log('error when trying logout ', error);
    });
};

const username = computed(() => String(data.value?.username ?? '').replace(/"/g, ''));
</script>

<template>
    <v-menu :close-on-content-click="false" location="bottom end" offset="10">
        <template v-slot:activator="{ props }">
            <button class="pdd-btn" v-bind="props" aria-label="Perfil e sair">
                <img src="/images/users/avatar-lx.svg" alt="" class="pdd-avatar" />
            </button>
        </template>
        <div class="pdd-card">
            <div class="pdd-user">
                <span class="pdd-ring"><img src="/images/users/avatar-lx.svg" alt="" /></span>
                <div class="pdd-info">
                    <strong>{{ username || 'Usuário' }}</strong>
                    <span><i class="pdd-dot"></i>Conectado</span>
                </div>
            </div>
            <div class="pdd-sep"></div>
            <button class="pdd-sair" @click="submitLogout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sair
            </button>
        </div>
    </v-menu>
</template>

<style>
/* Sem scoped: o conteúdo do v-menu é teleportado para o body. */
.pdd-btn{all:unset;box-sizing:border-box;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;cursor:pointer;position:relative;background:rgba(10,15,40,.74);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(12px);transition:box-shadow .25s,border-color .25s}
.pdd-btn::before{content:"";position:absolute;inset:-1px;border-radius:50%;padding:1.5px;background:conic-gradient(#22c5e0,#a855f7,#34d37a,#22c5e0);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:.55;transition:opacity .25s}
.pdd-btn:hover{box-shadow:0 0 22px -4px #22c5e0}
.pdd-btn:hover::before{opacity:1}
.pdd-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
.pdd-avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;display:block;margin:0}
.pdd-card{min-width:230px;background:rgba(13,19,48,.96);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:14px;color:#eef2ff;font-family:'Sora','Plus Jakarta Sans',system-ui,sans-serif;backdrop-filter:blur(16px);box-shadow:0 18px 50px -12px rgba(0,0,0,.75),0 0 36px -14px #22c5e0}
.pdd-user{display:flex;align-items:center;gap:12px}
.pdd-ring{width:44px;height:44px;border-radius:50%;padding:2px;background:conic-gradient(#22c5e0,#a855f7,#34d37a,#22c5e0);flex:none}
.pdd-ring img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;border:2px solid #0d1330}
.pdd-info{min-width:0;display:flex;flex-direction:column;gap:3px}
.pdd-info strong{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pdd-info span{font-size:11.5px;color:#9aa7cc;display:flex;align-items:center;gap:6px}
.pdd-dot{width:7px;height:7px;border-radius:50%;background:#34d37a;box-shadow:0 0 8px #34d37a}
.pdd-sep{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);margin:12px 0}
.pdd-sair{all:unset;box-sizing:border-box;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border-radius:999px;cursor:pointer;font:600 13px 'Sora','Plus Jakarta Sans',system-ui,sans-serif;color:#fff;background:linear-gradient(120deg,#ff6b4a,#ff5f6d);box-shadow:0 8px 24px -10px #ff6b4a;transition:transform .2s,box-shadow .2s}
.pdd-sair:hover{transform:translateY(-1px);box-shadow:0 12px 30px -8px #ff5f6d}
.pdd-sair:focus-visible{outline:2px solid #fff;outline-offset:2px}
</style>
