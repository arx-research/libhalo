const path = require('path');

module.exports = {
    entry: {
        app: './ws_client.js',
    },
    output: {
        filename: 'ws_client.js',
        path: path.resolve(__dirname, '../assets/static')
    },
    mode: 'production',
    target: 'web',
    resolve: {
        fallback: {
            crypto: require.resolve('crypto-browserify'),
            stream: require.resolve('stream-browserify'),
        },
    }
};
