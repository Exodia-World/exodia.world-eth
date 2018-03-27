const EXOStorage = artifacts.require('EXOStorage');
const EXOUpgrade = artifacts.require('EXOUpgrade');
const EXORole = artifacts.require('EXORole');

module.exports = function (callback) {
  EXORole.new(EXOStorage.address).then(async exoRole => {
    const exoUpgrade = await EXOUpgrade.deployed();
    exoUpgrade.upgradeContract('EXORole', exoRole.address, false)
      .then(result => {
        if (parseInt(result.receipt.status, 16) === 1) {
          console.log('EXORole upgrade - SUCCESS');
          console.log('Transaction', result.receipt.transactionHash);
          console.log('Contract lives at', exoRole.address);
          callback();
        } else {
          console.log('EXORole upgrade - FAIL');
          console.log('Transaction', result.receipt.transactionHash);
          callback(new Error());
        }
      });
  });
};
