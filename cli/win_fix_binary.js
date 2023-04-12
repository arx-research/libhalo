const path = require("path");
const fs = require("fs");
const { readFileSync, writeFileSync } = require('fs');
// purposely not declared in package.json, the "pkg-fetch" will be
// implicitly installed by "pkg" dev dependency in correct version
const { need, system } = require('pkg-fetch');
const package_json = require('./package.json');
const crypto = require("crypto");

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
    // unable to normally require, this is ES6 module
    const ResEdit = await import('resedit');

    if (package_json['pkg']['targets'].length !== 1) {
        throw Error("Only one pkg target is supported");
    }

    console.log('Fetching node js binary...');

    const nodeBinPath = await need({
        dryRun: false,
        forceBuild: false,
        nodeRange: package_json['pkg']['targets'][0],
        platform: hostPlatform,
        arch: hostArch
    });

    const language = {
        lang: 1033, // en-us
        codepage: 1200 // UTF-16
    };

    // Modify .exe w/ ResEdit
    const data = readFileSync(nodeBinPath);
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
    const iconFile = ResEdit.Data.IconFile.from(readFileSync("halo.ico"));
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        1,
        language.lang,
        iconFile.icons.map(item => item.data)
    );

    // Regenerate and write to .exe
    res.outputResource(executable);

    if (!fs.existsSync(".pkg-cache")){
        fs.mkdirSync(".pkg-cache");
    }

    const nodeBinBase = path.basename(nodeBinPath);
    const nodeHashKey = nodeBinBase.replace('fetched-', 'node-');
    const outPath = path.join(".pkg-cache", nodeBinBase);
    writeFileSync(outPath, Buffer.from(executable.generate()));
    const fileHash = await computeSha256(outPath);

    fs.appendFileSync('node_modules\\pkg-fetch\\lib-es5\\expected.js', '\n/** PATCHED **/ if (process.env.PKG_PATCHED_BIN === "1") {exports.EXPECTED_HASHES[\'' + nodeHashKey + '\'] = \'' + fileHash + '\';}');
}

let name = null;
let binName = null;

if (process.argv.length < 3) {
    throw Error("Binary type not specified in argv.");
} else if (process.argv[2] === "cli") {
    name = 'HaLo CLI';
    binName = 'halocli.exe';
} else if (process.argv[2] === "bridge") {
    name = 'HaLo Bridge Server';
    binName = 'halo-bridge.exe';
} else if (process.argv[2] === "gateway") {
    name = 'HaLo Gateway Server';
    binName = 'halo-gateway.exe';
} else {
    throw Error("Unknown binary type specified.");
}

let tagName = process.env.GITHUB_REF_NAME;
let version = null;

if (tagName && tagName.startsWith('halotools-v')) {
    let vStr = tagName.split('-v')[1];
    let vStr2 = vStr.split('.');
    version = [parseInt(vStr2[0]), parseInt(vStr2[1]), parseInt(vStr2[2]), 0];
} else {
    version = [0, 0, 0, 0];
}

console.log('Using version', version);
fixBinary(name, binName, version);

// run pkg with:
// $env:PKG_PATCHED_BIN = 1
// $env:PKG_CACHE_PATH = './.pkg-cache/'
// $env:PKG_IGNORE_TAG = 1
