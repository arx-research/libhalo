/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import crypto from 'crypto';

import {Buffer} from 'buffer/index.js';
import {ethers} from 'ethers';
import {HaloLogicError, HaloTagError} from "./exceptions.js";
import {
    BJJ_ORDER,
    convertSignature,
    mode,
    parsePublicKeys,
    parseSig,
    randomBuffer,
    SECP256k1_ORDER,
    sigToDer
} from "./util.js";
import {FLAGS} from "./flags.js";
import {sha256} from "js-sha256";
import elliptic from 'elliptic';
import {CMD_CODES as CMD} from './cmdcodes.js';
import pbkdf2 from 'pbkdf2';
import {KEY_FLAGS, parseKeyFlags} from "./keyflags.js";
import {
    ExecHaloCmdOptions,
    ExecReturnStruct,
    HaloCmdCFGNDEF,
    HaloCmdCFGNDEFStoreGraffiti,
    HaloCmdGenKey,
    HaloCmdGenKeyConfirm,
    HaloCmdGenKeyFinalize,
    HaloCmdReplacePasswordStoreGraffiti,
    HaloResCFGNDEF,
    HaloResCFGNDEFStoreGraffiti,
    HaloResGenKey,
    HaloResGenKeyConfirm,
    HaloResGenKeyFinalize,
    HaloResReplacePasswordStoreGraffiti,
    KeyFlags,
    PublicKeyList
} from "../types.js";
import {
    HaloCmdExportKey,
    HaloCmdGetDataStruct,
    HaloCmdGetGraffiti,
    HaloCmdGetKeyInfo,
    HaloCmdGetPkeys,
    HaloCmdGetTransportPK,
    HaloCmdImportKey,
    HaloCmdImportKeyInit,
    HaloCmdLoadTransportPK,
    HaloCmdReplacePassword,
    HaloCmdSetPassword,
    HaloCmdSetURLSubdomain,
    HaloCmdSign,
    HaloCmdSignChallenge,
    HaloCmdSignRandom,
    HaloCmdStoreGraffiti,
    HaloCmdUnsetPassword,
    HaloCmdWriteLatch,
    HaloResExportKey,
    HaloResGetDataStruct,
    HaloResGetGraffiti,
    HaloResGetKeyInfo,
    HaloResGetPkeys,
    HaloResGetTransportPK,
    HaloResImportKey,
    HaloResImportKeyInit,
    HaloResInputObj,
    HaloResLoadTransportPK,
    HaloResReplacePassword,
    HaloResSetPassword,
    HaloResSetURLSubdomain,
    HaloResSign,
    HaloResSignChallenge,
    HaloResSignRandom,
    HaloResStoreGraffiti,
    HaloResUnsetPassword,
    HaloResWriteLatch,
    StructErrorResponse
} from "./command_types.js";

const ec = new elliptic.ec('secp256k1');

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

function extractPublicKeyWebNFC(keyNo: number, resp: ExecReturnStruct) {
    let publicKey = null;
    const pkKey = "pk" + keyNo;

    if (Object.prototype.hasOwnProperty.call(resp.extra, pkKey)) {
        publicKey = Buffer.from(resp.extra[pkKey], "hex");
    } else if (Object.prototype.hasOwnProperty.call(resp.extra, "static")) {
        const pkeys = parsePublicKeys(Buffer.from(resp.extra["static"], "hex"));
        publicKey = pkeys[keyNo];
    }

    return publicKey;
}

async function cmdGetPkeys(options: ExecHaloCmdOptions, args: HaloCmdGetPkeys): Promise<HaloResGetPkeys> {
    const payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_GET_PKEYS])
    ]);

    const resp = await options.exec(payload);
    const res = Buffer.from(resp.result, "hex");

    const publicKeys = parsePublicKeys(res);
    const compressedPublicKeys: PublicKeyList = {};
    const etherAddresses: PublicKeyList = {};

    for (const pkNo of Object.keys(publicKeys).map(Number)) {
        compressedPublicKeys[pkNo] = ec.keyFromPublic(publicKeys[pkNo], 'hex').getPublic().encodeCompressed('hex');
        etherAddresses[pkNo] = ethers.computeAddress('0x' + publicKeys[pkNo]);
    }

    return {publicKeys, compressedPublicKeys, etherAddresses};
}

