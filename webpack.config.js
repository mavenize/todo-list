const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.js',
    output: {
      filename: isProduction ? 'main.[contenthash].js' : 'main.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    devServer: {
      static: './dist',
      watchFiles: ['src/template.html'],
      open: false,
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/template.html',
      }),
    ],
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|woff2?)$/i,
          type: 'asset/resource',
        },
      ],
    },
  };
};
