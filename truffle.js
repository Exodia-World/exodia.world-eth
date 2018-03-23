var HDWalletProvider = require('truffle-hdwallet-provider');

// Do NOT use the same mnemonic for mainnet accounts.
var testNetAccountMnemonic = 'decorate history baby ostrich middle battle verify east grunt body clean various';

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(testNetAccountMnemonic, 'https://rinkeby.infura.io/RBI9AwKu0qhsYeHXcqqr');
      },
      network_id: 4,
      gas: 8000000
    }
  }
};