async function cmdSign(options: ExecHaloCmdOptions, args: HaloCmdSign): Promise<HaloResSign> {
    const checks = [
        Object.prototype.hasOwnProperty.call(args, "digest") && typeof args.digest !== "undefined",
        Object.prototype.hasOwnProperty.call(args, "message") && typeof args.message !== "undefined",
        Object.prototype.hasOwnProperty.call(args, "typedData") && typeof args.typedData !== "undefined"
    ];

    const numDataArgs = checks.filter((x) => !!x).length;

    if (numDataArgs !== 1) {
        throw new HaloLogicError("One of the following arguments are required: digest, message, typedData.");
    }

    let messageBuf = null;
    let digestBuf = null;

    if (Object.prototype.hasOwnProperty.call(args, "message") && typeof args.message !== "undefined") {
        if (args.format === "text") {
            messageBuf = Buffer.from(args.message);
        } else if (!args.format || args.format === "hex") {
            let msg = args.message;

            if (msg.startsWith("0x")) {
                msg = msg.substring(2);
            }

            messageBuf = Buffer.from(msg, "hex");

            if (msg.length !== messageBuf.length * 2) {
                throw new HaloLogicError("Failed to decode command.message parameter. If you want to sign text instead of bytes, please use command.format = 'text'.");
            }
        } else {
            throw new HaloLogicError("Invalid message format specified. Valid formats: text, hex.");
        }

        digestBuf = Buffer.from(ethers.hashMessage(messageBuf).slice(2), "hex");
    } else if (Object.prototype.hasOwnProperty.call(args, "typedData") && typeof args.typedData !== "undefined") {
        let hashStr;

        try {
            hashStr = ethers.TypedDataEncoder.hash(args.typedData.domain, args.typedData.types, args.typedData.value);
        } catch (e) {
            throw new HaloLogicError("Unable to encode typed data. Please check if the data provided conforms to the required schema.");
        }

        digestBuf = Buffer.from(hashStr.slice(2), "hex");
    } else if (Object.prototype.hasOwnProperty.call(args, "digest") && typeof args.digest !== "undefined") {
        digestBuf = Buffer.from(args.digest, "hex");

        if (args.digest.length !== digestBuf.length * 2 || digestBuf.length !== 32) {
            throw new HaloLogicError("Failed to decode command.digest parameter. The digest to be signed must be exactly 32 bytes long.");
        }
    } else {
        throw new HaloLogicError("Either args.digest, args.message or args.typedData is required.");
    }

    let payload;
    let pwdHash = null;

    if (args.rawPwdDigest && args.password) {
        throw new HaloLogicError("Arguments authDigest and password are mutually exclusive.")
    }

    if (args.rawPwdDigest) {
        pwdHash = Buffer.from(sha256(Buffer.concat([
            Buffer.from([0x19]),
            Buffer.from("Password authentication:\n"),
            Buffer.from([args.keyNo]),
            digestBuf,
            Buffer.from(args.rawPwdDigest, "hex")
        ])), "hex");
    } else if (args.password) {
        const derivedKey = pbkdf2.pbkdf2Sync(args.password, 'HaLoChipSalt', 5000, 16, 'sha512');

        pwdHash = Buffer.from(sha256(Buffer.concat([
            Buffer.from([0x19]),
            Buffer.from("Password authentication:\n"),
            Buffer.from([args.keyNo]),
            digestBuf,
            derivedKey
        ])), "hex");
    }

    if ((args.legacySignCommand || options.method === "webnfc") && args.keyNo <= 3) {
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

    const sigBuf = Buffer.from(resp.result, "hex");
    const sigLen = sigBuf[1] + 2;
    const sig = sigBuf.slice(0, sigLen).toString('hex');
    let publicKey = null;

    if ((!args.legacySignCommand && options.method !== "webnfc") || args.keyNo > 3) {
        if (sigBuf[sigLen] !== 0x04) {
            throw new HaloLogicError("Assertion failed, expected public key first byte to be 0x04.");
        }

        publicKey = sigBuf.slice(sigLen, sigLen + 65);
    } else if (options.method === "webnfc") {
        publicKey = extractPublicKeyWebNFC(args.keyNo, resp);
    }

    const inputObj: HaloResInputObj = {
        "keyNo": args.keyNo,
        "digest": digestBuf.toString('hex')
    };

    if (args.skipPostprocessing) {
        return {
            "input": inputObj,
            "signature": {
                "der": sig,
            },
            "publicKey": publicKey ? publicKey.toString('hex') : undefined
        };
    }

    if (messageBuf !== null) {
        inputObj.message = messageBuf.toString('hex');
    } else if (args.typedData) {
        inputObj.typedData = {
            primaryType: ethers.TypedDataEncoder.getPrimaryType(args.typedData.types),
            domainHash: ethers.TypedDataEncoder.hashDomain(args.typedData.domain).slice(2),
            ...args.typedData
        };
    }

    if (args.keyNo >= 0x60) {
        return {
            "input": inputObj,
            "signature": {
                "der": sigToDer(parseSig(Buffer.from(sig, "hex"), BJJ_ORDER)).toString('hex')
            },
            "publicKey": publicKey ? publicKey.toString('hex') : undefined
        };
    }

    if (publicKey) {
        return {
            "input": inputObj,
            "signature": convertSignature(digestBuf.toString('hex'), sig, publicKey.toString('hex'), SECP256k1_ORDER),
            "publicKey": publicKey.toString('hex'),
            "etherAddress": ethers.computeAddress('0x' + publicKey.toString('hex'))
        };
    } else {
        return {
            "input": inputObj,
            "signature": {
                "der": sigToDer(parseSig(Buffer.from(sig, "hex"), SECP256k1_ORDER)).toString('hex')
            }
        };
    }
}

async function cmdWriteLatch(options: ExecHaloCmdOptions, args: HaloCmdWriteLatch): Promise<HaloResWriteLatch> {
    const payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_LATCH_DATA, args.latchNo]),
        Buffer.from(args.data, "hex")
    ]);

    await options.exec(payload);
    return {"status": "ok"};
}

