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
    HaloWebMethod, NDEFReader,
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
 * Historically, this method was trying to pick the best among "credential" or "webnfc".
 * Right now it is going to statically return "credential" in all cases.
 */
export function detectMethod() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (navigator && navigator.userAgentData && navigator.userAgentData.brands) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const chromeVerObj = navigator.userAgentData.brands.filter(
            (o: { brand: string; version: string; }) => o.brand == "Google Chrome");

        if (chromeVerObj.length === 1 && typeof chromeVerObj[0].version === "string") {
            const chromeVer = parseInt(chromeVerObj[0].version);

            if (chromeVer < 124) {
                // we want to use WebNFC on older Chrome Android (version <124)
                // newer Chrome versions contain proper Credential API UX

                try {
                    new NDEFReader();
                    return "webnfc";
                } catch (e) {
                    // pass
                }
            }
        }
    }

    return "credential";
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
