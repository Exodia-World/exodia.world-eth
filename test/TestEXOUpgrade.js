const BN = require('bn.js');
const Web3Utils = require('web3-utils');
const EXOStorage = artifacts.require('EXOStorage');
const EXORole = artifacts.require('EXORole');
const EXOUpgrade = artifacts.require('EXOUpgrade');
const EXOToken = artifacts.require('EXOToken');
var exoStorage, exoToken;

const newEXOToken = (_value = 0) => {
  return EXOToken.new(
    exoStorage.address,
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
      gas: 7000000,
      value: _value
    }
  );
};

const newEXOUpgrade = (registerEXOToken = true, tokenBalance = 0) => {
  return EXOStorage.new().then(_exoStorage => {
    exoStorage = _exoStorage;
    return EXOUpgrade.new(exoStorage.address).then(exoUpgrade => {
      return EXORole.new(exoStorage.address).then(exoRole => {
        return newEXOToken(tokenBalance).then(async _exoToken => {
          exoToken = _exoToken;
          // Register EXOUpgrade contract.
          await exoStorage.setAddress(
            Web3Utils.soliditySha3('contract.address', exoUpgrade.address),
            exoUpgrade.address
          );
          await exoStorage.setAddress(
            Web3Utils.soliditySha3('contract.name', 'EXOUpgrade'),
            exoUpgrade.address
          );

          // Register EXORole contract.
          await exoStorage.setAddress(
            Web3Utils.soliditySha3('contract.address', exoRole.address),
            exoRole.address
          );
          await exoStorage.setAddress(
            Web3Utils.soliditySha3('contract.name', 'EXORole'),
            exoRole.address
          );

          if (registerEXOToken) {
            // Register EXOToken contract.
            await exoStorage.setAddress(
              Web3Utils.soliditySha3('contract.address', exoToken.address),
              exoToken.address
            );
            await exoStorage.setAddress(
              Web3Utils.soliditySha3('contract.name', 'EXOToken'),
              exoToken.address
            );
          }

          await exoStorage.setBool(
            Web3Utils.soliditySha3('contract.storage.initialized'),
            true
          );
          return exoUpgrade;
        });
      });
    });
  });
};

