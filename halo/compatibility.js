let minSupportedVersion = "01.C6";

function haloSetTargetVersion(version) {
    minSupportedVersion = version;
}

module.exports = {
    haloSetTargetVersion,
    minSupportedVersion
};
