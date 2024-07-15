// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// TODO

/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {HaloLogicError, HaloTagError} from "../api/common.js";
import elliptic from 'elliptic';

const ec = new elliptic.ec('secp256k1');

function assert(condition: unknown) {
    if (!condition) {
        throw new Error("Assertion failed.");
    }
}

class SkipTest extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SkipTest";
    }
}

const tests = [
    ["testLegacySign1", async function(driver: string, exec) {
        if (driver !== 'webnfc') {
            const resPkeys = await exec({
                "name": "get_pkeys"
            });

            const pk1 = ec.keyFromPublic(resPkeys.publicKeys[1], 'hex');
            const digest = "b64ab259577c3a28fda62c8e64744c8dd42a82155fbca7de02a1d85d8383d4e1";

            const res = await exec({
                "name": "sign",
                "keyNo": 1,
                "digest": digest,
                "legacySignCommand": true
            });

            assert(pk1.verify(digest, res.signature.der));
        } else {
            const digest = "b64ab259577c3a28fda62c8e64744c8dd42a82155fbca7de02a1d85d8383d4e1";

            const res = await exec({
                "name": "sign",
                "keyNo": 1,
                "digest": digest,
                "legacySignCommand": true
            });

            const pk1 = ec.keyFromPublic(res.publicKey, 'hex');
            assert(pk1.verify(digest, res.signature.der));
        }
    }],
    ["testSign1", async function(driver, exec) {
        const digest = "b64ab259577c3a28fda62c8e64744c8dd42a82155fbca7de02a1d85d8383d4e1";

        const res = await exec({
            "name": "sign",
            "keyNo": 1,
            "digest": digest
        });

        const pk1 = ec.keyFromPublic(res.publicKey, 'hex');
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
                } else {
                    throw e;
                }
            } else {
                throw e;
            }
        }

        assert(resGenKey.needsConfirm);

        const resGenKeyConfirm = await exec({
            "name": "gen_key_confirm",
            "publicKey": resGenKey.publicKey
        });

        assert(resGenKeyConfirm.status === "ok");

        const resGenKeyFinalize = await exec({
            "name": "gen_key_finalize"
        });

        assert(resGenKeyConfirm.status === "ok");
    }],
    ["testSign3", async function(driver, exec) {
        const digest = "b64ab259577c3a28fda62c8e64744c8dd42a82155fbca7de02a1d85d8383d4e1";

        const res = await exec({
            "name": "sign",
            "keyNo": 3,
            "digest": digest
        });

        const pk3 = ec.keyFromPublic(res.publicKey, 'hex');
        assert(pk3.verify(digest, res.signature.der));
    }],
    ["testSign1Typed", async function(driver, exec) {
        const domain = {
            name: 'Ether Mail',
            version: '1',
            chainId: 1,
            verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
        };

        const types = {
            Person: [
                { name: 'name', type: 'string' },
                { name: 'wallet', type: 'address' }
            ],
            Mail: [
                { name: 'from', type: 'Person' },
                { name: 'to', type: 'Person' },
                { name: 'contents', type: 'string' }
            ]
        };

        const value = {
            from: {
                name: 'Cow',
                wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
            },
            to: {
                name: 'Bob',
                wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
            },
            contents: 'Hello, Bob!'
        };

        const res = await exec({
            "name": "sign",
            "keyNo": 1,
            "typedData": {domain, types, value}
        });

        const pk1 = ec.keyFromPublic(res.publicKey, 'hex');
        assert(res.input.digest === "be609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2");
        assert(res.input.primaryType === "Mail");
        assert(res.input.domainHash === "f2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f");
        assert(pk1.verify(res.input.digest, res.signature.der));
    }]
];

async function __runTestSuite(__unsafe, driver, exec) {
    if (!__unsafe.__this_is_unsafe) {
        throw new HaloLogicError("This method is used for internal testing, shouldn't be invoked directly.");
    }

    const passed = [];
    const skipped = [];
    const failed = [];

    for (const testObj of tests) {
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

export {__runTestSuite};
