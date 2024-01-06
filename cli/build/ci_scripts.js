const {ArgumentParser} = require("argparse");
const {doFixWinBinary} = require("./win_fix_binary");
const {parseGitHubRef, getProductInfo} = require("./version_helper");
const {writeFileSync} = require("fs");

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
}

runCIScripts();
