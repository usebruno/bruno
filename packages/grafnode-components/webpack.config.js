const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: "./src/index.js",
  output: {
    publicPath: '',
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
      },
      {
        test: /\.css$/,
        use: [ MiniCssExtractPlugin.loader, 'css-loader' ]
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      }
    ]
  },
  externals: {
    'react': 'react',
    'lodash': 'lodash',
    'styled-components': 'styled-components',
    '@tippyjs/react': '@tippyjs/react',
    '@tabler/icons': '@tabler/icons',
    '@fortawesome/free-solid-svg-icons': '@fortawesome/free-solid-svg-icons',
    '@fortawesome/react-fontawesome': '@fortawesome/react-fontawesome',
    'classnames': 'classnames',
    'react-tabs': 'react-tabs',
    'codemirror': 'codemirror',
    'graphql': 'graphql',
    'escape-html': 'escape-html',
    'formik': 'formik',
    'markdown-it': 'markdown-it',
    'nanoid': 'nanoid',
    'graphql-request': 'graphql-request',
    'yup': 'yup'
  },
  plugins: [
    new MiniCssExtractPlugin()
  ]
};