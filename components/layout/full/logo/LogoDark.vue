<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
const primary = ref('rgb(var(--v-theme-primary))');
const secondary = ref('rgb(var(--v-theme-secondary))');
   
</script>
<template>
    <div class="logo text-center mt-3">
        <NuxtLink to="/">
            <img src="https://i.imgur.com/gHxwN0V.png" height="60">
        </NuxtLink>
    </div>
</template>

