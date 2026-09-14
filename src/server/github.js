import { requestGithub } from './http-request';

export async function getUserInfo() {
  return requestGithub('/user');
}

export async function getStarredRepositories(params) {
  return requestGithub('/user/starred', { params });
}

export async function getRepositoryReadme(params, signal) {
  return requestGithub(`/repos/${params.owner}/${params.name}/readme`, {
    signal,
  });
}

export async function getReadmeByMarkdown(content, signal) {
  return requestGithub('/markdown', {
    method: 'POST',
    body: { text: content },
    signal,
  });
}

export async function getGithubRankingLanguageList() {
  const res = await fetch(
    'https://raw.githubusercontent.com/cfour-hi/github-ranking/main/languages.json',
  );
  const list = await res.json();
  return list;
}

export async function getGithubRankingLanguageMap() {
  const res = await fetch(
    `https://raw.githubusercontent.com/cfour-hi/github-ranking/main/ranking.json`,
  );
  const map = await res.json();
  return map;
}
