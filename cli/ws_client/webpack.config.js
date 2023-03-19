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
};
