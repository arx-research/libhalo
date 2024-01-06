const fs = require("fs");
const {dirname} = require("./util");

function getVersionInfo() {
    if (fs.existsSync(dirname + '/halotools_version.json')) {
        return JSON.parse(fs.readFileSync(dirname + '/halotools_version.json', 'utf-8'));
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