contract('EXOUpgrade', accounts => {
  const addressZero = '0x0000000000000000000000000000000000000000';
  const owner = accounts[0];

  it('should upgrade old contract to a new one if owner requests it', () => {
    return newEXOUpgrade().then(exoUpgrade => {
      return newEXOToken().then(_exoToken => {
        exoUpgrade.upgradeContract('EXOToken', _exoToken.address, false)
          .then(async result => {
            assert.equal(parseInt(result.receipt.status, 16), 1, 'The upgrade should complete');

            const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
            const expectedEvents = {};

            for (let i = 0; i < result.logs.length; i++) {
              const log = result.logs[i];
              if (log.event === 'ContractUpgraded') {
                assert.equal(log.args.oldContractAddress, exoToken.address, 'The published old contract should be correct');
                assert.equal(log.args.newContractAddress, _exoToken.address, 'The published new contract should be correct');
                // NOTE: Sometimes the block timestamp isn't as expected, but it's a test-specific issue.
                if (! log.args.createdAt.eq(new BN(now))) {
                  console.log('BLOCK TIMESTAMP INCONSISTENCY', log.args.createdAt.valueOf(), now);
                }
                const diff = log.args.createdAt.sub(new BN(now)).toNumber();
                assert(diff === -1 || diff === 0, 'The published created time should be equal to current block time');
                expectedEvents['ContractUpgraded'] = true;
              }
            }
            assert(expectedEvents['ContractUpgraded'], 'ContractUpgraded event should be published');

            const updatedContractNameAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.name', 'EXOToken'));
            const updatedNewContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', _exoToken.address));
            const updatedOldContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', exoToken.address));
            assert.equal(updatedContractNameAddress, _exoToken.address, 'sha3(contract.name, EXOToken) should have correct value');
            assert.equal(updatedNewContractAddress, _exoToken.address, 'sha3(contract.address, _exoToken.address) should have correct value');
            assert.equal(updatedOldContractAddress, addressZero, 'sha3(contract.address, exoToken.address) should have correct value');
          });
      });
    });
  });

  it('should NOT upgrade old contract to a new one if non-owner requests it', () => {
    return newEXOUpgrade().then(exoUpgrade => {
      return newEXOToken().then(_exoToken => {
        exoUpgrade.upgradeContract('EXOToken', _exoToken.address, false, {from: accounts[3]})
          .then(async result => {
            assert.equal(parseInt(result.receipt.status, 16), 0, 'The upgrade should fail');

            const updatedContractNameAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.name', 'EXOToken'));
            const updatedNewContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', _exoToken.address));
            const updatedOldContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', exoToken.address));
            assert.equal(updatedContractNameAddress, exoToken.address, 'sha3(contract.name, EXOToken) should have correct value');
            assert.equal(updatedNewContractAddress, addressZero, 'sha3(contract.address, _exoToken.address) should have correct value');
            assert.equal(updatedOldContractAddress, exoToken.address, 'sha3(contract.address, exoToken.address) should have correct value');
          });
      });
    });
  });

  it('should upgrade old contract to a new one if old contract has ether in it and forceEther flag is set', () => {
    return newEXOUpgrade(true, 1).then(exoUpgrade => {
      return newEXOToken().then(_exoToken => {
        exoUpgrade.upgradeContract('EXOToken', _exoToken.address, true)
          .then(async result => {
            assert.equal(parseInt(result.receipt.status, 16), 1, 'The upgrade should complete');

            const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
            const expectedEvents = {};

            for (let i = 0; i < result.logs.length; i++) {
              const log = result.logs[i];
              if (log.event === 'ContractUpgraded') {
                assert.equal(log.args.oldContractAddress, exoToken.address, 'The published old contract should be correct');
                assert.equal(log.args.newContractAddress, _exoToken.address, 'The published new contract should be correct');
                // NOTE: Sometimes the block timestamp isn't as expected, but it's a test-specific issue.
                if (! log.args.createdAt.eq(new BN(now))) {
                  console.log('BLOCK TIMESTAMP INCONSISTENCY', log.args.createdAt.valueOf(), now);
                }
                const diff = log.args.createdAt.sub(new BN(now)).toNumber();
                assert(diff === -1 || diff === 0, 'The published created time should be equal to current block time');
                expectedEvents['ContractUpgraded'] = true;
              }
            }
            assert(expectedEvents['ContractUpgraded'], 'ContractUpgraded event should be published');

            const updatedContractNameAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.name', 'EXOToken'));
            const updatedNewContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', _exoToken.address));
            const updatedOldContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', exoToken.address));
            assert.equal(updatedContractNameAddress, _exoToken.address, 'sha3(contract.name, EXOToken) should have correct value');
            assert.equal(updatedNewContractAddress, _exoToken.address, 'sha3(contract.address, _exoToken.address) should have correct value');
            assert.equal(updatedOldContractAddress, addressZero, 'sha3(contract.address, exoToken.address) should have correct value');
          });
      });
    });
  });

  it('should NOT upgrade old contract to a new one if old contract has ether in it and forceEther flag is NOT set', () => {
    return newEXOUpgrade(true, 1).then(exoUpgrade => {
      return newEXOToken().then(_exoToken => {
        exoUpgrade.upgradeContract('EXOToken', _exoToken.address, false)
          .then(async result => {
            assert.equal(parseInt(result.receipt.status, 16), 0, 'The upgrade should fail');

            const updatedContractNameAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.name', 'EXOToken'));
            const updatedNewContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', _exoToken.address));
            const updatedOldContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', exoToken.address));
            assert.equal(updatedContractNameAddress, exoToken.address, 'sha3(contract.name, EXOToken) should have correct value');
            assert.equal(updatedNewContractAddress, addressZero, 'sha3(contract.address, _exoToken.address) should have correct value');
            assert.equal(updatedOldContractAddress, exoToken.address, 'sha3(contract.address, exoToken.address) should have correct value');
          });
      });
    });
  });

  it('should NOT upgrade old contract to a new one if old contract has address 0x0', () => {
    // Deploy contracts but do not register EXOToken to eternal storage.
    return newEXOUpgrade(false).then(exoUpgrade => {
      return newEXOToken().then(_exoToken => {
        exoUpgrade.upgradeContract('EXOToken', _exoToken.address, false)
          .then(async result => {
            assert.equal(parseInt(result.receipt.status, 16), 0, 'The upgrade should fail');

            const updatedContractNameAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.name', 'EXOToken'));
            const updatedNewContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', _exoToken.address));
            assert.equal(updatedContractNameAddress, addressZero, 'sha3(contract.name, EXOToken) should have correct value');
            assert.equal(updatedNewContractAddress, addressZero, 'sha3(contract.address, _exoToken.address) should have correct value');
          });
      });
    });
  });

  it('should NOT upgrade old contract to a new one if new contract has address 0x0', () => {
    return newEXOUpgrade().then(exoUpgrade => {
      return newEXOToken().then(() => {
        exoUpgrade.upgradeContract('EXOToken', addressZero, false)
          .then(async result => {
            assert.equal(parseInt(result.receipt.status, 16), 0, 'The upgrade should fail');

            const updatedContractNameAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.name', 'EXOToken'));
            const updatedNewContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', addressZero));
            assert.equal(updatedContractNameAddress, exoToken.address, 'sha3(contract.name, EXOToken) should have correct value');
            assert.equal(updatedNewContractAddress, addressZero, 'sha3(contract.address, 0x0) should have correct value');
          });
      });
    });
  });
});
