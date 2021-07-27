const accounts = require(`./test-wallets.js`).accounts;

module.exports = {
  client: require('ganache-cli'),
  skipFiles: ['./mocks', './interfaces'],
  mocha: {
    enableTimeouts: false,
  },
  providerOptions: {
    accounts,
  },
};
