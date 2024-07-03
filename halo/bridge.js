const WebSocketAsPromised = require("websocket-as-promised");
const {HaloLogicError, HaloTagError, NFCOperationError} = require("./exceptions");
const {haloFindBridge} = require("../web/web_utils");
const {webDebug} = require("./util");

class HaloBridge {
    constructor(options) {
        options = Object.assign({}, options);

        this.isRunning = false;
        this.lastCommand = null;
        this.lastHandle = null;

        this.createWebSocket = options.createWebSocket
            ? options.createWebSocket
            : (url) => new WebSocket(url);
    }

    waitForWelcomePacket() {
        return new Promise((resolve, reject) => {
            let welcomeWaitTimeout = setTimeout(() => {
                reject(new Error("Server doesn't send ws_connected packet for 6 seconds after accepting the connection."));
            }, 6000);

            this.ws.onClose.addListener((event) => {
                reject(new Error("WebSocket closed when waiting for ws_connected packet. Reason: [" + event.code + "] " + event.reason));
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
        let url = await haloFindBridge({createWebSocket: this.createWebSocket});

        this.ws = new WebSocketAsPromised(url, {
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

    async waitForHandle() {
        if (!this.ws.isOpened) {
            throw new Error("Bridge is not open.");
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

                reject(new Error("Bridge disconnected."));
            };

            this.ws.onUnpackedMessage.addListener(msgListener);
            this.ws.onClose.addListener(closeListener);
        });
    }

    async execHaloCmd(command) {
        webDebug('[halo-bridge] called execHaloCmd()', command);

        if (this.isRunning) {
            webDebug('[halo-bridge] rejecting a call, there is already a call pending');
            throw new Error("Can not make multiple calls to execHaloCmd() in parallel.");
        }

        this.isRunning = true;

        try {
            webDebug('[halo-bridge] waiting for card tap');
            let handle = await this.waitForHandle();

            webDebug('[halo-bridge] sending request to execute command', handle);
            let res = await this.ws.sendRequest({
                "type": "exec_halo",
                "handle": handle,
                "command": command
            });

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

module.exports = {
    HaloBridge
};
