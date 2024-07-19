import {NFCAbortedError, NFCMethodNotSupported} from "../halo/exceptions.js";
import {execCredential} from "./credential.js";
import {execWebNFC} from "./webnfc.js";
import {execHaloCmd} from "./common.js";
import {emulatedPromptStatusCallback} from "../web/soft_prompt.js";
import {isWebDebugEnabled} from "../halo/util.js";
import {
    ExecHaloCmdOptions,
    ExecHaloCmdWebOptions, HaloAPICallOptions,
    HaloCommandObject, HaloResponseObject, HaloWebAPICallOptions,
    HaloWebMethod,
    StatusCallbackDetails
} from "../types.js";
import {Buffer} from 'buffer/index.js';
import {BaseHaloAPI} from "../halo/cmd_exec.js";

let isCallRunning = false;

function makeDefault<Type>(curValue: Type | null | undefined, defaultValue: Type): Type {
    if (typeof curValue === "undefined") {
        return defaultValue;
    }

    if (curValue === null) {
        return defaultValue;
    }

    return curValue;
}

/**
 * Detect the best command execution method for the current device.
 * @returns {string} Either "credential" or "webnfc".
 */
export function detectMethod() {
    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        new window.NDEFReader();
    } catch (e) {
        // WebNFC not supported
        return "credential";
    }

    return "webnfc";
}

function defaultStatusCallback(cause: string, statusObj: StatusCallbackDetails) {
    if (statusObj.execMethod === "webnfc") {
        return emulatedPromptStatusCallback(cause, statusObj);
    }

    // the rest execMethods are ignored since the operating system
    // would display appropriate UI with a scanning prompt on its own
    return null;
}

/**
 * Execute the NFC command from the web browser.
 * @param command Command specification object.
 * @param options Additional options for the command executor.
 * @returns {Promise<*>} Command execution result.
 */
export async function execHaloCmdWeb(command: HaloCommandObject, options?: ExecHaloCmdWebOptions) {
    if (options && !options.noDebounce && isCallRunning) {
        throw new NFCAbortedError("The operation was debounced.");
    }

    isCallRunning = true;

    options = options ? Object.assign({}, options) : {};
    options.method = makeDefault<HaloWebMethod>(options.method, detectMethod());
    options.noDebounce = makeDefault<boolean>(options.noDebounce, false);
    options.statusCallback = makeDefault(options.statusCallback, defaultStatusCallback);

    command = command ? Object.assign({}, command) : {};

    if (isWebDebugEnabled()) {
        console.log('[libhalo] execHaloCmdWeb() command:', command);
        console.log('[libhalo] execHaloCmdWeb() options:', options);
    }

    try {
        let cmdOpts: ExecHaloCmdOptions;

        if (options.method === "credential") {
            cmdOpts = {
                method: "credential",
                exec: async (command: Buffer) => await execCredential(command, {
                    statusCallback: options.statusCallback
                })
            };
        } else if (options.method === "webnfc") {
            cmdOpts = {
                method: "webnfc",
                exec: async (command: Buffer) => await execWebNFC(command, {
                    statusCallback: options.statusCallback
                })
            };
        } else {
            throw new NFCMethodNotSupported("Unsupported options.method parameter specified.");
        }

        return await execHaloCmd(command, cmdOpts);
    } finally {
        if (options.statusCallback) {
            options.statusCallback("finished", {
                execMethod: options.method,
                execStep: "finished",
                cancelScan: () => null,
            });
        }

        isCallRunning = false;
    }
}

export class HaloWebAPI extends BaseHaloAPI {
    private readonly options: ExecHaloCmdWebOptions | undefined;

    constructor(options?: ExecHaloCmdWebOptions) {
        super();

        this.options = options;
    }

    executeCommand(args: HaloCommandObject, options?: HaloWebAPICallOptions): Promise<HaloResponseObject> {
        return execHaloCmdWeb(args, {...this.options, ...options});
    }
}
