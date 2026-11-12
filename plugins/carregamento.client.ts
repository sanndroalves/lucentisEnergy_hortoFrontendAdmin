// plugins/carregamento.client.ts
//
// Bolinha de carregamento entre páginas (componente components/lx/Carregando.vue).
//
// Os layouts usam <RouterView /> direto (não <NuxtPage>), então os hooks
// page:start/page:finish do Nuxt não disparam. Por isso:
//   • acende  → router.beforeEach, quando a rota de destino é outra página
//               (troca só de query/parâmetro na mesma página não acende);
//   • apaga   → quando a nova página termina de montar. Páginas com
//               `await useFetch` só montam depois que os dados chegam, então
//               a bolinha fica até a tela estar pronta;
//   • também apaga se a navegação for cancelada/redirecionada ou der erro,
//     e há um limite de segurança para nunca ficar presa.
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter();
  const ativo = useState('lx-carregando', () => false);

  const MINIMO = 350;      // ms: evita "piscar" em páginas instantâneas
  const SEGURANCA = 20000; // ms: nunca fica presa
  let inicio = 0;
  let tSeg: ReturnType<typeof setTimeout> | undefined;
  let tFim: ReturnType<typeof setTimeout> | undefined;
  let esperando = false;

  const mostrar = () => {
    clearTimeout(tFim); clearTimeout(tSeg);
    esperando = true; inicio = Date.now(); ativo.value = true;
    tSeg = setTimeout(esconder, SEGURANCA);
  };
  function esconder() {
    if (!esperando && !ativo.value) return;
    esperando = false; clearTimeout(tSeg); clearTimeout(tFim);
    tFim = setTimeout(() => { ativo.value = false; }, Math.max(0, MINIMO - (Date.now() - inicio)));
  }

  router.beforeEach((to, from) => {
    if (!from.matched.length) return; // primeira carga do site
    if (to.matched.at(-1) === from.matched.at(-1)) return; // mesma página (só mudou query/parâmetro)
    mostrar();
  });
  router.afterEach((_to, _from, falha) => { if (falha) esconder(); });
  router.onError(() => esconder());

  // a página nova montou → apaga
  nuxtApp.vueApp.mixin({
    mounted() {
      if (esperando && (this as any).$?.parent?.type?.name === 'RouterView') esconder();
    },
  });
});
