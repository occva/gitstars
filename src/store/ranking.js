import { defineStore } from 'pinia';
import {
  getGithubRankingLanguageList,
  getGithubRankingLanguageMap,
} from '@/server/github';

export const useRankingStore = defineStore('ranking', {
  state: () => ({
    /**
     * 语言 tag 列表
     */
    languageList: [],
    /**
     * 语言 tag: 仓库列表
     */
    languageMap: {},
    /**
     * 当前选中的语言 tag
     */
    selectedLanguage: '',
    /**
     * 语言 tag 过滤
     */
    filterText: '',
    loading: false,
  }),

  getters: {
    repositories: (state) =>
      Object.values(state.languageMap)
        .flat()
        .filter(
          (repo, index, self) =>
            self.findIndex(({ id }) => id === repo.id) === index,
        ),
  },

  actions: {
    async resolve() {
      if (this.languageMap.all) return;

      this.loading = true;
      try {
        await Promise.all([
          this.resolveLanguageList(),
          this.resolveLanguageMap(),
        ]);
      } finally {
        this.loading = false;
      }
    },
    /**
     * 获取语言列表
     */
    async resolveLanguageList() {
      if (this.languageList.length > 0) return;
      this.languageList = await getGithubRankingLanguageList();
    },
    /**
     * 获取语言: 仓库列表
     */
    async resolveLanguageMap() {
      if (Object.keys(this.languageMap).length > 0) return;
      this.languageMap = await getGithubRankingLanguageMap();
    },
  },
});
