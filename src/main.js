import 'virtual:svg-icons-register';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { TOKEN_KEY, LANG_KEY, SIDEBAR_VISIBLE_KEY } from '@/constants';
import { useUserStore } from '@/store/user';
import SvgIcon from '@/components/svg-icon.vue';
import { createI18nByLocale } from './i18n';

function onResize() {
  let fontSize = window.innerWidth / 100;
  if (fontSize < 12) {
    fontSize = 12;
  } else if (fontSize > 16) {
    fontSize = 16;
  }
  const userStore = useUserStore();
  userStore.$patch({ htmlFontSize: fontSize });
  document.scrollingElement.style.fontSize = `${fontSize}px`;
}

function removeURLCode() {
  let href = location.href.replace(/code=[^&]+/, '');
  if (href[href.length - 1] === '?') href = href.slice(0, -1);
  history.replaceState({}, null, href);
}

async function resolveToken() {
  const searchParams = new URLSearchParams(location.search);
  const code = searchParams.get('code');
  if (!code) return;

  removeURLCode();

  const { getToken } = await import('@/server/gitstars');
  const res = await getToken(code).catch((err) => {
    onAppError(err);
  });

  if (!res?.access_token) {
    const message = res
      ? `${res.error}. ${res.error_description}`
      : 'Unable to exchange the GitHub authorization code';
    onAppError({ message });
    throw new Error(message);
  }

  localStorage.setItem(TOKEN_KEY, res.access_token);

  const userStore = useUserStore();
  userStore.$patch({ token: res.access_token });
  userStore.resolveUserinfo().catch(onAppError);
}

async function initApp() {
  const app = createApp(App);
  app.use(createPinia());
  app.component(SvgIcon.name, SvgIcon);

  const userStore = useUserStore();
  const lang = localStorage.getItem(LANG_KEY);
  const sidebarVisible = localStorage.getItem(SIDEBAR_VISIBLE_KEY);

  if (lang) userStore.$patch({ lang });
  if (sidebarVisible !== null) {
    userStore.$patch({ isSidebarVisible: sidebarVisible === '1' });
  }
  app.use(createI18nByLocale(userStore.lang));

  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    userStore.$patch({ token });
    userStore.resolveUserinfo().catch(onAppError);
  } else {
    await resolveToken();
  }

  app.mount('#app');

  let resizeFrame;
  window.addEventListener(
    'resize',
    () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(onResize);
    },
    { passive: true },
  );
  onResize();
}

initApp();
