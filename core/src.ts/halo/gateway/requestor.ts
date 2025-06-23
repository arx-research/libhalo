import QRCode from "qrcode";
import WebSocketAsPromised from "websocket-as-promised";
import crypto from "crypto";
import {JWEUtil} from "../jwe_util.js";
import {
    HaloLogicError,
    HaloTagError,
    NFCBadTransportError,
    NFCAbortedError,
    NFCOperationError,
    NFCGatewayUnexpectedError, NFCBridgeConsentError
} from "../exceptions.js";
import {webDebug} from "../util.js";
import {GatewayWelcomeMsg, HaloCommandObject} from "../../types.js";
import {SignalDispatcher} from "strongly-typed-events";


function makeQR(url: string): Promise<string> {
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
    private jweUtil: JWEUtil;
    private isRunning: boolean;
    private _isInitialized: boolean;
    private hasExecutor: boolean;
    private closeTimeout: NodeJS.Timeout | null;

    private lastCommand: null;
    private gatewayServer: string;
    private gatewayServerHttp: string;

    private themeName: string;

    private ws: WebSocketAsPromised;
    private _onDisconnected = new SignalDispatcher();

    constructor(gatewayServer: string, options: {
        createWebSocket?: (url: string) => WebSocket
        themeName?: string
    }) {
        this.jweUtil = new JWEUtil();
        this.isRunning = false;
        this._isInitialized = false;
        this.hasExecutor = false;
        this.closeTimeout = null;

        this.lastCommand = null;
        this.gatewayServer = gatewayServer;
        this.themeName = options.themeName ?? 'default'

        options = Object.assign({}, options);
        const createWebSocket = options.createWebSocket ? options.createWebSocket : (url: string) => new WebSocket(url);

        const urlObj = new URL(gatewayServer);

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
            unpackMessage: data => JSON.parse(data as string),
            attachRequestId: (data, requestId) => Object.assign({uid: requestId}, data),
            extractRequestId: data => data && data.uid
        });

        this.ws.onSend.addListener(data => {
            const obj = JSON.parse(data);

            if (obj.type === "request_cmd") {
                this.lastCommand = obj;
            }
        });

        this.ws.onClose.addListener((event) => {
            this._onDisconnected.dispatch();
        });

        this.ws.onUnpackedMessage.addListener(data => {
            if (data.type === "executor_connected") {
                if (this.lastCommand) {
                    // existing executor connection was replaced, repeat last command
                    this.ws.sendPacked(this.lastCommand);
                }

                this.hasExecutor = true;

                if (this.closeTimeout !== null) {
                    clearTimeout(this.closeTimeout);
                    this.closeTimeout = null;
                }

                webDebug('[halo-requestor] executor had connected');
            } else if (data.type === "executor_disconnected") {
                this.hasExecutor = false;

                if (this.closeTimeout === null) {
                    this.closeTimeout = setTimeout(() => this.ws.close(), 3000);
                }

                webDebug('[halo-requestor] executor had disconnected');
            }
        });
    }

    isInitialized() {
        return this._isInitialized;
    }

    onDisconnected() {
        return this._onDisconnected.asEvent();
    }

    waitForWelcomePacket() {
        return new Promise((resolve, reject) => {
            const welcomeWaitTimeout = setTimeout(() => {
                reject(new NFCBadTransportError("Server doesn't send welcome packet for 6 seconds after accepting the connection."));
            }, 6000);

            this.ws.onClose.addListener((event) => {
                reject(new NFCBadTransportError("WebSocket closed when waiting for welcome packet. Reason: [" + event.code + "] " + event.reason));
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
        const sharedKey = await this.jweUtil.generateKey();

        const waitPromise = this.waitForWelcomePacket();
        const promiseRes = await Promise.all([this.ws.open(), waitPromise]);
        const welcomeMsg = promiseRes[1] as GatewayWelcomeMsg;

        const serverVersion = welcomeMsg.serverVersion;

        if (serverVersion.commitId === 'SNAPSHOT' || (serverVersion.version[0] >= 1 && serverVersion.version[1] >= 12)) {
            await this.ws.sendRequest({
                "type": "set_theme",
                "themeName": this.themeName,
            })
        }

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
        const execURL = this.gatewayServerHttp + '?id=' + welcomeMsg.sessionId + '#!/' + sharedKey + '/';
        const qrCode = await makeQR(execURL);

        return {
            execURL: execURL,
            qrCode: qrCode,
            serverVersion: serverVersion
        };
    }

    waitConnected() {
        return new Promise((resolve, reject) => {
            this.ws.onClose.addListener((event) => {
                reject(new NFCBadTransportError("WebSocket closed when waiting for executor to connect. Reason: [" + event.code + "] " + event.reason));
            });

            this.ws.onUnpackedMessage.addListener(data => {
                if (data.type === "executor_connected") {
                    this._isInitialized = true;
                    resolve(data);
                }
            });
        })
    }

    async execHaloCmd(command: HaloCommandObject) {
        webDebug('[halo-requestor] called execHaloCmd()', command);

        if (this.isRunning) {
            webDebug('[halo-requestor] rejecting a call, there is already a call pending');
            throw new NFCAbortedError("Can not make multiple calls to execHaloCmd() in parallel.");
        }

        if (!this.ws.isOpened) {
            webDebug('[halo-requestor] rejecting a call, socket is not open');
            throw new NFCBadTransportError("Unable to execute command, there is no connection open.");
        }

        if (!this.hasExecutor) {
            webDebug('[halo-requestor] rejecting a call, there is no executor connected');
            throw new NFCBadTransportError("Unable to execute command, there is no executor connected.");
        }

        this.isRunning = true;
        const nonce = crypto.randomBytes(8).toString('hex');

        try {
            webDebug('[halo-requestor] sending request to execute command', nonce, command);
            let res;

            try {
                res = await this.ws.sendRequest({
                    "type": "request_cmd",
                    "payload": await this.jweUtil.encrypt({
                        nonce,
                        command
                    })
                });
            } catch (e) {
                webDebug('[halo-requestor] exception when trying to sendRequest', e);
                throw new NFCBadTransportError('Failed to send request: ' + (<Error> e).toString());
            }

            if (res.type !== "result_cmd") {
                webDebug('[halo-requestor] unexpected packet type received', res);
                throw new NFCBadTransportError("Unexpected packet type.");
            }

            this.lastCommand = null;
            let out;

            try {
                out = await this.jweUtil.decrypt(res.payload);
            } catch (e) {
                webDebug('[halo-requestor] failed to validate or decrypt response JWE', e);
                throw new NFCBadTransportError("Failed to validate or decrypt response packet.");
            }

            if (out.nonce !== nonce) {
                webDebug('[halo-requestor] mismatched nonce in reply JWE');
                throw new NFCBadTransportError("Mismatched nonce in reply.");
            }

            const resolution = out.response;

            if (resolution.status === "success") {
                webDebug('[halo-requestor] returning with success', resolution.output);
                return resolution.output;
            } else if (resolution.status === "exception") {
                webDebug('[halo-requestor] command exception occurred');

                let e;

                switch (resolution.exception.kind) {
                    case 'HaloLogicError':
                        e = new HaloLogicError(resolution.exception.message, resolution.exception.stack);
                        break;
                    case 'HaloTagError':
                        e = new HaloTagError(resolution.exception.name, resolution.exception.message, resolution.exception.stack);
                        break;
                    case 'NFCOperationError':
                        e = new NFCOperationError(resolution.exception.message, resolution.exception.stack);
                        break;
                    default:
                        e = new NFCGatewayUnexpectedError("Unexpected exception occurred while executing the command. " +
                            resolution.exception.name + ": " + resolution.exception.message, resolution.exception.stack);
                        break;
                }

                webDebug('[halo-requestor] throwing exception as call result', e);
                throw e;
            } else {
                webDebug('[halo-requestor] unexpected status received');
                throw new NFCBadTransportError("Unexpected status received.");
            }
        } finally {
            this.isRunning = false;
        }
    }

    async close() {
        if (this.ws && this.ws.isOpened) {
            await this.ws.close();
        }
    }
}

export {
    HaloGateway
};
