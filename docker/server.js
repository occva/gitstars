import { createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const host = process.env.HOST || '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '8080', 10);
const clientSecret = process.env.GITHUB_CLIENT_SECRET;
const tlsCertificateFile = process.env.TLS_CERT_FILE;
const tlsKeyFile = process.env.TLS_KEY_FILE;
const tlsEnabled = Boolean(tlsCertificateFile && tlsKeyFile);
const distDirectory = resolve(
  fileURLToPath(new URL('../dist/', import.meta.url)),
);
const maxRequestSize = 16 * 1024;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let size = 0;
  const chunks = [];

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxRequestSize) {
      throw new Error('REQUEST_TOO_LARGE');
    }
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function handleTokenExchange(request, response) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'method_not_allowed' }, {
      ...corsHeaders,
      Allow: 'OPTIONS, POST',
    });
    return;
  }

  if (!clientSecret) {
    console.error('GITHUB_CLIENT_SECRET is not configured');
    sendJson(response, 503, { error: 'oauth_not_configured' }, corsHeaders);
    return;
  }

  try {
    const body = await readJson(request);
    if (
      typeof body.code !== 'string' ||
      typeof body.client_id !== 'string' ||
      body.code.length > 512 ||
      body.client_id.length > 256
    ) {
      sendJson(response, 400, { error: 'invalid_request' }, corsHeaders);
      return;
    }

    const githubResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'gitstars-docker',
        },
        body: JSON.stringify({
          code: body.code,
          client_id: body.client_id,
          client_secret: clientSecret,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    const responseBody = await githubResponse.text();
    response.writeHead(githubResponse.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    });
    response.end(responseBody);
  } catch (error) {
    if (error.message === 'REQUEST_TOO_LARGE') {
      sendJson(response, 413, { error: 'request_too_large' }, corsHeaders);
      return;
    }

    if (error instanceof SyntaxError) {
      sendJson(response, 400, { error: 'invalid_json' }, corsHeaders);
      return;
    }

    console.error('GitHub OAuth token exchange failed:', error.message);
    sendJson(response, 502, { error: 'oauth_upstream_error' }, corsHeaders);
  }
}

async function sendFile(request, response, filePath) {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) throw new Error('NOT_A_FILE');

  const extension = extname(filePath).toLowerCase();
  const isIndex = filePath === resolve(distDirectory, 'index.html');
  const isHashedAsset = filePath.startsWith(
    `${resolve(distDirectory, 'assets')}${sep}`,
  );

  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Content-Length': fileStat.size,
    'Cache-Control': isIndex
      ? 'no-cache'
      : isHashedAsset
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}

async function handleStatic(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'method_not_allowed' }, {
      Allow: 'GET, HEAD',
    });
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, { error: 'invalid_path' });
    return;
  }

  const requestedFile = resolve(distDirectory, `.${decodedPath}`);
  if (
    requestedFile !== distDirectory &&
    !requestedFile.startsWith(`${distDirectory}${sep}`)
  ) {
    sendJson(response, 403, { error: 'forbidden' });
    return;
  }

  try {
    await sendFile(request, response, requestedFile);
  } catch {
    if (extname(decodedPath)) {
      sendJson(response, 404, { error: 'not_found' });
      return;
    }

    try {
      await sendFile(request, response, resolve(distDirectory, 'index.html'));
    } catch {
      sendJson(response, 404, { error: 'not_found' });
    }
  }
}

if (Boolean(tlsCertificateFile) !== Boolean(tlsKeyFile)) {
  throw new Error('TLS_CERT_FILE and TLS_KEY_FILE must be configured together');
}

const handleRequest = async (request, response) => {
  const protocol = tlsEnabled ? 'https' : 'http';
  const url = new URL(request.url || '/', `${protocol}://${request.headers.host}`);

  if (url.pathname === '/healthz') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (url.pathname === '/api/oauth/access_token') {
    await handleTokenExchange(request, response);
    return;
  }

  await handleStatic(request, response, url.pathname);
};

const server = tlsEnabled
  ? createHttpsServer(
      {
        cert: readFileSync(tlsCertificateFile),
        key: readFileSync(tlsKeyFile),
      },
      handleRequest,
    )
  : createHttpServer(handleRequest);

server.listen(port, host, () => {
  const protocol = tlsEnabled ? 'https' : 'http';
  console.log(`Gitstars is listening on ${protocol}://${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
