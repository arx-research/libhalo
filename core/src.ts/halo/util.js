/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {Buffer} from 'buffer/index.js';
import elliptic from 'elliptic';
import {ethers} from 'ethers';
import {HaloLogicError} from "./exceptions.js";
import crypto from "crypto";
import {BN} from 'bn.js';

const ec = new elliptic.ec('secp256k1');

const SECP256k1_ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const BJJ_ORDER = 0x060c89ce5c263405370a08b6d0302b0bab3eedb83920ee0a677297dc392126f1n;

function hex2arr(hexString) {
    return new Uint8Array(
        hexString.match(/.{1,2}/g).map(
            byte => parseInt(byte, 16)
        )
    );
}

function arr2hex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

function parsePublicKeys(buffer) {
    let buf;

    if (typeof buffer === "string") {
        buf = Buffer.from(buffer, 'hex');
    } else {
        buf = Buffer.from(buffer);
    }

    let out = {};
    let keyNo = 1;

    while (true) {
        let keyLength = buf[0];

        if (typeof keyLength === "undefined" || keyLength === 0) {
            break;
        }

        let key = buf.slice(1, 1 + keyLength);
        out[keyNo] = key.toString('hex');
        buf = buf.slice(1 + keyLength);
        keyNo++;
    }

    return out;
}

function parseSig(res, curveOrder) {
    if (res[0] !== 0x30 || res[2] !== 0x02) {
        throw new HaloLogicError("Unable to parse signature, unexpected header (1).");
    }

    let rLen = res[3];

    if (res[rLen + 4] !== 0x02) {
        throw new HaloLogicError("Unable to parse signature, unexpected header (2).");
    }

    let sLen = res[rLen + 5];

    if (res.length !== rLen + 4 + 2 + sLen) {
        throw new HaloLogicError("Unable to parse signature, unexpected length.");
    }

    let r = res.slice(4, rLen + 4);
    let s = res.slice(rLen + 4 + 2, rLen + 4 + 2 + sLen);
    let rn = BigInt('0x' + r.toString('hex'));
    let sn = BigInt('0x' + s.toString('hex'));

    rn %= curveOrder;
    sn %= curveOrder;

    if (sn > curveOrder / 2n) {
        // malleable signature, not compliant with Ethereum's EIP-2
        // we need to flip s value in the signature
        sn = -sn + curveOrder;
    }

    return {
        r: rn.toString(16).padStart(64, '0'),
        s: sn.toString(16).padStart(64, '0')
    };
}

function sigToDer(sig) {
    let r = BigInt('0x' + sig.r);
    let s = BigInt('0x' + sig.s);

    let padR = r.toString(16).length % 2 ? '0' : '';
    let padS = s.toString(16).length % 2 ? '0' : '';

    let encR = Buffer.from(padR + r.toString(16), 'hex');
    let encS = Buffer.from(padS + s.toString(16), 'hex');

    if (encR[0] & 0x80) {
        // add zero to avoid interpreting this as negative integer
        encR = Buffer.concat([Buffer.from([0x00]), encR]);
    }

    if (encS[0] & 0x80) {
        // add zero to avoid interpreting this as negative integer
        encS = Buffer.concat([Buffer.from([0x00]), encS]);
    }

    encR = Buffer.concat([Buffer.from([0x02, encR.length]), encR]);
    encS = Buffer.concat([Buffer.from([0x02, encS.length]), encS]);

    return Buffer.concat([
        Buffer.from([0x30, encR.length + encS.length]),
        encR,
        encS
    ]);
}

function convertSignature(digest, signature, publicKey, curveOrder) {
    signature = Buffer.from(signature, "hex");
    let fixedSig = parseSig(signature, curveOrder);

    let recoveryParam = null;

    for (let i = 0; i < 2; i++) {
        if (publicKey === ec.recoverPubKey(new BN(digest, 16), fixedSig, i).encode('hex')) {
            recoveryParam = i;
            break;
        }
    }

    if (recoveryParam === null) {
        throw new HaloLogicError("Failed to get recovery param.");
    }

    let finalSig = '0x' + fixedSig.r
        + fixedSig.s
        + Buffer.from([27 + recoveryParam]).toString('hex');

    let pkeyAddress = ethers.computeAddress('0x' + publicKey);
    let recoveredAddress = ethers.recoverAddress('0x' + digest, finalSig);

    if (pkeyAddress !== recoveredAddress) {
        throw new HaloLogicError("Failed to correctly recover public key from the signature.");
    }

    return {
        "raw": {
            ...fixedSig,
            v: recoveryParam + 0x1b
        },
        "der": sigToDer(parseSig(signature, curveOrder)).toString('hex'),
        "ether": finalSig.toString('hex')
    };
}

function recoverPublicKey(digest, signature, curveOrder) {
    let out = [];

    signature = Buffer.from(signature, "hex");
    let fixedSig = parseSig(signature, curveOrder);

    for (let i = 0; i < 2; i++) {
        out.push(ec.recoverPubKey(new BN(digest, 16), fixedSig, i).encode('hex'));
    }

    return out;
}

function mode(arr) {
    return arr.sort((a, b) =>
        arr.filter(v => v === a).length
        - arr.filter(v => v === b).length
    ).pop();
}

function randomBuffer() {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
}

function isWebDebugEnabled() {
    return typeof window !== "undefined" && window.localStorage && window.localStorage.getItem("DEBUG_LIBHALO_WEB") === "1";
}

function webDebug(...args) {
    if (isWebDebugEnabled()) {
        console.log(...args);
    }
}

export {
    SECP256k1_ORDER,
    BJJ_ORDER,
    hex2arr,
    arr2hex,
    parseSig,
    sigToDer,
    convertSignature,
    parsePublicKeys,
    recoverPublicKey,
    mode,
    randomBuffer,
    isWebDebugEnabled,
    webDebug,
};
