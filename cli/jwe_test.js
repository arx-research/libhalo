const jose = require("jose");
const crypto = require("crypto");

async function run() {
    let k = await crypto.subtle.importKey("raw", "b5b84b82641daaee7e85ce5d31d8a6e0", "AES-GCM", true, [
        "encrypt",
        "decrypt",
    ]);
    console.log(k);

    const jwe = await new jose.CompactEncrypt(
        new TextEncoder().encode(JSON.stringify({"a": 132432432, "b": "djisojfoidsfjdsoifjoidsfds"})),
    )
        .setProtectedHeader({alg: 'dir', enc: 'A256GCM'})
        .encrypt(k)

    console.log(jwe);

    const { plaintext, protectedHeader } = await jose.compactDecrypt(jwe, k);
    console.log(JSON.parse(plaintext), protectedHeader);
}

run();
