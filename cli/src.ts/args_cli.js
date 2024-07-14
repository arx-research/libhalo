/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

import {ArgumentParser} from "argparse";
import {JSONParseAction} from "./actions.js";
import {printVersionInfo} from "./version.js";

const parser = new ArgumentParser({
    description: 'HaLo - Command Line Tool for PC/SC'
});
parser.add_argument("-o", "--output", {help: "Output format, either: color (default, better for humans), json (better for scripts).", "default": "color"});
parser.add_argument("--reader", {help: "Name of the PC/SC reader to be used."});

const subparsers = parser.add_subparsers({help: 'command', dest: 'name'});

subparsers.add_parser("version", {help: "Get tag version."});

subparsers.add_parser("cli_version", {help: "Get halocli build version."});

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
signParser.add_argument("--password", {
    dest: 'password',
    help: "Slot password (32 bytes hex encoded).",
    required: false
});
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
setNDEFCfgParser.add_argument("--flag-show-pkn", {
    dest: "flagShowPkN",
    help: "Display the public key of the selected key slot in the URL.",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-show-pkn-attest", {
    dest: "flagShowPkNAttest",
    help: "Display the attest of the public key of the selected key slot in the URL.",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--flag-rndsig-use-bjj62", {
    dest: "flagRNDSIGUseBJJ62",
    help: "Use BJJ key slot #62 for the \"rndsig\" signature.",
    action: 'store_true',
    required: false
});
setNDEFCfgParser.add_argument("--pkn", {
    dest: "pkN",
    help: "Key slot number for --flag-show-pkn and --flag-show-pkn-attest",
    type: 'int',
    required: false
});

let genKeyParser = subparsers.add_parser("gen_key", {help: "Perform the first step of the key generation procedure."});
genKeyParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    type: 'int',
    help: "Target key slot number.",
    required: true
});
genKeyParser.add_argument("--entropy", {
    dest: 'entropy',
    help: "Additional entropy for key generation process (32 bytes, hex encoded).",
    required: false
});

let genKeyConfirmParser = subparsers.add_parser("gen_key_confirm", {help: "Confirm the public key generated by gen_key command."});
genKeyConfirmParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    type: 'int',
    help: "Target key slot number.",
    required: true
});
genKeyConfirmParser.add_argument("--public-key", {
    dest: 'publicKey',
    help: "Public key as returned from the gen_key command.",
    required: true
});

let genKeyFinalizeParser = subparsers.add_parser("gen_key_finalize", {help: "Finalize key generation procedure."});
genKeyFinalizeParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    type: 'int',
    help: "Target key slot number.",
    required: true
});
genKeyFinalizeParser.add_argument("--password", {
    dest: 'password',
    help: "Slot password (optional, utf-8 string).",
    required: false
});

let fullGenKeyParser = subparsers.add_parser("full_gen_key", {help: "Perform the full key generation procedure."});
fullGenKeyParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    type: 'int',
    help: "Target key slot number.",
    required: true
});
fullGenKeyParser.add_argument("--entropy", {
    dest: 'entropy',
    help: "Additional entropy (32 bytes, hex encoded).",
    required: false
});
fullGenKeyParser.add_argument("--password", {
    dest: 'password',
    help: "Slot password (optional, utf-8 string).",
    required: false
});

let setPasswordParser = subparsers.add_parser("set_password", {help: "Set password for slot #3."});
setPasswordParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    'default': 3,
    type: 'int',
    help: "Target key slot number (default: 3)."
});
setPasswordParser.add_argument("--password", {
    dest: 'password',
    help: "Slot password (utf-8 string).",
    required: true
});

let replacePasswordParser = subparsers.add_parser("replace_password", {help: "Replace password for slot #3."});
replacePasswordParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    'default': 3,
    type: 'int',
    help: "Target key slot number (default: 3)."
});
replacePasswordParser.add_argument("--cur-password", {
    dest: 'currentPassword',
    help: "Current slot password (utf-8 string).",
    required: true
});
replacePasswordParser.add_argument("--new-password", {
    dest: 'newPassword',
    help: "New slot password (utf-8 string).",
    required: true
});

