/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const Buffer = require('buffer/').Buffer;
const ethers = require('ethers');
const {HaloLogicError, HaloTagError} = require("./exceptions");
const {convertSignature, mode, parseSig, parsePublicKeys} = require("./utils");
const {FLAGS} = require("./flags");
const {sha256} = require("js-sha256");
const EC = require("elliptic").ec;
const CMD = require('./cmdcodes').CMD_CODES;

const ec = new EC('secp256k1');

/**
 * NOTE: Since LibHaLo supports multiple driver backends which differ in their implementation and behavior,
 * there are few things to consider when implementing a new command or modifying the existing code.
 *
 * Web-based drivers (webnfc, credential):
 * -> the command implementation may only call options.exec() once;
 *
 * React Native driver (nfc-manager) and PC/SC driver (pcsc):
 * -> there are no limitations on the number of calls to options.exec();
 *
 * The command could provide a different implementation for a given driver, but that should be
 * a last-resort solution. Optimally, the command implementation should be independent of the driver used,
 * if that's possible.
 */

function extractPublicKeyWebNFC(keyNo, resp) {
    let publicKey = null;
    let pkKey = "pk" + keyNo;

    if (resp.extra.hasOwnProperty(pkKey)) {
        publicKey = Buffer.from(resp.extra[pkKey], "hex");
    } else if (resp.extra.hasOwnProperty("static")) {
        let pkeys = parsePublicKeys(Buffer.from(resp.extra["static"], "hex"));
        publicKey = pkeys[keyNo];
    }

    return publicKey;
}

async function cmdGetPkeys(options, args) {
    let payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_GET_PKEYS])
    ]);

    let resp = await options.exec(payload);
    let res = Buffer.from(resp.result, "hex");

    let publicKeys = parsePublicKeys(res);
    let compressedPublicKeys = {};
    let etherAddresses = {};

    for (let pkNo of Object.keys(publicKeys)) {
        compressedPublicKeys[pkNo] = ec.keyFromPublic(publicKeys[pkNo], 'hex').getPublic().encodeCompressed('hex');
        etherAddresses[pkNo] = ethers.utils.computeAddress('0x' + publicKeys[pkNo]);
    }

    return {publicKeys, compressedPublicKeys, etherAddresses};
}

