<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
const primary = ref('rgb(var(--v-theme-primary))');
const secondary = ref('rgb(var(--v-theme-secondary))');

/* LOGOS ANTIGOS */
// LOGO NÃO PREENCHIDO  https://i.imgur.com/YSSRDBS.png
// LOGO PREENCHIDO      https://i.imgur.com/wPxGqq7.png
// lOGO COM VETOR       https://i.imgur.com/SVSwjDO.png
// LOGO COM ALETECH     https://i.imgur.com/JUiYTkn.png

/* LOGOS NOVOS */
//LOGO SEM FUND  https://i.imgur.com/T5Otj0s.png    AZUL ESCURO
//LOGO SEM FUND  https://i.imgur.com/mHOVDPK.png    AZUL CLARO
//LOGO COM ADMIN https://i.imgur.com/byPtfbk.png    
</script>
<template>
    <div class="logo text-center mt-3">
        <NuxtLink to="/">
            <img src="https://i.imgur.com/gHxwN0V.png" height="80">
        </NuxtLink>
    </div>
</template>

