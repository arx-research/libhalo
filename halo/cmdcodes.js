/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const CMD_CODES = {
    // user commands, can be executed through any interface
    "SHARED_CMD_SIGN": 0x01,
    "SHARED_CMD_GET_PKEYS": 0x02,
    "SHARED_CMD_GENERATE_3RD_KEY": 0x03,
    "SHARED_CMD_GENERATE_3RD_KEY_CONT": 0x09,
    "SHARED_CMD_GENERATE_3RD_KEY_FINALIZE": 0x12,
    "SHARED_CMD_GET_ATTEST": 0x04,
    // reserved, do not use
    "SHARED_CMD_RESERVED_1": 0x05,
    "SHARED_CMD_FETCH_SIGN": 0x06,
    "SHARED_CMD_GET_FW_VERSION": 0x07,
    "SHARED_CMD_SIGN_RANDOM": 0x08,
    "SHARED_CMD_GET_ADDON_FW_VERSION": 0x09,
    "SHARED_CMD_SIGN_CHALLENGE": 0x11,

    "SHARED_CMD_SIGN_PWD": 0xA1,
    "SHARED_CMD_FETCH_SIGN_PWD": 0xA2,
    "SHARED_CMD_SET_PASSWORD": 0xA3,
    "SHARED_CMD_UNSET_PASSWORD": 0xA4,
    // reserved, do not use
    "SHARED_CMD_RESERVED_2": 0xCC,

    "SHARED_CMD_GET_LATCH": 0xD1,
    "SHARED_CMD_LATCH_DATA": 0xD3,
    "SHARED_CMD_SET_URL_SUBDOMAIN": 0xD4,
    "SHARED_CMD_LOCK_URL_SUBDOMAIN": 0xD5,
    "SHARED_CMD_GET_DATA_VERSION": 0xD7,
    "SHARED_CMD_GET_URL_SUBDOMAIN": 0xD6,
    "SHARED_CMD_SET_NDEF_MODE": 0xD8,
};

module.exports = {CMD_CODES};
