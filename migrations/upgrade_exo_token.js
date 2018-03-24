const EXOStorage = artifacts.require('EXOStorage');
const EXOUpgrade = artifacts.require('EXOUpgrade');
const EXOToken = artifacts.require('EXOToken');

module.exports = function (callback) {
  EXOToken.new(
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
    {
      gas: 7000000
    }
  ).then(async exoToken => {
    const exoUpgrade = await EXOUpgrade.deployed();
    exoUpgrade.upgradeContract('EXOToken', exoToken.address, false)
      .then(result => {
        if (parseInt(result.receipt.status, 16) === 1) {
          console.log('EXOToken upgrade - SUCCESS');
          callback();
        } else {
          callback(new Error('EXOToken upgrade - FAIL'));
        }
      });
  });
};
