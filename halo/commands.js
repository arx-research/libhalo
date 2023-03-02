const Buffer = require('buffer/').Buffer;
const ethers = require('ethers');
const {HaloLogicError, HaloTagError} = require("./exceptions");
const {parseStatic, reformatSignature, mode, parseSig, parsePublicKeys} = require("./utils");
const {FLAGS} = require("./flags");
const {sha256} = require("js-sha256");
const EC = require("elliptic").ec;

const ec = new EC('secp256k1');

function extractPublicKeyWebNFC(keyNo, resp) {
    let publicKey = null;
    let pkKey = "pk" + keyNo;

    if (resp.extra.hasOwnProperty(pkKey)) {
        publicKey = Buffer.from(resp.extra[pkKey], "hex");
    } else if (resp.extra.hasOwnProperty("static")) {
        let pkeys = parseStatic(Buffer.from(resp.extra["static"], "hex"));
        publicKey = pkeys[pkKey];
    }

    return publicKey;
}

async function cmdGetPkeys(options, args) {
    let payload = Buffer.concat([
        Buffer.from("02", "hex")
    ]);

    let resp = await options.exec(payload);
    let res = Buffer.from(resp.result, "hex");

    return parsePublicKeys(res);
}

async function cmdSign(options, args) {
    if (args.hasOwnProperty("digest") && args.hasOwnProperty("message")) {
        throw new HaloLogicError("Can't specify both args.digest and args.message.");
    }

    let messageBuf = null;
    let digestBuf = null;

    if (args.hasOwnProperty("message")) {
        if (args.format === "text") {
            messageBuf = Buffer.from(args.message);
        } else if (!args.format || args.format === "hex") {
            messageBuf = Buffer.from(args.message, "hex");
        } else {
            throw new HaloLogicError("Invalid message format specified. Valid formats: text, hex.");
        }

        digestBuf = Buffer.from(ethers.utils.hashMessage(messageBuf).slice(2), "hex");
    } else if (args.hasOwnProperty("digest")) {
        digestBuf = Buffer.from(args.digest, "hex");
    } else {
        throw new HaloLogicError("Either args.digest or args.message is required.");
    }

    let payload;

    if (args.legacySignCommand || options.method === "webnfc") {
        // the public key will be available through URL parameters
        // we only need to sign the digest
        payload = Buffer.concat([
            Buffer.from([0x01, args.keyNo]),
            digestBuf
        ]);
    } else {
        // sign the digest and also fetch the public key
        payload = Buffer.concat([
            Buffer.from([0x06, args.keyNo]),
            digestBuf
        ]);
    }

    let resp;

    try {
        resp = await options.exec(payload);
    } catch (e) {
        if (e instanceof HaloTagError) {
            if (e.name === "ERROR_CODE_UNKNOWN_CMD") {
                throw new HaloLogicError("The tag doesn't support the new signing command. Please set command.legacySignCommand = true.");
            } else {
                throw e;
            }
        } else {
            throw e;
        }
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
    }

    if (publicKey) {
        return {
            "input": inputObj,
            ...reformatSignature(digestBuf.toString('hex'), sig.toString('hex'), publicKey.toString('hex')),
            publicKey: publicKey.toString('hex')
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
        Buffer.from([0xD3, args.latchNo]),
        Buffer.from(args.data, "hex")
    ]);

    await options.exec(payload);
    return {"status": "ok"};
}

async function cmdSignRandom(options, args) {
    let resp = await options.exec(Buffer.from([0x08, args.keyNo]));

    let resBuf = Buffer.from(resp.result, 'hex');
    let digest = resBuf.slice(0, 32);
    let signature = resBuf.slice(32);

    let counter = digest.readUInt32BE(0);

    return {
        "counter": counter,
        "digest": digest.toString('hex'),
        "signature": signature.toString('hex')
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
        Buffer.from("D8", "hex"),
        flagBuf
    ]);
    await options.exec(payload);

    return {"status": "ok"};
}

async function cmdGenKey(options, args) {
    if (!args.entropy) {
        let payload = Buffer.concat([
            Buffer.from("03", "hex")
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
            Buffer.from("03", "hex"),
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
        Buffer.from("09", "hex"),
        Buffer.from(args.publicKey, "hex")
    ]);

    await options.exec(payload);

    return {"status": "ok"};
}

module.exports = {cmdSign, cmdSignRandom, cmdWriteLatch, cmdCfgNDEF, cmdGenKey, cmdGenKeyConfirm, cmdGetPkeys};
