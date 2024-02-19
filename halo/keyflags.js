/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */

const KEY_FLAGS = {
    KEYFLG_IS_PWD_PROTECTED:   0x01,
    KEYFLG_CONTAINS_AUTH_CTR:  0x02,
    KEYFLG_MANDATORY_PASSWORD: 0x04,
    KEYFLG_SIGN_NOT_USED:      0x08,
    KEYFLG_IS_IMPORTED:        0x10,
    KEYFLG_IS_EXPORTED:        0x20
}

module.exports = {KEY_FLAGS};
