import crypto from "crypto";
import path from "path";
import fs from "fs";
import * as ResEdit from "resedit";
// purposely not declared in package.json, the "pkg-fetch" will be
// implicitly installed by "pkg" dev dependency in correct version
import { need, system } from '@yao-pkg/pkg-fetch';
import package_json from '../package.json' assert { type: "json" };
import {parseGitHubRef, getProductInfo} from "./version_helper.js";

const {
    hostArch,
    hostPlatform
} = system;

function computeSha256(filePath) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(crypto.createHash('sha256').setEncoding('hex'))
            .on('error', function (err) {
                reject(err);
            })
            .on('finish', function () {
                resolve(this.read());
            });
    });
}

async function fixBinary(name, bin_name, version) {
    if (package_json['pkg']['targets'].length !== 1) {
        throw Error("Only one pkg target is supported");
    }

    console.log('Fetching node js binary...');

    const nodeBinPath = await need({
        dryRun: false,
        forceBuild: false,
        forceFetch: false,
        nodeRange: package_json['pkg']['targets'][0],
        platform: hostPlatform,
        arch: hostArch
    });

    const language = {
        lang: 1033, // en-us
        codepage: 1200 // UTF-16
    };

    // Modify .exe w/ ResEdit
    const data = fs.readFileSync(nodeBinPath);
    const executable = ResEdit.NtExecutable.from(data);
    const res = ResEdit.NtExecutableResource.from(executable);
    const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];

    // Remove original filename
    vi.removeStringValue(language, 'OriginalFilename');
    vi.removeStringValue(language, 'InternalName');

    vi.setProductVersion(...version, language.lang);
    vi.setFileVersion(...version, language.lang);

    vi.setStringValues(language, {
        FileDescription: name,
        ProductName: name,
        LegalCopyright: 'Arx Research Inc.',
        OriginalFilename: bin_name
    });

    vi.outputToResourceEntries(res.entries);

    // Add icon
    const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync("halo.ico"));
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        1,
        language.lang,
        iconFile.icons.map(item => item.data)
    );

    // Regenerate and write to .exe
    res.outputResource(executable);

    if (!fs.existsSync(".pkg-cache")) {
        fs.mkdirSync(".pkg-cache");
    }

    const nodeBinBase = path.basename(nodeBinPath);
    const nodeBuiltKey = nodeBinBase.replace('fetched-', 'built-');
    const outPath = path.join(".pkg-cache", nodeBuiltKey);
    fs.writeFileSync(outPath, Buffer.from(executable.generate()));
}

async function doFixWinBinary(productType) {
    let {name, binName} = getProductInfo(productType);
    let {version} = parseGitHubRef();
    console.log('Using version', version);
    await fixBinary(name, binName, version);

    // run pkg with:
    // $env:PKG_CACHE_PATH = './.pkg-cache/'
    // $env:PKG_IGNORE_TAG = 1
}

export {doFixWinBinary};
