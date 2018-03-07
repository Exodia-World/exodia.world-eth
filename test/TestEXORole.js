const EXOStorage = artifacts.require('EXOStorage');
const EXORole = artifacts.require('EXORole');

contract('EXORole', accounts => {
  const owner = accounts[0];

  it('should transfer ownership to a new address if owner requests it', () => {
    return EXORole.deployed().then(async exoRole => {
      const exoStorage = await EXOStorage.deployed();
      const newOwner = accounts[3];
      const isOwner = exoStorage.getBool.call(web3.sha3('access.role', 'owner', owner));
      assert(isOwner, 'Owner address should be correct');

      exoRole.transferOwnership(newOwner)
        .then(result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The transfer should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'OwnershipTransferred') {
              assert.equal(log.args.previousOwner, owner, 'The published previous owner should be correct');
              assert.equal(log.args.newOwner, newOwner, 'The published new owner should be correct');
            }
          }

          const isOldAddressOwner = exoStorage.getBool.call(web3.sha3('access.role', 'owner', owner));
          const isNewAddressOwner = exoStorage.getBool.call(web3.sha3('access.role', 'owner', newOwner));
          assert(! isOldAddressOwner, 'The old address should not be the owner anymore');
          assert(isNewAddressOwner, 'The new address should be the owner');
        });
    });
  });

  // it('should NOT transfer ownership to a new address if a non-owner requests it', () => {});
  // it('should NOT transfer ownership to a new address if the new address equals ZERO', () => {});
  // it('should transfer role access to a new address if a super user requests it', () => {});
  // it('should NOT transfer role access to a new address if a non-super-user requests it', () => {});
  // it('should NOT transfer role access to a new address if the new address equals ZERO', () => {});
  // it('should NOT transfer role access to a new address if role is owner', () => {});
  // it('should NOT transfer role access to a new address if the old address has owner role', () => {});
  // it('should add role access to a new address if a super user requests it', () => {});
  // it('should NOT add role access to a new address if a non-super-user requests it', () => {});
  // it('should NOT add role access to a new address if the new address equals ZERO', () => {});
  // it('should NOT add role access to a new address if role is owner', () => {});
  // it('should remove role access of an address if a super user requests it', () => {});
  // it('should NOT remove role access of an address if a non-super-user requests it', () => {});
  // it('should NOT remove role access of an address if the address has owner role', () => {});
});
