const {ERROR_CODES} = require("../halo/errors");
const {readNDEF} = require("./pcsc_ndef");
const {HaloLogicError, HaloTagError} = require("../halo/exceptions");
const {execHaloCmd} = require("./common");

async function transceive(reader, command, options) {
    options = options || {};

    let res = await reader.transmit(command, 255);

    let check1 = res.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0;
    let check2 = res.slice(-2).compare(Buffer.from([0x91, 0x00])) !== 0;

    if (!options.noCheck) {
        if (check1 && check2) {
            throw Error("Command failed, cmd: " + command.toString('hex') + ", status code: " + res.toString('hex'));
        }

        return res.slice(0, -2);
    } else {
        return res;
    }
}

async function selectCore(reader) {
    return await transceive(reader, Buffer.from("00A4040007481199130E9F0100", "hex"));
}

async function getVersion(reader) {
    await selectCore(reader);
    let versionRes = await transceive(reader, Buffer.from("00510000010700", "hex"), {noCheck: true});

    if (versionRes.slice(-2).compare(Buffer.from([0x90, 0x00])) !== 0) {
        // GET_FV_VERSION command not supported, fallback to NDEF
        let qs = await readNDEF(reader, {allowCache: true});

        if (!qs.v) {
            return '01.C1.000001.00000000';
        } else if (qs.v.toLowerCase() === 'c2') {
            return '01.C2.000002.00000000';
        } else if (qs.v.toLowerCase() === 'c3') {
            return '01.C3.000003.00000000';
        } else {
            return qs.v;
        }
    } else {
        return versionRes.slice(0, -2).toString();
    }
}

async function execCoreCommand(reader, command) {
    const cmdBuf = Buffer.concat([
        Buffer.from("B0510000", "hex"),
        Buffer.from([command.length]),
        command,
        Buffer.from("00", "hex")
    ]);

    let res = await transceive(reader, cmdBuf);

    if (res.length === 2 && res[0] === 0xE1) {
        if (ERROR_CODES.hasOwnProperty(res[1])) {
            let err = ERROR_CODES[res[1]];
            throw new HaloTagError(err[0], "Tag responded with error: [" + err[0] + "] " + err[1]);
        } else {
            throw new HaloLogicError("Tag responded with unknown error: " + res.toString('hex'));
        }
    }

    return {
        result: res.toString('hex'),
        extra: {}
    };
}

function makeOptions(reader) {
    return {
        method: 'pcsc',
        exec: async (command) => await execCoreCommand(reader, command),
    }
}

async function execHaloCmdPCSC(command, reader) {
    let version = await getVersion(reader);

    let [verMajor, verMinor, verSeq, verShortId] = version.split('.');
    verMajor = parseInt(verMajor, 10);
    verSeq = parseInt(verSeq, 10);

    if (verMajor > 1) {
        throw new HaloLogicError("This version of CLI doesn't support major release version " + verMajor + ". Please update.");
    }

    await selectCore(reader);
    let options = makeOptions(reader);
    command = {...command};

    if (command.name === "version") {
        return version;
    }

    try {
        return await execHaloCmd(command, options);
    } catch (e) {
        console.error(e);
        return null;
    }
}

module.exports = {execHaloCmdPCSC};
