import WebSocketAsPromised from 'websocket-as-promised';
import {NFCBadTransportError} from "../halo/exceptions.js";
import {FindBridgeOptions, FindBridgeOptionsDiagnose, FindBridgeOptionsNoDiagnose, FindBridgeResult} from "../types.js";

function haloCreateWs(url: string) {
    return new WebSocketAsPromised(url, {
        packMessage: data => JSON.stringify(data),
        unpackMessage: data => JSON.parse(data as string),
        attachRequestId: (data, requestId) => Object.assign({uid: requestId}, data),
        extractRequestId: data => data && data.uid
    });
}

function runHealthCheck(url: string, openTimeout: number, createWebSocket: (url: string) => WebSocket) {
    return new Promise((resolve, reject) => {
        let closeTimeout: NodeJS.Timeout | null = null;

        const pingUrl = url.includes('?') ? (url + '&ping=1') : (url + '?ping=1');
        const wsp = new WebSocketAsPromised(pingUrl, {
            timeout: openTimeout,
            createWebSocket: createWebSocket
        });

        wsp.onClose.addListener(event => {
            if (event.code === 4090) {
                if (closeTimeout) {
                    clearTimeout(closeTimeout);
                }

                resolve(url);
            } else {
                reject(new NFCBadTransportError("Unexpected WebSocket close code: " + event.code));
            }
        });

        wsp.open()
            .then(() => {
                closeTimeout = setTimeout(() => {
                    wsp.close();
                    reject(new NFCBadTransportError('WebSocket didn\'t close as expected.'));
                }, 2000);
            })
            .catch((err) => {
                reject(err);
            })
    });
}

function createChecks(wsPort: number, wssPort: number, createWebSocket: (url: string) => WebSocket) {
    // detect Firefox
    const isFirefox = typeof window !== "undefined" && Object.prototype.hasOwnProperty.call(window, "InternalError");
    const openTimeout = isFirefox ? 10000 : 5000;

    const checks = [
        runHealthCheck('ws://127.0.0.1:' + wsPort + '/ws', openTimeout, createWebSocket)
    ];

    if (!isFirefox) {
        // It seems like Firefox is processing one WebSocket request at time.
        // A call to wss:// endpoint with incorrect certificate could hang the request
        // for many seconds until it actually fails, and this would hang all remaining WS requests too.
        // We need to skip this check on Firefox to avoid race conditions and have reasonable performance.
        checks.push(runHealthCheck('wss://halo-bridge.local:' + wssPort + '/ws', openTimeout, createWebSocket));
    }

    return checks;
}

async function haloFindBridge(options: FindBridgeOptionsNoDiagnose): Promise<string>;
async function haloFindBridge(options: FindBridgeOptionsDiagnose): Promise<FindBridgeResult>;

async function haloFindBridge(options: FindBridgeOptions) {
    options = Object.assign({}, options) || {};

    if (!options.wsPort) {
        options.wsPort = 32868;
    }

    if (!options.wssPort) {
        options.wssPort = 32869;
    }

    const wsPort = options.wsPort;
    const wssPort = options.wssPort;
    const createWebSocket = options.createWebSocket
        ? options.createWebSocket
        : (url: string) => new WebSocket(url);

    if (options.diagnose) {
        const res = await Promise.allSettled(createChecks(wsPort, wssPort, createWebSocket));
        const urls = [];
        const errors = [];

        for (const o of res) {
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
            return await Promise.any(createChecks(wsPort, wssPort, createWebSocket));
        } catch (e) {
            throw new NFCBadTransportError("Unable to locate halo bridge.");
        }
    }
}

export {haloCreateWs, haloFindBridge};
