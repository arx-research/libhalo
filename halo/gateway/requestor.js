const QRCode = require("qrcode");
const WebSocketAsPromised = require("websocket-as-promised");
const crypto = require("crypto");
const {JWEUtil} = require("../jwe_util");

function makeQR(url) {
    return new Promise((resolve, reject) => {
        QRCode.toDataURL(url, function (err, url) {
            if (err) {
                reject(err);
            } else {
                resolve(url);
            }
        });
    });
}

class HaloGateway {
    constructor(gatewayServer, options) {
        this.jweUtil = new JWEUtil();
        this.isRunning = false;

        this.lastCommand = null;
        this.gatewayServer = gatewayServer;

        options = Object.assign({}, options);
        let createWebSocket = options.createWebSocket ? options.createWebSocket : (url) => new WebSocket(url);

        let urlObj = new URL(gatewayServer);

        if (urlObj.protocol === 'wss:') {
            urlObj.protocol = 'https:';
        } else if (urlObj.protocol === 'ws:') {
            urlObj.protocol = 'http:';
        } else {
            throw new Error("Unexpected protocol provided, expected ws:// or wss:// only.");
        }

        if (!urlObj.pathname.endsWith('/')) {
            urlObj.pathname += '/';
        }

        urlObj.pathname += 'e';

        this.gatewayServerHttp = urlObj.toString();

        this.ws = new WebSocketAsPromised(this.gatewayServer + '/ws?side=requestor', {
            createWebSocket: url => createWebSocket(url),
            packMessage: data => JSON.stringify(data),
            unpackMessage: data => JSON.parse(data),
            attachRequestId: (data, requestId) => Object.assign({uid: requestId}, data),
            extractRequestId: data => data && data.uid
        });

        this.ws.onSend.addListener(data => {
            let obj = JSON.parse(data);

            if (obj.type === "request_cmd") {
                this.lastCommand = obj;
            }
        });

        this.ws.onUnpackedMessage.addListener(data => {
            if (data.type === "executor_connected" && this.lastCommand) {
                // existing executor connection was replaced, repeat last command
                this.ws.sendPacked(this.lastCommand);
            }
        });
    }

    waitForWelcomePacket() {
        return new Promise((resolve, reject) => {
            let welcomeWaitTimeout = setTimeout(() => {
                reject(new Error("Server doesn't send welcome packet for 6 seconds after accepting the connection."));
            }, 6000);

            this.ws.onClose.addListener((event) => {
                reject(new Error("WebSocket closed when waiting for welcome packet. Reason: [" + event.code + "] " + event.reason));
            });

            this.ws.onUnpackedMessage.addListener(data => {
                if (data.type === "welcome") {
                    clearTimeout(welcomeWaitTimeout);
                    resolve(data);
                }
            });
        })
    }

    async startPairing() {
        let sharedKey = await this.jweUtil.generateKey();

        let waitPromise = this.waitForWelcomePacket();
        await this.ws.open();
        let welcomeMsg = await waitPromise;

        /**
         * URL format in the QR Code:
         * <gateway server origin>/e?id=<session id>#!/<encryption key>/
         *
         * where:
         * * gateway server origin - public HTTP(S) address to the gateway server
         * * session id - unique identifier generated by the server, used to match requestor and executor
         * * encryption key - end-to-end encryption key, passed only on client side, the gateway server doesn't see it
         *
         * note that the communication between requestor (e.g. PC) and executor (e.g. smartphone) is carried out
         * in the form of JWE tokens encrypted with AES-128 shared key, the shared key is passed only on the
         * client side so the gateway server doesn't "see" neither commands nor responses
         *
         * example:
         * https://dev-gate.example.com/e?id=-l6QxdU3xLyDTR2oT7bjnw#!/3LKNuIJV0Ltp0dhNw09tCQ/
         */
        let execURL = this.gatewayServerHttp + '?id=' + welcomeMsg.sessionId + '#!/' + sharedKey + '/';
        let qrCode = await makeQR(execURL);

        return {
            execURL: execURL,
            qrCode: qrCode
        };
    }

    waitConnected() {
        return new Promise((resolve, reject) => {
            this.ws.onClose.addListener((event) => {
                reject(new Error("WebSocket closed when waiting for executor to connect. Reason: [" + event.code + "] " + event.reason));
            });

            this.ws.onUnpackedMessage.addListener(data => {
                if (data.type === "executor_connected") {
                    resolve(data);
                }
            });
        })
    }

    async execHaloCmd(command) {
        if (this.isRunning) {
            throw new Error("Can not make multiple calls to execHaloCmd() in parallel.");
        }

        this.isRunning = true;
        let nonce = crypto.randomBytes(8).toString('hex');

        try {
            let res = await this.ws.sendRequest({
                "type": "request_cmd",
                "payload": await this.jweUtil.encrypt({
                    nonce,
                    command
                })
            });

            if (res.type !== "result_cmd") {
                throw new Error("Unexpected packet type.");
            }

            this.lastCommand = null;
            let out;

            try {
                out = await this.jweUtil.decrypt(res.payload);
            } catch (e) {
                throw new Error("Failed to validate or decrypt response packet.");
            }

            if (out.nonce !== nonce) {
                throw new Error("Mismatched nonce in reply.");
            }

            return out.response;
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = {
    HaloGateway
};