let unsetPasswordParser = subparsers.add_parser("unset_password", {help: "Unset password for slot #3."});
unsetPasswordParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    'default': 3,
    type: 'int',
    help: "Target key slot number (default: 3)."
});
unsetPasswordParser.add_argument("--password", {
    dest: 'password',
    help: "Slot password (utf-8 string).",
    required: true
});

subparsers.add_parser("get_pkeys", {help: "Get tag's public keys #1, #2 and #3."});

let getKeyInfoParser = subparsers.add_parser("get_key_info", {help: "Get key information."});
getKeyInfoParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    type: 'int',
    help: "Target key slot number."
});

subparsers.add_parser("get_transport_pk", {help: "[Key backup] Get secure transport credentials from the target HaLo tag."});

let loadTransportPKParser = subparsers.add_parser("load_transport_pk", {help: "[Key backup] Load target tag's secure transport credentials into source tag."});
loadTransportPKParser.add_argument("--data", {
    dest: 'data',
    help: "Source tag's secure transport credentials.",
    required: true
});

let exportKeyParser = subparsers.add_parser("export_key", {help: "[Key backup] Export encrypted key pair from the source HaLo tag."});
exportKeyParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    type: 'int',
    help: "Target key slot number.",
    required: true
});
exportKeyParser.add_argument("--password", {
    dest: 'password',
    help: "Key slot password (utf-8 string).",
    required: true
});
exportKeyParser.add_argument("--data", {
    dest: 'data',
    help: "Target tag's secure transport credentials.",
    required: true
});

let importKeyInitParser = subparsers.add_parser("import_key_init", {help: "[Key backup] Initialize import of the encrypted key pair into the target HaLo tag."});
importKeyInitParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    type: 'int',
    help: "Target key slot number.",
    required: true
});
importKeyInitParser.add_argument("--data", {
    dest: 'data',
    help: "Encrypted key pair data.",
    required: true
});

let importKeyParser = subparsers.add_parser("import_key", {help: "[Key backup] Finalize import of the encrypted key pair into the target HaLo tag."});
importKeyParser.add_argument("-k", "--key-no", {
    dest: 'keyNo',
    type: 'int',
    help: "Target key slot number.",
    required: true
});

let getDataStructParser = subparsers.add_parser("get_data_struct", {help: "Get certain data from the tag."});
getDataStructParser.add_argument("-s", "--spec", {
    dest: 'spec',
    type: 'str',
    help: "Data specification.",
    required: true
});

let getGraffitiParser = subparsers.add_parser("get_graffiti", {help: "Get graffiti data from the tag."});
getGraffitiParser.add_argument("-n", "--slot-no", {
    dest: 'slotNo',
    type: 'int',
    help: "Target data slot number.",
    required: true
});

let storeGraffitiParser = subparsers.add_parser("store_graffiti", {help: "Store graffiti data to the tag."});
storeGraffitiParser.add_argument("-n", "--slot-no", {
    dest: 'slotNo',
    type: 'int',
    help: "Target data slot number.",
    required: true
});
storeGraffitiParser.add_argument("--data", {
    dest: 'data',
    help: "Data to be stored (ASCII string).",
    required: true,
    default: ''
});

subparsers.add_parser("pcsc_detect", {help: "Detect PC/SC readers and HaLo tags (for debugging)."});

function parseArgs() {
    let args = parser.parse_args();

    if (!args.name) {
        printVersionInfo();
        parser.print_help();
        return null;
    }

    if (args.output && args.output !== "color" && args.output !== "json") {
        console.error('Error: Incorrect output parameter specified. Should be on of: color, json.')
        return null;
    }

    return args;
}

export {parseArgs};
