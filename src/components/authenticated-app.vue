<template>
  <Sidebar v-if="userStore.isSidebarVisible" />
  <div class="flex flex-auto flex-col" :style="mainContentStyle">
    <Header />
    <div class="flex" style="height: calc(100% - 4rem)">
      <SidebarRepository />
      <RepositoryContent />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Sidebar from '@/components/sidebar/index.vue';
import Header from '@/components/header/index.vue';
import SidebarRepository from '@/components/sidebar-repository/index.vue';
import RepositoryContent from '@/components/repository-content/index.vue';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const mainContentStyle = computed(() => ({
  width: userStore.isSidebarVisible ? 'calc(100% - 18rem)' : '100%',
}));
</script>
