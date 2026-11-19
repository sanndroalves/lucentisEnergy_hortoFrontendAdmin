// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Se estiver usando server-side rendering 
  ssr: false,

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        // Ícone usado pelo iPhone/iPad ao "Adicionar à Tela de Início" no Safari
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'apple-mobile-web-app-title', content: 'Lucentis' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
    },
  },

  typescript: {
    shim: false
  },

  build: {
    transpile: ["vuetify", '@nuxtjs/vuex'],
  },

  vite: {
    define: {
      "process.env.DEBUG": false,
    },
  },

  nitro: {
    serveStatic: true,
  },

  devServerHandlers: [],

  modules: [
    '@sidebase/nuxt-auth'
  ],

  auth: {
    baseURL: 'https://api.lucentis.com.br/api/auth',//endereço do backend
    provider: {
      type: 'local',//biblioteca sidebase no modo local (webToken)
      endpoints: {
        signIn: { path: '/token/login', method: 'post' },//endereço do djoser
        signOut: { path: '/token/logout', method: 'post' },//endereço do djoser
        //signUp: false,//criar usuário novo (desativado temporáriamente)
        getSession: { path: '/users/me', method: 'get' },//endereço p/ confirmar token
      },
      token: { signInResponseTokenPointer: '/auth_token', type: 'Token' },
      pages: { login: '../auth/login' }
    }
  },

  compatibilityDate: '2025-03-12'
})