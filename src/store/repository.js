import { defineStore } from 'pinia';
import { getStarredRepositories } from '@/server/github';
import { STARRED_REPOS, STARRED_REPOS_UPDATED_AT } from '@/constants';
import { useTagStore } from '@/store/tag';
import { useRankingStore } from '@/store/ranking';

const PAGE_SIZE = 100;
const PARALLEL_NUM = 2;
const CACHE_MAX_AGE = 15 * 60 * 1000;

function runWhenIdle(callback) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 2000 });
  } else {
    setTimeout(callback, 0);
  }
}

/**
 * 通过 HTTP 获取 repositories 并更新
 * Github 接口使用 HTTP2 协议，无并发限制
 *
 * @param {Array} storeRepositories
 * @returns
 */
async function rsolveRepositoriesByHTTP(page = 1) {
  const parallelRequests = [];

  for (let i = 0; i < PARALLEL_NUM; i += 1) {
    parallelRequests.push(
      getStarredRepositories({ page, per_page: PAGE_SIZE }),
    );
    page += 1;
  }
  const httpRepositories = (await Promise.all(parallelRequests)).flat();

  if (httpRepositories.length === PAGE_SIZE * PARALLEL_NUM) {
    return httpRepositories.concat(await rsolveRepositoriesByHTTP(page));
  }
  return httpRepositories;
}

export const useRepositoryStore = defineStore('repository', {
  state: () => ({
    /**
     * 所有 repositories
     */
    all: [],
    /**
     * 选中的 repository id
     */
    selectedId: null,
    /**
     * repositories 过滤内容
     */
    filterText: '',
    /**
     * 是否正在 HTTP 请求 repositories
     */
    loading: true,
    /**
     * repositories 排序
     * time 或 star
     */
    sortType: 'time',
  }),

  getters: {
    /**
     * 当前条件下的 repositories
     */
    filteredRepositories: (state) => {
      let repositoriesTmp = [];
      const tagStore = useTagStore();
      const rankingStore = useRankingStore();

      if (tagStore.tagSrc === 'star') {
        if (!tagStore.selectedTag) {
          /**
           * 当前未选中 tag
           * 展示所有 repositories
           * 不可直接使用 state.all
           * 下文的排序处理会对 repositoriesTmp 进行变更
           * 变更会触发 tag 分析
           * 导致 tag 数据累加（错误）
           */
          repositoriesTmp = [...state.all];
        } else if (tagStore.selectedTagType === 'topic') {
          /**
           * 当前选中的 tag 属于 Topics
           * 从 topicMap 找到 tag 及其对应的 repositories id
           */
          const repositoryIds = tagStore.topicMap[tagStore.selectedTag];
          if (repositoryIds) {
            repositoriesTmp = state.all.filter((repository) =>
              repositoryIds.includes(repository.id),
            );
          }
        } else if (tagStore.selectedTagType === 'language') {
          /**
           * 当前选中的 tag 属于 Languages
           * 从 languageMap 找到 tag 及其对应的 repositories id
           */
          const repositoryIds = tagStore.languageMap[tagStore.selectedTag];
          if (repositoryIds) {
            repositoriesTmp = state.all.filter((repository) =>
              repositoryIds.includes(repository.id),
            );
          }
        }
      } else if (tagStore.tagSrc === 'ranking') {
        if (rankingStore.selectedLanguage) {
          repositoriesTmp = [
            ...(rankingStore.languageMap[rankingStore.selectedLanguage] ?? []),
          ];
        } else {
          repositoriesTmp = [...(rankingStore.languageMap.all ?? [])];
        }
      }

      /**
       * 过滤对当前展示的 repositories
       */
      if (state.filterText) {
        const filterText = state.filterText.toLowerCase();
        repositoriesTmp = repositoriesTmp.filter(
          (repository) =>
            repository.owner.login.toLowerCase().includes(filterText) ||
            repository.name.toLowerCase().includes(filterText) ||
            repository.description?.toLowerCase().includes(filterText),
        );
      }

      /**
       * 根据当前排序类型对当前展示的 repositories 排序
       * repositories 默认已经按 star 时间排序
       * 只需处理按 star 数量排序
       */
      if (
        tagStore.tagSrc === 'star' &&
        repositoriesTmp.length > 0 &&
        state.sortType === 'star'
      ) {
        repositoriesTmp.sort((a, b) => b.stargazers_count - a.stargazers_count);
      }

      return repositoriesTmp;
    },

    /**
     * 当前选中的 repository
     */
    selectedRepository: (state) => {
      const rankingStore = useRankingStore();
      return (
        state.all.find((item) => item.id === state.selectedId) ||
        rankingStore.repositories.find((item) => item.id === state.selectedId)
      );
    },
  },

  actions: {
    /**
     * 获取 repositories
     * LocalStorage 或 HTTP
     */
    async resolveRepositories() {
      this.loading = true;
      let localRepositories = localStorage.getItem(STARRED_REPOS);

      if (localRepositories) {
        try {
          localRepositories = JSON.parse(localRepositories);
          this.all = localRepositories;
          this.loading = false;
        } catch {
          localStorage.removeItem(STARRED_REPOS);
          localRepositories = null;
        }
      }

      const updatedAt = Number(
        localStorage.getItem(STARRED_REPOS_UPDATED_AT) || 0,
      );
      if (localRepositories && Date.now() - updatedAt < CACHE_MAX_AGE) return;

      const refreshRepositories = async () => {
        this.loading = true;
        try {
          const repos = await rsolveRepositoriesByHTTP();
          this.all = repos;
          localStorage.setItem(STARRED_REPOS, JSON.stringify(this.all));
          localStorage.setItem(STARRED_REPOS_UPDATED_AT, String(Date.now()));
        } finally {
          this.loading = false;
        }
      };

      if (localRepositories) {
        runWhenIdle(() => refreshRepositories());
      } else {
        await refreshRepositories();
      }
    },
  },
});
