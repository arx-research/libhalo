import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    entry: {
        entry_cli: './src.ts/entry_cli.js',
        entry_bridge: './src.ts/entry_bridge.js',
        entry_gateway: './src.ts/entry_gateway.js',
    },
    output: {
        filename: '[name].bundle.js',
        path: resolve(__dirname, 'dist_webpack')
    },
    mode: 'production',
    target: 'node',
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
            chokidar: false,
            "utf-8-validate": false
        }
    },
    optimization: {
        minimize: false
    }
};
