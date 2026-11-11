module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'src/js/models/**/*.js',
    'src/js/core/**/*.js',
    'src/js/storage/**/*.js',
    'src/js/utils/**/*.js',
  ],
};
