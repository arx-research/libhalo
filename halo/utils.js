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

function parseStatic(buffer) {
    let offset = 0;
    let keyNo = 1;
    let out = {};

    while (true) {
        let pkLen = buffer[offset];

        if (!pkLen) {
            break;
        }

        ++offset;
        out["pk" + keyNo] = buffer.slice(offset, offset + pkLen);
        ++keyNo;
        offset += pkLen;
    }

    return out;
}

function reformatSignature(digest, signature, publicKey) {
    signature = Buffer.from(signature, "hex");

    if (signature[0] !== 0x30 || signature[2] !== 0x02) {
        throw new HaloLogicError("Invalid signature returned by the tag (2).");
    }

    let rLen = signature[3];

    if (signature[rLen+4] !== 0x02) {
        throw new HaloLogicError("Invalid signature returned by the tag (3).");
    }

    let sLen = signature[rLen+5];

    if (signature.length !== rLen+4+2+sLen) {
        throw new HaloLogicError("Invalid signature returned by the tag (4).");
    }

    let r = signature.slice(4, rLen+4);
    let s = signature.slice(rLen+4+2, rLen+4+2+sLen);
    let rn = BigInt('0x' + r.toString('hex'));
    let sn = BigInt('0x' + s.toString('hex'));

    // SECP256k1 order constant
    let curveOrder = 115792089237316195423570985008687907852837564279074904382605163141518161494337n;

    if (sn > curveOrder / 2n) {
        // malleable signature, not compliant with Ethereum's EIP-2
        // we need to flip s value in the signature
        sn = -sn + curveOrder;
    }

    let fixedSig = {r: rn.toString(16), s: sn.toString(16)};
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

    let finalSig = '0x' + rn.toString(16).padStart(64, '0')
        + sn.toString(16).padStart(64, '0')
        + Buffer.from([27 + recoveryParam]).toString('hex');

    let pkeyAddress = ethers.utils.computeAddress('0x' + publicKey);
    let recoveredAddress = ethers.utils.recoverAddress('0x' + digest, finalSig);

    if (pkeyAddress !== recoveredAddress) {
        throw new HaloLogicError("Failed to correctly recover public key from the signature.");
    }

    return {
        "signature": {
            "raw": {
                ...fixedSig,
                v: recoveryParam + 0x1b
            },
            "der": signature.toString('hex'),
            "ether": finalSig.toString('hex')
        }
    };
}

module.exports = {
    hex2arr,
    arr2hex,
    parseStatic,
    reformatSignature
};
