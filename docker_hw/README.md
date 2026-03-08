# Docker homework

How to run everything:

**Local dev**

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

**Prod-like**

```bash
docker compose up --build
```

**Migrations and seed**

```bash
docker compose --profile tools run --rm migrate
docker compose --profile tools run --rm seed
```

## Optimisation proofs

Built all 4 targets from the Dockerfile. A few words about distroless prod — no shell, no wget, no package manager, just node and its runtime. That makes it smaller and much harder to exploit.

```
REPOSITORY   TAG               IMAGE ID       CREATED          SIZE
app          prod-distroless   21209e673954   2 minutes ago    412MB
app          prod              7c08afd07c51   3 minutes ago    719MB
app          build             560000a21971   5 minutes ago    597MB
app          dev               c92ae8d4d5e3   11 minutes ago   638MB
```

`prod-distroless` is ~307 MB smaller than `prod` — no Alpine toolchain, no pnpm, no devDependencies.

`docker history app:prod-distroless` :

```
IMAGE          CREATED         CREATED BY                                      SIZE
21209e673954   7 minutes ago   CMD ["dist/main.js"]                            0B
<missing>      7 minutes ago   COPY --chown=nonroot:nonroot dist/              1.71MB
<missing>      7 minutes ago   COPY --chown=nonroot:nonroot node_modules/      213MB
<missing>      11 days ago     WORKDIR /usr/src/app                            16.4kB
--- distroless base (node runtime only, no shell, no apt) ---
<missing>      N/A             bazel build @nodejs20_amd64//:data              97.8MB
<missing>      N/A             bazel build @bookworm//libssl3 ...              5.98MB
<missing>      N/A             bazel build @bookworm//libc6 ...                13.4MB
<missing>      N/A             bazel build //common:cacerts_debian12_amd64     270kB
<missing>      N/A             bazel build //common:os_release_debian12        16.4kB
<missing>      N/A             bazel build //static:nsswitch                   12.3kB
<missing>      N/A             bazel build //common:tmp                        8.19kB
<missing>      N/A             bazel build //common:group                      12.3kB
<missing>      N/A             bazel build //common:home                       16.4kB
<missing>      N/A             bazel build //common:passwd                     12.3kB
<missing>      N/A             bazel build //common:rootfs                     4.1kB
<missing>      N/A             bazel build @bookworm//media-types/amd64:dat…   152kB
<missing>      N/A             bazel build @bookworm//tzdata/amd64:data_sta…   4.23MB
<missing>      N/A             bazel build @bookworm//netbase/amd64:data_st…   86kB
<missing>      N/A             bazel build @bookworm//base-files/amd64:data…   582kB
```

No `RUN` steps, no package manager, no source files — only compiled `dist/` and prod `node_modules`.

## Non-root user

**prod image** — runs as `node` (uid 1000):

```bash
docker run --rm --entrypoint id app:prod
# uid=1000(node) gid=1000(node) groups=1000(node)
```

**prod-distroless** — uses the nonroot image variant:

```bash
docker image inspect app:prod-distroless --format '{{.Config.User}}'
# 65532
```

The base image is `gcr.io/distroless/nodejs20-debian12:nonroot`, and every `COPY` uses `--chown=nonroot:nonroot`, so the process has no write access to system directories.
