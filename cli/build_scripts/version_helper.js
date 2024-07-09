function parseGitHubRef() {
    let commitId = process.env.GITHUB_SHA;
    let tagName = process.env.GITHUB_REF_NAME;
    let version = null;

    if (tagName && tagName.startsWith('halotools-v')) {
        let vStr = tagName.split('-v')[1];
        let vStr2 = vStr.split('.');
        version = [parseInt(vStr2[0]), parseInt(vStr2[1]), parseInt(vStr2[2]), 0];
    } else {
        version = [0, 0, 0, 0];
    }

    return {
        commitId,
        tagName,
        version
    };
}

function getProductInfo(productType) {
    let name, binName;

    if (productType === "cli") {
        name = 'HaLo CLI';
        binName = 'halocli.exe';
    } else if (productType === "bridge") {
        name = 'HaLo Bridge Server';
        binName = 'halo-bridge.exe';
    } else if (productType === "gateway") {
        name = 'HaLo Gateway Server';
        binName = 'halo-gateway.exe';
    } else {
        throw Error("Unknown product type specified.");
    }

    return {name, binName};
}

export {parseGitHubRef, getProductInfo};
