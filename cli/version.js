import fs from "fs";
import {dirname} from "./util.js";

function getVersionInfo() {
    if (fs.existsSync(dirname + '/halotools_version.json')) {
        return JSON.parse(fs.readFileSync(dirname + '/halotools_version.json', 'utf-8'));
    } else {
        return null;
    }
}

function getBuildInfo() {
    let versionInfo = getVersionInfo();

    return {
        tagName: versionInfo ? versionInfo.tagName : 'SNAPSHOT',
        commitId: versionInfo ? versionInfo.commitId : 'SNAPSHOT',
        version: versionInfo ? versionInfo.version : [0, 0, 0, 0]
    };
}

function printVersionInfo() {
    let versionInfo = getVersionInfo();

    if (versionInfo) {
        console.log(versionInfo.name + ' (' + versionInfo.tagName + '; ' + versionInfo.commitId + ')');
    }
}

export {getVersionInfo, printVersionInfo, getBuildInfo};
