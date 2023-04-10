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
    constructor(gatewayServer, gatewayServerHttp) {
        this.jweUtil = new JWEUtil();
        this.isRunning = false;

        this.gatewayServer = gatewayServer;
        this.gatewayServerHttp = gatewayServerHttp;
        this.lastCommand = null;

        this.ws = new WebSocketAsPromised(this.gatewayServer + '?side=requestor', {
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

            this.ws.onClose.addListener(() => {
                reject(new Error("WebSocket closed when waiting for the welcome packet."));
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
        let randomQs = crypto.randomBytes(4).toString('hex');

        let waitPromise = this.waitForWelcomePacket();
        await this.ws.open();
        let welcomeMsg = await waitPromise;

        let execURL = this.gatewayServerHttp + '/e?_=' + randomQs + '/#/' + welcomeMsg.sessionId + '/' + sharedKey + '/';
        let qrCode = await makeQR(execURL);

        return {
            execURL: execURL,
            qrCode: qrCode
        };
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
