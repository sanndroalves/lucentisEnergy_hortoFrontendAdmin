<script setup>
// Shell padrão LUCENTIS em todas as páginas: dock de navegação inferior +
// ações fixas do topo (marca, perfil, contas faltando e clima).
// O antigo menu lateral (v-navigation-drawer) e a barra superior saíram;
// os mesmos destinos estão agrupados no dock.
defineProps({ marca: { type: Boolean, default: true } });
</script>

<template>
  <div class="lx-shell">
    <LayoutFullTopActions :marca="marca" />
    <LayoutFullDockNav />
  </div>
</template>
