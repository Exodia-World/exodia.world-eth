const EXOStorage = artifacts.require('EXOStorage');
const EXOUpgrade = artifacts.require('EXOUpgrade');
const upgradeHelper = require('./upgrade.js');
let network;

module.exports = function (callback) {
  web3.version.getNetwork((err, networkId) => {
    if (err) {
      callback(err);
      return;
    }
    network = upgradeHelper.getNetworkName(networkId);

    const contracts = upgradeHelper.loadContracts();
    let exoStorageAddress, exoUpgradeAddress;
    if (network === 'rinkeby') {
      exoStorageAddress = contracts.rinkeby.EXOStorage;
      exoUpgradeAddress = contracts.rinkeby.EXOUpgrade;
    } else {
      exoStorageAddress = EXOStorage.address;
      exoUpgradeAddress = EXOUpgrade.address;
    }
    if (! exoStorageAddress || ! exoUpgradeAddress) {
      callback(new Error('Required contract addresses not found'));
    }

    EXOUpgrade.new(exoStorageAddress).then(async _exoUpgrade => {
      const exoUpgrade = EXOUpgrade.at(exoUpgradeAddress);
      exoUpgrade.upgradeContract('EXOUpgrade', _exoUpgrade.address, false)
        .then(result => {
          if (parseInt(result.receipt.status, 16) === 1) {
            console.log('EXOUpgrade upgrade - SUCCESS');
            console.log('Transaction', result.receipt.transactionHash);
            console.log('Contract lives at', _exoUpgrade.address);

            contracts[network].EXOUpgrade = _exoUpgrade.address;
            upgradeHelper.saveContracts(contracts);

            callback();
          } else {
            callback(new Error('Upgrade failed at transaction '+result.receipt.transactionHash));
          }
        });
    });
  });
};
