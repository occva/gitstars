![Gitstars](public/brand.png)

<div align="center">

[简体中文](./README.md) / [English](./README-EN.md)

A repository manager for organizing, searching, and browsing your GitHub Stars.

</div>

## What is Gitstars?

As your list of starred repositories grows, finding a project again becomes increasingly difficult with GitHub's built-in list alone. Gitstars syncs your public Stars and organizes them by Topics and programming language, making your saved repositories easier to search, filter, and revisit.

Gitstars also provides GitHub repository rankings grouped by programming language to help you discover open-source projects worth following.

## Features

- **Your Stars**: Sync and browse the repositories starred by the current GitHub account.
- **Automatic categories**: Group repositories by Topics and primary programming language.
- **Fast search**: Search by owner, repository name, or description.
- **Flexible sorting**: Sort by starred date or number of Stars.
- **Gitstars Ranking**: Explore the top 100 repositories for different programming languages.
- **README preview**: Read repository documentation without leaving Gitstars.
- **Direct links**: Open a GitHub repository or its project website quickly.
- **Chinese and English UI**: Switch languages directly in the application.

## Screenshots

### Your Stars

Organize and search your Stars by Topics and Language:

![Your Stars](public/example-your-stars.png)

### Gitstars Ranking

Browse popular GitHub repositories by programming language:

![Gitstars Ranking](public/example-github-ranking.png)

### Topics and Language

Topics are maintained by repository authors and describe a project's purpose and technical areas:

![Topics](public/example-topics.png)

Language is the primary programming language calculated by GitHub from the files in a repository:

![Languages](public/example-languages.png)

## Local deployment with Docker

Docker deployments use HTTPS by default. [mkcert](https://github.com/FiloSottile/mkcert) is recommended for generating a locally trusted development certificate.

### Requirements

- Docker and Docker Compose
- mkcert
- A GitHub OAuth App

### 1. Create a GitHub OAuth App

Open [GitHub Developer Settings](https://github.com/settings/developers), create an OAuth App, and use the following local defaults:

| Setting | Local default |
| --- | --- |
| Homepage URL | `https://localhost:8080` |
| Authorization callback URL | `https://localhost:8080` |

The callback URL must exactly match the **protocol, host, and port** used in the browser. If you change the exposed Docker port through `GITSTARS_PORT`, update the callback URL to use the same port.

### 2. Configure environment variables

Copy the environment template:

```bash
cp .env.example .env
```

Edit `.env` and enter the OAuth App's Client ID and Client Secret:

```dotenv
VITE_GITSTARS_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

GITSTARS_PORT=8080
GITSTARS_CERT_DIR=./.certs
```

### 3. Generate a local HTTPS certificate

```bash
./scripts/setup-local-https.sh
```

The script installs the local mkcert development CA and creates these files in `.certs`:

```text
.certs/localhost.pem
.certs/localhost-key.pem
```

The certificate covers `localhost`, `127.0.0.1`, and `::1`. The `.certs` directory is ignored by both Git and the Docker build context. Certificates are mounted read-only into the running container.

### 4. Build and start the service

```bash
docker compose up -d --build
```

Once the service is running, open:

- Gitstars: [https://localhost:8080](https://localhost:8080)
- Health check: [https://localhost:8080/healthz](https://localhost:8080/healthz)

Check the service status and logs:

```bash
docker compose ps
docker compose logs -f gitstars
```

Stop the service:

```bash
docker compose down
```

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_GITSTARS_CLIENT_ID` | Yes | — | GitHub OAuth App Client ID; embedded in the frontend during the build |
| `GITHUB_CLIENT_SECRET` | Yes | — | GitHub OAuth App Client Secret; injected only at container runtime |
| `GITSTARS_PORT` | No | `8080` | HTTPS port exposed on the host |
| `GITSTARS_CERT_DIR` | No | `./.certs` | Directory containing `localhost.pem` and `localhost-key.pem` |

Rebuild the image after changing `VITE_GITSTARS_CLIENT_ID`:

```bash
docker compose up -d --build
```

If only `GITHUB_CLIENT_SECRET` changes, recreate the container:

```bash
docker compose up -d --force-recreate
```

## OAuth troubleshooting

### `The redirect_uri is not associated with this application`

Gitstars uses the browser's current `location.origin` as the OAuth `redirect_uri`. Make sure the Authorization callback URL in the GitHub OAuth App exactly matches the address used to access Gitstars:

| Address used in the browser | Correct callback URL |
| --- | --- |
| `https://localhost:8080` | `https://localhost:8080` |
| `https://127.0.0.1:8080` | `https://127.0.0.1:8080` |

The following values are not interchangeable:

- `http` and `https`
- `localhost` and `127.0.0.1`
- Different ports

Use the site root as the callback URL. Do not append `/api/oauth/access_token`.

### The browser does not trust the certificate

Generate and install the local certificate again, then restart the browser:

```bash
./scripts/setup-local-https.sh
```

Firefox uses a separate certificate store and might require the local mkcert CA to be trusted separately.

### Gitstars still redirects to the previous OAuth App after changing the Client ID

The Client ID is embedded in the frontend during the build. Rebuild after modifying `.env`:

```bash
docker compose up -d --build
```

## Local frontend development

Local development requires Node.js 18 or later and pnpm 9:

```bash
pnpm install
pnpm cert:local
pnpm dev
```

The Vite development server runs at `https://localhost:30000` by default and uses the same `.certs` directory as Docker. This port comes from the Vite development configuration and is independent of Docker's default port `8080`. Set `VITE_API_PROXY` when an OAuth API proxy is required.

Common commands:

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server |
| `pnpm build` | Create a production build |
| `pnpm preview` | Preview the production build |
| `pnpm cert:local` | Generate and trust the local HTTPS certificate |

## Vercel deployment

See the [Vercel deployment Wiki](https://github.com/cfour-hi/gitstars/wiki/Vercel-%E9%83%A8%E7%BD%B2).

## Technology stack

- Vue 3, Vite, and Pinia
- Tailwind CSS
- GitHub REST API and OAuth
- Node.js HTTPS server
- Docker Compose

## Security notes

- `GITHUB_CLIENT_SECRET` is injected only into the running container. It is not included in frontend assets or the final image.
- Local certificates and private keys are stored in `.certs`. They are not committed to Git or included in the Docker build context.
- The OAuth access token is stored in the browser's LocalStorage. Use Gitstars only on trusted devices.
- Never commit `.env`, a Client Secret, or a local certificate private key.
