const WebSocketAsPromised = require('websocket-as-promised');

function haloCreateWs(url) {
    return new WebSocketAsPromised(url, {
        packMessage: data => JSON.stringify(data),
        unpackMessage: data => JSON.parse(data),
        attachRequestId: (data, requestId) => Object.assign({uid: requestId}, data),
        extractRequestId: data => data && data.uid
    });
}

function runHealthCheck(url, openTimeout) {
    return new Promise((resolve, reject) => {
        let closeTimeout = null;

        const pingUrl = url.includes('?') ? (url + '&ping=1') : (url + '?ping=1');
        const wsp = new WebSocketAsPromised(pingUrl, {timeout: openTimeout});

        wsp.onClose.addListener(event => {
            if (event.code === 4090) {
                if (closeTimeout) {
                    clearTimeout(closeTimeout);
                }

                resolve(url);
            } else {
                reject(new Error("Unexpected WebSocket close code: " + event.code));
            }
        });

        wsp.open()
            .then(() => {
                closeTimeout = setTimeout(() => {
                    wsp.close();
                    reject(new Error('WebSocket didn\'t close as expected.'));
                }, 2000);
            })
            .catch((err) => {
                reject(err);
            })
    });
}

function createChecks(wsPort, wssPort) {
    // detect Firefox
    const isFirefox = window.hasOwnProperty("InternalError");
    const openTimeout = isFirefox ? 10000 : 5000;

    let checks = [
        runHealthCheck('ws://127.0.0.1:' + wsPort + '/ws', openTimeout)
    ];

    if (!isFirefox) {
        // It seems like Firefox is processing one WebSocket request at time.
        // A call to wss:// endpoint with incorrect certificate could hang the request
        // for many seconds until it actually fails, and this would hang all remaining WS requests too.
        // We need to skip this check on Firefox to avoid race conditions and have reasonable performance.
        checks.push(runHealthCheck('wss://halo-bridge.internal:' + wssPort + '/ws', openTimeout));
    }

    return checks;
}

async function haloFindBridge(options) {
    options = Object.assign({}, options) || {};

    if (!options.wsPort) {
        options.wsPort = 32868;
    }

    if (!options.wssPort) {
        options.wssPort = 32869;
    }

    const wsPort = options.wsPort;
    const wssPort = options.wssPort;

    if (options.diagnose) {
        let res = await Promise.allSettled(createChecks(wsPort, wssPort));
        let urls = [];
        let errors = [];

        for (let o of res) {
            if (o.status === "fulfilled") {
                urls.push(o.value);
            } else {
                errors.push(o.reason);
            }
        }

        return {
            urls,
            errors
        };
    } else {
        try {
            return await Promise.any(createChecks(wsPort, wssPort));
        } catch (e) {
            throw new Error("Unable to locate halo bridge.");
        }
    }
}

module.exports = {haloCreateWs, haloFindBridge};