async function cmdSignRandom(options: ExecHaloCmdOptions, args: HaloCmdSignRandom): Promise<HaloResSignRandom> {
    const resp = await options.exec(Buffer.from([CMD.SHARED_CMD_SIGN_RANDOM, args.keyNo]));

    const resBuf = Buffer.from(resp.result, 'hex');
    const digest = resBuf.slice(0, 32);
    let signature = resBuf.slice(32, 32 + resBuf[33] + 2);
    const publicKey = resBuf.slice(32 + resBuf[33] + 2);

    const counter = digest.readUInt32BE(0);

    if (args.keyNo >= 0x60) {
        signature = sigToDer(parseSig(signature, BJJ_ORDER));
    } else {
        signature = sigToDer(parseSig(signature, SECP256k1_ORDER));
    }

    return {
        "counter": counter,
        "payload": digest.toString('hex'),
        "signature": signature.toString('hex'),
        "publicKey": publicKey.toString('hex')
    };
}

async function cmdSignChallenge(options: ExecHaloCmdOptions, args: HaloCmdSignChallenge): Promise<HaloResSignChallenge> {
    const challengeBuf = Buffer.from(args.challenge, "hex");
    const resp = await options.exec(Buffer.from([CMD.SHARED_CMD_SIGN_CHALLENGE, args.keyNo, ...challengeBuf]));

    const resBuf = Buffer.from(resp.result, 'hex');
    const sigLen = 2 + resBuf[1];

    let signature = resBuf.slice(0, sigLen);
    const publicKey = resBuf.slice(sigLen, sigLen + 65);
    const attestSig = resBuf.slice(sigLen + 65);

    if (args.keyNo >= 0x60) {
        signature = sigToDer(parseSig(signature, BJJ_ORDER));
    } else {
        signature = sigToDer(parseSig(signature, SECP256k1_ORDER));
    }

    return {
        "signature": signature.toString('hex'),
        "publicKey": publicKey.toString('hex'),
        "attestSig": attestSig.toString('hex')
    };
}

