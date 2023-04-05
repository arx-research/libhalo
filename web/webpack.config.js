const fs = require('fs');

module.exports = {
    entry: {
        app: './weblib.js',
    },
    output: {
        filename: 'libhalo.js'
    },
    mode: 'production',
    target: 'web',
    resolve: {
        fallback: {
            crypto: require.resolve('crypto-browserify'),
            stream: require.resolve('stream-browserify'),
        },
    },
    plugins: [
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
                    compilation.getAssets().forEach((asset) => {
                        fs.copyFileSync('./dist/' + asset.name, '../cli/assets/static/' + asset.name);
                    });
                });
            }
        }
    ]
};