async function cmdSign(options, args) {
    let checks = [
        args.hasOwnProperty("digest") && typeof args.digest !== "undefined",
        args.hasOwnProperty("message") && typeof args.message !== "undefined",
        args.hasOwnProperty("typedData") && typeof args.typedData !== "undefined"
    ];

    let numDataArgs = checks.filter((x) => !!x).length;

    if (numDataArgs !== 1) {
        throw new HaloLogicError("One of the following arguments are required: digest, message, typedData.");
    }

    let messageBuf = null;
    let digestBuf = null;

    if (args.hasOwnProperty("message") && typeof args.message !== "undefined") {
        if (args.format === "text") {
            messageBuf = Buffer.from(args.message);
        } else if (!args.format || args.format === "hex") {
            messageBuf = Buffer.from(args.message, "hex");

            if (args.message.length !== messageBuf.length * 2) {
                throw new HaloLogicError("Failed to decode command.message parameter. If you want to sign text instead of bytes, please use command.format = 'text'.");
            }
        } else {
            throw new HaloLogicError("Invalid message format specified. Valid formats: text, hex.");
        }

        digestBuf = Buffer.from(ethers.utils.hashMessage(messageBuf).slice(2), "hex");
    } else if (args.hasOwnProperty("typedData") && typeof args.typedData !== "undefined") {
        let hashStr;

        try {
            hashStr = ethers.utils._TypedDataEncoder.hash(args.typedData.domain, args.typedData.types, args.typedData.value);
        } catch (e) {
            throw new HaloLogicError("Unable to encode typed data. Please check if the data provided conforms to the required schema.");
        }

        digestBuf = Buffer.from(hashStr.slice(2), "hex");
    } else if (args.hasOwnProperty("digest") && typeof args.digest !== "undefined") {
        digestBuf = Buffer.from(args.digest, "hex");

        if (args.digest.length !== digestBuf.length * 2 || digestBuf.length !== 32) {
            throw new HaloLogicError("Failed to decode command.digest parameter. The digest to be signed must be exactly 32 bytes long.");
        }
    } else {
        throw new HaloLogicError("Either args.digest, args.message or args.typedData is required.");
    }

    let payload;
    let pwdHash = null;

    if (args.password) {
        if (!args.publicKeyHex) {
            throw new HaloLogicError("Target public key must be provided when using password.");
        }

        let pwdBuf = Buffer.from(args.password, "utf-8");
        let publicKeyBuf = Buffer.from(args.publicKeyHex, "hex");
        pwdHash = Buffer.from(sha256(Buffer.concat([publicKeyBuf, pwdBuf])), "hex");
    }

    if (args.legacySignCommand || options.method === "webnfc") {
        // the public key will be available through URL parameters
        // we only need to sign the digest
        if (!pwdHash) {
            payload = Buffer.concat([
                Buffer.from([CMD.SHARED_CMD_SIGN, args.keyNo]),
                digestBuf
            ]);
        } else {
            payload = Buffer.concat([
                Buffer.from([CMD.SHARED_CMD_SIGN_PWD, args.keyNo]),
                digestBuf,
                pwdHash
            ]);
        }
    } else {
        // sign the digest and also fetch the public key
        if (!pwdHash) {
            payload = Buffer.concat([
                Buffer.from([CMD.SHARED_CMD_FETCH_SIGN, args.keyNo]),
                digestBuf
            ]);
        } else {
            payload = Buffer.concat([
                Buffer.from([CMD.SHARED_CMD_FETCH_SIGN_PWD, args.keyNo]),
                digestBuf,
                pwdHash
            ]);
        }
    }

    let resp;

    try {
        resp = await options.exec(payload);
    } catch (e) {
        if (e instanceof HaloTagError) {
            if (e.name === "ERROR_CODE_UNKNOWN_CMD") {
                throw new HaloLogicError("The tag doesn't support the new signing command. Please set command.legacySignCommand = true.");
            }
        }

        throw e;
    }

    let sigBuf = Buffer.from(resp.result, "hex");
    let sigLen = sigBuf[1] + 2;
    let sig = sigBuf.slice(0, sigLen).toString('hex');
    let publicKey = null;

    if (!args.legacySignCommand && options.method !== "webnfc") {
        if (sigBuf[sigLen] !== 0x04) {
            throw new HaloLogicError("Assertion failed, expected public key first byte to be 0x04.");
        }

        publicKey = sigBuf.slice(sigLen, sigLen + 65);
    } else if (options.method === "webnfc") {
        publicKey = extractPublicKeyWebNFC(args.keyNo, resp);
    }

    let inputObj = {
        "keyNo": args.keyNo,
        "digest": digestBuf.toString('hex'),
    };

    if (messageBuf !== null) {
        inputObj.message = messageBuf.toString('hex');
    } else if (args.typedData) {
        inputObj.typedData = args.typedData;

        inputObj.primaryType = ethers.utils._TypedDataEncoder.getPrimaryType(args.typedData.types);
        inputObj.domainHash = ethers.utils._TypedDataEncoder.hashDomain(args.typedData.domain).slice(2);
    }

    if (publicKey) {
        return {
            "input": inputObj,
            "signature": convertSignature(digestBuf.toString('hex'), sig.toString('hex'), publicKey.toString('hex')),
            "publicKey": publicKey.toString('hex'),
            "etherAddress": ethers.utils.computeAddress('0x' + publicKey.toString('hex'))
        };
    } else {
        return {
            "input": inputObj,
            "signature": {
                "der": sig.toString('hex')
            }
        };
    }
}

async function cmdWriteLatch(options, args) {
    let payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_LATCH_DATA, args.latchNo]),
        Buffer.from(args.data, "hex")
    ]);

    await options.exec(payload);
    return {"status": "ok"};
}

async function cmdSignRandom(options, args) {
    let resp = await options.exec(Buffer.from([CMD.SHARED_CMD_SIGN_RANDOM, args.keyNo]));

    let resBuf = Buffer.from(resp.result, 'hex');
    let digest = resBuf.slice(0, 32);
    let signature = resBuf.slice(32, 32 + resBuf[33] + 2);
    let publicKey = resBuf.slice(32 + resBuf[33] + 2);

    let counter = digest.readUInt32BE(0);

    return {
        "counter": counter,
        "digest": digest.toString('hex'),
        "signature": signature.toString('hex'),
        "publicKey": publicKey.toString('hex')
    };
}

async function cmdSignChallenge(options, args) {
    let challengeBuf = Buffer.from(args.challenge, "hex");
    let resp = await options.exec(Buffer.from([CMD.SHARED_CMD_SIGN_CHALLENGE, args.keyNo, ...challengeBuf]));

    let resBuf = Buffer.from(resp.result, 'hex');
    let sigLen = 2 + resBuf[1];

    let signature = resBuf.slice(0, sigLen);
    let publicKey = resBuf.slice(sigLen);

    return {
        "signature": signature.toString('hex'),
        "publicKey": publicKey.toString('hex')
    };
}

