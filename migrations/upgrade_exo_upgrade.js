const EXOStorage = artifacts.require('EXOStorage');
const EXOUpgrade = artifacts.require('EXOUpgrade');

module.exports = function (callback) {
  EXOUpgrade.new(EXOStorage.address).then(async _exoUpgrade => {
    const exoUpgrade = await EXOUpgrade.deployed();
    exoUpgrade.upgradeContract('EXOUpgrade', _exoUpgrade.address, false)
      .then(result => {
        if (parseInt(result.receipt.status, 16) === 1) {
          console.log('EXOUpgrade upgrade - SUCCESS');
          console.log('Transaction', result.receipt.transactionHash);
          console.log('Contract lives at', _exoUpgrade.address);
          callback();
        } else {
          console.log('EXOUpgrade upgrade - FAIL');
          console.log('Transaction', result.receipt.transactionHash);
          callback(new Error());
        }
      });
  });
};