function prepareCfgNDEFInput(args: HaloCmdCFGNDEF): Buffer {
    if (args.flagHidePk1 && args.flagHidePk2) {
        throw new HaloLogicError("It's not allowed to use both flagHidePk1 and flagHidePk2.");
    }

    let flagBuf = Buffer.alloc(3);

    Object.keys(args)
        .filter((k) => k.startsWith('flag') && args[k as keyof typeof args])
        .map((k) => FLAGS[k])
        .forEach((v) => {
            flagBuf[v[0]] |= v[1];
        });

    if (!args.flagShowPkN && !args.flagShowPkNAttest && !args.pkN && !args.flagRNDSIGUseBJJ62) {
        // use legacy format
        flagBuf = flagBuf.slice(0, 2);
    } else if (args.pkN) {
        flagBuf[2] = args.pkN;
    }

    return Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_SET_NDEF_MODE]),
        flagBuf
    ]);
}

async function cmdCfgNDEF(options: ExecHaloCmdOptions, args: HaloCmdCFGNDEF): Promise<HaloResCFGNDEF> {
    const payload = prepareCfgNDEFInput(args);
    await options.exec(payload);

    return {
        "status": "ok",
        "cfgBytes": payload.slice(1).toString('hex').toUpperCase()
    };
}

async function cmdGenKey(options: ExecHaloCmdOptions, args: HaloCmdGenKey): Promise<HaloResGenKey> {
    if (!args.entropy) {
        if (options.method === "pcsc") {
            args.entropy = randomBuffer().toString("hex");
        } else {
            throw new HaloLogicError("The command.entropy should be exactly 32 bytes, hex encoded.");
        }
    }

    const entropyBuf = Buffer.from(args.entropy, "hex");

    if (entropyBuf.length !== 32) {
        throw new HaloLogicError("The command.entropy should be exactly 32 bytes, hex encoded.");
    }

    const payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_GENERATE_KEY_INIT]),
        Buffer.from([args.keyNo]),
        entropyBuf
    ]);

    let resp;

    try {
        resp = await options.exec(payload);
    } catch (e) {
        if (e instanceof HaloTagError) {
            if (e.name === "ERROR_CODE_INVALID_LENGTH") {
                throw new HaloLogicError("The key generation algorithm is not supported with this tag version.");
            }
        }

        throw e;
    }

    const res = Buffer.from(resp.result, "hex");

    if (res[0] === 0x00) {
        const m1Prefixed = Buffer.concat([
            Buffer.from([0x19]),
            Buffer.from("Key generation sample:\n"),
            res.slice(1, 1 + 32)
        ]);
        const m2Prefixed = Buffer.concat([
            Buffer.from([0x19]),
            Buffer.from("Key generation sample:\n"),
            res.slice(1 + 32, 1 + 64)
        ]);
        const msg1 = Buffer.from(sha256(m1Prefixed), 'hex');
        const msg2 = Buffer.from(sha256(m2Prefixed), 'hex');
        const sig = res.slice(1 + 64);
        const sig1Length = sig[1];
        const sig1 = sig.slice(0, 2 + sig1Length);
        const sig2 = sig.slice(2 + sig1Length);

        let curveOrder = SECP256k1_ORDER;

        if (args.keyNo >= 0x60) {
            curveOrder = BJJ_ORDER;
        }

        const candidates: string[] = [];

        for (let i = 0; i < 2; i++) {
            candidates.push(ec.recoverPubKey(msg1, parseSig(sig1, curveOrder), i).encode('hex'));
            candidates.push(ec.recoverPubKey(msg2, parseSig(sig2, curveOrder), i).encode('hex'));
        }

        const bestPk = Buffer.from(mode(candidates), 'hex');
        return {
            "publicKey": bestPk.toString('hex'),
            "needsConfirmPK": true
        };
    } else if (res[0] === 0x01) {
        const rootKeyPk = res.slice(0, 65);
        const rootKeyAttest = res.slice(65);

        return {
            "rootPublicKey": rootKeyPk.toString('hex'),
            "rootAttestSig": rootKeyAttest.toString('hex'),
            "needsConfirmPK": false
        };
    } else {
        throw new HaloLogicError("Unexpected response from HaLo.");
    }
}

