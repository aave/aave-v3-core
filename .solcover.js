const accounts = require(`./test-wallets.js`).accounts;
const cp = require('child_process');

module.exports = {
  client: require('ganache-cli'),
  skipFiles: ['./mocks', './interfaces', './dependencies'],
  mocha: {
    enableTimeouts: false,
  },
  providerOptions: {
    accounts,
  },
  onCompileComplete: function () {
    cp.execSync('. ./setup-test-env.sh');
  },
};
