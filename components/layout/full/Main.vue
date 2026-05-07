<script setup>
import { ref, shallowRef } from 'vue';
import sidebarItems from '@/components/layout/full/vertical-sidebar/sidebarItem';
import { Menu2Icon } from 'vue-tabler-icons';
const sidebarMenu = shallowRef(sidebarItems);
const sDrawer = ref(true);
</script>

<template>
    <!------Sidebar-------->
    <v-navigation-drawer left elevation="0" app class="lc-sidebar" v-model="sDrawer">

        <!-- Logo oficial -->
        <div class="lc-sidebar-logo">
            <NuxtLink to="/">
                <img src="https://i.imgur.com/gHxwN0V.png" class="lc-logo-img" alt="Lucentis" />
            </NuxtLink>
        </div>

        <!-- Divider -->
        <div class="lc-sidebar-divider">
            <div class="lc-sidebar-divider-line"></div>
        </div>

        <!-- Nav — sem perfect-scrollbar wrapper extra, usa o scroll nativo do v-navigation-drawer -->
        <v-list class="pa-3 lc-nav-list">
            <template v-for="(item, i) in sidebarMenu" :key="i">
                <LayoutFullVerticalSidebarNavGroup :item="item" v-if="item.header" />
                <LayoutFullVerticalSidebarNavItem  :item="item" v-else />
            </template>
        </v-list>

    </v-navigation-drawer>

    <!------Header-------->
    <v-app-bar elevation="0" height="64" class="lc-header">
        <div class="lc-header-inner">
            <!-- Esquerda -->
            <div class="lc-header-left">
                <v-btn class="lc-hamburger hidden-lg-and-up"
                    @click="sDrawer = !sDrawer" icon variant="flat" size="small">
                    <Menu2Icon size="20" stroke-width="1.5" />
                </v-btn>
                <div class="lc-header-brand hidden-md-and-down">
                    <span class="lc-header-brand-name">LUCENTIS</span>
                    <span class="lc-header-brand-sep">·</span>
                    <span class="lc-header-brand-sub">Hortolândia</span>
                </div>
            </div>

            <!-- Centro -->
            <div class="lc-header-center">
                <div class="lc-live-badge">
                    <span class="lc-live-dot"></span>
                    <span class="lc-live-txt">Sistema Ativo</span>
                </div>
            </div>

            <!-- Direita -->
            <div class="lc-header-right">
                <!-- <LayoutFullVerticalHeaderNotificationDD /> -->
                <div class="lc-header-divider-v"></div>
                <LayoutFullVerticalHeaderProfileDD />
            </div>
        </div>
        <div class="lc-header-accent"></div>
    </v-app-bar>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

/* ════════════════════════════════════
   SIDEBAR — fundo branco, clean
════════════════════════════════════ */
.lc-sidebar {
  background: #ffffff !important;
  border-right: 1px solid #E2E8F0 !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  /* deixa o v-navigation-drawer rolar sozinho — sem wrapper extra */
  overflow-y: auto !important;
}

/* Remove qualquer scrollbar duplicada do perfect-scrollbar herdada */
.lc-sidebar .ps {
  overflow: visible !important;
  height: auto !important;
}
.lc-sidebar .ps__rail-y { display: none !important; }

/* ── Logo ── */
.lc-sidebar-logo {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  padding: 20px 16px 12px !important;
}
.lc-logo-img {
  height: 56px !important;
  object-fit: contain !important;
  display: block !important;
}

/* ── Divider gradiente ── */
.lc-sidebar-divider {
  padding: 0 20px !important;
  margin-bottom: 6px !important;
}
.lc-sidebar-divider-line {
  height: 1.5px !important;
  background: linear-gradient(90deg,
    transparent 0%,
    #059669 30%,
    #4F46E5 70%,
    transparent 100%) !important;
  border-radius: 2px !important;
  opacity: .35 !important;
}

/* ── Lista de nav ── */
.lc-nav-list {
  background: transparent !important;
}

/* ── Subheader de grupo ── */
.lc-sidebar .v-list-subheader,
.lc-nav-group-header {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 9px !important;
  font-weight: 800 !important;
  letter-spacing: .2em !important;
  color: #94A3B8 !important;
  margin-top: 14px !important;
}

