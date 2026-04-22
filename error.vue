<script setup lang="ts">
// Page title
const title = ref("404-Page Not Found");
useHead({
  meta: [{ content: title }],
  titleTemplate: (titleChunk) => {
    return titleChunk
      ? `${titleChunk} - 404-Page Not Found`
      : "Erro 404 - Lucentis";
  },
});
</script>
<template>
  <div class="d-flex justify-center align-center text-center h-100vh">
      <div>
          <img src="/images/background/errorimg.svg" width="500" alt="404" />
          <h1 class="text-h1 pt-3">Opps!!!</h1>
          <h4 class="text-h4 my-8">A página que você está procurando, não foi encontrada.</h4>
      </div>    
  </div>
</template>
