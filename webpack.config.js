const path = require("path");

module.exports = {
    entry: "./src/static/Handler.js",
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    },
    output: {
        filename: "classes.js",
        path: path.resolve(__dirname, "build/static")
    }
};