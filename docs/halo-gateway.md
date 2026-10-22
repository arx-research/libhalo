# HaLo Gateway

HaLo Gateway is a special tool which would allow you to perform HaLo operations straight on your desktop,
using your smartphone as the NFC reader for interaction with HaLo tags.

## Architecture graph

![Graph: Using smartphone as the NFC scanner when doing HaLo operations on the desktop.](/docs/images/halo_gateway_graph.png)

## Using HaLo Gateway

### End-user side

In order to use HaLo Gateway, you need to both access your desktop computer and smartphone.

1. **On desktop:** Open the website which supports the usage of HaLo Gateway.
2. **On desktop:** Whenever the website will display a QR code and ask you to pair your smartphone, please scan the
   QR code with your smartphone.
3. **On smartphone:** The tag scanner web page will open up.
4. **On desktop:** The website will signal that the pairing process was successful.
5. **On desktop:** Continue your operations on the website, until it asks you to scan the HaLo tag.
6. **On smartphone:** Review the command requested, click `[Confirm]` button and tap the HaLo tag to the back
   of your smartphone in order to scan it.
7. **On smartphone:** You should see an indication that the command was executed successfully.
8. **On desktop:** The command's execution result will arrive from your smartphone and the operation will be
   continued. Continue operations on the desktop.

### Web application's developer side

Please see `web/examples/gateway_requestor.html` for an example web application which uses
HaLo Gateway. This web application provides a simple demo which can be opened on the desktop. You can
request to sign an arbitrary message on the desktop, and then scan HaLo with your smartphone.
The result will be delivered back to the desktop web application who requested it.

## Hosting your own HaLo Gateway server

The HaLo Gateway server is not distributed as a standalone binary. Instead, it could be built from sources
as a Docker image, using the [Dockerfile](/Dockerfile) in the root of this repository.

### Building the image

```
git clone https://github.com/arx-research/libhalo
cd libhalo
docker build -t halo-gateway .
```

The image is based on the official `node` image. You can pick a different Node.js version with
`--build-arg NODE_VERSION=<version>`, but please make sure that it contains the recent security fixes.

### Running the server

```
docker run -d --name halo-gateway -p 32842:32842 halo-gateway
```

The server will listen on port `32842`. Any extra arguments are passed to the server:

| Argument                   | Description                                                     |
|----------------------------|-----------------------------------------------------------------|
| `-p`, `--listen-port PORT` | Port where the server should bind (default: `32842`)            |
| `-d`, `--disable-stats`    | Disable the `/stats` page                                       |
| `--disable-cache`          | Disable template caching (useful when developing custom themes) |

For example, to disable the `/stats` page:

```
docker run -d --name halo-gateway -p 32842:32842 halo-gateway --disable-stats
```

### Data directories

The server's working directory in the container is `/data`:

* `/data/themes` - custom themes, see [Creating custom themes for HaLo Gateway](/docs/gateway-custom-themes.md).
  The image already contains the themes bundled in this repository. Mount your own directory over it to replace them,
  e.g. `-v "$(pwd)/themes:/data/themes:ro"`.
* `/data/logs` - monthly connection logs (`YYYY_M.ndjson`), these are also used to render the `/stats` page.
  Mount a volume there in order to keep the logs when the container is recreated, e.g. `-v halo-gateway-logs:/data/logs`.

The server runs as the unprivileged `node` user (UID 1000), so any mounted directories must be readable
(and writable, in case of `/data/logs`) by that user.

### Production deployment

The HaLo Gateway server doesn't terminate TLS by itself. For production use, put it behind a reverse proxy which:

* serves it over HTTPS on a public domain (the smartphone opens the `https://<your domain>/e?...` page from the QR code);
* forwards WebSocket upgrades on the `/ws` path;
* sets the `X-Forwarded-For` header, which is recorded in the logs alongside the proxy's IP address.

Then pass your server's address to the requestor, e.g. `new HaloGateway('wss://<your domain>')`.

### Running without Docker

Requires Node.js and corepack (in order to use the Yarn version pinned in `package.json`):

```
git clone https://github.com/arx-research/libhalo
cd libhalo
corepack enable
# skips building native addons (PC/SC), which are not needed by halo-gateway
YARN_ENABLE_SCRIPTS=0 yarn install --immutable
cd core && yarn tsc && yarn webpack && cd ..
cd cli && yarn webpack && cd ..
node cli/dist_webpack/entry_gateway.bundle.cjs --listen-host 0.0.0.0
```

The `themes` and `logs` directories are resolved relative to the current working directory.
