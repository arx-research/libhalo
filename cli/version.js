const fs = require("fs");

function getVersionInfo() {
    if (fs.existsSync('halotools_version.json')) {
        return JSON.parse(fs.readFileSync('halotools_version.json', 'utf-8'));
    } else {
        return null;
    }
}

function printVersionInfo() {
    let versionInfo = getVersionInfo();

    if (versionInfo) {
        console.log(versionInfo.name + ' (' + versionInfo.tagName + '; ' + versionInfo.commitId + ')');
    }
}

module.exports = {getVersionInfo, printVersionInfo};
