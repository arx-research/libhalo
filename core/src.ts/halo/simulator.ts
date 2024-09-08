import WebSocketAsPromised from "websocket-as-promised";
import {
    ConnectSimulatorOptions,
    ExecHaloCmdOptions,
    ExecOptions,
    HaloCommandObject,
    HaloResponseObject,
    SimulatorOptions
} from "../types.js";
import {SignalDispatcher} from "strongly-typed-events";
import queryString from 'query-string';
import {execHaloCmd, unwrapResultFromU2F, wrapCommandForU2F} from "../drivers/common.js";
import {Buffer} from "buffer/index.js";
import {BaseHaloAPI} from "./cmd_exec.js";
import {SignJWT} from "jose";
import {HaloLogicError, HaloTagError, NFCBadTransportError} from "./exceptions.js";
import {arr2hex} from "./util.js";
import {ERROR_CODES} from "./errors.js";

class HaloSimulator {
    protected url: string | null;
    protected consoleUrl: string | null;
    protected readonly createWebSocket: (url: string) => WebSocket;
    protected ws: WebSocketAsPromised | null;
    protected _onDisconnected = new SignalDispatcher();
    protected noDebugPrints: boolean = false;

    constructor(options?: SimulatorOptions) {
        options = Object.assign({}, options);

        this.url = null;
        this.ws = null;
        this.consoleUrl = null;
        this.noDebugPrints = !!options.noDebugPrints;

        this.createWebSocket = options.createWebSocket
            ? options.createWebSocket
            : (url: string) => new WebSocket(url);
    }

    protected async signJWT(url: string, authSecret: string, csetId: string, simInstance: string, exp: string) {
        return await new SignJWT({cset_id: csetId, sim_instance: simInstance})
            .setProtectedHeader({alg: 'HS256'})
            .setIssuedAt()
            .setAudience(queryString.parseUrl(url).url)
            .setExpirationTime(exp)
            .sign(Buffer.from(authSecret, 'hex'));
    }

    async makeSignedURL(url: string, authSecret: string, csetId: string, simInstance: string, exp: string) {
        return queryString.stringifyUrl({url: url, query: {
            jwt: await this.signJWT(url, authSecret, csetId, simInstance, exp)
        }});
    }

    async connect(options: ConnectSimulatorOptions) {
        if (!this.noDebugPrints) {
            console.log('[libhalo][simulator] Simulator connecting...');
        }
        this.url = await this.makeSignedURL(options.url + "/ws", options.authSecret, options.csetId, options.simInstance, "180 seconds");
        const tmpConsoleUrl = (options.url + "/console")
            .replace("ws://", "http://")
            .replace("wss://", "https://");
        this.consoleUrl = await this.makeSignedURL(tmpConsoleUrl, options.authSecret, options.csetId, options.simInstance, "8 hours");

        this.ws = new WebSocketAsPromised(this.url, {
            createWebSocket: url => this.createWebSocket(url),
            packMessage: data => JSON.stringify(data),
            unpackMessage: data => JSON.parse(data as string),
            attachRequestId: (data, requestId) => Object.assign({uid: requestId}, data),
            extractRequestId: data => data && data.uid
        });

        this.ws.onClose.addListener((event) => {
            this._onDisconnected.dispatch();
        });

        await this.ws.open();
        const welcomePacket = await this.waitForWelcomePacket();

        if (!this.noDebugPrints) {
            console.log('[libhalo][simulator] Connected, console URL: ', this.consoleUrl);
        }

        return welcomePacket;
    }

    getConsoleURL(): string {
        if (!this.consoleUrl) {
            throw new Error("Simulator is not yet connected!");
        }

        return this.consoleUrl;
    }

    async resetCardSet(options: Record<string, string>): Promise<void> {
        const res = await this.ws!.sendRequest({"type": "destroy_card_set", "options": options});

        if (res.type !== "ack") {
            throw new NFCBadTransportError("Unexpected reply from the server.");
        }
    }

    async swapCard(cardId: number): Promise<void> {
        const res = await this.ws!.sendRequest({"type": "swap_card", "card_id": cardId});

        if (res.type !== "ack") {
            throw new NFCBadTransportError("Unexpected reply from the server.");
        }
    }

