/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const CMD_CODES = {
    // user commands, can be executed through any interface
    "SHARED_CMD_SIGN": 0x01,
    "SHARED_CMD_GET_PKEYS": 0x02,
    "SHARED_CMD_GENERATE_KEY_INIT": 0xB5,
    "SHARED_CMD_GENERATE_KEY_CONT": 0xB6,
    "SHARED_CMD_GENERATE_KEY_FINALIZE": 0xB7,
    "SHARED_CMD_GENERATE_KEY_FIN_PWD": 0xB8,
    "SHARED_CMD_GET_ATTEST": 0x04,
    // reserved, do not use
    "SHARED_CMD_RESERVED_1": 0x05,
    "SHARED_CMD_FETCH_SIGN": 0x06,
    "SHARED_CMD_GET_FW_VERSION": 0x07,
    "SHARED_CMD_SIGN_RANDOM": 0x08,
    "SHARED_CMD_GET_ADDON_FW_VERSION": 0x09,
    "SHARED_CMD_SIGN_CHALLENGE": 0x11,
    "SHARED_CMD_GET_KEY_INFO": 0x13,

    "SHARED_CMD_SIGN_PWD": 0xA1,
    "SHARED_CMD_FETCH_SIGN_PWD": 0xA2,
    "SHARED_CMD_SET_PASSWORD": 0xA3,
    "SHARED_CMD_UNSET_PASSWORD": 0xA4,
    "SHARED_CMD_REPLACE_PASSWORD": 0xA5,
    // reserved, do not use
    "SHARED_CMD_RESERVED_2": 0xCC,

    "SHARED_CMD_GET_LATCH": 0xD1,
    "SHARED_CMD_LATCH_DATA": 0xD3,
    "SHARED_CMD_SET_URL_SUBDOMAIN": 0xD4,
    "SHARED_CMD_LOCK_URL_SUBDOMAIN": 0xD5,
    "SHARED_CMD_GET_DATA_VERSION": 0xD7,
    "SHARED_CMD_GET_URL_SUBDOMAIN": 0xD6,
    "SHARED_CMD_SET_NDEF_MODE": 0xD8,

    "CRED_CMD_GET_TRANSPORT_PK_ATT": 0xA6,
    "CRED_CMD_LOAD_TRANSPORT_PK": 0xA7,
    "CRED_CMD_EXPORT_KEY": 0xA8,
    "CRED_CMD_IMPORT_KEY_INIT": 0xA9,
    "CRED_CMD_IMPORT_KEY": 0xAA,
};

module.exports = {CMD_CODES};
