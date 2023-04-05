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
            "crypto": require.resolve("crypto-browserify"),
            "stream": false
        }
    }
};
