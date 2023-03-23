/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const {ArgumentParser} = require("argparse");
const {JSONParseAction} = require("./actions");

const parser = new ArgumentParser({
    description: 'HaLo - Command Line Tool for PC/SC'
});
parser.add_argument("-o", "--output", {help: "Output format, either: color (default, better for humans), json (better for scripts).", "default": "color"});

const subparsers = parser.add_subparsers({help: 'command', dest: 'name'});

subparsers.add_parser("version", {help: "Get tag version."});

if (process.env.__UNSAFE_ENABLE_TESTS === "1") {
    let testParser = subparsers.add_parser("test", {help: "Run test suite against the tag. Please do not use this command."});
    testParser.add_argument("--unsafe", {
        help: "I understand that this command might reconfigure the tag in undesired way and that it might be " +
            "not possible to rollback certain changes made by this command.",
        action: "store_true",
        dest: "thisIsUnsafe",
        required: true
    });
}

subparsers.add_parser("read_ndef", {help: "Read dynamic URL on the tag."});

let signParser = subparsers.add_parser("sign", {help: "Sign message using ECDSA/Keccak algorithm."});
signParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    help: "Number of the key slot to use.",
    type: 'int',
    required: true
});
signParser.add_argument("-m", "--message", {help: "Text message to be signed."});
signParser.add_argument("-d", "--digest", {
    help: "Message digest to be signed (32 bytes, hex encoded)."
});
signParser.add_argument("--typed-data", {
    dest: 'typedData',
    help: "Typed data to sign according with EIP-712. Should contain the following sub-keys: domain, types, value",
    action: JSONParseAction
});
signParser.add_argument("-f", "--format", {help: "Message format: text, hex.", "default": "hex"});
signParser.add_argument("--legacy-sign-command", {
    help: "Use legacy signing command (more compatible).",
    action: "store_true",
    dest: "legacySignCommand",
    "default": false
});

let signRandomParser = subparsers.add_parser("sign_random", {help: "Sign random digest using key slot #2."});
signRandomParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    help: "Number of the key slot to use.",
    type: 'int',
    'default': 2
});

let signChallenge = subparsers.add_parser("sign_challenge", {help: "Sign challenge using ECDSA/Keccak algorithm."});
signChallenge.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    help: "Number of the key slot to use.",
    type: 'int',
    required: true
});
signChallenge.add_argument("-c", "--challenge", {help: "Challenge to be signed (32 bytes hex)."});

let writeLatchParser = subparsers.add_parser("write_latch", {help: "Write value into the latch slot."});
writeLatchParser.add_argument("-n", "--latch-no", {
    dest: "latchNo",
    help: "Number of the latch slot to use.",
    type: "int",
    required: true
});
writeLatchParser.add_argument("-d", "--data", {
    help: "Data to be written to the latch slot (32 bytes, hex encoded).",
    required: true
});

let setNDEFCfgParser = subparsers.add_parser("cfg_ndef", {help: "Configure the tag's NDEF data."});
setNDEFCfgParser.add_argument("--flag-use-text", {
    dest: "flagUseText",
    help: "Use text NDEF record instead of the URL record.",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-hide-pk1", {
    dest: "flagHidePk1",
    help: "Hide public key #1 in the dynamic URL.",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-hide-pk2", {
    dest: "flagHidePk2",
    help: "Hide public key #2 in the dynamic URL.",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-hide-pk3", {
    dest: "flagHidePk3",
    help: "Hide public key #3 in the dynamic URL (if it's generated).",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-show-pk1-attest", {
    dest: "flagShowPk1Attest",
    help: "Display public key #1 attest signature in the dynamic URL.",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-show-pk2-attest", {
    dest: "flagShowPk2Attest",
    help: "Display public key #2 attest signature in the dynamic URL.",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-show-pk3-attest", {
    dest: "flagShowPk3Attest",
    help: "Display public key #3 attest signature in the dynamic URL (if it's generated).",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-show-latch1-sig", {
    dest: "flagShowLatch1Sig",
    help: "Display the signature of latch #1 (if latch is set).",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-show-latch2-sig", {
    dest: "flagShowLatch2Sig",
    help: "Display the signature of latch #2 (if latch is set).",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-hide-rndsig", {
    dest: "flagHideRNDSIG",
    help: "Hide \"rnd\" and \"rndsig\" fields. The counter\'s signature will be generated only upon manual request.",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-hide-cmdres", {
    dest: "flagHideCMDRES",
    help: "Hide \"cmd\" and \"res\" fields. With this flag set, it will be not possible to execute commands through WebNFC.",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-legacy-static", {
    dest: "flagLegacyStatic",
    help: "Display public keys in the legacy format, using the \"static\" field with all keys concatenated together.",
    action: 'store_true',
    required: false
});

let genKeyParser = subparsers.add_parser("gen_key", {help: "Generate key in slot #3."});
genKeyParser.add_argument("--entropy", {
    dest: 'entropy',
    help: "Additional entropy (32 bytes, hex encoded). Optional."
});

let genKeyConfirmParser = subparsers.add_parser("gen_key_confirm", {help: "Confirm public key in slot #3 (only if additional entropy was provided)."});
genKeyConfirmParser.add_argument("--public-key", {dest: 'publicKey', help: "Key slot #3 public key", required: true});

subparsers.add_parser("gen_key_finalize", {help: "Finalize key generation in slot #3."});

subparsers.add_parser("get_pkeys", {help: "Get tag's public keys #1, #2 and #3."});

subparsers.add_parser("pcsc_detect", {help: "Detect PC/SC readers and HaLo tags (for debugging)."});

function parseArgs() {
    let args = parser.parse_args();

    if (!args.name) {
        parser.print_help();
        return null;
    }

    if (args.output && args.output !== "color" && args.output !== "json") {
        console.error('Error: Incorrect output parameter specified. Should be on of: color, json.')
        return null;
    }

    return args;
}

module.exports = {parseArgs};