/* ── Nav items ── */
.lc-sidebar .v-list-item,
.lc-nav-item {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  color: #475569 !important;
  border-radius: 10px !important;
  margin-bottom: 2px !important;
  transition: all .16s ease !important;
  min-height: 40px !important;
}
.lc-sidebar .v-list-item:hover,
.lc-nav-item:hover {
  background: #F0FDF9 !important;
  color: #059669 !important;
}
.lc-sidebar .v-list-item:hover .iconClass {
  stroke: #059669 !important;
}
.lc-sidebar .v-list-item--active,
.lc-nav-item.v-list-item--active {
  background: linear-gradient(135deg, #ECFDF5 0%, #EEF2FF 100%) !important;
  color: #059669 !important;
  border: 1px solid rgba(5,150,105,.2) !important;
  box-shadow: 0 2px 10px rgba(5,150,105,.1) !important;
}
.lc-sidebar .v-list-item--active .iconClass {
  stroke: #059669 !important;
}
.lc-sidebar .v-list-item--active .v-list-item-title,
.lc-nav-item.v-list-item--active .lc-nav-title {
  font-weight: 800 !important;
  color: #059669 !important;
}
.lc-sidebar .v-list-item-title,
.lc-nav-title {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  color: inherit !important;
}
.lc-sidebar .iconClass {
  stroke: #94A3B8 !important;
  transition: stroke .16s !important;
}

/* Icon wrap dentro do nav item */
.lc-nav-icon-wrap {
  width: 30px !important; height: 30px !important;
  border-radius: 8px !important;
  background: #F8FAFC !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  margin-right: 8px !important; flex-shrink: 0 !important;
  transition: background .16s !important;
}
.lc-nav-item:hover .lc-nav-icon-wrap {
  background: #ECFDF5 !important;
}
.lc-nav-item.v-list-item--active .lc-nav-icon-wrap {
  background: #ECFDF5 !important;
}

/* Chip */
.lc-nav-chip,
.lc-sidebar .sidebarchip {
  font-size: 9px !important;
  font-weight: 800 !important;
  height: 18px !important;
}

/* ════════════════════════════════════
   HEADER
════════════════════════════════════ */
.lc-header {
  background: rgba(255,255,255,.95) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border-bottom: 1px solid #E2E8F0 !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  position: relative !important;
}
.lc-header-inner {
  display: flex !important; align-items: center !important;
  justify-content: space-between !important;
  width: 100% !important; padding: 0 20px !important; height: 100% !important;
}
.lc-header-left  { display: flex !important; align-items: center !important; gap: 12px !important; }
.lc-header-right { display: flex !important; align-items: center !important; gap: 8px !important; }
.lc-header-center { display: flex !important; align-items: center !important; justify-content: center !important; }

.lc-hamburger {
  color: #475569 !important; background: #F1F5F9 !important; border-radius: 9px !important;
}
.lc-header-brand { display: flex !important; align-items: center !important; gap: 6px !important; }
.lc-header-brand-name {
  font-size: 15px !important; font-weight: 900 !important; letter-spacing: .1em !important;
  background: linear-gradient(135deg, #059669, #4F46E5) !important;
  -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important; background-clip: text !important;
}
.lc-header-brand-sep { color: #CBD5E1 !important; font-size: 16px !important; }
.lc-header-brand-sub { font-size: 13px !important; font-weight: 600 !important; color: #64748b !important; }

.lc-live-badge {
  display: flex !important; align-items: center !important; gap: 6px !important;
  background: #ECFDF5 !important; border: 1px solid #A7F3D0 !important;
  border-radius: 20px !important; padding: 5px 12px !important;
}
.lc-live-dot {
  width: 7px !important; height: 7px !important; border-radius: 50% !important;
  background: #059669 !important; box-shadow: 0 0 6px rgba(5,150,105,.6) !important;
  animation: lcDotPulse 2s ease-in-out infinite !important;
}
@keyframes lcDotPulse {
  0%,100% { opacity:1; box-shadow: 0 0 6px rgba(5,150,105,.6); }
  50%      { opacity:.5; box-shadow: 0 0 12px rgba(5,150,105,.4); }
}
.lc-live-txt {
  font-size: 11px !important; font-weight: 700 !important; color: #047857 !important;
  letter-spacing: .04em !important; font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
}
.lc-header-divider-v { width: 1px !important; height: 28px !important; background: #E2E8F0 !important; }
.lc-header-accent {
  position: absolute !important; bottom: 0 !important; left: 0 !important; right: 0 !important;
  height: 2px !important;
  background: linear-gradient(90deg, #059669, #4F46E5 50%, transparent) !important;
  opacity: .4 !important;
}
</style>