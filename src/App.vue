<template>
  <Suspense v-if="userStore.token">
    <AuthenticatedApp />
    <template #fallback>
      <span class="loader"></span>
    </template>
  </Suspense>
  <Unauth v-else />
</template>

<script setup>
import { defineAsyncComponent } from 'vue';
import Unauth from '@/components/unauth.vue';
import { useUserStore } from '@/store/user';
import { useI18n } from 'vue-i18n';
import { LANG_KEY, SIDEBAR_VISIBLE_KEY } from '@/constants';

const AuthenticatedApp = defineAsyncComponent(
  () => import('@/components/authenticated-app.vue'),
);
const userStore = useUserStore();
const { locale } = useI18n();

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
