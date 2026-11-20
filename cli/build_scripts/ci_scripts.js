import {ArgumentParser} from "argparse";
import {doFixWinBinary} from "./win_fix_binary.js";
import {parseGitHubRef, getProductInfo} from "./version_helper.js";
import {readFileSync, writeFileSync} from "fs";

// Build package.json for pkg: orig-package.json overlaid with bin-<product>.json.
// Done locally rather than via `npx json-merger`, which would fetch an unpinned
// package from npm at build time (bypassing yarn.lock and .yarnrc.yml guardrails).
function writeProductPackageJson(product) {
    const origPkg = JSON.parse(readFileSync('orig-package.json', 'utf-8'));
    const binPkg = JSON.parse(readFileSync(`bin-${product}.json`, 'utf-8'));
    writeFileSync('package.json', JSON.stringify({...origPkg, ...binPkg}, null, 2) + "\n");
}

async function runCIScripts() {
    const parser = new ArgumentParser({
        description: "GitHub Actions CI Entrypoint"
    });

    parser.add_argument("--platform", {required: true});
    parser.add_argument("--product", {required: true});
    let args = parser.parse_args();

    if (args.platform.includes("windows")) {
        await doFixWinBinary(args.product);
    }

    let productInfo = getProductInfo(args.product);
    let versionInfo = parseGitHubRef();
    writeFileSync('halotools_version.json', JSON.stringify({...productInfo, ...versionInfo}));
    writeProductPackageJson(args.product);
}

runCIScripts();
