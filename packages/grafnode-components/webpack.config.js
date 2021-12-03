const path = require('path');

module.exports = {
  entry: "./src/index.js",
  output: {
    globalObject: 'this',
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "umd",
    library: "@grafnode/components"
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  externals: {
    'react': 'react',
    'styled-components': 'styled-components',
    '@tabler/icon': '@tabler/icon',
    '@fortawesome/free-solid-svg-icons': '@fortawesome/free-solid-svg-icons',
    '@fortawesome/react-fontawesome': '@fortawesome/react-fontawesome',
    'classnames': 'classnames'
  }
};