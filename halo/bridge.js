import queryString from "query-string";
import WebSocketAsPromised from "websocket-as-promised";
import {HaloLogicError, HaloTagError, NFCOperationError, NFCBadTransportError, NFCAbortedError, NFCBridgeConsentError} from "./exceptions.js";
import {haloFindBridge} from "../web/web_utils.js";
import {webDebug} from "./util.js";

class HaloBridge {
    constructor(options) {
        options = Object.assign({}, options);

        this.isRunning = false;
        this.lastCommand = null;
        this.lastHandle = null;
        this.url = null;

        this.createWebSocket = options.createWebSocket
            ? options.createWebSocket
            : (url) => new WebSocket(url);
    }

    waitForWelcomePacket() {
        return new Promise((resolve, reject) => {
            let welcomeWaitTimeout = setTimeout(() => {
                reject(new NFCBadTransportError("Server doesn't send ws_connected packet for 6 seconds after accepting the connection."));
            }, 6000);

            this.ws.onClose.addListener((event) => {
                if (event.code === 4002) {
                    // no user consent
                    reject(new NFCBridgeConsentError());
                } else {
                    reject(new NFCBadTransportError("WebSocket closed when waiting for ws_connected packet. " +
                        "Reason: [" + event.code + "] " + event.reason));
                }
            });

            this.ws.onUnpackedMessage.addListener(data => {
                if (data.event === "ws_connected") {
                    clearTimeout(welcomeWaitTimeout);
                    resolve(data);
                }
            });
        })
    }

    async connect() {
        this.url = await haloFindBridge({createWebSocket: this.createWebSocket});

        this.ws = new WebSocketAsPromised(this.url, {
            createWebSocket: url => this.createWebSocket(url),
            packMessage: data => JSON.stringify(data),
            unpackMessage: data => JSON.parse(data),
            attachRequestId: (data, requestId) => Object.assign({uid: requestId}, data),
            extractRequestId: data => data && data.uid
        });

        this.ws.onUnpackedMessage.addListener(data => {
            if (data.event === "handle_added") {
                this.lastHandle = data.data.handle;
            } else if (data.event === "handle_removed" && this.lastHandle === data.data.handle) {
                this.lastHandle = null;
            }
        });

        let waitPromise = this.waitForWelcomePacket();
        await this.ws.open();
        let welcomeMsg = await waitPromise;
        let serverVersion = welcomeMsg.serverVersion;

        return {
            serverVersion: serverVersion
        };
    }

    getConsentURL(websiteURL, options) {
        if (!this.url) {
            return null;
        }

        return this.url
            .replace('ws://', 'http://')
            .replace('wss://', 'https://')
            .replace('/ws', '/consent?' + queryString.stringify({'website': websiteURL, ...options}));
    }

    async close() {
        if (this.ws && this.ws.isOpened) {
            await this.ws.close();
        }
    }

    async waitForHandle() {
        if (!this.ws.isOpened) {
            throw new NFCBadTransportError("Bridge is not open.");
        }

        if (this.lastHandle) {
            return this.lastHandle;
        }

        return new Promise((resolve, reject) => {
            const msgListener = data => {
                if (data.event === "handle_added") {
                    this.lastHandle = data.data.handle;

                    this.ws.onUnpackedMessage.removeListener(msgListener);
                    this.ws.onClose.removeListener(closeListener);

                    resolve(this.lastHandle);
                }
            };

            const closeListener = data => {
                this.ws.onUnpackedMessage.removeListener(msgListener);
                this.ws.onClose.removeListener(closeListener);

                reject(new NFCBadTransportError("Bridge server has disconnected."));
            };

            this.ws.onUnpackedMessage.addListener(msgListener);
            this.ws.onClose.addListener(closeListener);
        });
    }

    async execHaloCmd(command) {
        webDebug('[halo-bridge] called execHaloCmd()', command);

        if (this.isRunning) {
            webDebug('[halo-bridge] rejecting a call, there is already a call pending');
            throw new NFCAbortedError("Can not make multiple calls to execHaloCmd() in parallel.");
        }

        this.isRunning = true;

        try {
            webDebug('[halo-bridge] waiting for card tap');
            let handle = await this.waitForHandle();

            webDebug('[halo-bridge] sending request to execute command', handle);
            let res;

            try {
                res = await this.ws.sendRequest({
                    "type": "exec_halo",
                    "handle": handle,
                    "command": command
                });
            } catch (e) {
                webDebug('[halo-bridge] exception when trying to sendRequest', e);
                throw new NFCBadTransportError('Failed to send request: ' + e.toString());
            }

            if (res.event === "exec_success") {
                webDebug('[halo-bridge] returning with success', res);
                return res.data.res;
            } else if (res.event === "exec_exception") {
                webDebug('[halo-bridge] execution exception', res);
                let e;

                switch (res.data.exception.kind) {
                    case 'HaloLogicError':
                        e = new HaloLogicError(res.data.exception.message);
                        break;
                    case 'HaloTagError':
                        e = new HaloTagError(res.data.exception.name, res.data.exception.message);
                        break;
                    case 'NFCOperationError':
                        // allow some time for the PC/SC reader to re-poll for the card
                        await new Promise((resolve, reject) => setTimeout(resolve, 500));
                        e = new NFCOperationError(res.data.exception.message);
                        break;
                    default:
                        e = new Error("Unexpected exception occurred while executing the command. " +
                            res.data.exception.name + ": " + res.data.exception.message);
                        break;
                }

                e.stackOnExecutor = res.data.exception.stack;
                webDebug('[halo-bridge] throwing exception as the call result', e);
                throw e;
            } else {
                webDebug('[halo-bridge] unexpected packet type received', res);
                throw new Error("Unexpected status received.");
            }
        } finally {
            this.isRunning = false;
        }
    }
}

export {
    HaloBridge
};
