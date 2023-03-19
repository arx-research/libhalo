let dirname;

if (process.pkg && process.pkg.entrypoint) {
    dirname = __dirname;
} else {
    dirname = '.';
}

module.exports = {dirname};