async function cmdCfgNDEF(options, args) {
    if (args.flagHidePk1 && args.flagHidePk2) {
        throw new HaloLogicError("It's not allowed to use both flagHidePk1 and flagHidePk2.");
    }

    let flagBuf = Buffer.alloc(2);

    Object.keys(args)
        .filter((k) => k.startsWith('flag') && args[k])
        .map((k) => FLAGS[k])
        .forEach((v) => {
            flagBuf[v[0]] |= v[1];
        });

    let payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_SET_NDEF_MODE]),
        flagBuf
    ]);
    await options.exec(payload);

    return {"status": "ok"};
}

async function cmdGenKey(options, args) {
    if (!args.entropy) {
        let payload = Buffer.concat([
            Buffer.from([CMD.SHARED_CMD_GENERATE_3RD_KEY])
        ]);
        let resp = await options.exec(payload);
        let res = Buffer.from(resp.result, "hex");

        return {"status": "ok", "publicKey": res.toString('hex'), "needsConfirm": false};
    } else {
        let entropyBuf = Buffer.from(args.entropy, "hex");

        if (entropyBuf.length !== 32) {
            throw new HaloLogicError("The command.entropy should be exactly 32 bytes, hex encoded.");
        }

        let payload = Buffer.concat([
            Buffer.from([CMD.SHARED_CMD_GENERATE_3RD_KEY]),
            entropyBuf
        ]);

        let resp;

        try {
            resp = await options.exec(payload);
        } catch (e) {
            if (e instanceof HaloTagError) {
                if (e.name === "ERROR_CODE_INVALID_LENGTH") {
                    throw new HaloLogicError("The hardened key generation algorithm is not supported with this tag version.");
                }
            }

            throw e;
        }

        let res = Buffer.from(resp.result, "hex");

        if (res.length === 65) {
            throw new HaloLogicError("The hardened key generation algorithm is not supported with this tag version.");
        }

        let msg1 = Buffer.from(sha256(res.slice(0, 32)), 'hex');
        let msg2 = Buffer.from(sha256(res.slice(32, 64)), 'hex');
        let sig = res.slice(64);
        let sig1Length = sig[1];
        let sig1 = sig.slice(0, 2 + sig1Length);
        let sig2 = sig.slice(2 + sig1Length);

        let candidates = [];

        for (let i = 0; i < 2; i++) {
            candidates.push(ec.recoverPubKey(msg1, parseSig(sig1), i).encode('hex'));
            candidates.push(ec.recoverPubKey(msg2, parseSig(sig2), i).encode('hex'));
        }

        let bestPk = Buffer.from(mode(candidates), 'hex');
        return {"status": "ok", "publicKey": bestPk.toString('hex'), "needsConfirm": true};
    }
}

async function cmdGenKeyConfirm(options, args) {
    let payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_GENERATE_3RD_KEY_CONT]),
        Buffer.from(args.publicKey, "hex")
    ]);

    await options.exec(payload);

    return {"status": "ok"};
}

async function cmdGenKeyFinalize(options, args) {
    let payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_GENERATE_3RD_KEY_FINALIZE])
    ]);

    await options.exec(payload);

    return {"status": "ok"};
}

async function cmdSetURLSubdomain(options, args) {
    let payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_SET_URL_SUBDOMAIN]),
        Buffer.from([args.subdomain.length]),
        Buffer.from(args.subdomain),
        Buffer.from(args.allowSignatureDER, 'hex')
    ]);

    await options.exec(payload);

    return {"status": "ok"};
}

async function cmdSetPassword(options, args) {
    let pwdBuf = Buffer.from(args.password, "utf-8");

    let payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_SET_PASSWORD]),
        Buffer.from([args.keyNo]),
        Buffer.from([pwdBuf.length]),
        pwdBuf
    ]);

    await options.exec(payload);

    return {"status": "ok"};
}

async function cmdUnsetPassword(options, args) {
    let pwdBuf = Buffer.from(args.password, "utf-8");
    let publicKeyBuf = Buffer.from(args.publicKeyHex, "hex");
    let pwdHash = Buffer.from(sha256(Buffer.concat([publicKeyBuf, pwdBuf])), "hex");

    let payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_UNSET_PASSWORD]),
        Buffer.from([args.keyNo]),
        pwdHash
    ]);

    await options.exec(payload);

    return {"status": "ok"};
}

module.exports = {
    cmdSign,
    cmdSignRandom,
    cmdWriteLatch,
    cmdCfgNDEF,
    cmdGenKey,
    cmdGenKeyConfirm,
    cmdGetPkeys,
    cmdGenKeyFinalize,
    cmdSignChallenge,
    cmdSetURLSubdomain,
    cmdSetPassword,
    cmdUnsetPassword
};
