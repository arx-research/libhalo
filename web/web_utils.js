const WebSocketAsPromised = require('websocket-as-promised');

function runHealthCheck(url) {
    return new Promise((resolve, reject) => {
        let closeTimeout = null;

        const pingUrl = url.includes('?') ? (url + '&ping=1') : (url + '?ping=1');
        const wsp = new WebSocketAsPromised(pingUrl, {timeout: 5000});

        wsp.onClose.addListener(event => {
            if (event.code === 4090) {
                if (closeTimeout) {
                    clearTimeout(closeTimeout);
                }

                resolve(url);
            } else {
                throw new Error("Unexpected WebSocket close code: " + event.code);
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
    return [
        runHealthCheck('wss://halo-bridge.local:' + wssPort + '/ws'),
        runHealthCheck('ws://127.0.0.1:' + wsPort + '/ws')
    ];
}

async function haloFindBridge(options) {
    options = Object.assign({}, options) || {};

    if (!options.wsPort) {
        options.wsPort = 32868;
    }

    if (!options.wssPort) {
        options.wssPort = 32869;
    }

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

module.exports = {haloFindBridge};
