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
import {HaloLogicError, NFCBadTransportError} from "./exceptions.js";

class HaloSimulator {
    protected url: string | null;
    protected readonly createWebSocket: (url: string) => WebSocket;
    protected ws: WebSocketAsPromised | null;
    protected _onDisconnected = new SignalDispatcher();

    constructor(options?: SimulatorOptions) {
        options = Object.assign({}, options);

        this.url = null;
        this.ws = null;

        this.createWebSocket = options.createWebSocket
            ? options.createWebSocket
            : (url: string) => new WebSocket(url);
    }

    protected async signJWT(url: string, authSecret: string, cardId: string) {
        return await new SignJWT({card_id: cardId}) // details to  encode in the token
            .setProtectedHeader({alg: 'HS256'}) // algorithm
            .setIssuedAt()
            .setAudience(queryString.parseUrl(url).url)
            .setExpirationTime("180 seconds")
            .sign(Buffer.from(authSecret, 'hex')); // secretKey generated from previous step
    }

    async connect(options: ConnectSimulatorOptions) {
        this.url = queryString.stringifyUrl({url: options.url, query: {
            jwt: await this.signJWT(options.url, options.authSecret, options.cardId)
        }});

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
        await this.waitForWelcomePacket();
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

                return {
                    result: unwrappedRes.toString('hex'),
                    extra: {}
                };
            }
        };

        let res;
        console.log('[libhalo][simulator] => ', command);
        try {
            res = await execHaloCmd(command, cmdOpts);
        } catch (e) {
            console.error('[libhalo][simulator] err', e);
            throw e;
        }
        console.log('[libhalo][simulator] <= ', res);
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

    executeCommand(args: HaloCommandObject): Promise<HaloResponseObject> {
        return this.sim.execHaloCmd(args);
    }
}

export {
    HaloSimulator,
    SimHaloAPI
};
