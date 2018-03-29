const Web3Utils = require('web3-utils');
const BN = require('bn.js');
const helpers = require('./helpers');
const EXOStorage = artifacts.require('EXOStorage');
const EXOUpgrade = artifacts.require('EXOUpgrade');
const EXORole = artifacts.require('EXORole');
const EXOToken = artifacts.require('EXOToken');
var exoStorage, exoUpgrade, exoRole;

const exp = (new BN(10)).pow(new BN(18));
const TOTAL_SUPPLY = (new BN(100000000)).mul(exp);
const MIN_BALANCE_FOR_STAKE_REWARD = (new BN(50000000)).mul(exp);
const LOCKED_TREASURY_FUND = (new BN(10000000)).mul(exp);
const LOCKED_PRESALE_FUND = (new BN(5000000)).mul(exp);
const PRESALE_ETH_TO_EXO = new BN(7300);
const PRESALE_DURATION = new BN(1209600);
const ICO_DURATION = new BN(2419200);
const AVAILABLE_ICO_FUND = (new BN(25000000)).mul(exp);
const MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE = (new BN(3650)).mul(exp);
const MAX_ICO_TOKENS_BOUGHT = (new BN(18250)).mul(exp);
const ICO_ETH_TO_EXO = new BN(3650);
const AIRDROP_AMOUNT = (new BN(10)).mul(exp);

const newEXOToken = (changes = {}, value = 0) => {
  return EXOStorage.new().then(_exoStorage => {
    exoStorage = _exoStorage;
    return EXOUpgrade.new(exoStorage.address).then(_exoUpgrade => {
      exoUpgrade = _exoUpgrade;
      return EXORole.new(exoStorage.address).then(_exoRole => {
        exoRole = _exoRole;
        const argsObj = {
          totalSupply: TOTAL_SUPPLY.div(exp).toNumber(),
          minBalanceForStakeReward: MIN_BALANCE_FOR_STAKE_REWARD.div(exp).toNumber(),
          lockedTreasuryFund: LOCKED_TREASURY_FUND.div(exp).toNumber(),
          lockedPreSaleFund: LOCKED_PRESALE_FUND.div(exp).toNumber(),
          preSaleDuration: PRESALE_DURATION.toNumber(),
          ICODuration: ICO_DURATION.toNumber(),
          availableICOFund: AVAILABLE_ICO_FUND.div(exp).toNumber(),
          minICOTokensBoughtEveryPurchase: MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(exp).toNumber(),
          maxICOTokensBought: MAX_ICO_TOKENS_BOUGHT.div(exp).toNumber(),
          airdropAmount: AIRDROP_AMOUNT.div(exp).toNumber()
        };
        Object.assign(argsObj, changes);
        const args = Object.values(argsObj);
        return EXOToken.new(exoStorage.address, ...args, {gas: 7000000, value}).then(async exoToken => {
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

          // Register EXOToken contract.
          await exoStorage.setAddress(
            Web3Utils.soliditySha3('contract.address', exoToken.address),
            exoToken.address
          );
          await exoStorage.setAddress(
            Web3Utils.soliditySha3('contract.name', 'EXOToken'),
            exoToken.address
          );

          await exoStorage.setBool(
            Web3Utils.soliditySha3('contract.storage.initialized'),
            true
          );
          return exoToken;
        });
      });
    });
  });
};

const logContract = async (exoToken, target) => {
  console.log('');
  console.log('EXOToken');
  console.log('==============================');
  console.log(`BALANCE=${web3.eth.getBalance(exoToken.address)}`);
  if (target) {
    console.log('');
    console.log(`target's balance=${await exoToken.balanceOf.call(target)}`);
    console.log(`target's stake balance=${await exoToken.stakeBalanceOf.call(target)}`);
    console.log(`target's stake start time=${await exoToken.stakeStartTimeOf.call(target)}`);
    console.log(`ICO tokens bought by target=${await exoToken.ICOTokensBoughtBy.call(target)}`);
    console.log(`is target airdropped?=${await exoToken.isAirdropped.call(target)}`);
    console.log('');
  }
  console.log('');
  console.log(`lockedFunds["treasury"]=${await exoToken.lockedFundOf.call("treasury")}`);
  console.log('');
  console.log(`lockedFunds["preSale"]=${await exoToken.lockedFundOf.call("preSale")}`);
  console.log(`preSaleStartTime=${await exoToken.preSaleStartTime.call()}`);
  console.log(`preSaleDeadline=${await exoToken.preSaleDeadline.call()}`);
  console.log('');
  console.log(`availableICOFund=${await exoToken.availableICOFund.call()}`);
  console.log(`ICOStartTime=${await exoToken.ICOStartTime.call()}`);
  console.log(`ICODeadline=${await exoToken.ICODeadline.call()}`);
};

