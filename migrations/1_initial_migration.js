var Migrations = artifacts.require("./Migrations.sol");
var migrationHelper = require('./migration_helper.js');

module.exports = function(deployer) {
  return deployer.deploy(Migrations).then(() => {
    // Record Migrations address.
    web3.version.getNetwork((err, networkId) => {
      const network = migrationHelper.getNetworkName(networkId);

      const contracts = migrationHelper.loadContracts(network);
      contracts.Migrations = Migrations.address;
      migrationHelper.saveContracts(contracts, network);
    });
  });
};
