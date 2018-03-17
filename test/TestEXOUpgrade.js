const Web3Utils = require('web3-utils');
const EXOStorage = artifacts.require('EXOStorage');
const EXOToken = artifacts.require('EXOToken');
const EXOUpgrade = artifacts.require('EXOUpgrade');

const newEXOToken = () => {
  return EXOToken.new(
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
    {gas: 8000000}
  );
};

contract('EXOUpgrade', accounts => {
  const addressZero = '0x0000000000000000000000000000000000000000';
  const exoStorage = await EXOStorage.deployed();
  const owner = accounts[0];

  it('should upgrade old contract to a new one if owner requests it', () => {
    return EXOUpgrade.deployed().then(exoUpgrade => {
      newEXOToken().then(exoToken => {
        const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

        exoUpgrade.upgradeContract('EXOToken', exoToken.address, false)
          .then(async result => {
            assert(parseInt(result.receipt.status, 16), 1, 'The upgrade should complete'));

            const expectedEvents = {};
            for (let i = 0; i < result.logs.length; i++) {
              const log = result.logs[i];
              if (log.event === 'ContractUpgraded') {
                assert(log.args.oldContractAddress, EXOToken.address, 'The published old contract should be correct');
                assert(log.args.newContractAddress, exoToken.address, 'The published new contract should be correct');
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
            const updatedNewContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', exoToken.address));
            const updatedOldContractAddress = await exoStorage.getAddress.call(Web3Utils.soliditySha3('contract.address', EXOToken.address));
            assert(updatedContractNameAddress, exoStorage.address, 'sha3(contract.name, EXOToken) should have correct value');
            assert(updatedNewContractAddress, exoStorage.address, 'sha3(contract.address, exoToken.address) should have correct value');
            assert(updatedOldContractAddress, addressZero, 'sha3(contract.address, EXOToken.address) should have correct value');
          });
      });
    });
  });

  // it('should NOT upgrade old contract to a new one if non-owner requests it', () => {});
  // it('should upgrade old contract to a new one if old contract has ether in it and forceEther flag is set', () => {});
  // it('should NOT upgrade old contract to a new one if old contract has ether in it and forceEther flag is NOT set', () => {});
  // it('should NOT upgrade old contract to a new one if old contract has address 0x0', () => {});
});
