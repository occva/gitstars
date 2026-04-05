<template>
  <template v-if="userStore.token">
    <Sidebar v-if="userStore.isSidebarVisible" />
    <div class="flex flex-auto flex-col" :style="mainContentStyle">
      <Header />
      <div class="flex" style="height: calc(100% - 4rem)">
        <SidebarRepository />
        <RepositoryContent />
      </div>
    </div>
  </template>
  <Unauth v-else />
</template>

<script setup>
import { computed } from 'vue';
import Sidebar from '@/components/sidebar/index.vue';
import Header from '@/components/header/index.vue';
import SidebarRepository from '@/components/sidebar-repository/index.vue';
import RepositoryContent from '@/components/repository-content/index.vue';
import Unauth from '@/components/unauth.vue';
import { useUserStore } from '@/store/user';
import { useI18n } from 'vue-i18n';
import { LANG_KEY, SIDEBAR_VISIBLE_KEY } from '@/constants';

const userStore = useUserStore();
const { locale } = useI18n();
const mainContentStyle = computed(() => ({
  width: userStore.isSidebarVisible ? 'calc(100% - 18rem)' : '100%',
}));

userStore.$subscribe((mutation) => {
  const payload = mutation.payload || {};

  if (mutation.type === 'patch object') {
    if (Object.prototype.hasOwnProperty.call(payload, 'lang')) {
      locale.value = payload.lang;
      localStorage.setItem(LANG_KEY, payload.lang);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'isSidebarVisible')) {
      localStorage.setItem(
        SIDEBAR_VISIBLE_KEY,
        payload.isSidebarVisible ? '1' : '0',
      );
    }
  }
});
</script>

<style src="./styles/app.css"></style>
<style src="./styles/microtip.css"></style>
