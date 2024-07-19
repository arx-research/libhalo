/**
 * LibHaLo - Programmatically interact with HaLo tags from the web browser, mobile application or the desktop.
 * Copyright by Arx Research, Inc., a Delaware corporation
 * License: MIT
 */
import {
    HaloCmdExportKey,
    HaloCmdGetDataStruct,
    HaloCmdGetGraffiti,
    HaloCmdGetKeyInfo,
    HaloCmdGetPkeys,
    HaloCmdGetTransportPK,
    HaloCmdImportKey,
    HaloCmdImportKeyInit,
    HaloCmdLoadTransportPK,
    HaloCmdReplacePassword,
    HaloCmdSetPassword,
    HaloCmdSetURLSubdomain,
    HaloCmdSign,
    HaloCmdSignChallenge,
    HaloCmdSignRandom,
    HaloCmdStoreGraffiti,
    HaloCmdUnsetPassword,
    HaloCmdWriteLatch,
    HaloResExportKey,
    HaloResGetDataStruct,
    HaloResGetGraffiti,
    HaloResGetKeyInfo,
    HaloResGetPkeys,
    HaloResGetTransportPK,
    HaloResImportKey,
    HaloResImportKeyInit,
    HaloResLoadTransportPK,
    HaloResReplacePassword,
    HaloResSetPassword,
    HaloResSetURLSubdomain,
    HaloResSign,
    HaloResSignChallenge,
    HaloResSignRandom,
    HaloResStoreGraffiti,
    HaloResUnsetPassword,
    HaloResWriteLatch
} from "./command_types.js";
import {
    HaloAPICallOptions,
    HaloCmdCFGNDEF,
    HaloCmdGenKey,
    HaloCmdGenKeyConfirm,
    HaloCmdGenKeyFinalize,
    HaloCommandObject,
    HaloResCFGNDEF,
    HaloResGenKey,
    HaloResGenKeyConfirm,
    HaloResGenKeyFinalize,
    HaloResponseObject
} from "../types.js";

export abstract class BaseHaloAPI {
    abstract executeCommand(args: HaloCommandObject, options?: HaloAPICallOptions): Promise<HaloResponseObject>;

    getPkeys(args: HaloCmdGetPkeys, options?: HaloAPICallOptions): Promise<HaloResGetPkeys> {
        return this.executeCommand({...args, name: "get_pkeys"}, options);
    }

    sign(args: HaloCmdSign, options?: HaloAPICallOptions): Promise<HaloResSign> {
        return this.executeCommand({...args, name: "sign"}, options);
    }

    writeLatch(args: HaloCmdWriteLatch, options?: HaloAPICallOptions): Promise<HaloResWriteLatch> {
        return this.executeCommand({...args, name: "write_latch"}, options);
    }

    signRandom(args: HaloCmdSignRandom, options?: HaloAPICallOptions): Promise<HaloResSignRandom> {
        return this.executeCommand({...args, name: "sign_random"}, options);
    }

    signChallenge(args: HaloCmdSignChallenge, options?: HaloAPICallOptions): Promise<HaloResSignChallenge> {
        return this.executeCommand({...args, name: "sign_challenge"}, options);
    }

    cfgNDEF(args: HaloCmdCFGNDEF, options?: HaloAPICallOptions): Promise<HaloResCFGNDEF> {
        return this.executeCommand({...args, name: "cfg_ndef"}, options);
    }

    genKey(args: HaloCmdGenKey, options?: HaloAPICallOptions): Promise<HaloResGenKey> {
        return this.executeCommand({...args, name: "gen_key"}, options);
    }

    genKeyConfirm(args: HaloCmdGenKeyConfirm, options?: HaloAPICallOptions): Promise<HaloResGenKeyConfirm> {
        return this.executeCommand({...args, name: "gen_key_confirm"}, options);
    }

    genKeyFinalize(args: HaloCmdGenKeyFinalize, options?: HaloAPICallOptions): Promise<HaloResGenKeyFinalize> {
        return this.executeCommand({...args, name: "gen_key_finalize"}, options);
    }

    setURLSubdomain(args: HaloCmdSetURLSubdomain, options?: HaloAPICallOptions): Promise<HaloResSetURLSubdomain> {
        return this.executeCommand({...args, name: "set_url_subdomain"}, options);
    }

    getKeyInfo(args: HaloCmdGetKeyInfo, options?: HaloAPICallOptions): Promise<HaloResGetKeyInfo> {
        return this.executeCommand({...args, name: "get_key_info"}, options);
    }

    setPassword(args: HaloCmdSetPassword, options?: HaloAPICallOptions): Promise<HaloResSetPassword> {
        return this.executeCommand({...args, name: "set_password"}, options);
    }

    unsetPassword(args: HaloCmdUnsetPassword, options?: HaloAPICallOptions): Promise<HaloResUnsetPassword> {
        return this.executeCommand({...args, name: "unset_password"}, options);
    }

    replacePassword(args: HaloCmdReplacePassword, options?: HaloAPICallOptions): Promise<HaloResReplacePassword> {
        return this.executeCommand({...args, name: "replace_password"}, options);
    }

    getTransportPK(args: HaloCmdGetTransportPK, options?: HaloAPICallOptions): Promise<HaloResGetTransportPK> {
        return this.executeCommand({...args, name: "get_transport_pk"}, options);
    }

    loadTransportPK(args: HaloCmdLoadTransportPK, options?: HaloAPICallOptions): Promise<HaloResLoadTransportPK> {
        return this.executeCommand({...args, name: "load_transport_pk"}, options);
    }

    exportKey(args: HaloCmdExportKey, options?: HaloAPICallOptions): Promise<HaloResExportKey> {
        return this.executeCommand({...args, name: "export_key"}, options);
    }

    importKeyInit(args: HaloCmdImportKeyInit, options?: HaloAPICallOptions): Promise<HaloResImportKeyInit> {
        return this.executeCommand({...args, name: "import_key_init"}, options);
    }

    importKey(args: HaloCmdImportKey, options?: HaloAPICallOptions): Promise<HaloResImportKey> {
        return this.executeCommand({...args, name: "import_key"}, options);
    }

    getDataStruct(args: HaloCmdGetDataStruct, options?: HaloAPICallOptions): Promise<HaloResGetDataStruct> {
        return this.executeCommand({...args, name: "get_data_struct"}, options);
    }

    getGraffiti(args: HaloCmdGetGraffiti, options?: HaloAPICallOptions): Promise<HaloResGetGraffiti> {
        return this.executeCommand({...args, name: "get_graffiti"}, options);
    }

    storeGraffiti(args: HaloCmdStoreGraffiti, options?: HaloAPICallOptions): Promise<HaloResStoreGraffiti> {
        return this.executeCommand({...args, name: "store_graffiti"}, options);
    }
}
