const Web3Utils = require('web3-utils');
const EXOStorage = artifacts.require("EXOStorage");
const EXOUpgrade = artifacts.require("EXOUpgrade");
const EXORole = artifacts.require("EXORole");
const EXOToken = artifacts.require("EXOToken");

module.exports = async function(deployer) {
  return deployer.deploy(EXOStorage).then(async () => {
    await deployer.deploy(EXOUpgrade, EXOStorage.address);
    await deployer.deploy(EXORole, EXOStorage.address);
    await deployer.deploy(
      EXOToken,
      EXOStorage.address,
      100000000, // total supply
      50000000, // minimum balance for stake reward
      10000000, // locked treasury fund
      5000000, // locked pre-sale fund
      1209600, // pre-sale duration
      2419200, // ICO duration
      25000000, // available ICO fund
      3650, // minimum ICO tokens bought every purchase (1 ETH)
      18250, // maximum ICO tokens bought for all purchases (5 ETH)
      10, // airdrop amount
      {gas: 7000000}
    );

    return EXOStorage.deployed().then(async exoStorage => {
      // Register all contracts to EXOStorage in two different ways:
      // 1. address => address -- allow us to validate it only with its address
      // 2. name => address -- allow us to know its address by name

      // Register EXOUpgrade contract.
      await exoStorage.setAddress(
        Web3Utils.soliditySha3('contract.address', EXOUpgrade.address),
        EXOUpgrade.address
      );
      await exoStorage.setAddress(
        Web3Utils.soliditySha3('contract.name', 'EXOUpgrade'),
        EXOUpgrade.address
      );

      // Register EXORole contract.
      await exoStorage.setAddress(
        Web3Utils.soliditySha3('contract.address', EXORole.address),
        EXORole.address
      );
      await exoStorage.setAddress(
        Web3Utils.soliditySha3('contract.name', 'EXORole'),
        EXORole.address
      );

      // Register EXOToken contract.
      await exoStorage.setAddress(
        Web3Utils.soliditySha3('contract.address', EXOToken.address),
        EXOToken.address
      );
      await exoStorage.setAddress(
        Web3Utils.soliditySha3('contract.name', 'EXOToken'),
        EXOToken.address
      );

      // Disable direct access by owner to EXOStorage after initialization.
      await exoStorage.setBool(
        Web3Utils.soliditySha3('contract.storage.initialized'),
        true
      );
      return deployer;
    });
  });
};
