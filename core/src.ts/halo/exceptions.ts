/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

/**
 * This error is thrown when there is an error response from the tag itself.
 * The "name" property will contain the exact error name (e.g. ERROR_CODE_INVALID_KEY_NO).
 */
class HaloTagError extends Error {
    public errorName: string;
    public stackOnExecutor: string | undefined;

    constructor(name: string, message: string, stackOnExecutor?: string) {
        super("The NFC tag encountered an error when executing command: " + message);
        this.name = name;
        this.errorName = "HaloTagError";
        this.stackOnExecutor = stackOnExecutor;
    }
}

/**
 * There is an unexpected logic error while processing information on the client's side.
 * Check "message" property for the detailed information.
 */
class HaloLogicError extends Error {
    public errorName: string;
    public stackOnExecutor: string | undefined;

    constructor(message: string, stackOnExecutor?: string) {
        super(message);
        this.name = "HaloLogicError";
        this.errorName = this.name;
        this.stackOnExecutor = stackOnExecutor;
    }
}

/**
 * The user has denied NFC access permission.
 */
class NFCPermissionRequestDenied extends Error {
    public errorName: string;

    constructor(message: string) {
        super(message);
        this.name = "NFCPermissionRequestDenied";
        this.errorName = this.name;
    }
}

/**
 * This NFC access method is not supported by the user's browser
 * or the method is invoked incorrectly. Check "message" property
 * for the detailed explanation.
 */
class NFCMethodNotSupported extends Error {
    public errorName: string;

    constructor(message: string) {
        super(message);
        this.name = "NFCMethodNotSupported";
        this.errorName = this.name;
    }
}

/**
 * When executeNFCCommand() is concurrently executed multiple times,
 * all calls except one will fail with NFCAbortedError.
 * This error should be ignored on the frontend.
 */
class NFCAbortedError extends Error {
    public errorName: string;

    constructor(message: string) {
        super(message);
        this.name = "NFCAbortedError";
        this.errorName = this.name;
    }
}

/**
 * There was a low-level failure of the NFC command execution mechanism.
 * Check "message" property for more details.
 */
class NFCOperationError extends Error {
    public errorName: string;
    public stackOnExecutor: string | undefined;

    constructor(message: string, stackOnExecutor?: string) {
        super(message);
        this.name = "NFCOperationError";
        this.errorName = this.name;
        this.stackOnExecutor = stackOnExecutor;
    }
}

/**
 * The currently used transport (HaLo Bridge/Gateway) has failed permanently (for instance due to disconnect),
 * and can no longer be used without creating a completely new instance first.
 */
class NFCBadTransportError extends Error {
    public errorName: string;

    constructor(message: string) {
        super(message);
        this.name = "NFCBadTransportError";
        this.errorName = this.name;
    }
}

/**
 * The current origin is not on the HaLo Bridge's allow list.
 */
class NFCBridgeConsentError extends Error {
    public errorName: string;

    constructor(message: string) {
        super(message);
        this.name = "NFCBridgeConsentError";
        this.errorName = this.name;
    }
}

/**
 * Bridge has encountered an internal unexpected error.
 */
class NFCBridgeUnexpectedError extends Error {
    public errorName: string;
    public stackOnExecutor: string;

    constructor(message: string, stackOnExecutor: string) {
        super(message);
        this.errorName = this.name;
        this.stackOnExecutor = stackOnExecutor;
    }
}

/**
 * Gateway has encountered an internal unexpected error.
 */
class NFCGatewayUnexpectedError extends Error {
    public errorName: string;
    public stackOnExecutor: string;

    constructor(message: string, stackOnExecutor: string) {
        super(message);
        this.errorName = this.name;
        this.stackOnExecutor = stackOnExecutor;
    }
}

export {
    HaloTagError,
    HaloLogicError,
    NFCPermissionRequestDenied,
    NFCMethodNotSupported,
    NFCAbortedError,
    NFCOperationError,
    NFCBadTransportError,
    NFCBridgeConsentError,
    NFCBridgeUnexpectedError,
    NFCGatewayUnexpectedError,
};
