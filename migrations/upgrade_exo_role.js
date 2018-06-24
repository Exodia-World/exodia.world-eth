const EXOStorage = artifacts.require('EXOStorage');
const EXOUpgrade = artifacts.require('EXOUpgrade');
const EXORole = artifacts.require('EXORole');
const migrationHelper = require('./migration_helper.js');
let network;

module.exports = function (callback) {
  web3.version.getNetwork((err, networkId) => {
    if (err) {
      callback(err);
      return;
    }
    network = migrationHelper.getNetworkName(networkId);

    const contracts = migrationHelper.loadContracts(network);
    let exoStorageAddress, exoUpgradeAddress;
    if (network === 'development') {
      exoStorageAddress = EXOStorage.address;
      exoUpgradeAddress = EXOUpgrade.address;
    } else {
      exoStorageAddress = contracts.EXOStorage;
      exoUpgradeAddress = contracts.EXOUpgrade;
    }
    if (! exoStorageAddress || ! exoUpgradeAddress) {
      callback(new Error('Required contract addresses not found'));
    }

    EXORole.new(exoStorageAddress).then(async exoRole => {
      const exoUpgrade = EXOUpgrade.at(exoUpgradeAddress);
      exoUpgrade.upgradeContract('EXORole', exoRole.address, false)
        .then(result => {
          if (parseInt(result.receipt.status, 16) === 1) {
            console.log('EXORole upgrade - SUCCESS');
            console.log('Transaction', result.receipt.transactionHash);
            console.log('Contract lives at', exoRole.address);

            contracts.EXORole = exoRole.address;
            migrationHelper.saveContracts(contracts, network);

            callback();
          } else {
            callback(new Error('Upgrade failed at transaction '+result.receipt.transactionHash));
          }
        });
    });
  });
};