    protected waitForWelcomePacket() {
        return new Promise((resolve, reject) => {
            const welcomeWaitTimeout = setTimeout(() => {
                reject(new NFCBadTransportError("Server doesn't send welcome packet for 6 seconds after accepting the connection."));
            }, 6000);

            this.ws!.onClose.addListener((event) => {
                reject(new NFCBadTransportError("WebSocket closed when waiting for welcome packet. Reason: [" + event.code + "] " + event.reason));
            });

            this.ws!.onUnpackedMessage.addListener(data => {
                if (data.type === "welcome") {
                    clearTimeout(welcomeWaitTimeout);
                    resolve(data);
                }
            });
        })
    }

    async disconnect() {
        await this.ws?.close();
        this.ws?.removeAllListeners();
    }

    onDisconnected() {
        return this._onDisconnected.asEvent();
    }

    protected unwrapRAPDU(response: Record<string, string>) {
        if (response.type !== "rapdu") {
            throw new NFCBadTransportError("Simulator returned an incorrect packet type, expected 'rapdu', got: '" + response.type + "'");
        }

        const buf = Buffer.from(response.data, "hex");

        if (buf.slice(-2).compare(Buffer.from("9000", "hex")) !== 0
                && buf.slice(-2).compare(Buffer.from("9100", "hex")) !== 0) {
            throw new HaloLogicError("Command execution failed: " + buf.slice(-2).toString("hex"));
        }

        return buf;
    }

    async execRawAPDU(data: Buffer): Promise<Buffer> {
        const res = await this.ws!.sendRequest({
            "type": "apdu",
            "data": data.toString('hex').toUpperCase()
        });

        if (res.type !== "rapdu") {
            throw new Error("Unexpected packet returned by simulator.");
        }

        return Buffer.from(res.data, "hex");
    }

    async execHaloCmd(command: HaloCommandObject) {
        const cmdOpts: ExecHaloCmdOptions = {
            method: "simulator",
            exec: async (command: Buffer, options?: ExecOptions) => {
                const wrappedCmd = wrapCommandForU2F(command);
                let execRes;

                try {
                    this.unwrapRAPDU(await this.ws!.sendRequest({
                        "type": "apdu",
                        "data": "00A4040008A0000006472F0001"
                    }));

                    execRes = this.unwrapRAPDU(await this.ws!.sendRequest({
                        "type": "apdu",
                        "data": wrappedCmd.toString('hex').toUpperCase() // execute wrapped command
                    }));
                } catch (e) {
                    if (e instanceof NFCBadTransportError || e instanceof HaloLogicError) {
                        throw e;
                    }

                    throw new NFCBadTransportError("Failed to send command to the simulator: " + (<Error> e).toString());
                }

                const unwrappedRes = unwrapResultFromU2F(execRes.slice(0, -2));

                if (unwrappedRes.length === 2 && unwrappedRes[0] === 0xE1) {
                    if (Object.prototype.hasOwnProperty.call(ERROR_CODES, unwrappedRes[1])) {
                        const err = ERROR_CODES[unwrappedRes[1]];
                        throw new HaloTagError(err[0], err[1]);
                    } else {
                        const errCode = arr2hex([unwrappedRes[1]]);
                        throw new HaloTagError("ERROR_CODE_" + errCode, "Command returned an unknown error: " + arr2hex(unwrappedRes));
                    }
                }

                return {
                    result: unwrappedRes.toString('hex'),
                    extra: {}
                };
            }
        };

        let res;
        if (!this.noDebugPrints) {
            console.log('[libhalo][simulator] => ', command);
        }
        try {
            res = await execHaloCmd(command, cmdOpts);
        } catch (e) {
            if (!this.noDebugPrints) {
                console.error('[libhalo][simulator] err', e);
            }
            throw e;
        }
        if (!this.noDebugPrints) {
            console.log('[libhalo][simulator] <= ', res);
        }
        return res;
    }
}

class SimHaloAPI extends BaseHaloAPI {
    protected readonly sim: HaloSimulator;

    constructor(options?: SimulatorOptions) {
        super();

        this.sim = new HaloSimulator(options);
    }

    async connect(options: ConnectSimulatorOptions) {
        await this.sim.connect(options);
    }

    async resetCardSet(options: Record<string, string>): Promise<void> {
        await this.sim.resetCardSet(options);
    }

    async swapCard(cardId: number): Promise<void> {
        await this.sim.swapCard(cardId);
    }

    executeCommand(args: HaloCommandObject): Promise<HaloResponseObject> {
        return this.sim.execHaloCmd(args);
    }
}

export {
    HaloSimulator,
    SimHaloAPI
};