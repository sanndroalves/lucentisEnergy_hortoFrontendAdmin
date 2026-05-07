<script setup>
import Icon from '../Icon.vue';
const props = defineProps({ item: Object, level: Number });
</script>

<template>
    <v-list-item
        :to="item.to"
        rounded="lg"
        class="lc-nav-item mb-1"
        color="primary"
        :disabled="item.disabled"
        :target="item.type === 'external' ? '_blank' : ''"
    >
        <template v-slot:prepend>
            <div class="lc-nav-icon-wrap">
                <Icon :item="item.icon" :level="level" />
            </div>
        </template>

        <v-list-item-title class="lc-nav-title">{{ item.title }}</v-list-item-title>

        <v-list-item-subtitle v-if="item.subCaption" class="lc-nav-sub hide-menu">
            {{ item.subCaption }}
        </v-list-item-subtitle>

        <template v-slot:append v-if="item.chip">
            <v-chip
                :color="item.chipColor"
                class="lc-nav-chip hide-menu"
                size="x-small"
                :variant="item.chipVariant || 'tonal'"
                :prepend-icon="item.chipIcon"
            >{{ item.chip }}</v-chip>
        </template>
    </v-list-item>
</template>

<style>
.lc-nav-item {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 13px !important; font-weight: 600 !important;
  color: #475569 !important; border-radius: 10px !important;
  margin-bottom: 2px !important; transition: all .16s ease !important;
  min-height: 40px !important;
}
.lc-nav-item:hover { background: #F0FDF9 !important; color: #059669 !important; }
.lc-nav-item:hover .lc-nav-icon-wrap { background: #ECFDF5 !important; }
.lc-nav-item:hover .iconClass { stroke: #059669 !important; }

.lc-nav-item.v-list-item--active {
  background: linear-gradient(135deg, #ECFDF5 0%, #EEF2FF 100%) !important;
  color: #059669 !important;
  border: 1px solid rgba(5,150,105,.2) !important;
  box-shadow: 0 2px 10px rgba(5,150,105,.1) !important;
}
.lc-nav-item.v-list-item--active .lc-nav-icon-wrap { background: #ECFDF5 !important; }
.lc-nav-item.v-list-item--active .iconClass { stroke: #059669 !important; }
.lc-nav-item.v-list-item--active .lc-nav-title { font-weight: 800 !important; color: #059669 !important; }

.lc-nav-icon-wrap {
  width: 30px !important; height: 30px !important; border-radius: 8px !important;
  background: #F8FAFC !important; border: 1px solid #F1F5F9 !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  margin-right: 8px !important; flex-shrink: 0 !important; transition: all .16s !important;
}
.lc-nav-title {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 13px !important; font-weight: 600 !important; color: inherit !important;
}
.lc-nav-sub {
  font-size: 10px !important; color: #94A3B8 !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
}
.lc-nav-chip {
  font-size: 9px !important; font-weight: 800 !important; height: 18px !important;
}
.iconClass { stroke: #94A3B8 !important; transition: stroke .16s !important; }
</style>