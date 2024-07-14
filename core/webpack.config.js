import fs from 'node:fs';

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import webpack from "webpack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    entry: {
        app: './src.ts/web/weblib.js',
    },
    output: {
        filename: 'libhalo.js',
        path: resolve(__dirname, 'dist')
    },
    mode: 'production',
    target: 'web',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            vm: false,
            buffer: resolve(__dirname, './node_modules/buffer/index.js'),
            crypto: resolve(__dirname, './node_modules/crypto-browserify'),
            stream: resolve(__dirname, './node_modules/stream-browserify')
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
