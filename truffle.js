const HDWalletProvider = require('truffle-hdwallet-provider');

// Do NOT use the same mnemonic for mainnet accounts.
const testNetAccountMnemonic = 'decorate history baby ostrich middle battle verify east grunt body clean various';
const eth = require('./eth.json');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(testNetAccountMnemonic, eth.INFURA_ADDRESS);
      },
      network_id: 4,
      gas: 7000000
    }
  }
};