async function cmdGenKeyConfirm(options: ExecHaloCmdOptions, args: HaloCmdGenKeyConfirm): Promise<HaloResGenKeyConfirm> {
    const payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_GENERATE_KEY_CONT]),
        Buffer.from([args.keyNo]),
        Buffer.from(args.publicKey, "hex")
    ]);

    const resp = await options.exec(payload);
    const res = Buffer.from(resp.result, "hex");

    const rootPublicKey = res.slice(0, 65);
    const rootAttestSig = res.slice(65 + 1);

    return {
        rootPublicKey: rootPublicKey.toString('hex'),
        rootAttestSig: rootAttestSig.toString('hex')
    };
}

async function cmdGenKeyFinalize(options: ExecHaloCmdOptions, args: HaloCmdGenKeyFinalize): Promise<HaloResGenKeyFinalize> {
    let payload;

    if (args.password) {
        const derivedKey = pbkdf2.pbkdf2Sync(args.password, 'HaLoChipSalt', 5000, 16, 'sha512');

        payload = Buffer.concat([
            Buffer.from([CMD.SHARED_CMD_GENERATE_KEY_FIN_PWD]),
            Buffer.from([args.keyNo]),
            derivedKey
        ]);
    } else {
        payload = Buffer.concat([
            Buffer.from([CMD.SHARED_CMD_GENERATE_KEY_FINALIZE]),
            Buffer.from([args.keyNo])
        ]);
    }

    const resp = await options.exec(payload);
    const res = Buffer.from(resp.result, "hex");

    // const newKeyNo = res.slice(0, 1);
    const publicKey = res.slice(1, 1 + 65);
    const attestSig = res.slice(1 + 65);

    return {
        publicKey: publicKey.toString('hex'),
        attestSig: attestSig.toString('hex')
    };
}

async function cmdSetURLSubdomain(options: ExecHaloCmdOptions, args: HaloCmdSetURLSubdomain): Promise<HaloResSetURLSubdomain> {
    const payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_SET_URL_SUBDOMAIN]),
        Buffer.from([args.subdomain.length]),
        Buffer.from(args.subdomain),
        Buffer.from(args.allowSignatureDER, 'hex')
    ]);

    await options.exec(payload);

    return {"status": "ok"};
}

async function cmdGetKeyInfo(options: ExecHaloCmdOptions, args: HaloCmdGetKeyInfo): Promise<HaloResGetKeyInfo> {
    const payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_GET_KEY_INFO]),
        Buffer.from([args.keyNo]),
    ]);

    const resp = await options.exec(payload);
    const res = Buffer.from(resp.result, "hex");

    const keyFlags = res.slice(1, 2)[0];
    let failedAuthCtr = 0;
    let off = 2;

    if (keyFlags & KEY_FLAGS.KEYFLG_FLAG_FORMAT_V2) {
        // key info contains failed auth counter
        off = 3;
        failedAuthCtr = res.slice(2, 3)[0];
    }

    const publicKey = res.slice(off, off + 65);
    const attestSig = res.slice(off + 65);

    return {
        keyState: {
            ...parseKeyFlags(keyFlags),
            failedAuthCounter: failedAuthCtr
        },
        publicKey: publicKey.toString('hex'),
        attestSig: attestSig.toString('hex')
    };
}

async function cmdSetPassword(options: ExecHaloCmdOptions, args: HaloCmdSetPassword): Promise<HaloResSetPassword> {
    const derivedKey = pbkdf2.pbkdf2Sync(args.password, 'HaLoChipSalt', 5000, 16, 'sha512');

    const payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_SET_PASSWORD]),
        Buffer.from([args.keyNo]),
        derivedKey
    ]);

    await options.exec(payload);

    return {"status": "ok"};
}

