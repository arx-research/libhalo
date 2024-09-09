import {Reader, ReaderEventListener, Card, ConnectSimulatorOptions} from "@arx-research/libhalo/types";
import {Buffer} from 'buffer/index.js';
import {HaloSimulator} from "@arx-research/libhalo/api/common";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import websocket from 'websocket';

export interface INFCOn {
    (eventName: 'reader', listener: (reader: Reader) => void): void;
    (eventName: 'error', listener: (error: Error) => void): void;
}

export interface INFC {
    on: INFCOn;
    readers: Record<string, Reader>;
    close: () => void;
}

export class SimNFC implements INFC {
    _connectedReader = new SimReader();
    readers: Record<string, Reader>;
    _onReader: ((reader: Reader) => void)[] = [];
    _onError: ((error: Error) => void)[] = [];
    _options: ConnectSimulatorOptions;

    constructor(options: ConnectSimulatorOptions) {
        this._options = options;
        this.readers = {};
    }

    async initialize() {
        try {
            await this._connectedReader.initialize(this._options);
        } catch (e) {
            this._onError.forEach((listener) => {
                listener(e as Error);
            });
            return;
        }

        this._onReader.forEach((listener) => {
            const rdrName = this._connectedReader.name;
            this.readers = {rdrName: this._connectedReader};
            listener(this._connectedReader);
        });
    }

    getCardSetID() {
        return this._options.csetId;
    }

    getSimInstance() {
        return this._options.simInstance;
    }

    getConsoleURL() {
        return this._connectedReader.sim.getConsoleURL();
    }

    async swapCard(selectedId: number) {
        return await this._connectedReader.sim.swapCard(selectedId);
    }

    async resetCardSet(options: Record<string, string>) {
        return await this._connectedReader.sim.resetCardSet(options);
    }

    async destroyCardSet() {
        return await this._connectedReader.sim.destroyCardSet();
    }

    on: INFCOn = (eventName, listener) => {
        if (eventName === "reader") {
            const _listener = listener as (reader: Reader) => void;

            if (this._onReader.length === 0) {
                setTimeout(() => this.initialize(), 1);
            }

            this._onReader.push(_listener);
        } else if (eventName === "error") {
            const _listener = listener as (error: Error) => void;
            this._onError.push(_listener);
        }
    }

    close() {
        this._connectedReader.close();
    }
}

export class SimCard implements Card {
    type = "TAG_ISO_14443_4"
    atr = Buffer.from("3b8c80019067464a010088060000000079", "hex")
}

export class SimReader implements Reader {
    autoProcessing: boolean = false;
    name: string;
    reader: { name: string };
    sim: HaloSimulator;
    _insertedCard = new SimCard();

    constructor() {
        this.autoProcessing = false;
        this.name = "Simulator"
        this.reader = {name: this.name};
        this.sim = new HaloSimulator({
            createWebSocket: (url) => new websocket.w3cwebsocket(url),
            noDebugPrints: true
        });
    }

    async initialize(options: ConnectSimulatorOptions) {
        this.name = "Simulator " + options.simInstance + " " + options.csetId
        this.reader.name = this.name;
        await this.sim.connect(options);
    }

    close() {
        this.sim.disconnect();
    }

    async transmit(data: Buffer, responseMaxLength: number): Promise<Buffer> {
        return await this.sim.execRawAPDU(data);
    }

    on: ReaderEventListener = (eventName, listener) => {
        const _listener = listener as (card: Card) => void;

        if (eventName === "card") {
            setTimeout(() => _listener(this._insertedCard as Card), 1);
        }

        // remaining types of events are not simulated at all
    }
}
