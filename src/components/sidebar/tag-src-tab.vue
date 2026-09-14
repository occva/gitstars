<template>
  <ul
    class="broder-solid flex h-8 flex-none justify-between border-t border-gray-600 text-xs"
  >
    <li
      v-for="tab in ['star', 'ranking']"
      :key="tab"
      :class="{
        selected: tab === tagStore.tagSrc,
        disabled: toTabLoading(tab),
      }"
      class="h-full w-1/3 flex-auto cursor-pointer border-r border-solid border-gray-500 text-center capitalize leading-8 last:border-none"
      @click="handleClickTab(tab)"
    >
      {{ $t(`category.${tab}`) }}
      <svg-icon
        v-show="toTabLoading(tab)"
        name="loading"
        class="animate-spin"
      />
    </li>
  </ul>
</template>

<script setup>
import { useTagStore } from '@/store/tag';
import { useRankingStore } from '@/store/ranking';
import { useRepositoryStore } from '@/store/repository';

const tagStore = useTagStore();
const rankingStore = useRankingStore();
const repositoryStore = useRepositoryStore();

const toTabLoading = (tab) => {
  return tab === 'ranking' && rankingStore.loading;
};

async function handleClickTab(tab) {
  if (tab === tagStore.tagSrc || rankingStore.loading) return;
  if (tab === 'ranking') await rankingStore.resolve();

  tagStore.$patch({ tagSrc: tab });
  repositoryStore.$patch({ selectedId: null });
}
</script>

<style scoped>
.selected {
  position: relative;
  background-color: #ffffff22;
}

.selected::before {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--primary);
}

.disabled {
  color: #ffffff44;
  cursor: not-allowed;
}
</style>
