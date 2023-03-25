/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

let ERROR_CODES = {
    0x01: ["ERROR_CODE_UNKNOWN_CMD", "Unknown command code."],
    0x02: ["ERROR_CODE_INVALID_KEY_NO", "Invalid key number."],
    0x03: ["ERROR_CODE_INVALID_LENGTH", "Invalid length."],
    0x04: ["ERROR_CODE_RESERVED_1", "Reserved (1)."],
    0x05: ["ERROR_CODE_CONFIG_NOT_LOCKED", "Config is not locked."],
    0x06: ["ERROR_CODE_KEY_ALREADY_EXISTS", "Key already exists."],
    0x07: ["ERROR_CODE_INVALID_LATCH_SLOT", "Invalid latch slot number."],
    0x08: ["ERROR_CODE_SLOT_ALREADY_LATCHED", "This slot was already written. It's not possible to override latch slot."],
    0x09: ["ERROR_CODE_SLOT_NOT_LATCHED", "Unable to fetch latch slot information. The latch slot is empty."],
    0x0A: ["ERROR_CODE_KEY_NOT_INITIALIZED", "Targeted key is not initialized."],
    0x0B: ["ERROR_CODE_SUBDOMAIN_LOCKED", "Unable to modify NDEF subdomain. The subdomain is already permanently locked."],
    0x0C: ["ERROR_CODE_CRYPTO_ERROR", "Cryptographic error. No details available."],
    0x0D: ["ERROR_CODE_INVALID_DATA", "Invalid data provided."],
    0x0E: ["ERROR_CODE_CMD_TOO_LONG", "Command is too long to be displayed."],
    0x0F: ["ERROR_CODE_RESP_TOO_LONG", "Response is too long to be displayed."],
    0x10: ["ERROR_CODE_PWD_NOT_SET", "Password was not set."],
    0x11: ["ERROR_CODE_WRONG_PWD", "Wrong password provided."],
    0x12: ["ERROR_CODE_PWD_ALREADY_SET", "Password is already set."],
    0x13: ["ERROR_CODE_NO_ADDON", "HaLo Addons are not installed on this tag."]
};

module.exports = {ERROR_CODES};
