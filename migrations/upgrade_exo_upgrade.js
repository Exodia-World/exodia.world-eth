const EXOStorage = artifacts.require('EXOStorage');
const EXOUpgrade = artifacts.require('EXOUpgrade');

module.exports = function (callback) {
  EXOUpgrade.new(EXOStorage.address).then(async _exoUpgrade => {
    const exoUpgrade = await EXOUpgrade.deployed();
    exoUpgrade.upgradeContract('EXOUpgrade', _exoUpgrade.address, false)
      .then(result => {
        if (parseInt(result.receipt.status, 16) === 1) {
          console.log('EXOUpgrade upgrade - SUCCESS');
          callback();
        } else {
          callback(new Error('EXOUpgrade upgrade - FAIL'));
        }
      });
  });
};
