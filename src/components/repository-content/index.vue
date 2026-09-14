<template>
  <div class="relative flex-auto bg-white" style="width: calc(100% - 24rem)">
    <header
      v-if="selectedRepository"
      class="broder-b-gray-300 flex h-9 items-center border-b border-solid px-4"
    >
      <a
        :href="toRepositoryHref(selectedRepository)"
        class="inline-flex items-center hover:underline"
        rel="noopener noreferrer"
      >
        <h2 class="text-lg font-bold">
          <svg-icon name="github" class="text-xl" />
          {{ selectedRepository?.owner.login }} /
          {{ selectedRepository?.name }}
          <svg-icon name="share" class="text-sm" />
        </h2>
      </a>
    </header>

    <div
      v-show="!readme"
      class="relative top-1/3 mx-auto w-60 text-center text-gray-300"
    >
      <p class="mb-2 text-3xl font-bold">README.md</p>
      <p
        v-if="!selectedRepository"
        class="flex items-center justify-center text-sm"
      >
        <svg-icon name="hand-left" class="mr-1 text-base" />{{
          $t('readmeTip')
        }}
      </p>
      <svg-icon v-show="loading" name="loading" class="animate-spin text-2xl" />
    </div>

    <article
      v-show="readme"
      v-html="readme"
      ref="refReadme"
      class="markdown-body overflow-y-auto p-5 text-sm"
      style="height: calc(100% - 2.75rem)"
    />
  </div>
</template>

<script setup>
import { watchEffect, ref, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useRepositoryStore } from '@/store/repository';
import { getRepositoryReadme, getReadmeByMarkdown } from '@/server/github';
import { toRepostoryReadmeHref } from './tool';

const { selectedRepository } = storeToRefs(useRepositoryStore());
const readme = ref('');
const refReadme = ref(null);
const loading = ref(false);

watchEffect((onCleanup) => {
  const repository = selectedRepository.value;
  if (!repository) return;

  const abortController = new AbortController();
  onCleanup(() => abortController.abort());

  readme.value = '';
  loading.value = true;

  const resolveReadme = async () => {
    try {
      const { content, html_url } = await getRepositoryReadme(
        {
          owner: repository.owner.login,
          name: repository.name,
        },
        abortController.signal,
      );
      const result = await getReadmeByMarkdown(
        decodeURIComponent(escape(atob(content))),
        abortController.signal,
      );

      if (abortController.signal.aborted) return;
      loading.value = false;

      /**
       * https://github.com/coder/code-server/blob/main/docs/README.md
       * =>
       * https://github.com/coder/code-server/blob/main/docs/
       */
      const urlPrefix = html_url.slice(0, -9);

      readme.value = result
        .replace(/<[^>]+href="([^"]+)(?=")/g, (match, p1) => {
          const a = match.slice(0, match.lastIndexOf('"') + 1);
          const b = toRepostoryReadmeHref(p1, { urlPrefix });
          return a + b;
        })
        .replace(/<[^>]+src="([^"]+)(?=")/g, (match, p1) => {
          const a = match.slice(0, match.lastIndexOf('"') + 1);
          const b = toRepostoryReadmeHref(p1, { urlPrefix });
          return (a + b).replace('/blob/', '/raw/');
        })
        .replace(
          /<img(?![^>]*\bloading=)/gi,
          '<img loading="lazy" decoding="async" fetchpriority="low"',
        );

      nextTick(() => {
        refReadme.value.scrollTo({ top: 0 });
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      loading.value = false;
      onAppError(error);
    }
  };

  resolveReadme();
});

const toRepositoryHref = (repository) =>
  `https://github.com/${repository.owner.login}/${repository.name}`;
</script>

<style src="github-markdown-css/github-markdown-light.css"></style>

<style>
.markdown-body {
  font-size: 14px;
}

.markdown-body img {
  display: inline;
}
</style>
