import { useUserStore } from '@/store/user';

const GITHUB_API_URL = 'https://api.github.com';

async function parseResponse(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json')
    ? response.json()
    : response.text();
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(
      data?.message || response.statusText || `HTTP ${response.status}`,
    );
    error.response = {
      data,
      status: response.status,
      statusText: response.statusText,
    };
    throw error;
  }

  return data;
}

export function requestGitstars(path, { body, ...options } = {}) {
  return request(path, {
    ...options,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function requestGithub(path, { params, body, ...options } = {}) {
  const url = new URL(path, GITHUB_API_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const userStore = useUserStore();

  try {
    return await request(url, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${userStore.token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.clear();
      location.reload();
    }
    throw error;
  }
}
