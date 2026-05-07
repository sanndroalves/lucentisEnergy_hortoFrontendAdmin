<script setup>
const props = defineProps({ item: Object });
</script>

<template>
    <div class="lc-nav-group-header">
        <span class="lc-nav-group-line"></span>
        <span class="lc-nav-group-label">{{ props.item.header }}</span>
        <span class="lc-nav-group-line"></span>
    </div>
</template>

<style>
.lc-nav-group-header {
  display: flex !important; align-items: center !important;
  gap: 8px !important; padding: 16px 8px 6px !important;
}
.lc-nav-group-label {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 9px !important; font-weight: 800 !important;
  letter-spacing: .2em !important; text-transform: uppercase !important;
  color: #94A3B8 !important; white-space: nowrap !important;
}
.lc-nav-group-line {
  flex: 1 !important; height: 1px !important; background: #E2E8F0 !important;
}
</style>