/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License:  MIT
 */

const FLAGS = {
    flagUseText:        [0, 0x01],
    flagHidePk1:        [0, 0x02],
    flagHidePk2:        [0, 0x04],
    flagHidePk3:        [0, 0x08],
    flagShowPk1Attest:  [0, 0x10],
    flagShowPk2Attest:  [0, 0x20],
    flagHideRNDSIG:     [0, 0x40],
    flagHideCMDRES:     [0, 0x80],

    flagShowPk3Attest:  [1, 0x01],
    flagShowLatch1Sig:  [1, 0x02],
    flagShowLatch2Sig:  [1, 0x04],
    flagLegacyStatic:   [1, 0x08],
    flagShowPkN:        [1, 0x10],
    flagShowPkNAttest:  [1, 0x20],
    flagRNDSIGUseBJJ62: [1, 0x40]
};

export {FLAGS};
