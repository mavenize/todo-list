// Used by Jest (babel-jest) to run ES module source in Node.
// webpack bundles the browser code natively and does not use Babel.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
