<script setup>
// Iluminação pública foi unificada em /predios (UCs Públicas).
// Esta rota fica só para links antigos: abre a lista já filtrada em Iluminação + Praças.
definePageMeta({ middleware: 'sidebase-auth' });
await navigateTo({ path: '/predios/', query: { sec: 'IP' } }, { replace: true });
</script>

<template>
  <div />
</template>
