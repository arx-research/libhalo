/**
 * Example script to verify a dynamic URL based off the BJJ curve
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const hash = require("hash.js");
const {PresetCurve} = require("elliptic/lib/elliptic/curves");
const {Buffer} = require("buffer");
const {sha256} = require("js-sha256");
const EC = require('elliptic').ec;

const BJJ_ORDER = 0x060c89ce5c263405370a08b6d0302b0bab3eedb83920ee0a677297dc392126f1n;

const ec = new EC({
    "curve": new PresetCurve({
        type: 'short',
        prime: null,
        p: '30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001',
        a: '10216f7ba065e00de81ac1e7808072c9b8114d6d7de87adb16a0a72f1a91f6a0',
        b: '23d885f647fed5743cad3d1ee4aba9c043b4ac0fc2766658a410efdeb21f706e',
        n: '060c89ce5c263405370a08b6d0302b0bab3eedb83920ee0a677297dc392126f1',
        hash: hash.sha256,
        gRed: false,
        g: [
            '1fde0a3cac7cb46b36c79f4c0a7a732e38c2c7ee9ac41f44392a07b748a0869f',
            '203a710160811d5c07ebaeb8fe1d9ce201c66b970d66f18d0d2b264c195309aa',
        ],
    })
});


function parseSig(res, curveOrder) {
    if (res[0] !== 0x30 || res[2] !== 0x02) {
        throw new Error("Unable to parse signature, unexpected header (1).");
    }

    let rLen = res[3];

    if (res[rLen + 4] !== 0x02) {
        throw new Error("Unable to parse signature, unexpected header (2).");
    }

    let sLen = res[rLen + 5];

    if (res.length < rLen + 4 + 2 + sLen) {
        throw new Error("Unable to parse signature, unexpected length.");
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

// input: Buffer; DER-encoded signature from HaLo tag
// output: Buffer; fixed DER-encoded signature
function fixBJJSig(sig) {
    return sigToDer(parseSig(sig, BJJ_ORDER));
}

function verifyBJJDynamicURL(pkn, rnd, rndsig) {
    let pk62 = Buffer.from(pkn, "hex").slice(2).toString("hex");

    let pubKey = ec.keyFromPublic(pk62, "hex");
    let rndBuf = Buffer.from(rnd, "hex");
    let rndsigBuf = Buffer.from(rndsig, "hex");
    let counter = rndBuf.readUInt32BE(0);

    let digest = sha256(Buffer.concat([
        Buffer.from([0x19]),
        Buffer.from("Attest counter pk62:\n"),
        rndBuf
    ]));

    let verifyRes = pubKey.verify(digest, fixBJJSig(rndsigBuf).toString("hex"));

    if (!verifyRes) {
        throw new Error("Failed to verify signature.");
    }

    return {
        "counter": counter,
        "pk62": pk62
    }
}

// --- EXAMPLE USAGE ---
let res = verifyBJJDynamicURL(
    "62000416FFE77D0F9044B209663A96F1FDF8C41A4C75212F520B1013C64F3AD0193FD7118EB2A50D78520DE66B1D3F89048B7189FCAC8B1B3B5C21834A1E87916D8303",
    "000005490DEE4E738210E393E3A9E9D292976CAA1915663F82A75415CA765A97",
    "304402200B49B3FE4B80947D99272192812BE9E4F60232C1BCBBFA26DEDCFA80DCD4B24F0220026AF01F3D324F5006C70B8974AAE12E7CFB73CFE8EFEDE53DD019CE3D93ED8E0000"
);

console.log('PASS', res);