async function cmdUnsetPassword(options: ExecHaloCmdOptions, args: HaloCmdUnsetPassword): Promise<HaloResUnsetPassword> {
    const derivedKey = pbkdf2.pbkdf2Sync(args.password, 'HaLoChipSalt', 5000, 16, 'sha512');
    const authHash = Buffer.from(sha256(Buffer.concat([
        Buffer.from([0x19]),
        Buffer.from("Unset password auth:\n"),
        Buffer.from([args.keyNo]),
        derivedKey
    ])), "hex");

    const payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_UNSET_PASSWORD]),
        Buffer.from([args.keyNo]),
        authHash
    ]);

    await options.exec(payload);

    return {"status": "ok"};
}

function prepareReplacePasswordInput(args: HaloCmdReplacePassword): Buffer {
    const curPassword = pbkdf2.pbkdf2Sync(args.currentPassword, 'HaLoChipSalt', 5000, 16, 'sha512');
    const newPassword = pbkdf2.pbkdf2Sync(args.newPassword, 'HaLoChipSalt', 5000, 16, 'sha512');

    const plaintext = Buffer.concat([
        Buffer.from(sha256(newPassword), "hex").slice(0, 16),
        newPassword
    ]);

    const cipher = crypto.createCipheriv('aes-128-cbc', curPassword, Buffer.alloc(16));
    cipher.setAutoPadding(false);
    const ct = Buffer.from(cipher.update(plaintext, undefined, 'hex') + cipher.final('hex'), 'hex');

    const authHash = Buffer.from(sha256(Buffer.concat([
        Buffer.from([0x19]),
        Buffer.from("Replace password auth:\n"),
        Buffer.from([args.keyNo]),
        ct,
        curPassword
    ])), "hex");

    return Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_REPLACE_PASSWORD]),
        Buffer.from([args.keyNo]),
        ct,
        authHash
    ]);
}

async function cmdReplacePassword(options: ExecHaloCmdOptions, args: HaloCmdReplacePassword): Promise<HaloResReplacePassword> {
    const payload = prepareReplacePasswordInput(args);
    await options.exec(payload);

    return {"status": "ok"};
}

async function _internalLoadPK(options: ExecHaloCmdOptions, payload: Buffer) {
    const resp = await options.exec(payload, {pcscExecLayer: "u2f"});
    const res = Buffer.from(resp.result, "hex");

    if (res[0] !== 0x01) {
        throw new HaloLogicError("Unsupported protocol version reported by the HaLo tag.");
    }

    const sigLen = res[2] + 2;
    const data = res.slice(1, sigLen + 1 + 65);
    const rootPK = res.slice(sigLen + 1 + 65);

    return {
        "data": data.toString('hex'),
        "rootPublicKey": rootPK.toString('hex')
    }
}

async function cmdGetTransportPK(options: ExecHaloCmdOptions, args: HaloCmdGetTransportPK): Promise<HaloResGetTransportPK> {
    if (options.method !== "credential" && options.method !== "pcsc" && options.method !== "simulator") {
        throw new HaloLogicError("Unsupported execution method. Please set options.method = 'credential'.");
    }

    const payload = Buffer.concat([
        Buffer.from([CMD.CRED_CMD_GET_TRANSPORT_PK_ATT])
    ]);

    return await _internalLoadPK(options, payload);
}

async function cmdLoadTransportPK(options: ExecHaloCmdOptions, args: HaloCmdLoadTransportPK): Promise<HaloResLoadTransportPK> {
    if (options.method !== "credential" && options.method !== "pcsc" && options.method !== "simulator") {
        throw new HaloLogicError("Unsupported execution method. Please set options.method = 'credential'.");
    }

    const payload = Buffer.concat([
        Buffer.from([CMD.CRED_CMD_LOAD_TRANSPORT_PK]),
        Buffer.from(args.data, 'hex')
    ]);

    return await _internalLoadPK(options, payload);
}

