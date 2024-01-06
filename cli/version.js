const fs = require("fs");
const {dirname} = require("./util");

function getVersionInfo() {
    console.log('debug: opening file');
    if (fs.existsSync('halotools_version.json')) {
        console.log('debug: opened');
        return JSON.parse(fs.readFileSync(dirname + '/halotools_version.json', 'utf-8'));
    } else {
        console.log('debug: no such file');
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
