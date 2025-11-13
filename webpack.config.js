//@ts-check
'use strict';

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
    target: 'node',
    mode: 'none',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2'
    },
    externals: {
        vscode: 'commonjs vscode'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'node_modules/@ruffle-rs/ruffle',
                    to: 'ruffle',
                    globOptions: {
                        ignore: ['**/package.json', '**/README.md', '**/LICENSE*']
                    }
                }
            ]
        })
    ],
    devtool: 'nosources-source-map',
    infrastructureLogging: {
        level: 'log'
    }
};

module.exports = [extensionConfig];