contract('EXOToken', accounts => {
  const addressZero = '0x0000000000000000000000000000000000000000';
  const owner = accounts[0];
  const treasuryCarrier = accounts[1];
  const preSaleCarrier = accounts[2];
  const airdropCarrier = accounts[3];

  const fastForwardToAfterPreSale = async exoToken => {
    await exoToken.startPreSale();
    await helpers.increaseTime(PRESALE_DURATION.toNumber() + 1);
  };

  const fastForwardToAfterICO = async exoToken => {
    await fastForwardToAfterPreSale(exoToken);
    await exoToken.startICO();
    await helpers.increaseTime(ICO_DURATION.toNumber() + 1);
  };

  it('should get the stake start time of an account', () => {
    return newEXOToken().then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);

      exoToken.depositStake(50*exp, {from: staker})
        .then(async result => {
          const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
          const stakeStartTime = await exoToken.stakeStartTimeOf.call(staker);

          if (! stakeStartTime.eq(new BN(now))) {
            console.log('BLOCK TIMESTAMP INCONSISTENCY', stakeStartTime.valueOf(), now);
          }
          const diff = stakeStartTime.sub(new BN(now)).toNumber();
          assert(diff === -1 || diff === 0, 'The stake start time should be equal to current block time');
        });
    });
  });

  it('should NOT transfer anything to owner account', () => {
    return newEXOToken().then(async exoToken => {
      const sender = accounts[5];
      await exoToken.transfer(sender, 100*exp);
      const expectedSenderBalance = await exoToken.balanceOf.call(sender);
      const expectedOwnerBalance = await exoToken.balanceOf.call(owner);

      exoToken.transfer(owner, 50*exp, {from: sender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const senderBalance = await exoToken.balanceOf.call(sender);
          const ownerBalance = await exoToken.balanceOf.call(owner);
          assert(senderBalance.eq(expectedSenderBalance), 'The sender\'s balance should be unchanged');
          assert(ownerBalance.eq(expectedOwnerBalance), 'The owner\'s balance should be unchanged');
        });
    });
  });

  it('should lock the minimum balance for stake reward in owner\'s account', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      const surplus = (await exoToken.balanceOf.call(owner)).sub(MIN_BALANCE_FOR_STAKE_REWARD);
      await exoToken.transfer(account, surplus.div(exp).toNumber()*exp);

      const expectedAccountBalance = await exoToken.balanceOf.call(account);
      const expectedOwnerBalance = await exoToken.balanceOf.call(owner);
      assert(expectedAccountBalance.eq(surplus), 'Transfer amount should be correct');
      assert(expectedOwnerBalance.eq(MIN_BALANCE_FOR_STAKE_REWARD), 'Remaining balance should be correct');

      exoToken.transfer(account, 1)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const accountBalance = await exoToken.balanceOf.call(account);
          const ownerBalance = await exoToken.balanceOf.call(owner);
          assert(accountBalance.eq(expectedAccountBalance), 'The account\'s balance should be unchanged');
          assert(ownerBalance.eq(expectedOwnerBalance), 'The owner\'s balance should be unchanged');
        });
    });
  });

  it('should NOT be possible to transfer tokens if sender is frozen', () => {
    return newEXOToken().then(async exoToken => {
      const sender = accounts[5];
      const recipient = accounts[6];
      const expectedSenderBalance = await exoToken.balanceOf.call(sender);
      const expectedRecipientBalance = await exoToken.balanceOf.call(recipient);

      await exoRole.roleAdd('frozen', sender);
      exoToken.transfer(recipient, 100, {from: sender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const senderBalance = await exoToken.balanceOf.call(sender);
          const recipientBalance = await exoToken.balanceOf.call(recipient);
          assert(senderBalance.eq(expectedSenderBalance), 'The sender\'s balance should be unchanged');
          assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be unchanged');
        });
    });
  });

  it('should NOT be possible to transfer tokens if recipient is frozen', () => {
    return newEXOToken().then(async exoToken => {
      const sender = accounts[5];
      const recipient = accounts[6];
      const expectedSenderBalance = await exoToken.balanceOf.call(sender);
      const expectedRecipientBalance = await exoToken.balanceOf.call(recipient);

      await exoRole.roleAdd('frozen', recipient);
      exoToken.transfer(recipient, 100, {from: sender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const senderBalance = await exoToken.balanceOf.call(sender);
          const recipientBalance = await exoToken.balanceOf.call(recipient);
          assert(senderBalance.eq(expectedSenderBalance), 'The sender\'s balance should be unchanged');
          assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be unchanged');
        });
    });
  });

  it('should NOT be possible to transfer allowance tokens if spender is frozen', () => {
    return newEXOToken().then(async exoToken => {
      const lender = accounts[4];
      const spender = accounts[5];
      const recipient = accounts[6];
      const expectedLenderBalance = await exoToken.balanceOf.call(lender);
      const expectedRecipientBalance = await exoToken.balanceOf.call(recipient);

      await exoToken.approve(spender, 100, {from: lender});
      await exoRole.roleAdd('frozen', spender);

      exoToken.transferFrom(lender, recipient, 100, {from: spender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const lenderBalance = await exoToken.balanceOf.call(lender);
          const recipientBalance = await exoToken.balanceOf.call(recipient);
          assert(lenderBalance.eq(expectedLenderBalance), 'The lender\'s balance should be unchanged');
          assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be unchanged');
        });
    });
  });

  it('should NOT be possible to transfer allowance tokens if lender is frozen', () => {
    return newEXOToken().then(async exoToken => {
      const lender = accounts[4];
      const spender = accounts[5];
      const recipient = accounts[6];
      const expectedLenderBalance = await exoToken.balanceOf.call(lender);
      const expectedRecipientBalance = await exoToken.balanceOf.call(recipient);

      await exoToken.approve(spender, 100, {from: lender});
      await exoRole.roleAdd('frozen', lender);

      exoToken.transferFrom(lender, recipient, 100, {from: spender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const lenderBalance = await exoToken.balanceOf.call(lender);
          const recipientBalance = await exoToken.balanceOf.call(recipient);
          assert(lenderBalance.eq(expectedLenderBalance), 'The lender\'s balance should be unchanged');
          assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be unchanged');
        });
    });
  });

  it('should NOT be possible to transfer allowance tokens if recipient is frozen', () => {
    return newEXOToken().then(async exoToken => {
      const lender = accounts[4];
      const spender = accounts[5];
      const recipient = accounts[6];
      const expectedLenderBalance = await exoToken.balanceOf.call(lender);
      const expectedRecipientBalance = await exoToken.balanceOf.call(recipient);

      await exoToken.approve(spender, 100, {from: lender});
      await exoRole.roleAdd('frozen', recipient);

      exoToken.transferFrom(lender, recipient, 100, {from: spender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const lenderBalance = await exoToken.balanceOf.call(lender);
          const recipientBalance = await exoToken.balanceOf.call(recipient);
          assert(lenderBalance.eq(expectedLenderBalance), 'The lender\'s balance should be unchanged');
          assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be unchanged');
        });
    });
  });

  it('should NOT be possible to deposit stake tokens if account is frozen', () => {
    return newEXOToken().then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoRole.roleAdd('frozen', staker);

      exoToken.depositStake(50*exp, {from: staker})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');
        });
    });
  });

  it('should NOT be possible to withdraw stake tokens if account is frozen', () => {
    return newEXOToken().then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: staker});
      await exoRole.roleAdd('frozen', staker);

      exoToken.withdrawStake(50*exp, {from: staker})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake withdrawal should fail');
        });
    });
  });

  it('should NOT be possible to buy ICO tokens if buyer is frozen', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();

      const buyer = accounts[6];
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).add(new BN(1)).div(exp), "ether"));
      await exoRole.roleAdd('frozen', buyer);

      exoToken.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');
        });
    });
  });

  it('should NOT be possible to airdrop tokens if carrier is frozen', () => {
    return newEXOToken().then(async exoToken => {
      const recipient = accounts[4];

      await exoRole.roleAdd('airdropCarrier', airdropCarrier);
      await fastForwardToAfterICO(exoToken);
      await exoRole.roleAdd('frozen', airdropCarrier);

      exoToken.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');
          assert(await exoToken.isAirdropped(recipient) == false, 'The recipient should NOT be marked as airdropped');
        });
    })
  });

  it('should NOT be possible to receive airdrop tokens if account is frozen', () => {
    return newEXOToken().then(async exoToken => {
      const recipient = accounts[4];

      await exoRole.roleAdd('airdropCarrier', airdropCarrier);
      await fastForwardToAfterICO(exoToken);
      await exoRole.roleAdd('frozen', recipient);

      exoToken.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');
          assert(await exoToken.isAirdropped(recipient) == false, 'The recipient should NOT be marked as airdropped');
        });
    })
  });

  it('should NOT run any state-modifying external functions if paused', () => {
    return newEXOToken().then(async exoToken => {
      const recipient = accounts[5];
      await exoToken.transfer(recipient, 1000);
      const recipientBalance = await exoToken.balanceOf.call(recipient);
      assert(recipientBalance.eq(new BN(1000)), 'The recipient\'s balance should be correct');

      exoToken.pause().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'The pause should complete');

        const events = {};
        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'Pause') {
            events['Pause'] = true;
          }
        }
        assert(events['Pause'], 'Pause event should be published');

        return exoToken.transfer(recipient, 1000).then(transferResult => {
          assert.equal(parseInt(transferResult.receipt.status, 16), 0, 'The transfer should fail');
        });
      });
    });
  });

  it('should transfer tokens', () => {
    return newEXOToken().then(async exoToken => {
      const recipient = accounts[5];
      const expectedOwnerBalance = (await exoToken.balanceOf.call(owner)).sub(new BN(1000));
      const expectedRecipientBalance = (await exoToken.balanceOf.call(recipient)).add(new BN(1000));

      exoToken.transfer(recipient, 1000).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'The transfer should complete');

        const events = {};
        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'Transfer') {
            assert.equal(log.args.from, owner, 'The published sender should be correct');
            assert.equal(log.args.to, recipient, 'The published recipient should be correct');
            assert(log.args.value.eq(new BN(1000)), 'The published value should be correct');
            events['Transfer'] = true;
          }
        }
        assert(events['Transfer'], 'Transfer event should be published');

        const ownerBalance = await exoToken.balanceOf.call(owner);
        const recipientBalance = await exoToken.balanceOf.call(recipient);
        assert(ownerBalance.eq(expectedOwnerBalance), 'The owner\'s balance should be correct');
        assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be correct');
      });
    });
  });

  it('should NOT transfer tokens if recipient has 0x0 address', () => {
    return newEXOToken().then(async exoToken => {
      const recipient = addressZero;
      const expectedOwnerBalance = await exoToken.balanceOf.call(owner);

      exoToken.transfer(recipient, 1000).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

        const ownerBalance = await exoToken.balanceOf.call(owner);
        const recipientBalance = await exoToken.balanceOf.call(recipient);
        assert(ownerBalance.eq(expectedOwnerBalance), 'The owner\'s balance should be unchanged');
        assert(recipientBalance.eq(new BN(0)), 'The recipient\'s balance should be zero');
      });
    });
  });

  it('should NOT transfer tokens if balance is insufficient', () => {
    return newEXOToken().then(async exoToken => {
      const recipient = accounts[5];
      const sender = accounts[4];

      await exoToken.transfer(sender, 1000);
      const expectedSenderBalance = await exoToken.balanceOf.call(sender);

      exoToken.transfer(recipient, 2000, {from: sender}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

        const senderBalance = await exoToken.balanceOf.call(sender);
        const recipientBalance = await exoToken.balanceOf.call(recipient);
        assert(senderBalance.eq(expectedSenderBalance), 'The sender\'s balance should be unchanged');
        assert(recipientBalance.eq(new BN(0)), 'The recipient\'s balance should be zero');
      });
    });
  });

  it('should transfer allowance tokens', () => {
    return newEXOToken().then(async exoToken => {
      const spender = accounts[4];
      const recipient = accounts[5];
      const expectedOwnerBalance = (await exoToken.balanceOf.call(owner)).sub(new BN(1000));
      const expectedRecipientBalance = (await exoToken.balanceOf.call(recipient)).add(new BN(1000));

      await exoToken.approve(spender, 1000);

      exoToken.transferFrom(owner, recipient, 1000, {from: spender}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'The transfer should complete');

        const events = {};
        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'Transfer') {
            assert.equal(log.args.from, owner, 'The published sender should be correct');
            assert.equal(log.args.to, recipient, 'The published recipient should be correct');
            assert(log.args.value.eq(new BN(1000)), 'The published value should be correct');
            events['Transfer'] = true;
          }
        }
        assert(events['Transfer'], 'Transfer event should be published');

        const ownerBalance = await exoToken.balanceOf.call(owner);
        const recipientBalance = await exoToken.balanceOf.call(recipient);
        assert(ownerBalance.eq(expectedOwnerBalance), 'The owner\'s balance should be correct');
        assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be correct');
      });
    });
  });

  it('should NOT transfer allowance tokens if recipient has 0x0 address', () => {
    return newEXOToken().then(async exoToken => {
      const spender = accounts[4];
      const recipient = addressZero;
      const expectedOwnerBalance = await exoToken.balanceOf.call(owner);

      await exoToken.approve(spender, 1000);

      exoToken.transferFrom(owner, recipient, 1000, {from: spender}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

        const ownerBalance = await exoToken.balanceOf.call(owner);
        const recipientBalance = await exoToken.balanceOf.call(recipient);
        assert(ownerBalance.eq(expectedOwnerBalance), 'The owner\'s balance should be unchanged');
        assert(recipientBalance.eq(new BN(0)), 'The recipient\'s balance should be zero');
      });
    });
  });

  it('should NOT transfer allowance tokens if lender\'s balance is insufficient', () => {
    return newEXOToken().then(async exoToken => {
      const lender = accounts[4];
      const recipient = accounts[5];
      const spender = accounts[6];

      await exoToken.transfer(lender, 1000);
      const expectedLenderBalance = await exoToken.balanceOf.call(lender);

      await exoToken.approve(spender, 1000, {from: lender});

      exoToken.transferFrom(lender, recipient, 2000, {from: spender}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

        const lenderBalance = await exoToken.balanceOf.call(lender);
        const recipientBalance = await exoToken.balanceOf.call(recipient);
        assert(lenderBalance.eq(expectedLenderBalance), 'The lender\'s balance should be unchanged');
        assert(recipientBalance.eq(new BN(0)), 'The recipient\'s balance should be zero');
      });
    });
  });

  it('should NOT transfer allowance tokens if allowed balance is insufficient', () => {
    return newEXOToken().then(async exoToken => {
      const lender = accounts[4];
      const recipient = accounts[5];
      const spender = accounts[6];

      await exoToken.transfer(lender, 1000);
      const expectedLenderBalance = await exoToken.balanceOf.call(lender);

      await exoToken.approve(spender, 500, {from: lender});

      exoToken.transferFrom(lender, recipient, 600, {from: spender}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

        const lenderBalance = await exoToken.balanceOf.call(lender);
        const recipientBalance = await exoToken.balanceOf.call(recipient);
        assert(lenderBalance.eq(expectedLenderBalance), 'The lender\'s balance should be unchanged');
        assert(recipientBalance.eq(new BN(0)), 'The recipient\'s balance should be zero');
      });
    });
  });

  it('should approve allowance for an address', () => {
    return newEXOToken().then(exoToken => {
      const spender = accounts[6];

      exoToken.approve(spender, 500).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'The approval should complete');

        const events = {};
        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'Approval') {
            assert.equal(log.args.owner, owner, 'The published owner should be correct');
            assert.equal(log.args.spender, spender, 'The published spender should be correct');
            assert(log.args.value.eq(new BN(500)), 'The published value should be correct');
            events['Approval'] = true;
          }
        }
        assert(events['Approval'], 'Approval event should be published');

        const allowance = await exoToken.allowance.call(owner, spender);
        assert(allowance.eq(new BN(500)), 'The allowance for spender should be correct');
      });
    });
  });

  it('should increase allowance for an address', () => {
    return newEXOToken().then(async exoToken => {
      const spender = accounts[6];
      await exoToken.approve(spender, 1000);
      const initialAllowance = await exoToken.allowance.call(owner, spender);
      assert(initialAllowance.eq(new BN(1000)), 'The initial allowance should be correct');

      const expectedAllowance = initialAllowance.add(new BN(500));

      exoToken.increaseApproval(spender, 500).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'The allowance increase should complete');

        const events = {};
        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'Approval') {
            assert.equal(log.args.owner, owner, 'The published owner should be correct');
            assert.equal(log.args.spender, spender, 'The published spender should be correct');
            assert(log.args.value.eq(expectedAllowance), 'The published value should be correct');
            events['Approval'] = true;
          }
        }
        assert(events['Approval'], 'Approval event should be published');

        const allowance = await exoToken.allowance.call(owner, spender);
        assert(allowance.eq(expectedAllowance), 'The allowance for spender should be correct');
      });
    });
  });

  it('should decrease allowance for an address', () => {
    return newEXOToken().then(async exoToken => {
      const spender = accounts[6];
      await exoToken.approve(spender, 1000);
      const initialAllowance = await exoToken.allowance.call(owner, spender);
      assert(initialAllowance.eq(new BN(1000)), 'The initial allowance should be correct');

      const expectedAllowance = initialAllowance.sub(new BN(500));

      exoToken.decreaseApproval(spender, 500).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'The allowance decrease should complete');

        const events = {};
        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'Approval') {
            assert.equal(log.args.owner, owner, 'The published owner should be correct');
            assert.equal(log.args.spender, spender, 'The published spender should be correct');
            assert(log.args.value.eq(expectedAllowance), 'The published value should be correct');
            events['Approval'] = true;
          }
        }
        assert(events['Approval'], 'Approval event should be published');

        const allowance = await exoToken.allowance.call(owner, spender);
        assert(allowance.eq(expectedAllowance), 'The allowance for spender should be correct');
      });
    });
  });

  it('should decrease allowance for an address to ZERO if the decrease is greater than old value', () => {
    return newEXOToken().then(async exoToken => {
      const spender = accounts[6];
      await exoToken.approve(spender, 1000);
      const initialAllowance = await exoToken.allowance.call(owner, spender);
      assert(initialAllowance.eq(new BN(1000)), 'The initial allowance should be correct');

      const expectedAllowance = 0;

      exoToken.decreaseApproval(spender, 2000).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'The allowance decrease should complete');

        const events = {};
        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'Approval') {
            assert.equal(log.args.owner, owner, 'The published owner should be correct');
            assert.equal(log.args.spender, spender, 'The published spender should be correct');
            assert(log.args.value.eq(expectedAllowance), 'The published value should be correct');
            events['Approval'] = true;
          }
        }
        assert(events['Approval'], 'Approval event should be published');

        const allowance = await exoToken.allowance.call(owner, spender);
        assert(allowance.eq(expectedAllowance), 'The allowance for spender should be correct');
      });
    });
  });

  it('should selfdestruct if killed by owner', () => {
    return newEXOToken({}, 100000).then(exoToken => {
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
        {gas: 7000000}
      ).then(async _exoToken => {
        await exoUpgrade.upgradeContract('EXOToken', _exoToken.address, true);

        const initialContractBalance = web3.eth.getBalance(exoToken.address);
        assert(initialContractBalance.eq(new BN(100000)), 'The initial contract balance should be correct');

        exoToken.kill().then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The selfdestruct should complete');

          const events = {};
          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'SelfDestruct') {
              assert.equal(log.args.contractName, 'EXOToken', 'The published contract name should be correct');
              assert.equal(log.args.contractAddress, exoToken.address, 'The published contract address should be correct');
              events['SelfDestruct'] = true;
            }
          }
          assert(events['SelfDestruct'], 'SelfDestruct event should be published');

          const contractBalance = web3.eth.getBalance(exoToken.address);
          assert(contractBalance.eq(new BN(0)), 'The contract balance should be correct');
        });
      });
    });
  });

  it('should NOT selfdestruct if killed by non-owner', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).add(new BN(1)).div(exp), "ether"));
      await exoToken.buyICOTokens({value: amount});

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
        {gas: 7000000}
      ).then(async _exoToken => {
        await exoUpgrade.upgradeContract('EXOToken', _exoToken.address, true);

        const initialContractBalance = web3.eth.getBalance(exoToken.address);
        assert(initialContractBalance.eq(amount), 'The initial contract balance should be correct');

        exoToken.kill({from: accounts[5]}).then(result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The selfdestruct should fail');

          const events = {};
          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'SelfDestruct') {
              events['SelfDestruct'] = true;
            }
          }
          assert(! events['SelfDestruct'], 'SelfDestruct event should NOT be published');

          const contractBalance = web3.eth.getBalance(exoToken.address);
          assert(contractBalance.eq(initialContractBalance), 'The contract balance should be correct');
        });
      });
    });
  });

  it('should NOT selfdestruct if it is still active', () => {
    return newEXOToken({}, 100000).then(exoToken => {
      const initialContractBalance = web3.eth.getBalance(exoToken.address);
      assert(initialContractBalance.eq(new BN(100000)), 'The initial contract balance should be correct');

      exoToken.kill().then(result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The selfdestruct should fail');

        const events = {};
        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'SelfDestruct') {
            events['SelfDestruct'] = true;
          }
        }
        assert(! events['SelfDestruct'], 'SelfDestruct event should NOT be published');

        const contractBalance = web3.eth.getBalance(exoToken.address);
        assert(contractBalance.eq(initialContractBalance), 'The contract balance should be correct');
      });
    });
  });
});
