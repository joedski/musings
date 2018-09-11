const path = require('path');

const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    main: path.resolve(__dirname, 'src', 'index.js'),
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    // default?
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        // Apparently there seem to be errors using the ExtractTextPlugin with Webpack 4,
        // but according to this blog post:
        //   https://hackernoon.com/a-tale-of-webpack-4-and-how-to-finally-configure-it-in-the-right-way-4e94c8e7e5c1
        // you can still use it precisely like so.
        // I may still replace it with MiniCssExtractPlugin, though.
        // Maybe along side optimize-css-assets-webpack-plugin like in this?
        //   https://medium.com/@timurcatakli/an-easy-to-understand-webpack-4-configuration-file-with-comments-6213882e9edf
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader'],
        }),
      },
    ],
  },
  plugins: [
    new ExtractTextPlugin({
      filename: 'style.css',
    }),
    new HtmlPlugin({
      inject: false,
      hash: true,
      template: './src/index.html',
      filename: 'index.html',
    }),
  ],
  devServer: {
    contentBase: path.resolve(__dirname, 'dist'),
  },
}
