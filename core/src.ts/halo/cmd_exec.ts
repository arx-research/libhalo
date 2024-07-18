/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */
import {
    HaloCmdExportKey,
    HaloCmdGetDataStruct,
    HaloCmdGetGraffiti, HaloCmdGetKeyInfo,
    HaloCmdGetPkeys,
    HaloCmdGetTransportPK,
    HaloCmdImportKey,
    HaloCmdImportKeyInit,
    HaloCmdLoadTransportPK, HaloCmdReplacePassword, HaloCmdSetPassword, HaloCmdSetURLSubdomain,
    HaloCmdSign,
    HaloCmdSignChallenge,
    HaloCmdSignRandom,
    HaloCmdStoreGraffiti, HaloCmdUnsetPassword,
    HaloCmdWriteLatch,
    HaloResExportKey,
    HaloResGetGraffiti, HaloResGetKeyInfo,
    HaloResGetPkeys, HaloResGetTransportPK,
    HaloResImportKey,
    HaloResImportKeyInit,
    HaloResLoadTransportPK, HaloResReplacePassword, HaloResSetPassword, HaloResSetURLSubdomain,
    HaloResSign,
    HaloResSignChallenge,
    HaloResSignRandom, HaloResUnsetPassword,
    HaloResWriteLatch
} from "./command_types.js";
import {
    HaloCmdCFGNDEF,
    HaloCmdGenKey, HaloCmdGenKeyConfirm, HaloCmdGenKeyFinalize,
    HaloCommandObject,
    HaloResCFGNDEF,
    HaloResGenKey, HaloResGenKeyConfirm, HaloResGenKeyFinalize,
    HaloResponseObject
} from "../types.js";

export abstract class BaseHaloAPI {
    abstract executeCommand(args: HaloCommandObject): Promise<HaloResponseObject>;

    getPkeys(args: HaloCmdGetPkeys): Promise<HaloResGetPkeys> {
        return this.executeCommand(args);
    }

    sign(args: HaloCmdSign): Promise<HaloResSign> {
        return this.executeCommand(args);
    }

    writeLatch(args: HaloCmdWriteLatch): Promise<HaloResWriteLatch> {
        return this.executeCommand(args);
    }

    signRandom(args: HaloCmdSignRandom): Promise<HaloResSignRandom> {
        return this.executeCommand(args);
    }

    signChallenge(args: HaloCmdSignChallenge): Promise<HaloResSignChallenge> {
        return this.executeCommand(args);
    }

    cfgNDEF(args: HaloCmdCFGNDEF): Promise<HaloResCFGNDEF> {
        return this.executeCommand(args);
    }

    genKey(args: HaloCmdGenKey): Promise<HaloResGenKey> {
        return this.executeCommand(args);
    }

    genKeyConfirm(args: HaloCmdGenKeyConfirm): Promise<HaloResGenKeyConfirm> {
        return this.executeCommand(args);
    }

    genKeyFinalize(args: HaloCmdGenKeyFinalize): Promise<HaloResGenKeyFinalize> {
        return this.executeCommand(args);
    }

    setURLSubdomain(args: HaloCmdSetURLSubdomain): Promise<HaloResSetURLSubdomain> {
        return this.executeCommand(args);
    }

    getKeyInfo(args: HaloCmdGetKeyInfo): Promise<HaloResGetKeyInfo> {
        return this.executeCommand(args);
    }

    setPassword(args: HaloCmdSetPassword): Promise<HaloResSetPassword> {
        return this.executeCommand(args);
    }

    unsetPassword(args: HaloCmdUnsetPassword): Promise<HaloResUnsetPassword> {
        return this.executeCommand(args);
    }

    replacePassword(args: HaloCmdReplacePassword): Promise<HaloResReplacePassword> {
        return this.executeCommand(args);
    }

    getTransportPK(args: HaloCmdGetTransportPK): Promise<HaloResGetTransportPK> {
        return this.executeCommand(args);
    }

    loadTransportPK(args: HaloCmdLoadTransportPK): Promise<HaloResLoadTransportPK> {
        return this.executeCommand(args);
    }

    exportKey(args: HaloCmdExportKey): Promise<HaloResExportKey> {
        return this.executeCommand(args);
    }

    importKeyInit(args: HaloCmdImportKeyInit): Promise<HaloResImportKeyInit> {
        return this.executeCommand(args);
    }

    importKey(args: HaloCmdImportKey): Promise<HaloResImportKey> {
        return this.executeCommand(args);
    }

    getDataStruct(args: HaloCmdGetDataStruct): Promise<HaloCmdGetDataStruct> {
        return this.executeCommand(args);
    }

    getGraffiti(args: HaloCmdGetGraffiti): Promise<HaloResGetGraffiti> {
        return this.executeCommand(args);
    }

    storeGraffiti(args: HaloCmdStoreGraffiti): Promise<HaloCmdStoreGraffiti> {
        return this.executeCommand(args);
    }
}