async function cmdExportKey(options: ExecHaloCmdOptions, args: HaloCmdExportKey): Promise<HaloResExportKey> {
    if (options.method !== "credential" && options.method !== "pcsc" && options.method !== "simulator") {
        throw new HaloLogicError("Unsupported execution method. Please set options.method = 'credential'.");
    }

    const derivedKey = pbkdf2.pbkdf2Sync(args.password, 'HaLoChipSalt', 5000, 16, 'sha512');
    const dataBuf = Buffer.from(args.data, 'hex');
    const sigLen = dataBuf[1] + 2;
    const publicKeyBuf = dataBuf.slice(sigLen);

    const pwdHash = Buffer.from(sha256(Buffer.concat([
        Buffer.from([0x19]),
        Buffer.from("Key backup:\n"),
        Buffer.from([args.keyNo]),
        derivedKey,
        publicKeyBuf,
    ])), "hex");

    const payload = Buffer.concat([
        Buffer.from([CMD.CRED_CMD_EXPORT_KEY]),
        Buffer.from([args.keyNo]),
        pwdHash
    ]);

    const resp = await options.exec(payload, {pcscExecLayer: "u2f"});
    const res = Buffer.from(resp.result, "hex");

    return {
        "data": res.toString('hex')
    }
}

async function cmdImportKeyInit(options: ExecHaloCmdOptions, args: HaloCmdImportKeyInit): Promise<HaloResImportKeyInit> {
    if (options.method !== "credential" && options.method !== "pcsc" && options.method !== "simulator") {
        throw new HaloLogicError("Unsupported execution method. Please set options.method = 'credential'.");
    }

    const payload = Buffer.concat([
        Buffer.from([CMD.CRED_CMD_IMPORT_KEY_INIT]),
        Buffer.from([args.keyNo]),
        Buffer.from(args.data, 'hex')
    ]);

    await options.exec(payload, {pcscExecLayer: "u2f"});

    return {
        "status": "ok"
    }
}

async function cmdImportKey(options: ExecHaloCmdOptions, args: HaloCmdImportKey): Promise<HaloResImportKey> {
    if (options.method !== "credential" && options.method !== "pcsc" && options.method !== "simulator") {
        throw new HaloLogicError("Unsupported execution method. Please set options.method = 'credential'.");
    }

    const payload = Buffer.concat([
        Buffer.from([CMD.CRED_CMD_IMPORT_KEY]),
        Buffer.from([args.keyNo])
    ]);

    const resp = await options.exec(payload, {pcscExecLayer: "u2f"});
    const res = Buffer.from(resp.result, "hex");

    return {
        "publicKey": res.slice(1).toString('hex')
    }
}

async function cmdGetDataStruct(options: ExecHaloCmdOptions, args: HaloCmdGetDataStruct): Promise<HaloResGetDataStruct> {
    const specParts = args.spec.split(',');
    let specItems = specParts.map((item: string) => item.split(':', 2));

    const TYPES: Record<string, number> = {
        "publicKey": 0x01,
        "publicKeyAttest": 0x02,
        "keySlotFlags": 0x03,
        "keySlotFailedAuthCtr": 0x04,
        "compressedPublicKey": 0x05,
        "latchValue": 0x20,
        "latchAttest": 0x21,
        "graffiti": 0x22,
        "firmwareVersion": 0xF0
    };

    const SPECIAL_MSG: Record<number, string> = {
        0x01: "keySlotOutOfBounds",
        0x02: "keySlotNotGenerated",
        0x03: "latchNotSet",
        0x04: "latchAttestNotSet"
    }

    let data = Buffer.alloc(0);

    for (const item of specItems) {
        if (!TYPES[item[0]]) {
            throw new HaloLogicError("Unsupported object type: " + item[0]);
        }

        const val = parseInt(item[1]);

        if (val < 0 || val > 255) {
            throw new HaloLogicError("Too high index value at: " + item[0] + ":" + item[1]);
        }

        data = Buffer.concat([
            data,
            Buffer.from([TYPES[item[0]], val])
        ]);
    }

    const payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_GET_DATA_STRUCT]),
        data
    ]);

    const resp = await options.exec(payload);
    let res = Buffer.from(resp.result, "hex");

    specItems = specItems.reverse();
    const out: Record<string, string | number | StructErrorResponse | KeyFlags | null> = {};

    while (res.length > 0) {
        const item = specItems.pop() as string[];

        let len = res[0];
        let data;
        let value;

        if (len === 0xFF) { // no value returned, special message
            len = 1;

            const msgCode = res.slice(1, 2)[0];
            const specialMsg = SPECIAL_MSG[msgCode];

            if (specialMsg) {
                value = {"error": specialMsg};
            } else {
                value = {"error": 'unknown_' + msgCode.toString()};
            }
        } else if (item[0] === "keySlotFlags") {
            const keyFlags = res.slice(1, len + 1)[0];
            value = parseKeyFlags(keyFlags);
        } else if (item[0] === "keySlotFailedAuthCtr") {
            value = res.slice(1, len + 1)[0];
        } else {
            const encoding = item[0] !== "graffiti" ? "hex" : "utf-8";

            data = res.slice(1, len + 1);
            value = data.toString(encoding);

            if (!data.length) {
                value = null;
            }
        }

        out[item[0] + ':' + item[1]] = value;
        res = res.slice(len + 1);
    }

    return {
        isPartial: specItems.length !== 0,
        data: out
    };
}

