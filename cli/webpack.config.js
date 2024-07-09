import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    entry: {
        entry_cli: './entry_cli.js',
        entry_bridge: './entry_bridge.js',
        entry_gateway: './entry_gateway.js',
    },
    output: {
        filename: '[name].bundle.js',
        path: resolve(__dirname, 'dist_webpack')
    },
    mode: 'production',
    target: 'node',
    resolve: {
        fallback: {
            vm: false
        }
    },
    optimization: {
        minimize: false
    }
};
