/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {Buffer} from 'buffer/index.js';
import elliptic from 'elliptic';
import {ethers, Signature} from 'ethers';
import {HaloLogicError} from "./exceptions.ts";
import crypto from "crypto";
import {BN} from 'bn.js';
import {PublicKeyList} from "../types.js";

const ec = new elliptic.ec('secp256k1');

const SECP256k1_ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const BJJ_ORDER = 0x060c89ce5c263405370a08b6d0302b0bab3eedb83920ee0a677297dc392126f1n;

interface SignatureObj {
    r: string
    s: string
}

function hex2arr(hexString: string) {
    return new Uint8Array(
        hexString.match(/.{1,2}/g)!.map(
            byte => parseInt(byte, 16)
        )
    );
}

function arr2hex(buffer: number[]) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

function parsePublicKeys(buffer: Buffer | string): PublicKeyList {
    let buf;

    if (typeof buffer === "string") {
        buf = Buffer.from(buffer, 'hex');
    } else {
        buf = Buffer.from(buffer);
    }

    const out: PublicKeyList = {};
    let keyNo = 1;

    while (true) {
        const keyLength = buf[0];

        if (typeof keyLength === "undefined" || keyLength === 0) {
            break;
        }

        const key = buf.slice(1, 1 + keyLength);
        out[keyNo] = key.toString('hex');
        buf = buf.slice(1 + keyLength);
        keyNo++;
    }

    return out;
}

function parseSig(res: Buffer, curveOrder: bigint) {
    if (res[0] !== 0x30 || res[2] !== 0x02) {
        throw new HaloLogicError("Unable to parse signature, unexpected header (1).");
    }

    const rLen = res[3];

    if (res[rLen + 4] !== 0x02) {
        throw new HaloLogicError("Unable to parse signature, unexpected header (2).");
    }

    const sLen = res[rLen + 5];

    if (res.length !== rLen + 4 + 2 + sLen) {
        throw new HaloLogicError("Unable to parse signature, unexpected length.");
    }

    const r = res.slice(4, rLen + 4);
    const s = res.slice(rLen + 4 + 2, rLen + 4 + 2 + sLen);
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

function sigToDer(sig: SignatureObj) {
    const r = BigInt('0x' + sig.r);
    const s = BigInt('0x' + sig.s);

    const padR = r.toString(16).length % 2 ? '0' : '';
    const padS = s.toString(16).length % 2 ? '0' : '';

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

function convertSignature(digest: string, signature: string, publicKey: string, curveOrder: bigint) {
    const sigBuf = Buffer.from(signature, "hex");
    const fixedSig = parseSig(sigBuf, curveOrder);

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

    const finalSig = '0x' + fixedSig.r
        + fixedSig.s
        + Buffer.from([27 + recoveryParam]).toString('hex');

    const pkeyAddress = ethers.computeAddress('0x' + publicKey);
    const recoveredAddress = ethers.recoverAddress('0x' + digest, finalSig);

    if (pkeyAddress !== recoveredAddress) {
        throw new HaloLogicError("Failed to correctly recover public key from the signature.");
    }

    return {
        "raw": {
            ...fixedSig,
            v: recoveryParam + 0x1b
        },
        "der": sigToDer(parseSig(sigBuf, curveOrder)).toString('hex'),
        "ether": finalSig
    };
}

function recoverPublicKey(digest: string, signature: string, curveOrder: bigint) {
    const out = [];

    const sigBuf = Buffer.from(signature, "hex");
    const fixedSig = parseSig(sigBuf, curveOrder);

    for (let i = 0; i < 2; i++) {
        out.push(ec.recoverPubKey(new BN(digest, 16), fixedSig, i).encode('hex'));
    }

    return out;
}

function mode<Type>(arr: Type[]): Type {
    if (arr.length <= 0) {
        throw new Error("Zero-length array.");
    }

    return arr.sort((a, b) =>
        arr.filter(v => v === a).length
        - arr.filter(v => v === b).length
    ).pop()!;
}

function randomBuffer() {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
}

function isWebDebugEnabled() {
    return typeof window !== "undefined" && window.localStorage && window.localStorage.getItem("DEBUG_LIBHALO_WEB") === "1";
}

function webDebug(...args: unknown[]) {
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
