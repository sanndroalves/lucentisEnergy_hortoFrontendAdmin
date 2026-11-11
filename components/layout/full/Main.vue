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
                <!-- <div class="lc-live-badge">
                    <span class="lc-live-dot"></span>
                    <span class="lc-live-txt">Sistema Ativo</span>
                </div> -->
            </div>

            <!-- Direita -->
            <div class="lc-header-right">
                <!-- <LayoutFullVerticalHeaderNotificationDD /> -->
                <!-- <div class="lc-header-divider-v"></div> -->
                <LayoutFullVerticalHeaderProfileDD />
            </div>
        </div>
        <div class="lc-header-accent"></div>
    </v-app-bar>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.lc-sidebar{background:#03090e!important;border-right:1px solid rgba(93,139,170,.16)!important;color:#9db1bf!important;font-family:'Plus Jakarta Sans',sans-serif!important;box-shadow:12px 0 40px rgba(0,0,0,.18);overflow-y:auto!important}.lc-sidebar .ps{overflow:visible!important;height:auto!important}.lc-sidebar .ps__rail-y{display:none!important}.lc-sidebar-logo{display:flex!important;justify-content:center!important;align-items:center!important;padding:20px 16px 14px!important}.lc-logo-img{height:48px!important;object-fit:contain!important;filter:brightness(.95) saturate(.8);display:block!important}.lc-sidebar-divider{padding:0 20px!important;margin-bottom:6px!important}.lc-sidebar-divider-line{height:1px!important;background:linear-gradient(90deg,transparent,#2ff59a,#2785ff,transparent)!important;opacity:.35!important}.lc-nav-list{background:transparent!important;padding:12px!important}.lc-sidebar .v-list-subheader,.lc-nav-group-header{font:500 8px 'DM Mono'!important;letter-spacing:.18em!important;color:#456174!important;margin-top:14px!important}.lc-sidebar .v-list-item,.lc-nav-item{font-family:'Plus Jakarta Sans',sans-serif!important;font-size:11px!important;font-weight:600!important;color:#708797!important;border-radius:8px!important;margin-bottom:3px!important;transition:.16s!important;min-height:39px!important}.lc-sidebar .v-list-item:hover,.lc-nav-item:hover{background:rgba(47,245,154,.045)!important;color:#b7d5cf!important}.lc-sidebar .v-list-item--active,.lc-nav-item.v-list-item--active{background:linear-gradient(90deg,rgba(47,245,154,.09),rgba(39,133,255,.035))!important;color:#2ff59a!important;border:1px solid rgba(47,245,154,.14)!important;box-shadow:inset 2px 0 #2ff59a!important}.lc-sidebar .v-list-item--active .v-list-item-title,.lc-nav-item.v-list-item--active .lc-nav-title{font-weight:800!important;color:#2ff59a!important}.lc-sidebar .v-list-item-title,.lc-nav-title{font-family:'Plus Jakarta Sans',sans-serif!important;font-size:11px!important;color:inherit!important}.lc-sidebar .iconClass{stroke:#526c7d!important}.lc-nav-icon-wrap{width:28px!important;height:28px!important;border-radius:7px!important;background:rgba(255,255,255,.025)!important;display:flex!important;align-items:center!important;justify-content:center!important;margin-right:8px!important;flex-shrink:0!important}.lc-nav-item:hover .lc-nav-icon-wrap,.lc-nav-item.v-list-item--active .lc-nav-icon-wrap{background:rgba(47,245,154,.07)!important}.lc-nav-chip,.lc-sidebar .sidebarchip{font:700 8px 'DM Mono'!important;height:17px!important}.lc-header{background:rgba(3,9,14,.88)!important;backdrop-filter:blur(18px)!important;border-bottom:1px solid rgba(93,139,170,.16)!important;font-family:'Plus Jakarta Sans',sans-serif!important;position:relative!important;color:#9db1bf!important}.lc-header-inner{display:flex!important;align-items:center!important;justify-content:space-between!important;width:100%!important;padding:0 20px!important;height:100%!important}.lc-header-left,.lc-header-right,.lc-header-center{display:flex!important;align-items:center!important;gap:10px!important}.lc-header-center{justify-content:center!important}.lc-hamburger{color:#8ea6b5!important;background:rgba(255,255,255,.035)!important;border-radius:8px!important}.lc-header-brand{display:flex!important;align-items:center!important;gap:6px!important}.lc-header-brand-name{font:800 14px 'DM Mono'!important;letter-spacing:.14em!important;color:#2ff59a!important}.lc-header-brand-sep{color:#355264!important}.lc-header-brand-sub{font:500 10px 'DM Mono'!important;color:#5d7788!important}.lc-live-badge{display:flex!important;align-items:center!important;gap:6px!important;background:rgba(47,245,154,.04)!important;border:1px solid rgba(47,245,154,.16)!important;border-radius:20px!important;padding:5px 12px!important}.lc-live-dot{width:6px!important;height:6px!important;border-radius:50%!important;background:#2ff59a!important;box-shadow:0 0 9px #2ff59a!important;animation:lcDotPulse 2s ease-in-out infinite!important}.lc-live-txt{font:500 8px 'DM Mono'!important;color:#63a88e!important;letter-spacing:.08em!important}.lc-header-accent{position:absolute!important;bottom:0!important;left:0!important;right:0!important;height:1px!important;background:linear-gradient(90deg,#2ff59a,#2785ff 45%,transparent)!important;opacity:.5!important}@keyframes lcDotPulse{0%,100%{opacity:1}50%{opacity:.4}}
</style>