import { defineStore } from 'pinia';
import { LOCAL_KEY_USERINFO } from '@/constants';

export const useUserStore = defineStore('userinfo', {
  state: () => ({
    token: '',
    userinfo: {},
    htmlFontSize: 16,
    lang: 'zh',
    isSidebarVisible: true,
  }),

  actions: {
    async resolveUserinfo() {
      let localUserinfo = localStorage.getItem(LOCAL_KEY_USERINFO);
      if (localUserinfo) {
        localUserinfo = JSON.parse(localUserinfo);
        Object.assign(this.userinfo, localUserinfo);
        return;
      }

      const { getUserInfo } = await import('@/server/github');
      const userinfo = await getUserInfo();
      localStorage.setItem(LOCAL_KEY_USERINFO, JSON.stringify(userinfo));
      Object.assign(this.userinfo, userinfo);
    },
  },
});