async function cmdGetGraffiti(options: ExecHaloCmdOptions, args: HaloCmdGetGraffiti): Promise<HaloResGetGraffiti> {
    const payload = Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_GET_GRAFFITI]),
        Buffer.from([args.slotNo])
    ]);

    const resp = await options.exec(payload);
    const res = Buffer.from(resp.result, "hex");

    return {
        "data": res.slice(1).toString('ascii')
    }
}

function prepareStoreGraffitiInput(args: HaloCmdStoreGraffiti): Buffer {
    return Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_STORE_GRAFFITI]),
        Buffer.from([args.slotNo]),
        Buffer.from(args.data, 'ascii')
    ]);
}

async function cmdStoreGraffiti(options: ExecHaloCmdOptions, args: HaloCmdStoreGraffiti): Promise<HaloResStoreGraffiti> {
    const payload = prepareStoreGraffitiInput(args);
    await options.exec(payload);

    return {
        "status": "ok"
    }
}

async function cmdReplacePasswordStoreGraffiti(options: ExecHaloCmdOptions, args: HaloCmdReplacePasswordStoreGraffiti): Promise<HaloResReplacePasswordStoreGraffiti> {
    const setPasswordInput = prepareReplacePasswordInput(args);
    const storeGraffitiInput = prepareStoreGraffitiInput(args);

    await options.exec(Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_REPLACE_PASSWORD_STORE_GRAFFITI]),
        Buffer.from([setPasswordInput.length]),
        setPasswordInput,
        Buffer.from([storeGraffitiInput.length]),
        storeGraffitiInput
    ]));

    return {"status": "ok"};
}

async function cmdCfgNDEFStoreGraffiti(options: ExecHaloCmdOptions, args: HaloCmdCFGNDEFStoreGraffiti): Promise<HaloResCFGNDEFStoreGraffiti> {
    const cfgNDEFInput = prepareCfgNDEFInput(args);
    const storeGraffitiInput = prepareStoreGraffitiInput(args);

    await options.exec(Buffer.concat([
        Buffer.from([CMD.SHARED_CMD_SET_NDEF_MODE_STORE_GRAFFITI]),
        Buffer.from([cfgNDEFInput.length]),
        cfgNDEFInput,
        Buffer.from([storeGraffitiInput.length]),
        storeGraffitiInput
    ]));

    return {"status": "ok"};
}

export {
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
    cmdUnsetPassword,
    cmdReplacePassword,
    cmdGetKeyInfo,
    cmdGetTransportPK,
    cmdLoadTransportPK,
    cmdExportKey,
    cmdImportKeyInit,
    cmdImportKey,
    cmdGetDataStruct,
    cmdGetGraffiti,
    cmdStoreGraffiti,
    cmdReplacePasswordStoreGraffiti,
    cmdCfgNDEFStoreGraffiti,
};

export type * from "./command_types.js";
