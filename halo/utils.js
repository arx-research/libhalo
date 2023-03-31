/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const Buffer = require('buffer/').Buffer;
const EC = require('elliptic').ec;
const ethers = require('ethers');
const {HaloLogicError} = require("./exceptions");
const BN = require('bn.js').BN;

const ec = new EC('secp256k1');

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

function parseSig(res) {
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

    // SECP256k1 order constant
    let curveOrder = 115792089237316195423570985008687907852837564279074904382605163141518161494337n;

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

function convertSignature(digest, signature, publicKey) {
    signature = Buffer.from(signature, "hex");
    let fixedSig = parseSig(signature);

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

    let pkeyAddress = ethers.utils.computeAddress('0x' + publicKey);
    let recoveredAddress = ethers.utils.recoverAddress('0x' + digest, finalSig);

    if (pkeyAddress !== recoveredAddress) {
        throw new HaloLogicError("Failed to correctly recover public key from the signature.");
    }

    return {
        "raw": {
            ...fixedSig,
            v: recoveryParam + 0x1b
        },
        "der": signature.toString('hex'),
        "ether": finalSig.toString('hex')
    };
}

function recoverPublicKey(digest, signature) {
    let out = [];

    signature = Buffer.from(signature, "hex");
    let fixedSig = parseSig(signature);

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

module.exports = {
    hex2arr,
    arr2hex,
    parseSig,
    convertSignature,
    parsePublicKeys,
    recoverPublicKey,
    mode
};
