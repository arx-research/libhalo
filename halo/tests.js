const {HaloLogicError, HaloTagError} = require("../index");
const EC = require('elliptic').ec;

const ec = new EC('secp256k1');

function assert(condition) {
    if (!condition) {
        throw new Error("Assertion failed.");
    }
}

class SkipTest extends Error {
    constructor(message) {
        super(message);
        this.name = "SkipTest";
    }
}

const tests = [
    ["testLegacySign1", async function(driver, exec) {
        let resPkeys = await exec({
            "name": "get_pkeys"
        });

        let pk1 = ec.keyFromPublic(resPkeys[1], 'hex');
        let digest = "b64ab259577c3a28fda62c8e64744c8dd42a82155fbca7de02a1d85d8383d4e1";

        let res = await exec({
            "name": "sign",
            "keyNo": 1,
            "digest": digest,
            "legacySignCommand": true
        });

        assert(pk1.verify(digest, res.signature.der));
    }],
    ["testSign1", async function(driver, exec) {
        let resPkeys = await exec({
            "name": "get_pkeys"
        });

        let pk1 = ec.keyFromPublic(resPkeys[1], 'hex');
        let digest = "b64ab259577c3a28fda62c8e64744c8dd42a82155fbca7de02a1d85d8383d4e1";

        let res = await exec({
            "name": "sign",
            "keyNo": 1,
            "digest": digest
        });

        assert(pk1.verify(digest, res.signature.der));
    }],
    ["testKeyGen3", async function(driver, exec) {
        let resGenKey;

        try {
            resGenKey = await exec({
                "name": "gen_key",
                "entropy": "c18ae10f225d48908ac485ba8a43c0f7bd3a9c25e214f49e4eb617561511d8f8"
            });
        } catch (e) {
            if (e instanceof HaloTagError) {
                if (e.name === "ERROR_CODE_KEY_ALREADY_EXISTS") {
                    throw new SkipTest("Unable to test key generation - key already exists.");
                }
            }
        }

        assert(resGenKey.needsConfirm);

        let resGenKeyConfirm = await exec({
            "name": "gen_key_confirm",
            "publicKey": resGenKey.publicKey
        });

        assert(resGenKeyConfirm.status === "ok");
    }],
    ["testSign3", async function(driver, exec) {
        let digest = "b64ab259577c3a28fda62c8e64744c8dd42a82155fbca7de02a1d85d8383d4e1";

        let res = await exec({
            "name": "sign",
            "keyNo": 3,
            "digest": digest
        });

        let pk3 = ec.keyFromPublic(res.publicKey, 'hex');
        assert(pk3.verify(digest, res.signature.der));
    }]
];

async function __runTestSuite(__unsafe, driver, exec) {
    if (!__unsafe.__this_is_unsafe) {
        throw new HaloLogicError("This method is used for internal testing, shouldn't be invoked directly.");
    }

    let passed = [];
    let skipped = [];
    let failed = [];

    for (let testObj of tests) {
        console.log(testObj[0]);

        try {
            await testObj[1](driver, exec);
            console.log(testObj[0], 'PASSED');
            passed.push(testObj[0]);
        } catch (e) {
            if (e instanceof SkipTest) {
                console.error(testObj[0], 'SKIPPED (' + e.message + ')');
                skipped.push(testObj[0]);
            } else {
                console.error(testObj[0], 'FAILED');
                console.error(e);
                failed.push(testObj[0]);
            }
        }
    }

    return {
        "stats": {
            "passed": passed.length,
            "skipped": skipped.length,
            "failed": failed.length
        },
        "skipped": skipped,
        "failedTests": failed
    };
}

module.exports = {__runTestSuite};
