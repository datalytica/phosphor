var path = require('path');

module.exports = {
  entry: './lib/index.js',
  output: {
    path: __dirname + '/dist/',
    filename: 'databrowser.js',
    publicPath: './dist/'
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.(png|svg)$/, use: 'url-loader?limit=100000' }
    ]
  },
  //devtool: 'eval-source-map',
  resolve: {
    alias: {
      typedfastbitset$: path.resolve(__dirname, "src/typedfastbitset.js"),
    }
  }
};
