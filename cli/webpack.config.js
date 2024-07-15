import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    entry: {
        entry_cli: './src.ts/entry_cli.ts',
        entry_bridge: './src.ts/entry_bridge.ts',
        entry_gateway: './src.ts/entry_gateway.ts',
    },
    output: {
        filename: '[name].bundle.cjs',
        path: resolve(__dirname, 'dist_webpack')
    },
    mode: 'production',
    target: 'node',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        extensionAlias: {
            '.js': ['.js', '.ts'],
        },
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
