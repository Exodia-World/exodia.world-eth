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
        return EXOToken.new(exoStorage.address, ...args, {gas: 8000000, value}).then(async exoToken => {
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

  it('should have the correct parameters as deployed', () => {
    return EXOToken.deployed().then(async exoToken => {
      const totalSupply = await exoToken.totalSupply.call();
      const minBalanceForStakeReward = await exoToken.minBalanceForStakeReward.call();
      const lockedTreasuryFund = await exoToken.lockedFundOf.call("treasury");
      const lockedPreSaleFund = await exoToken.lockedFundOf.call("preSale");
      const preSaleEthToExo = await exoToken.PRESALE_ETH_TO_EXO.call();
      const preSaleDuration = await exoToken.preSaleDuration.call();
      const availableICOFund = await exoToken.availableICOFund.call();
      const minICOTokensBoughtEveryPurchase = await exoToken.minICOTokensBoughtEveryPurchase.call();
      const maxICOTokensBought= await exoToken.maxICOTokensBought.call();
      const ICOEthToExo = await exoToken.ICO_ETH_TO_EXO.call();
      const ICODuration = await exoToken.ICODuration.call();
      const airdropAmount = await exoToken.airdropAmount.call();

      assert(totalSupply.eq(TOTAL_SUPPLY), 'The total supply of EXO should be set');
      assert(minBalanceForStakeReward.eq(MIN_BALANCE_FOR_STAKE_REWARD), 'The minimum balance for stake reward should be set');
      assert(lockedTreasuryFund.eq(LOCKED_TREASURY_FUND), 'The locked treasury fund should be set');
      assert(lockedPreSaleFund.eq(LOCKED_PRESALE_FUND), 'The locked pre-sale fund should be set');
      assert(preSaleEthToExo.eq(PRESALE_ETH_TO_EXO), 'The exchange rate from ETH to EXO at pre-sale should be set');
      assert(preSaleDuration.eq(PRESALE_DURATION), 'The pre-sale duration should be set');
      assert(availableICOFund.eq(AVAILABLE_ICO_FUND), 'The ICO fund should be set');
      assert(minICOTokensBoughtEveryPurchase.eq(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE), 'The minimum ICO tokens for every purchase should be set');
      assert(maxICOTokensBought.eq(MAX_ICO_TOKENS_BOUGHT), 'The maximum ICO tokens for all purchases should be set');
      assert(ICOEthToExo.eq(ICO_ETH_TO_EXO), 'The exchange rate from ETH to EXO at ICO should be set');
      assert(ICODuration.eq(ICO_DURATION), 'The ICO duration should be set');
      assert(airdropAmount.eq(AIRDROP_AMOUNT), 'The airdrop amount of EXO per account should be set');
    });
  });

  it('should only set constructor arguments to eternal storage on initial deployment', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();

      const buyer = accounts[6];
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).add(new BN(1)).div(exp), "ether"));
      const expectedExoBought = amount.mul(ICO_ETH_TO_EXO);
      const expectedBuyerBalance = (await exoToken.balanceOf(buyer)).add(expectedExoBought);
      const expectedICOFund = (await exoToken.availableICOFund.call()).sub(expectedExoBought);
      const expectedICOTokensBought = (await exoToken.ICOTokensBoughtBy.call(buyer)).add(expectedExoBought);
      const expectedTotalICOTokensBought = (await exoToken.totalICOTokensBought.call()).add(expectedExoBought);

      await exoToken.buyICOTokens({from: buyer, value: amount});

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
        {gas: 8000000}
      ).then(async _exoToken => {
        await exoUpgrade.upgradeContract('EXOToken', _exoToken.address, true);

        const buyerBalance = await _exoToken.balanceOf(buyer);
        const remainingICOFund = await _exoToken.availableICOFund.call();
        const ICOTokensBought = await _exoToken.ICOTokensBoughtBy.call(buyer);
        const totalICOTokensBought = await _exoToken.totalICOTokensBought.call();
        assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be correct');
        assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be correct');
        assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be correct');
        assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be correct');
      });
    });
  });

  it('should start the pre-sale', () => {
    return newEXOToken().then(async exoToken => {
      const preSaleDuration = await exoToken.preSaleDuration.call();

      exoToken.startPreSale().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'The pre-sale should be started');

        const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
        const startTime = await exoToken.preSaleStartTime.call();
        const deadline = await exoToken.preSaleDeadline.call();

        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'StartPreSale') {
            // NOTE: Sometimes the block timestamp isn't as expected, but it's a test-specific issue.
            if (! log.args.startTime.eq(new BN(now))) {
              console.log('BLOCK TIMESTAMP INCONSISTENCY', log.args.startTime.valueOf(), now);
            }
            const diff = log.args.startTime.sub(new BN(now)).toNumber();
            assert(diff === -1 || diff === 0, 'The published start time should be equal to current block time');
            assert(log.args.deadline.sub(log.args.startTime).eq(preSaleDuration), 'The published start time and deadline of pre-sale should be correct');
          }
        }
        const diff = startTime.sub(new BN(now)).toNumber();
        assert(diff === -1 || diff === 0, 'The start time should be equal to current block time');
        assert(deadline.sub(startTime).eq(preSaleDuration), 'The start time and deadline of pre-sale should be correct');
      });
    });
  });

  it('should NOT start the pre-sale if the locked fund is 0', () => {
    return newEXOToken({lockedPreSaleFund: 0}).then(async exoToken => {
      exoToken.startPreSale().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale should NOT be started');

        const startTime = await exoToken.preSaleStartTime.call();
        const deadline = await exoToken.preSaleDeadline.call();
        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should NOT start the pre-sale if it has already been started before', () => {
    return newEXOToken().then(async exoToken => {
      await exoToken.startPreSale();

      const expectedStartTime = await exoToken.preSaleStartTime.call();
      const expectedDeadline = await exoToken.preSaleDeadline.call();

      exoToken.startPreSale().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale should NOT be started');

        const startTime = await exoToken.preSaleStartTime.call();
        const deadline = await exoToken.preSaleDeadline.call();

        assert(startTime.eq(expectedStartTime), 'The start time should be unchanged');
        assert(deadline.eq(expectedDeadline), 'The deadline should be unchanged');
      });
    });
  });

  it('should NOT start the pre-sale if caller is NOT owner', () => {
    return newEXOToken().then(async exoToken => {
      exoToken.startPreSale({from: accounts[3]}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale should NOT be started');

        const startTime = await exoToken.preSaleStartTime.call();
        const deadline = await exoToken.preSaleDeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should sell EXO tokens at ICO for an amount of ETH', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();

      const buyer = accounts[6];
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).add(new BN(1)).div(exp), "ether"));
      const expectedExoBought = amount.mul(ICO_ETH_TO_EXO);
      const expectedBuyerBalance = (await exoToken.balanceOf(buyer)).add(expectedExoBought);
      const expectedContractBalance = web3.eth.getBalance(exoToken.address).add(amount);
      const expectedICOFund = (await exoToken.availableICOFund.call()).sub(expectedExoBought);
      const expectedICOTokensBought = (await exoToken.ICOTokensBoughtBy.call(buyer)).add(expectedExoBought);
      const expectedTotalICOTokensBought = (await exoToken.totalICOTokensBought.call()).add(expectedExoBought);

      exoToken.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'EXO tokens should be sold');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'Transfer') {
              assert.equal(log.args.from, exoToken.address, 'The transfer should originate from EXO token contract');
              assert.equal(log.args.to, buyer, 'The transfer should be designated to buyer');
              assert(log.args.value.eq(expectedExoBought), 'The transfer value should be equal to EXO tokens bought');
            }
          }

          const buyerBalance = await exoToken.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exoToken.address);
          const remainingICOFund = await exoToken.availableICOFund.call();
          const ICOTokensBought = await exoToken.ICOTokensBoughtBy.call(buyer);
          const totalICOTokensBought = await exoToken.totalICOTokensBought.call();
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be correct');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be correct');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be correct');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be correct');
          assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be correct');
        });
    });
  });

  it('should NOT sell EXO tokens at ICO for ETH less than the minimum amount set per purchase', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();

      const buyer = accounts[6];
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).sub(new BN(1000)).div(exp), "ether"));
      const expectedExoBought = 0;
      const expectedBuyerBalance = await exoToken.balanceOf(buyer);
      const expectedContractBalance = web3.eth.getBalance(exoToken.address);
      const expectedICOFund = await exoToken.availableICOFund.call();
      const expectedICOTokensBought = await exoToken.ICOTokensBoughtBy.call(buyer);
      const expectedTotalICOTokensBought = await exoToken.totalICOTokensBought.call();

      exoToken.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exoToken.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exoToken.address);
          const remainingICOFund = await exoToken.availableICOFund.call();
          const ICOTokensBought = await exoToken.ICOTokensBoughtBy.call(buyer);
          const totalICOTokensBought = await exoToken.totalICOTokensBought.call();
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
          assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be unchanged');
        });
    });
  });

  it('should NOT sell EXO tokens at ICO for ETH more than the maximum amount set for all purchases', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();

      const buyer = accounts[6];
      let amount = new BN(web3.toWei(MAX_ICO_TOKENS_BOUGHT.div(ICO_ETH_TO_EXO).sub(new BN(100000)).div(exp), "ether"));
      await exoToken.buyICOTokens({from: buyer, value: amount});

      const expectedExoBought = 0;
      const expectedBuyerBalance = await exoToken.balanceOf(buyer);
      const expectedContractBalance = web3.eth.getBalance(exoToken.address);
      const expectedICOFund = await exoToken.availableICOFund.call();
      const expectedICOTokensBought = await exoToken.ICOTokensBoughtBy.call(buyer);
      const expectedTotalICOTokensBought = await exoToken.totalICOTokensBought.call();

      amount = new BN(100001);

      exoToken.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exoToken.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exoToken.address);
          const remainingICOFund = await exoToken.availableICOFund.call();
          const ICOTokensBought = await exoToken.ICOTokensBoughtBy.call(buyer);
          const totalICOTokensBought = await exoToken.totalICOTokensBought.call();
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
          assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be unchanged');
        });
    });
  });

  it('should NOT sell EXO tokens at ICO if its tokens are insufficient', () => {
    return newEXOToken({
      availableICOFund: MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(exp).toNumber()
    }).then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();

      const buyer = accounts[6];
      const amount = MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).add(new BN(1));
      const expectedExoBought = 0;
      const expectedBuyerBalance = await exoToken.balanceOf(buyer);
      const expectedContractBalance = web3.eth.getBalance(exoToken.address);
      const expectedICOFund = await exoToken.availableICOFund.call();
      const expectedICOTokensBought = await exoToken.ICOTokensBoughtBy.call(buyer);
      const expectedTotalICOTokensBought = await exoToken.totalICOTokensBought.call();

      exoToken.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exoToken.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exoToken.address);
          const remainingICOFund = await exoToken.availableICOFund.call();
          const ICOTokensBought = await exoToken.ICOTokensBoughtBy.call(buyer);
          const totalICOTokensBought = await exoToken.totalICOTokensBought.call();
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
          assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be unchanged');
        });
    });
  });

  it('should NOT sell EXO tokens at ICO if ICO has NOT been started', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);

      const buyer = accounts[6];
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).div(exp), "ether"));
      const expectedExoBought = 0;
      const expectedBuyerBalance = await exoToken.balanceOf(buyer);
      const expectedContractBalance = web3.eth.getBalance(exoToken.address);
      const expectedICOFund = await exoToken.availableICOFund.call();
      const expectedICOTokensBought = await exoToken.ICOTokensBoughtBy.call(buyer);
      const expectedTotalICOTokensBought = await exoToken.totalICOTokensBought.call();

      exoToken.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exoToken.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exoToken.address);
          const remainingICOFund = await exoToken.availableICOFund.call();
          const ICOTokensBought = await exoToken.ICOTokensBoughtBy.call(buyer);
          const totalICOTokensBought = await exoToken.totalICOTokensBought.call();
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
          assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be unchanged');
        });
    });
  });

  it('should NOT sell EXO tokens at ICO if its deadline has passed', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterICO(exoToken);

      const buyer = accounts[6];
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).div(exp), "ether"));
      const expectedExoBought = 0;
      const expectedBuyerBalance = await exoToken.balanceOf(buyer);
      const expectedContractBalance = web3.eth.getBalance(exoToken.address);
      const expectedICOFund = await exoToken.availableICOFund.call();
      const expectedICOTokensBought = await exoToken.ICOTokensBoughtBy.call(buyer);
      const expectedTotalICOTokensBought = await exoToken.totalICOTokensBought.call();

      exoToken.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exoToken.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exoToken.address);
          const remainingICOFund = await exoToken.availableICOFund.call();
          const ICOTokensBought = await exoToken.ICOTokensBoughtBy.call(buyer);
          const totalICOTokensBought = await exoToken.totalICOTokensBought.call();
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
          assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be unchanged');
        });
    });
  });

  it('should start the ICO', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);

      exoToken.startICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'ICO should be started');

        const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
        const startTime = await exoToken.ICOStartTime.call();
        const deadline = await exoToken.ICODeadline.call();

        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'StartICO') {
            // NOTE: Sometimes the block timestamp isn't as expected, but it's a test-specific issue.
            if (! log.args.startTime.eq(new BN(now))) {
              console.log('BLOCK TIMESTAMP INCONSISTENCY', log.args.startTime.valueOf(), now);
            }
            const diff = log.args.startTime.sub(new BN(now)).toNumber();
            assert(diff === -1 || diff === 0, 'The published start time should be equal to current block time');
            assert(log.args.deadline.sub(log.args.startTime).eq(ICO_DURATION), 'The published start time and deadline of ICO should be correct');
          }
        }
        const diff = startTime.sub(new BN(now)).toNumber();
        assert(diff === -1 || diff === 0, 'The start time should be equal to current block time');
        assert(deadline.sub(startTime).eq(ICO_DURATION), 'The start time and deadline of ICO should be correct');
      });
    });
  });

  it('should NOT start the ICO if the pre-sale has NOT been started', () => {
    return newEXOToken().then(async exoToken => {
      exoToken.startICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be started');

        const startTime = await exoToken.ICOStartTime.call();
        const deadline = await exoToken.ICODeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should NOT start the ICO if the pre-sale has NOT been ended', () => {
    return newEXOToken().then(async exoToken => {
      await exoToken.startPreSale();

      exoToken.startICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be started');

        const startTime = await exoToken.ICOStartTime.call();
        const deadline = await exoToken.ICODeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should NOT start the ICO if it has already been started before', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();
      const expectedStartTime = await exoToken.ICOStartTime.call();
      const expectedDeadline = await exoToken.ICODeadline.call();

      exoToken.startICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be started');

        const startTime = await exoToken.ICOStartTime.call();
        const deadline = await exoToken.ICODeadline.call();

        assert(startTime.eq(expectedStartTime), 'The start time should be unchanged');
        assert(deadline.eq(expectedDeadline), 'The deadline should be unchanged');
      });
    });
  });

  it('should NOT start the ICO if there is no available fund', () => {
    return newEXOToken({availableICOFund: 0}).then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);

      exoToken.startICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be started');

        const startTime = await exoToken.ICOStartTime.call();
        const deadline = await exoToken.ICODeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should NOT start the ICO if caller is NOT owner', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);

      exoToken.startICO({from: accounts[6]}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be started');

        const startTime = await exoToken.ICOStartTime.call();
        const deadline = await exoToken.ICODeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should release the remaining ICO fund to owner', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterICO(exoToken);
      const availableICOFund = await exoToken.availableICOFund.call();
      const expectedOwnerBalance = (await exoToken.balanceOf.call(owner)).add(availableICOFund);

      exoToken.releaseRemainingICOFundToPrimaryHolder().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'Remaining ICO fund should be released to owner');

        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'Transfer') {
            assert.equal(log.args.from, exoToken.address, 'The transfer should originate from EXO Token contract');
            assert.equal(log.args.to, owner, 'The transfer should be designated to owner');
            assert(log.args.value.eq(availableICOFund), 'The transfer should be equal to available ICO fund');
          }
        }

        const ownerBalance = await exoToken.balanceOf.call(owner);
        const remainingICOFund = await exoToken.availableICOFund.call();
        assert(ownerBalance.eq(expectedOwnerBalance), 'Owner balance should be correct');
        assert(remainingICOFund.eq(0), 'Remaining ICO fund should be 0');
      });
    });
  });

  it('should NOT release the ICO fund to owner if ICO has NOT been started', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      const availableICOFund = await exoToken.availableICOFund.call();
      const expectedOwnerBalance = await exoToken.balanceOf.call(owner);

      exoToken.releaseRemainingICOFundToPrimaryHolder().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Remaining ICO fund should NOT be released to owner');

        const ownerBalance = await exoToken.balanceOf.call(owner);
        const remainingICOFund = await exoToken.availableICOFund.call();
        assert(ownerBalance.eq(expectedOwnerBalance), 'Owner balance should be unchanged');
        assert(remainingICOFund.eq(availableICOFund), 'Remaining ICO fund should be unchanged');
      });
    });
  });

  it('should NOT release the ICO fund to owner if ICO has NOT been ended', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();

      const availableICOFund = await exoToken.availableICOFund.call();
      const expectedOwnerBalance = await exoToken.balanceOf.call(owner);

      exoToken.releaseRemainingICOFundToPrimaryHolder().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Remaining ICO fund should NOT be released to owner');

        const ownerBalance = await exoToken.balanceOf.call(owner);
        const remainingICOFund = await exoToken.availableICOFund.call();
        assert(ownerBalance.eq(expectedOwnerBalance), 'Owner balance should be unchanged');
        assert(remainingICOFund.eq(availableICOFund), 'Remaining ICO fund should be unchanged');
      });
    });
  });

  it('should NOT release the ICO fund to owner if there is no fund to release', () => {
    return newEXOToken({availableICOFund: 0}).then(async exoToken => {
      await fastForwardToAfterICO(exoToken);
      const availableICOFund = await exoToken.availableICOFund.call();
      const expectedOwnerBalance = await exoToken.balanceOf.call(owner);

      exoToken.releaseRemainingICOFundToPrimaryHolder().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Remaining ICO fund should NOT be released to owner');

        const ownerBalance = await exoToken.balanceOf.call(owner);
        const remainingICOFund = await exoToken.availableICOFund.call();
        assert(ownerBalance.eq(expectedOwnerBalance), 'Owner balance should be unchanged');
        assert(remainingICOFund.eq(availableICOFund), 'Remaining ICO fund should be unchanged');
      });
    });
  });

  it('should NOT release the ICO fund to owner if caller is NOT owner', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterICO(exoToken);
      const availableICOFund = await exoToken.availableICOFund.call();
      const expectedOwnerBalance = await exoToken.balanceOf.call(owner);

      exoToken.releaseRemainingICOFundToPrimaryHolder({from: accounts[6]}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Remaining ICO fund should NOT be released to owner');

        const ownerBalance = await exoToken.balanceOf.call(owner);
        const remainingICOFund = await exoToken.availableICOFund.call();
        assert(ownerBalance.eq(expectedOwnerBalance), 'Owner balance should be unchanged');
        assert(remainingICOFund.eq(availableICOFund), 'Remaining ICO fund should be unchanged');
      });
    });
  });

  it('should allow owner to claim Ether fund raised in ICO', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();

      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).div(exp), "ether"));
      const exoBought = amount.mul(ICO_ETH_TO_EXO);
      await exoToken.buyICOTokens({from: accounts[7], value: amount});

      const availableICOFund = await exoToken.availableICOFund.call();
      const contractBalance = web3.eth.getBalance(exoToken.address);
      assert(availableICOFund.eq(AVAILABLE_ICO_FUND.sub(exoBought)), 'The remaining ICO fund should be correct');
      assert(contractBalance.eq(amount), 'The contract balance should be correct');
      await helpers.increaseTime(ICO_DURATION.toNumber() + 1);

      const initialOwnerEthBalance = web3.eth.getBalance(owner);

      exoToken.claimEtherFundRaisedInICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'Ether fund raised should be claimed by owner');

        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'TransferETH') {
            assert(log.args.from, exoToken.address, 'The transfer should originate from EXO Token contract');
            assert(log.args.to, owner, 'The transfer should be designated to owner');
            assert(log.args.value.eq(amount), 'The transfer value should be correct');
          }
        }

        const contractBalance = web3.eth.getBalance(exoToken.address);
        const ownerEthBalance = web3.eth.getBalance(owner);
        assert(contractBalance.eq(new BN(0)), 'Remaining contract balance should be 0');
        assert(ownerEthBalance.gt(initialOwnerEthBalance), 'Owner ETH balance should be greater than before');
      });
    });
  });

  it('should NOT allow owner to claim Ether fund raised in ICO if ICO has NOT started', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      const expectedContractBalance = web3.eth.getBalance(exoToken.address);
      const expectedOwnerEthBalance = web3.eth.getBalance(owner);

      exoToken.claimEtherFundRaisedInICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Ether fund raised should NOT be claimed by owner');

        const contractBalance = web3.eth.getBalance(exoToken.address);
        const ownerEthBalance = web3.eth.getBalance(owner);
        assert(contractBalance.eq(expectedContractBalance), 'Remaining contract balance should be unchanged');
        assert(ownerEthBalance.lt(expectedOwnerEthBalance), 'Owner ETH balance should be less than before');
      });
    });
  });

  it('should NOT allow owner to claim Ether fund raised in ICO if ICO has NOT ended', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();

      const expectedContractBalance = web3.eth.getBalance(exoToken.address);
      const expectedOwnerEthBalance = web3.eth.getBalance(owner);

      exoToken.claimEtherFundRaisedInICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Ether fund raised should NOT be claimed by owner');

        const contractBalance = web3.eth.getBalance(exoToken.address);
        const ownerEthBalance = web3.eth.getBalance(owner);
        assert(contractBalance.eq(expectedContractBalance), 'Remaining contract balance should be unchanged');
        assert(ownerEthBalance.lt(expectedOwnerEthBalance), 'Owner ETH balance should be less than before');
      });
    });
  });

  it('should NOT allow owner to claim Ether fund raised in ICO if there is no fund', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterICO(exoToken);

      const expectedContractBalance = web3.eth.getBalance(exoToken.address);
      const expectedOwnerEthBalance = web3.eth.getBalance(owner);

      exoToken.claimEtherFundRaisedInICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Ether fund raised should NOT be claimed by owner');

        const contractBalance = web3.eth.getBalance(exoToken.address);
        const ownerEthBalance = web3.eth.getBalance(owner);
        assert(contractBalance.eq(expectedContractBalance), 'Remaining contract balance should be unchanged');
        assert(ownerEthBalance.lt(expectedOwnerEthBalance), 'Owner ETH balance should be less than before');
      });
    });
  });

  it('should NOT allow owner to claim Ether fund raised in ICO if caller is NOT owner', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();

      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).div(exp), "ether"));
      const exoBought = amount.mul(ICO_ETH_TO_EXO);
      await exoToken.buyICOTokens({from: accounts[7], value: amount});

      const availableICOFund = await exoToken.availableICOFund.call();
      const expectedContractBalance = web3.eth.getBalance(exoToken.address);
      assert(availableICOFund.eq(AVAILABLE_ICO_FUND.sub(exoBought)), 'The remaining ICO fund should be correct');
      assert(expectedContractBalance.eq(amount), 'The contract balance should be correct');
      await helpers.increaseTime(ICO_DURATION.toNumber() + 1);

      const expectedOwnerEthBalance = web3.eth.getBalance(owner);

      exoToken.claimEtherFundRaisedInICO({from: accounts[6]}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Ether fund raised should NOT be claimed by owner');

        const contractBalance = web3.eth.getBalance(exoToken.address);
        const ownerEthBalance = web3.eth.getBalance(owner);
        assert(contractBalance.eq(expectedContractBalance), 'Remaining contract balance should be unchanged');
        assert(ownerEthBalance.lte(expectedOwnerEthBalance), 'Owner ETH balance should be less than or equal to before');
      });
    });
  });

  it('should airdrop to a recipient with a specific amount of tokens', () => {
    return newEXOToken().then(async exoToken => {
      const recipient = accounts[4];
      const airdropAmount = await exoToken.airdropAmount.call();
      const expectedICOFund = (await exoToken.availableICOFund.call()).sub(airdropAmount);
      const expectedStakeBalance = (await exoToken.stakeBalanceOf.call(recipient)).add(airdropAmount);

      await exoRole.roleAdd('airdropCarrier', airdropCarrier);
      await fastForwardToAfterICO(exoToken);

      exoToken.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The airdrop should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'Transfer') {
              assert.equal(log.args.from, airdropCarrier, 'The airdrop should be transferred from carrier');
              assert.equal(log.args.to, recipient, 'The airdrop should be transferred to recipient');
              assert(airdropAmount.eq(log.args.value), 'The airdrop value should be as configured');
            }
          }
          const availableICOFund = await exoToken.availableICOFund.call();
          const stakeBalance = await exoToken.stakeBalanceOf.call(recipient);
          assert(availableICOFund.eq(expectedICOFund), 'The remaining ICO fund should be 10 tokens less');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be 10 tokens more');
          assert(await exoToken.isAirdropped(recipient) == true, 'The recipient should be marked as airdropped');
        });
    })
  });

  it('should reject airdrops from non-carrier accounts', () => {
    return newEXOToken().then(async exoToken => {
      const recipient = accounts[5];
      const expectedICOFund = await exoToken.availableICOFund.call();
      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(recipient);

      await exoRole.roleAdd('airdropCarrier', airdropCarrier);
      await fastForwardToAfterICO(exoToken);

      exoToken.airdrop(recipient, {from: treasuryCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const availableICOFund = await exoToken.availableICOFund.call();
          const stakeBalance = await exoToken.stakeBalanceOf.call(recipient);
          assert(availableICOFund.eq(expectedICOFund), 'The remaining ICO fund should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be unchanged');
          assert(await exoToken.isAirdropped(recipient) == false, 'The recipient should NOT be marked as airdropped');
        });
    });
  });

  it('should fail airdrop if the available ICO fund is insufficient', () => {
    return newEXOToken({
      availableICOFund: AIRDROP_AMOUNT.sub(new BN(1)).div(exp).toNumber()
    }).then(async exoToken => {
      const recipient = accounts[6];
      const expectedICOFund = await exoToken.availableICOFund.call();
      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(recipient);

      await exoRole.roleAdd('airdropCarrier', airdropCarrier);
      await fastForwardToAfterICO(exoToken);

      exoToken.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const availableICOFund = await exoToken.availableICOFund.call();
          const stakeBalance = await exoToken.stakeBalanceOf.call(recipient);
          assert(availableICOFund.eq(expectedICOFund), 'The remaining ICO fund should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be unchanged');
          assert(await exoToken.isAirdropped(recipient) == false, 'The recipient should NOT be marked as airdropped');
        });
    });
  });

  it('should reject airdrops designated to the same account more than once', () => {
    return newEXOToken().then(async exoToken => {
      const recipient = accounts[5];

      await exoRole.roleAdd('airdropCarrier', airdropCarrier);
      await fastForwardToAfterICO(exoToken);

      await exoToken.airdrop(recipient, {from: airdropCarrier});
      const airdropped = await exoToken.isAirdropped.call(recipient);
      assert(airdropped, 'The account designated should already be marked as airdropped');

      const expectedICOFund = await exoToken.availableICOFund.call();
      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(recipient);

      exoToken.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const availableICOFund = await exoToken.availableICOFund.call();
          const stakeBalance = await exoToken.stakeBalanceOf.call(recipient);
          assert(availableICOFund.eq(expectedICOFund), 'The remaining ICO fund should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be unchanged');
        });
    });
  });

  it('should deposit stake with ZERO interest applied if it is the first deposit', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);

      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = (await exoToken.balanceOf.call(account)).sub(deposit);
      const expectedStakeBalance = (await exoToken.stakeBalanceOf.call(account)).add(deposit);

      await fastForwardToAfterICO(exoToken);

      exoToken.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake deposit should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'DepositStake') {
              assert.equal(log.args.staker, account, 'The stake should be deposited by staker');
              assert(log.args.value.div(exp).eq(new BN(50)), 'The stake value should be 50 tokens');
            }
          }
          const balance = await exoToken.balanceOf.call(account);
          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be 50 tokens less');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be 50 tokens more');
        });
    });
  });

  it('should deposit stake with interest applied to current stake', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: account});
      await helpers.increaseTime(21*24*3600);

      const deposit = (new BN(50)).mul(exp);
      const expectedInterest = await exoToken.calculateInterest.call({from: account});
      const expectedBalance = (await exoToken.balanceOf.call(account)).sub(deposit);
      const expectedStakeBalance = (await exoToken.stakeBalanceOf.call(account)).add(deposit).add(expectedInterest);

      exoToken.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake deposit should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'DepositStake') {
              assert.equal(log.args.staker, account, 'The stake should be deposited by staker');
              assert(log.args.value.div(exp).eq(new BN(50)), 'The published stake value should be correct');
            }
          }
          const balance = await exoToken.balanceOf.call(account);
          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be correct');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be correct');
        });
    });
  });

  it('should NOT deposit stake if staking is NOT for at least 21 days since last start time', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: account});
      await helpers.increaseTime(7*24*3600);

      const expectedBalance = await exoToken.balanceOf.call(account);
      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(account);

      exoToken.depositStake(20*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exoToken.balanceOf.call(account);
          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT deposit stake if balance is insufficient', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 49*exp);

      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = await exoToken.balanceOf.call(account);
      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(account);

      await fastForwardToAfterICO(exoToken);

      exoToken.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exoToken.balanceOf.call(account);
          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT deposit stake if deposit value is NOT more than ZERO', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);

      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = await exoToken.balanceOf.call(account);
      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(account);

      await fastForwardToAfterICO(exoToken);

      exoToken.depositStake(0, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exoToken.balanceOf.call(account);
          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT deposit stake if ICO has NOT started', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);

      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = await exoToken.balanceOf.call(account);
      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(account);

      await fastForwardToAfterPreSale(exoToken);

      exoToken.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exoToken.balanceOf.call(account);
          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT deposit stake if ICO has NOT ended', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);

      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = await exoToken.balanceOf.call(account);
      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(account);

      await fastForwardToAfterPreSale(exoToken);
      await exoToken.startICO();

      exoToken.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exoToken.balanceOf.call(account);
          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT deposit stake if caller is owner', () => {
    return newEXOToken().then(async exoToken => {
      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = await exoToken.balanceOf.call(owner);
      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(owner);

      await fastForwardToAfterICO(exoToken);

      exoToken.depositStake(50*exp, {from: owner})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exoToken.balanceOf.call(owner);
          const stakeBalance = await exoToken.stakeBalanceOf.call(owner);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should withdraw stake with interest applied to current stake', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: account});
      await helpers.increaseTime(21*24*3600);

      const withdrawal = (new BN(20)).mul(exp);
      const expectedInterest = await exoToken.calculateInterest.call({from: account});
      const expectedBalance = (await exoToken.balanceOf.call(account)).add(withdrawal);
      const expectedStakeBalance = (await exoToken.stakeBalanceOf.call(account)).add(expectedInterest).sub(withdrawal);

      exoToken.withdrawStake(20*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake withdrawal should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'WithdrawStake') {
              assert.equal(log.args.staker, account, 'The stake should be withdrawn by staker');
              assert(log.args.value.div(exp).eq(new BN(20)), 'The published stake value should be 20 tokens');
            }
          }
          const balance = await exoToken.balanceOf.call(account);
          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be 20 tokens more');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be correct');
        });
    });
  });

  it('should burn accumulated interest if deposited fund is withdrawn before 21 days have passed since last start time', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: account});
      await helpers.increaseTime(20*24*3600);

      const withdrawal = (new BN(20)).mul(exp);
      const expectedBalance = (await exoToken.balanceOf.call(account)).add(withdrawal);
      const expectedStakeBalance = (await exoToken.stakeBalanceOf.call(account)).sub(withdrawal);

      exoToken.withdrawStake(20*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake withdrawal should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'WithdrawStake') {
              assert.equal(log.args.staker, account, 'The stake should be withdrawn by staker');
              assert(log.args.value.div(exp).eq(new BN(20)), 'The published stake value should be 20 tokens');
            }
          }
          const balance = await exoToken.balanceOf.call(account);
          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be 20 tokens more');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be correct');
        });
    });
  });


  it('should NOT withdraw stake if stake balance is insufficient', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(49*exp, {from: account});

      const withdrawal = (new BN(50)).mul(exp);
      const expectedBalance = await exoToken.balanceOf.call(account);
      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(account);

      exoToken.withdrawStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake withdrawal should fail');

          const balance = await exoToken.balanceOf.call(account);
          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT withdraw stake if withdrawal value is NOT more than ZERO', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: account});

      const withdrawal = (new BN(50)).mul(exp);
      const expectedBalance = await exoToken.balanceOf.call(account);
      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(account);

      exoToken.withdrawStake(0, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake withdrawal should fail');

          const balance = await exoToken.balanceOf.call(account);
          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should update stake balance with interest', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: account});
      await helpers.increaseTime(21*24*3600);

      const expectedInterest = await exoToken.calculateInterest.call({from: account});
      const expectedStakeBalance = (await exoToken.stakeBalanceOf.call(account)).add(expectedInterest);

      exoToken.updateStakeBalance({from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake balance update should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'UpdateStakeBalance') {
              assert.equal(log.args.staker, account, 'The staker account should be correct');
              assert(log.args.balance.eq(expectedStakeBalance), 'The published stake balance should be correct');
            }
          }

          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The updated stake balance should be correct');
        });
    });
  });

  it('should NOT update stake balance if staking is NOT for at least 21 days since last start time', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: account});
      await helpers.increaseTime(20*24*3600);

      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(account);

      exoToken.updateStakeBalance({from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake balance update should fail');

          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT update stake balance with interest if ICO has NOT ended', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);
      await exoToken.depositStake(50*exp, {from: account});
      await helpers.increaseTime(21*24*3600);

      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(account);

      exoToken.updateStakeBalance({from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake balance update should fail');

          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The stake balance should be unchanged');
        });
    });
  });

  it('should update stake balance with owner balance if owner\'s balance is insufficient', () => {
    return newEXOToken({totalSupply: 40000101, minBalanceForStakeReward: 0}).then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(100*exp, {from: account});
      await helpers.increaseTime(1000*24*3600);

      const ownerBalance = await exoToken.balanceOf.call(owner);
      const expectedStakeBalance = (await exoToken.stakeBalanceOf.call(account)).add(ownerBalance);

      exoToken.updateStakeBalance({from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake balance update should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'UpdateStakeBalance') {
              assert.equal(log.args.staker, account, 'The staker account should be correct');
              assert(log.args.balance.eq(expectedStakeBalance), 'The published stake balance should be correct');
            }
          }

          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The updated stake balance should be correct');
        });
    });
  });

  it('should update stake balance with ZERO interest if there is no stake balance', () => {
    return newEXOToken().then(async exoToken => {
      const account = accounts[5];
      await exoToken.transfer(account, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(0, {from: account});
      await helpers.increaseTime(21*24*3600);

      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(account);

      exoToken.updateStakeBalance({from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake balance update should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'UpdateStakeBalance') {
              assert.equal(log.args.staker, account, 'The staker account should be correct');
              assert(log.args.balance.eq(expectedStakeBalance), 'The published stake balance should be correct');
            }
          }

          const stakeBalance = await exoToken.stakeBalanceOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The updated stake balance should be unchanged');
        });
    });
  });

  it('should NOT update stake balance if caller is owner', () => {
    return newEXOToken().then(async exoToken => {
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp);
      await helpers.increaseTime(21*24*3600);

      const expectedStakeBalance = await exoToken.stakeBalanceOf.call(owner);

      exoToken.updateStakeBalance().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake balance update should fail');

        const stakeBalance = await exoToken.stakeBalanceOf.call(owner);
        assert(stakeBalance.eq(expectedStakeBalance), 'The stake balance should be unchanged');
      });
    });
  });

  it('should calculate interest to be ZERO if staking is NOT for at least 7 days since last start time in first interest period', () => {
    return newEXOToken().then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: staker});

      const interest = await exoToken.calculateInterest.call({from: staker});
      assert(interest.eq(new BN(0)), 'The interest should be ZERO');
    });
  });

  it('should calculate interest correctly if staking is for multiple of 7 days since last start time in first interest period', () => {
    return newEXOToken().then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: staker});

      const randomDays = Math.floor((Math.random() * 1095) + 7);
      await helpers.increaseTime(randomDays*24*3600);
      const eligibleStakingDays = (new BN(randomDays)).div(new BN(7)).mul(new BN(7));
      const expectedInterest = (new BN(50)).mul(exp).mul(new BN(10)).mul(eligibleStakingDays).div(new BN(36500));

      const interest = await exoToken.calculateInterest.call({from: staker});
      if (! interest.eq(expectedInterest)) {
        console.log('--FAILED INTEREST CALCULATION--');
        console.log(`randomDays=${randomDays}`);
        console.log(`eligibleStakingDays=${eligibleStakingDays.valueOf()}`);
        console.log(`expectedInterest=${expectedInterest.valueOf()}`);
        console.log(`interest=${interest.valueOf()}`);
      }
      assert(interest.eq(expectedInterest), 'The interest should be correct');
    });
  });

  it('should calculate interest to be ZERO if staking is NOT for at least 7 days since last start time in second interest period', () => {
    return newEXOToken().then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await helpers.increaseTime(1096*24*3600); // jump 3+ years into the future
      await exoToken.depositStake(50*exp, {from: staker});

      const interest = await exoToken.calculateInterest.call({from: staker});
      assert(interest.eq(new BN(0)), 'The interest should be ZERO');
    });
  });

  it('should calculate interest correctly if staking is for multiple of 7 days since last start time in second interest period', () => {
    return newEXOToken().then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await helpers.increaseTime(1096*24*3600); // jump 3+ years into the future
      await exoToken.depositStake(50*exp, {from: staker});

      const randomDays = Math.floor((Math.random() * 73000) + 7);
      await helpers.increaseTime(randomDays*24*3600);
      const eligibleStakingDays = (new BN(randomDays)).div(new BN(7)).mul(new BN(7));
      const expectedInterest = (new BN(50)).mul(exp).mul(new BN(5)).mul(eligibleStakingDays).div(new BN(36500));

      const interest = await exoToken.calculateInterest.call({from: staker});
      if (! interest.eq(expectedInterest)) {
        console.log('--FAILED INTEREST CALCULATION--');
        console.log(`randomDays=${randomDays}`);
        console.log(`eligibleStakingDays=${eligibleStakingDays.valueOf()}`);
        console.log(`expectedInterest=${expectedInterest.valueOf()}`);
        console.log(`interest=${interest.valueOf()}`);
      }
      assert(interest.eq(expectedInterest), 'The interest should be correct');
    });
  });

  it('should calculate interest correctly if staking ranges from one interest period to the next', () => {
    return newEXOToken().then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: staker});

      const randomDays = Math.floor((Math.random() * 73000) + 1096);
      await helpers.increaseTime(randomDays*24*3600);

      const firstEligibleStakingDays = (new BN(1095)).div(new BN(7)).mul(new BN(7));
      const secondEligibleStakingDays = (new BN(randomDays)).sub(new BN(1092)).div(new BN(7)).mul(new BN(7));
      const expectedFirstInterest = (new BN(50)).mul(exp).mul(new BN(10)).mul(firstEligibleStakingDays).div(new BN(36500));
      const expectedSecondInterest = (new BN(50)).mul(exp).mul(new BN(5)).mul(secondEligibleStakingDays).div(new BN(36500));
      const expectedTotalInterest = expectedFirstInterest.add(expectedSecondInterest);

      const interest = await exoToken.calculateInterest.call({from: staker});
      if (! interest.eq(expectedTotalInterest)) {
        console.log('--FAILED INTEREST CALCULATION--');
        console.log(`randomDays=${randomDays}`);
        console.log(`firstEligibleStakingDays=${firstEligibleStakingDays.valueOf()}`);
        console.log(`secondEligibleStakingDays=${secondEligibleStakingDays.valueOf()}`);
        console.log(`expectedTotalInterest=${expectedTotalInterest.valueOf()}`);
        console.log(`interest=${interest.valueOf()}`);
      }
      assert(interest.eq(expectedTotalInterest), 'The interest should be correct');
    });
  });

  it('should calculate interest to be ZERO if staking is NOT for at least 7 days since last start time in the middle of two interest periods', () => {
    return newEXOToken().then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await helpers.increaseTime(1093*24*3600);
      await exoToken.depositStake(50*exp, {from: staker});
      await helpers.increaseTime(4*24*3600);

      const interest = await exoToken.calculateInterest.call({from: staker});
      assert(interest.eq(new BN(0)), 'The interest should be ZERO');
    });
  });

  it('should calculate interest to be ZERO if there is no stake balance', () => {
    return newEXOToken().then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);

      const interest = await exoToken.calculateInterest.call({from: staker});
      assert(interest.eq(new BN(0)), 'The interest should be ZERO');
    });
  });

  it('should calculate interest to be exactly as owner\'s remaining balance if the balance is insufficient', () => {
    return newEXOToken({totalSupply: 40000110, minBalanceForStakeReward: 0}).then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: staker});
      await helpers.increaseTime(1093*24*3600);

      const ownerBalance = await exoToken.balanceOf.call(owner);
      const interest = await exoToken.calculateInterest.call({from: staker});
      assert(interest.eq(ownerBalance), 'The interest should be equal to owner\'s remaining balance');
    });
  });

  it('should calculate interest to be ZERO if owner\'s remaining balance is ZERO', () => {
    return newEXOToken({totalSupply: 40000100, minBalanceForStakeReward: 0}).then(async exoToken => {
      const staker = accounts[5];
      await exoToken.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exoToken);
      await exoToken.depositStake(50*exp, {from: staker});
      await helpers.increaseTime(8*24*3600);

      const interest = await exoToken.calculateInterest.call({from: staker});
      assert(interest.eq(new BN(0)), 'The interest should be ZERO');
    });
  });

  it('should move locked fund to new carrier\'s account and publish new treasury carrier', () => {
    return newEXOToken().then(async exoToken => {
      const initialLockedFund = await exoToken.lockedFundOf.call('treasury');
      assert(initialLockedFund.eq(LOCKED_TREASURY_FUND), 'The initial locked fund should be correct');

      await exoRole.roleAdd('treasuryCarrier', treasuryCarrier);
      exoToken.setTreasuryCarrier(addressZero, treasuryCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The locked fund should be moved to new carrier\'s account');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'Transfer') {
              assert.equal(log.args.from, exoToken.address, 'The transfer should originate from EXO Token contract');
              assert.equal(log.args.to, treasuryCarrier, 'The transfer should be designated to new carrier');
              assert(log.args.value.eq(LOCKED_TREASURY_FUND), 'The published transfer value should be correct');
            } else if (log.event === 'SetTreasuryCarrier') {
              assert.equal(log.args.oldCarrier, addressZero, 'The published old carrier should be correct');
              assert.equal(log.args.newCarrier, treasuryCarrier, 'The published new carrier should be correct');
            }
          }

          const lockedFund = await exoToken.lockedFundOf.call('treasury');
          const newCarrierBalance = await exoToken.balanceOf.call(treasuryCarrier);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert(newCarrierBalance.eq(initialLockedFund), 'New carrier\'s balance should be correct');
        });
    });
  });

  it('should move fund from old carrier\'s account to new carrier\'s account and publish new treasury carrier', () => {
    return newEXOToken().then(async exoToken => {
      await exoRole.roleAdd('treasuryCarrier', treasuryCarrier);
      await exoToken.setTreasuryCarrier(addressZero, treasuryCarrier);
      const initialOldCarrierBalance = await exoToken.balanceOf.call(treasuryCarrier);
      assert(initialOldCarrierBalance.eq(LOCKED_TREASURY_FUND), 'The initial old carrier\'s balance should be correct');
      const newCarrier = accounts[7];

      await exoRole.roleAdd('treasuryCarrier', newCarrier);
      exoToken.setTreasuryCarrier(treasuryCarrier, newCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The old carrier\'s fund should be moved to new carrier\'s account');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'Transfer') {
              assert.equal(log.args.from, treasuryCarrier, 'The transfer should originate from old carrier');
              assert.equal(log.args.to, newCarrier, 'The transfer should be designated to new carrier');
              assert(log.args.value.eq(initialOldCarrierBalance), 'The published transfer value should be correct');
            } else if (log.event === 'SetTreasuryCarrier') {
              assert.equal(log.args.oldCarrier, treasuryCarrier, 'The published old carrier should be correct');
              assert.equal(log.args.newCarrier, newCarrier, 'The published new carrier should be correct');
            }
          }

          const lockedFund = await exoToken.lockedFundOf.call('treasury');
          const oldCarrierBalance = await exoToken.balanceOf.call(treasuryCarrier);
          const newCarrierBalance = await exoToken.balanceOf.call(newCarrier);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert(oldCarrierBalance.eq(new BN(0)), 'Old carrier\'s balance should be ZERO');
          assert(newCarrierBalance.eq(initialOldCarrierBalance), 'New carrier\'s balance should be correct');
        });
    });
  });

  it('should NOT move treasury fund+publish carrier if new carrier\'s account has more than ZERO balance', () => {
    return newEXOToken().then(async exoToken => {
      const initialLockedFund = await exoToken.lockedFundOf.call('treasury');
      assert(initialLockedFund.eq(LOCKED_TREASURY_FUND), 'The initial locked fund should be correct');

      await exoToken.transfer(treasuryCarrier, 1*exp);
      await exoRole.roleAdd('treasuryCarrier', treasuryCarrier);
      exoToken.setTreasuryCarrier(addressZero, treasuryCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exoToken.lockedFundOf.call('treasury');
          const accountBalance = await exoToken.balanceOf.call(treasuryCarrier);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert(accountBalance.eq((new BN(1)).mul(exp)), 'Account\'s balance should be unchanged');
        });
    });
  });

  it('should NOT move treasury fund+publish carrier if new carrier is the same as old carrier', () => {
    return newEXOToken().then(async exoToken => {
      await exoRole.roleAdd('treasuryCarrier', treasuryCarrier);
      await exoToken.setTreasuryCarrier(addressZero, treasuryCarrier);

      exoToken.setTreasuryCarrier(treasuryCarrier, treasuryCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The old carrier\'s fund should NOT be moved');
        });
    });
  });

  it('should NOT move treasury fund+publish carrier if new carrier has account address of 0x0', () => {
    return newEXOToken().then(async exoToken => {
      await exoRole.roleAdd('treasuryCarrier', treasuryCarrier);
      await exoToken.setTreasuryCarrier(addressZero, treasuryCarrier);
      await exoRole.roleAdd('treasuryCarrier', addressZero);
      exoToken.setTreasuryCarrier(treasuryCarrier, addressZero)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exoToken.lockedFundOf.call('treasury');
          const accountBalance = await exoToken.balanceOf.call(addressZero);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move treasury fund+publish carrier if new carrier has account address of owner', () => {
    return newEXOToken().then(async exoToken => {
      const initialOwnerBalance = await exoToken.balanceOf.call(owner);
      const initialLockedFund = await exoToken.lockedFundOf.call('treasury');
      assert(initialLockedFund.eq(LOCKED_TREASURY_FUND), 'The initial locked fund should be correct');

      await exoRole.roleAdd('treasuryCarrier', owner);
      exoToken.setTreasuryCarrier(addressZero, owner)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exoToken.lockedFundOf.call('treasury');
          const ownerBalance = await exoToken.balanceOf.call(owner);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert(ownerBalance.eq(initialOwnerBalance), 'Owner\'s balance should be unchanged');
        });
    });
  });

  it('should NOT move treasury fund+publish carrier if new carrier has account address of another carrier', () => {
    return newEXOToken().then(async exoToken => {
      const initialLockedFund = await exoToken.lockedFundOf.call('treasury');
      assert(initialLockedFund.eq(LOCKED_TREASURY_FUND), 'The initial locked fund should be correct');

      const callback = carrier => {
        return async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exoToken.lockedFundOf.call('treasury');
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
        };
      };

      // Add them to their respective roles.
      await exoRole.roleAdd('preSaleCarrier', preSaleCarrier);
      await exoRole.roleAdd('airdropCarrier', airdropCarrier);

      // Test.
      await exoRole.roleAdd('treasuryCarrier', preSaleCarrier);
      exoToken.setTreasuryCarrier(addressZero, preSaleCarrier).then(callback(preSaleCarrier));
      await exoRole.roleAdd('treasuryCarrier', airdropCarrier);
      exoToken.setTreasuryCarrier(addressZero, airdropCarrier).then(callback(airdropCarrier));
    });
  });

  it('should NOT move treasury fund+publish carrier if caller is NOT owner', () => {
    return newEXOToken().then(async exoToken => {
      const initialLockedFund = await exoToken.lockedFundOf.call('treasury');
      assert(initialLockedFund.eq(LOCKED_TREASURY_FUND), 'The initial locked fund should be correct');

      await exoRole.roleAdd('treasuryCarrier', treasuryCarrier);
      exoToken.setTreasuryCarrier(addressZero, treasuryCarrier, {from: accounts[7]})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exoToken.lockedFundOf.call('treasury');
          const accountBalance = await exoToken.balanceOf.call(treasuryCarrier);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move treasury fund+publish carrier if old address supplied is not treasury carrier (except 0x0)', () => {
    return newEXOToken().then(async exoToken => {
      await exoRole.roleAdd('treasuryCarrier', treasuryCarrier);
      exoToken.setTreasuryCarrier(addressZero, treasuryCarrier)
      const oldCarrier = accounts[5];
      const newCarrier = accounts[7];
      const expectedOldAccountBalance = await exoToken.balanceOf.call(oldCarrier);

      await exoRole.roleAdd('treasuryCarrier', newCarrier);
      exoToken.setTreasuryCarrier(oldCarrier, newCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The treasury fund should NOT be moved');

          const oldAccountBalance = await exoToken.balanceOf.call(oldCarrier);
          const accountBalance = await exoToken.balanceOf.call(newCarrier);
          assert(oldAccountBalance.eq(expectedOldAccountBalance), 'Old account\'s balance should be unchanged');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move treasury fund+publish carrier if new address supplied is not treasury carrier', () => {
    return newEXOToken().then(async exoToken => {
      await exoRole.roleAdd('treasuryCarrier', treasuryCarrier);
      exoToken.setTreasuryCarrier(addressZero, treasuryCarrier);
      const expectedOldAccountBalance = await exoToken.balanceOf.call(treasuryCarrier);
      const newCarrier = accounts[7];

      exoToken.setTreasuryCarrier(treasuryCarrier, newCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The treasury fund should NOT be moved');

          const oldAccountBalance = await exoToken.balanceOf.call(treasuryCarrier);
          const accountBalance = await exoToken.balanceOf.call(newCarrier);
          assert(oldAccountBalance.eq(expectedOldAccountBalance), 'Old account\'s balance should be unchanged');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should move locked fund to new carrier\'s account and set the new pre-sale carrier', () => {
    return newEXOToken().then(async exoToken => {
      const initialLockedFund = await exoToken.lockedFundOf.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');

      await exoRole.roleAdd('preSaleCarrier', preSaleCarrier);
      exoToken.setPreSaleCarrier(addressZero, preSaleCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The locked fund should be moved to new carrier\'s account');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'Transfer') {
              assert.equal(log.args.from, exoToken.address, 'The transfer should originate from EXO Token contract');
              assert.equal(log.args.to, preSaleCarrier, 'The transfer should be designated to new carrier');
              assert(log.args.value.eq(LOCKED_PRESALE_FUND), 'The published transfer value should be correct');
            } else if (log.event === 'SetPreSaleCarrier') {
              assert.equal(log.args.oldCarrier, addressZero, 'The published old carrier should be correct');
              assert.equal(log.args.newCarrier, preSaleCarrier, 'The published new carrier should be correct');
            }
          }

          const lockedFund = await exoToken.lockedFundOf.call('preSale');
          const newCarrierBalance = await exoToken.balanceOf.call(preSaleCarrier);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert(newCarrierBalance.eq(initialLockedFund), 'New carrier\'s balance should be correct');
        });
    });
  });

  it('should move fund from old carrier\'s account to new carrier\'s account and set the new pre-sale carrier', () => {
    return newEXOToken().then(async exoToken => {
      await exoRole.roleAdd('preSaleCarrier', preSaleCarrier);
      await exoToken.setPreSaleCarrier(addressZero, preSaleCarrier);
      const initialOldCarrierBalance = await exoToken.balanceOf.call(preSaleCarrier);
      assert(initialOldCarrierBalance.eq(LOCKED_PRESALE_FUND), 'The initial old carrier\'s balance should be correct');
      const newCarrier = accounts[7];

      await exoRole.roleAdd('preSaleCarrier', newCarrier);
      exoToken.setPreSaleCarrier(preSaleCarrier, newCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The old carrier\'s fund should be moved to new carrier\'s account');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'Transfer') {
              assert.equal(log.args.from, preSaleCarrier, 'The transfer should originate from old carrier');
              assert.equal(log.args.to, newCarrier, 'The transfer should be designated to new carrier');
              assert(log.args.value.eq(initialOldCarrierBalance), 'The published transfer value should be correct');
            } else if (log.event === 'SetPreSaleCarrier') {
              assert.equal(log.args.oldCarrier, preSaleCarrier, 'The published old carrier should be correct');
              assert.equal(log.args.newCarrier, newCarrier, 'The published new carrier should be correct');
            }
          }

          const lockedFund = await exoToken.lockedFundOf.call('preSale');
          const oldCarrierBalance = await exoToken.balanceOf.call(preSaleCarrier);
          const newCarrierBalance = await exoToken.balanceOf.call(newCarrier);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert(oldCarrierBalance.eq(new BN(0)), 'Old carrier\'s balance should be ZERO');
          assert(newCarrierBalance.eq(initialOldCarrierBalance), 'New carrier\'s balance should be correct');
        });
    });
  });

  it('should NOT move pre-sale fund+publish carrier if new carrier\'s account has more than ZERO balance', () => {
    return newEXOToken().then(async exoToken => {
      const initialLockedFund = await exoToken.lockedFundOf.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');

      await exoToken.transfer(preSaleCarrier, 1*exp);
      await exoRole.roleAdd('preSaleCarrier', preSaleCarrier);
      exoToken.setPreSaleCarrier(addressZero, preSaleCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exoToken.lockedFundOf.call('preSale');
          const accountBalance = await exoToken.balanceOf.call(preSaleCarrier);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert(accountBalance.eq((new BN(1)).mul(exp)), 'Account\'s balance should be unchanged');
        });
    });
  });

  it('should NOT move pre-sale fund+publish carrier if new carrier is the same as old carrier', () => {
    return newEXOToken().then(async exoToken => {
      await exoRole.roleAdd('preSaleCarrier', preSaleCarrier);
      await exoToken.setPreSaleCarrier(addressZero, preSaleCarrier);
      exoToken.setPreSaleCarrier(preSaleCarrier, preSaleCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The old carrier\'s fund should NOT be moved');
        });
    });
  });

  it('should NOT move pre-sale fund+publish carrier if new carrier has account address of 0x0', () => {
    return newEXOToken().then(async exoToken => {
      await exoRole.roleAdd('preSaleCarrier', preSaleCarrier);
      await exoToken.setPreSaleCarrier(addressZero, preSaleCarrier);
      await exoRole.roleAdd('preSaleCarrier', addressZero);
      exoToken.setPreSaleCarrier(preSaleCarrier, addressZero)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exoToken.lockedFundOf.call('preSale');
          const accountBalance = await exoToken.balanceOf.call(addressZero);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move pre-sale fund+publish carrier if new carrier has account address of owner', () => {
    return newEXOToken().then(async exoToken => {
      const initialOwnerBalance = await exoToken.balanceOf.call(owner);
      const initialLockedFund = await exoToken.lockedFundOf.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');

      await exoRole.roleAdd('preSaleCarrier', owner);
      exoToken.setPreSaleCarrier(addressZero, owner)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exoToken.lockedFundOf.call('preSale');
          const ownerBalance = await exoToken.balanceOf.call(owner);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert(ownerBalance.eq(initialOwnerBalance), 'Owner\'s balance should be unchanged');
        });
    });
  });

  it('should NOT move pre-sale fund+publish carrier if new carrier has account address of another carrier', () => {
    return newEXOToken().then(async exoToken => {
      const initialLockedFund = await exoToken.lockedFundOf.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');

      const callback = carrier => {
        return async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exoToken.lockedFundOf.call('preSale');
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
        };
      };

      // Add them to their respective roles.
      await exoRole.roleAdd('treasuryCarrier', treasuryCarrier);
      await exoRole.roleAdd('airdropCarrier', airdropCarrier);

      // Test.
      await exoRole.roleAdd('preSaleCarrier', treasuryCarrier);
      exoToken.setPreSaleCarrier(addressZero, treasuryCarrier).then(callback(treasuryCarrier));
      await exoRole.roleAdd('preSaleCarrier', airdropCarrier);
      exoToken.setPreSaleCarrier(addressZero, airdropCarrier).then(callback(airdropCarrier));
    });
  });

  it('should NOT move pre-sale fund+publish carrier if caller is NOT owner', () => {
    return newEXOToken().then(async exoToken => {
      const initialLockedFund = await exoToken.lockedFundOf.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');

      await exoRole.roleAdd('preSaleCarrier', preSaleCarrier);
      exoToken.setPreSaleCarrier(addressZero, preSaleCarrier, {from: accounts[7]})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exoToken.lockedFundOf.call('preSale');
          const accountBalance = await exoToken.balanceOf.call(preSaleCarrier);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move pre-sale fund+publish carrier if pre-sale has ended', () => {
    return newEXOToken().then(async exoToken => {
      const initialLockedFund = await exoToken.lockedFundOf.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');

      await fastForwardToAfterPreSale(exoToken);
      await exoRole.roleAdd('preSaleCarrier', preSaleCarrier);
      exoToken.setPreSaleCarrier(addressZero, preSaleCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exoToken.lockedFundOf.call('preSale');
          const accountBalance = await exoToken.balanceOf.call(preSaleCarrier);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move pre-sale fund+publish carrier if old address supplied is not pre-sale carrier (except 0x0)', () => {
    return newEXOToken().then(async exoToken => {
      await exoRole.roleAdd('preSaleCarrier', preSaleCarrier);
      exoToken.setPreSaleCarrier(addressZero, preSaleCarrier)
      const oldCarrier = accounts[5];
      const newCarrier = accounts[7];
      const expectedOldAccountBalance = await exoToken.balanceOf.call(oldCarrier);

      await exoRole.roleAdd('preSaleCarrier', newCarrier);
      exoToken.setPreSaleCarrier(oldCarrier, newCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale fund should NOT be moved');

          const oldAccountBalance = await exoToken.balanceOf.call(oldCarrier);
          const accountBalance = await exoToken.balanceOf.call(newCarrier);
          assert(oldAccountBalance.eq(expectedOldAccountBalance), 'Old account\'s balance should be unchanged');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move pre-sale fund+publish carrier if new address supplied is not pre-sale carrier', () => {
    return newEXOToken().then(async exoToken => {
      await exoRole.roleAdd('preSaleCarrier', preSaleCarrier);
      exoToken.setPreSaleCarrier(addressZero, preSaleCarrier);
      const expectedOldAccountBalance = await exoToken.balanceOf.call(preSaleCarrier);
      const newCarrier = accounts[7];

      exoToken.setPreSaleCarrier(preSaleCarrier, newCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale fund should NOT be moved');

          const oldAccountBalance = await exoToken.balanceOf.call(preSaleCarrier);
          const accountBalance = await exoToken.balanceOf.call(newCarrier);
          assert(oldAccountBalance.eq(expectedOldAccountBalance), 'Old account\'s balance should be unchanged');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

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
        {gas: 8000000}
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
        {gas: 8000000}
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

  // External functions should be non-reentrant.
});
