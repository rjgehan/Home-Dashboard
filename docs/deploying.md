# Deploying

Every push to `main` runs the tests, builds a container image, and publishes it to the GitHub
Container Registry. A Watchtower container on the server notices the new image and restarts the
dashboard with it. Nothing on GitHub's side ever connects to the server, so the server needs no
inbound ports, no SSH exposure and no deploy key.

```
git push  ->  GitHub Actions: test, build, push to ghcr.io  ->  Watchtower pulls  ->  container restarts
```

## One-time setup

### 1. Let Actions publish packages

In the repository, **Settings → Actions → General → Workflow permissions**, choose
**Read and write permissions**. The workflow requests `packages: write`, and without this it cannot
push to the registry.

### 2. Push once and make the package public

Push to `main`. When the `Build and publish image` workflow finishes, the image appears under the
repository's **Packages**. Open it, then **Package settings → Change visibility → Public**.

Public means Watchtower can pull without credentials, which is the simplest arrangement. The image
holds only compiled code — your token and coordinates are environment variables supplied on the
server, never baked in. To keep it private instead, see the note at the end.

### 3. Set up the server

On the Docker host:

```bash
git clone https://github.com/<owner>/<repo>.git
cd <repo>
cp .env.example .env
```

Edit `.env` with your Home Assistant token, base URL and coordinates. Then edit the `image:` line in
`docker-compose.yml` to point at your own package:

```yaml
image: ghcr.io/<owner>/<repo>:latest
```

Both `<owner>` and `<repo>` must be lowercase — the registry rejects capitals.

Start it:

```bash
docker compose up -d
```

The dashboard is on port 8080; point the tablet at `http://<server-ip>:8080/`.

That is the last manual step. From now on, pushing to `main` is the deploy.

## What runs where

| | |
| --- | --- |
| `.github/workflows/ci.yml` | Tests on pull requests and non-`main` branches |
| `.github/workflows/deploy.yml` | On `main`: tests, then builds and pushes `latest` and a commit-sha tag |
| `docker-compose.yml` | The dashboard plus Watchtower, on the server |
| `.env` | The token and coordinates. Gitignored, and it must stay that way |

The publish job declares `needs: test`, so a failing suite means no new image, which means Watchtower
has nothing to deploy. A broken commit leaves the running dashboard alone.

Watchtower checks every five minutes (`--interval 300`) and only touches containers labelled
`com.centurylinklabs.watchtower.enable=true`, so it will not restart anything else on the host.
`--cleanup` deletes the superseded image so old layers do not accumulate.

## Checking on it

```bash
docker compose logs -f dashboard      # app logs, including the startup integration summary
docker compose logs -f watchtower     # what it has pulled and when
curl localhost:8080/actuator/health   # {"status":"UP"}
```

To skip the wait and pull immediately:

```bash
docker compose pull && docker compose up -d
```

To roll back, pin the previous commit's tag instead of `latest` — the workflow tags every build with
its full commit sha:

```yaml
image: ghcr.io/<owner>/<repo>:sha-<the-good-commit>
```

Then `docker compose up -d`. Watchtower leaves pinned tags alone.

## Gotchas

**`homeassistant.local` will not resolve inside the container.** mDNS does not cross the container
boundary. Use the Home Assistant host's LAN IP in `HOME_ASSISTANT_BASE_URL`.

**Watchtower needs to see the same tag move.** It compares the digest behind `:latest`. Pinning a sha
tag disables updates for that container by design.

**Keeping the package private.** Give Watchtower a read-only token: create a classic personal access
token with the `read:packages` scope, then add to the watchtower service in `docker-compose.yml`:

```yaml
environment:
  REPO_USER: <your-github-username>
  REPO_PASS: ${GHCR_TOKEN}
```

and put `GHCR_TOKEN=` in `.env`. The pull in step 3 will also need
`docker login ghcr.io` once.
