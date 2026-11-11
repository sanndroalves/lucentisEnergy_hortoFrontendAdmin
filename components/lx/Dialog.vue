<script setup>
// <LxDialog v-model="aberto" titulo="..." subtitulo="..." icone="⚙" cor="var(--purple)" :largura="600">
//   conteúdo
//   <template #rodape> botões </template>
// </LxDialog>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  titulo: { type: String, default: '' },
  subtitulo: { type: String, default: '' },
  icone: { type: String, default: '' },
  cor: { type: String, default: 'var(--teal)' },
  largura: { type: [Number, String], default: 560 },
  persistente: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);
const fechar = () => emit('update:modelValue', false);
</script>

<template>
  <v-dialog :model-value="modelValue" :max-width="largura" :persistent="persistente" scrim="#03060f"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="lx-dlg" :style="{ '--c': cor }" role="document">
      <div class="lx-dlg-hd">
        <span v-if="icone" class="lx-ic" :style="{ '--c': cor }">{{ icone }}</span>
        <strong>{{ titulo }}<small v-if="subtitulo">{{ subtitulo }}</small></strong>
        <button class="lx-dlg-x" aria-label="Fechar" @click="fechar">×</button>
      </div>
      <div class="lx-dlg-body"><slot /></div>
      <div v-if="$slots.rodape" class="lx-dlg-ft"><slot name="rodape" /></div>
    </div>
  </v-dialog>
</template>
