import { requestGitstars } from './http-request';

export async function getToken(code) {
  return requestGitstars('/api/oauth/access_token', {
    method: 'POST',
    body: {
      code,
      client_id: import.meta.env.VITE_GITSTARS_CLIENT_ID,
    },
  });
}
