const Web3Utils = require('web3-utils');
const EXOStorage = artifacts.require('EXOStorage');
const EXORole = artifacts.require('EXORole');
var exoStorage;

const newEXORole = () => {
  return EXOStorage.new().then(_exoStorage => {
    exoStorage = _exoStorage;
    return EXORole.new(exoStorage.address).then(async exoRole => {
      // Register EXORole contract.
      await exoStorage.setAddress(
        Web3Utils.soliditySha3('contract.address', exoRole.address),
        exoRole.address
      );
      await exoStorage.setAddress(
        Web3Utils.soliditySha3('contract.name', 'EXORole'),
        exoRole.address
      );
      // Disable direct access by owner to EXOStorage after initialization.
      await exoStorage.setBool(
        Web3Utils.soliditySha3('contract.storage.initialized'),
        true
      );
      return exoRole;
    });
  });
};

contract('EXORole', accounts => {
  const owner = accounts[0];
  const admin = accounts[1];

  it('should transfer ownership to a new address if owner requests it', () => {
    return newEXORole().then(async exoRole => {
      const newOwner = accounts[3];
      const isOwner = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', owner));
      assert(isOwner, 'Owner address should be correct');

      exoRole.transferOwnership(newOwner)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The transfer should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'OwnershipTransferred') {
              assert.equal(log.args.previousOwner, owner, 'The published previous owner should be correct');
              assert.equal(log.args.newOwner, newOwner, 'The published new owner should be correct');
            }
          }

          const isOldAddressOwner = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', owner));
          const isNewAddressOwner = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', newOwner));
          assert(! isOldAddressOwner, 'The old address should not be the owner anymore');
          assert(isNewAddressOwner, 'The new address should be the owner');
        });
    });
  });

  it('should NOT transfer ownership to a new address if a non-owner requests it', () => {
    return newEXORole().then(async exoRole => {
      const newOwner = accounts[3];
      const isOwner = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', owner));
      assert(isOwner, 'Owner address should be correct');

      exoRole.transferOwnership(newOwner, {from: accounts[5]})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const isOldAddressOwner = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', owner));
          const isNewAddressOwner = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', newOwner));
          assert(isOldAddressOwner, 'The old address should still be the owner');
          assert(! isNewAddressOwner, 'The new address should NOT be the owner');
        });
    });
  });

  it('should NOT transfer ownership to a new address if the new address equals ZERO', () => {
    return newEXORole().then(async exoRole => {
      const newOwner = '0x0000000000000000000000000000000000000000';
      const isOwner = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', owner));
      assert(isOwner, 'Owner address should be correct');

      exoRole.transferOwnership(newOwner)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const isOldAddressOwner = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', owner));
          const isNewAddressOwner = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', newOwner));
          assert(isOldAddressOwner, 'The old address should still be the owner');
          assert(! isNewAddressOwner, 'The new address should NOT be the owner');
        });
    });
  });

  it('should transfer role access to a new address if a super user requests it', () => {
    return newEXORole().then(async exoRole => {
      const oldAddress = accounts[4];
      const newAddress = accounts[3];
      await exoRole.roleAdd('admin', admin);
      await exoRole.roleAdd('basic', oldAddress, {from: admin});

      exoRole.roleTransfer('basic', oldAddress, newAddress, {from: admin})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The transfer should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'RoleRemoved') {
              assert.equal(log.args.roleName, 'basic', 'The published role should be correct');
              assert.equal(log.args.account, oldAddress, 'The published removed account should be correct');
          } else if (log.event === 'RoleAdded') {
              assert.equal(log.args.roleName, 'basic', 'The published role should be correct');
              assert.equal(log.args.account, newAddress, 'The published added account should be correct');
            }
          }

          const oldAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', oldAddress));
          const newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
          assert(! oldAddressHasRole, 'The old address should not have the role anymore');
          assert(newAddressHasRole, 'The new address should have the role');
        });
    });
  });

  it('should NOT transfer role access to a new address if a non-super-user requests it', () => {
    return newEXORole().then(async exoRole => {
      const oldAddress = accounts[4];
      const newAddress = accounts[3];
      await exoRole.roleAdd('admin', admin);
      await exoRole.roleAdd('basic', oldAddress, {from: admin});

      exoRole.roleTransfer('basic', oldAddress, newAddress, {from: accounts[5]})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const oldAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', oldAddress));
          const newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
          assert(oldAddressHasRole, 'The old address should still have the role');
          assert(! newAddressHasRole, 'The new address should not have the role');
        });
    });
  });

  it('should NOT transfer role access to a new address if the new address equals ZERO', () => {
    return newEXORole().then(async exoRole => {
      const oldAddress = accounts[4];
      const newAddress = '0x0000000000000000000000000000000000000000';
      await exoRole.roleAdd('admin', admin);
      await exoRole.roleAdd('basic', oldAddress, {from: admin});

      exoRole.roleTransfer('basic', oldAddress, newAddress, {from: admin})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const oldAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', oldAddress));
          const newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
          assert(oldAddressHasRole, 'The old address should still have the role');
          assert(! newAddressHasRole, 'The new address should not have the role');
        });
    });
  });

  it('should NOT transfer role access to a new address if role is owner', () => {
    return newEXORole().then(async exoRole => {
      const newAddress = accounts[3];
      await exoRole.roleAdd('admin', admin);

      exoRole.roleTransfer('owner', owner, newAddress, {from: admin})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const oldAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', owner));
          const newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', newAddress));
          assert(oldAddressHasRole, 'The old address should still have the role');
          assert(! newAddressHasRole, 'The new address should not have the role');
        });
    });
  });

  it('should NOT transfer role access to a new address if the old address has owner role', () => {
    return newEXORole().then(async exoRole => {
      const oldAddress = owner;
      const newAddress = accounts[3];
      await exoRole.roleAdd('admin', admin);
      await exoRole.roleAdd('basic', oldAddress, {from: admin});

      exoRole.roleTransfer('basic', oldAddress, newAddress, {from: admin})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const oldAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', oldAddress));
          const newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
          assert(oldAddressHasRole, 'The old address should still have the role');
          assert(! newAddressHasRole, 'The new address should not have the role');
        });
    });
  });

  it('should add role access to a new address if a super user requests it', () => {
    return newEXORole().then(async exoRole => {
      const newAddress = accounts[3];
      await exoRole.roleAdd('admin', admin);

      let newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
      assert(! newAddressHasRole, 'The new address should not yet have the role');

      exoRole.roleAdd('basic', newAddress, {from: admin})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The addition should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'RoleAdded') {
              assert.equal(log.args.roleName, 'basic', 'The published role should be correct');
              assert.equal(log.args.account, newAddress, 'The published added account should be correct');
            }
          }

          newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
          assert(newAddressHasRole, 'The new address should have the role');
        });
    });
  });

  it('should NOT add role access to a new address if a non-super-user requests it', () => {
    return newEXORole().then(async exoRole => {
      const newAddress = accounts[3];
      await exoRole.roleAdd('admin', admin);

      let newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
      assert(! newAddressHasRole, 'The new address should not yet have the role');

      exoRole.roleAdd('basic', newAddress, {from: accounts[5]})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The addition should fail');

          newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
          assert(! newAddressHasRole, 'The new address should still not have the role');
        });
    });
  });

  it('should NOT add role access to a new address if the new address equals ZERO', () => {
    return newEXORole().then(async exoRole => {
      const newAddress = '0x0000000000000000000000000000000000000000';
      await exoRole.roleAdd('admin', admin);

      let newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
      assert(! newAddressHasRole, 'The new address should not yet have the role');

      exoRole.roleAdd('basic', newAddress, {from: admin})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The addition should fail');

          newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
          assert(! newAddressHasRole, 'The new address should still not have the role');
        });
    });
  });

  it('should NOT add role access to a new address if role is owner', () => {
    return newEXORole().then(async exoRole => {
      const newAddress = accounts[3];
      await exoRole.roleAdd('admin', admin);

      let newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', newAddress));
      assert(! newAddressHasRole, 'The new address should not yet have the role');

      exoRole.roleAdd('owner', newAddress, {from: admin})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The addition should fail');

          newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'owner', newAddress));
          assert(! newAddressHasRole, 'The new address should still not have the role');
        });
    });
  });

  it('should NOT add "frozen" role access to a new address if the new address is owner', () => {
    return newEXORole().then(async exoRole => {
      const newAddress = owner;
      await exoRole.roleAdd('admin', admin);

      let newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'frozen', newAddress));
      assert(! newAddressHasRole, 'The new address should not yet have the role');

      exoRole.roleAdd('frozen', newAddress, {from: admin})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The addition should fail');

          newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'frozen', newAddress));
          assert(! newAddressHasRole, 'The new address should still not have the role');
        });
    });
  });

  it('should remove role access of an address if a super user requests it', () => {
    return newEXORole().then(async exoRole => {
      const newAddress = accounts[3];
      await exoRole.roleAdd('admin', admin);
      await exoRole.roleAdd('basic', newAddress);

      let newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
      assert(newAddressHasRole, 'The new address should have the role');

      exoRole.roleRemove('basic', newAddress, {from: admin})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The removal should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'RoleRemoved') {
              assert.equal(log.args.roleName, 'basic', 'The published role should be correct');
              assert.equal(log.args.account, newAddress, 'The published removed account should be correct');
            }
          }

          newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
          assert(! newAddressHasRole, 'The new address should not have the role anymore');
        });
    });
  });

  it('should NOT remove role access of an address if a non-super-user requests it', () => {
    return newEXORole().then(async exoRole => {
      const newAddress = accounts[3];
      await exoRole.roleAdd('admin', admin);
      await exoRole.roleAdd('basic', newAddress);

      let newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
      assert(newAddressHasRole, 'The new address should have the role');

      exoRole.roleRemove('basic', newAddress, {from: accounts[5]})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The removal should fail');

          newAddressHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', newAddress));
          assert(newAddressHasRole, 'The new address should still have the role');
        });
    });
  });

  it('should NOT remove role access of an address if the address has owner role', () => {
    return newEXORole().then(async exoRole => {
      await exoRole.roleAdd('admin', admin);
      await exoRole.roleAdd('basic', owner);

      let ownerHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', owner));
      assert(ownerHasRole, 'The owner should have the role');

      exoRole.roleRemove('basic', owner, {from: admin})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The removal should fail');

          ownerHasRole = await exoStorage.getBool.call(Web3Utils.soliditySha3('access.role', 'basic', owner));
          assert(ownerHasRole, 'The owner should still have the role');
        });
    });
  });
});
