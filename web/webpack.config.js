import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import fs from 'fs';
import webpack from "webpack";
import path from "path";

export default {
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
            vm: false,
            buffer: path.resolve(__dirname, '../node_modules/buffer/index.js'),
            crypto: path.resolve(__dirname, '../node_modules/crypto-browserify'),
            stream: path.resolve(__dirname, '../node_modules/stream-browserify'),
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
        },
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser.js',
        })
    ]
};
