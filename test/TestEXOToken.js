const BN = require('bn.js');
const EXOToken = artifacts.require('EXOToken');
const helpers = require('./helpers');
const toBN = helpers.toBN;
const exp = (new BN(10)).pow(new BN(18));

const TOTAL_SUPPLY = (new BN(100000000)).mul(exp);
const MIN_BALANCE_FOR_STAKE_REWARD = (new BN(50000000)).mul(exp);
const LOCKED_TREASURY_FUND = (new BN(10000000)).mul(exp);
const LOCKED_PRESALE_FUND = (new BN(5000000)).mul(exp);
const PRESALE_ETH_TO_EXO = new BN(7300);
const PRESALE_DURATION = new BN(1209600);
const AVAILABLE_ICO_FUND = (new BN(25000000)).mul(exp);
const MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE = (new BN(3650)).mul(exp);
const MAX_ICO_TOKENS_BOUGHT = (new BN(18250)).mul(exp);
const ICO_ETH_TO_EXO = new BN(3650);
const ICO_DURATION = new BN(2419200);
const AIRDROP_AMOUNT = (new BN(10)).mul(exp);

const newEXOToken = (changes = {}) => {
  const argsObj = {
    totalSupply: TOTAL_SUPPLY.div(exp).toNumber(),
    minBalanceForStakeReward: MIN_BALANCE_FOR_STAKE_REWARD.div(exp).toNumber(),
    lockedTreasuryFund: LOCKED_TREASURY_FUND.div(exp).toNumber(),
    lockedPreSaleFund: LOCKED_PRESALE_FUND.div(exp).toNumber(),
    preSaleEthToExo: PRESALE_ETH_TO_EXO.toNumber(),
    preSaleDuration: PRESALE_DURATION.toNumber(),
    availableICOFund: AVAILABLE_ICO_FUND.div(exp).toNumber(),
    minICOTokensBoughtEveryPurchase: MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(exp).toNumber(),
    maxICOTokensBought: MAX_ICO_TOKENS_BOUGHT.div(exp).toNumber(),
    ICOEthToExo: ICO_ETH_TO_EXO.toNumber(),
    ICODuration: ICO_DURATION.toNumber(),
    airdropAmount: AIRDROP_AMOUNT.div(exp).toNumber()
  };
  Object.assign(argsObj, changes);
  const args = Object.values(argsObj);
  return EXOToken.new(...args);
};

const logContract = async (exo, target) => {
  const owner = await exo.owner.call();
  const treasuryCarrier = await exo.treasuryCarrier.call();
  const preSaleCarrier = await exo.preSaleCarrier.call();

  console.log('');
  console.log('EXOToken');
  console.log('==============================');
  console.log(`BALANCE=${web3.eth.getBalance(exo.address)}`);
  if (target) {
    console.log('');
    console.log(`target's balance=${await exo.balanceOf.call(target)}`);
    console.log(`target's stake balance=${await exo.stakeBalanceOf.call(target)}`);
    console.log(`target's stake start time=${await exo.stakeStartTimeOf.call(target)}`);
    console.log(`ICO tokens bought by target=${await exo.ICOTokensBought.call(target)}`);
    console.log(`is target airdropped?=${await exo.airdropped.call(target)}`);
    console.log('');
  }
  console.log(`owner=${owner}`);
  console.log(`owner's ETH balance=${await web3.eth.getBalance(owner)}`);
  console.log(`owner's EXO balance=${await exo.balanceOf.call(owner)}`);
  console.log('');
  console.log(`lockedFunds["treasury"]=${await exo.lockedFunds.call("treasury")}`);
  console.log(`treasuryCarrier=${treasuryCarrier}`);
  console.log(`treasuryCarrier's EXO balance=${await exo.balanceOf.call(treasuryCarrier)}`);
  console.log('');
  console.log(`lockedFunds["preSale"]=${await exo.lockedFunds.call("preSale")}`);
  console.log(`preSaleCarrier=${preSaleCarrier}`);
  console.log(`preSaleCarrier's EXO balance=${await exo.balanceOf.call(preSaleCarrier)}`);
  console.log(`preSaleStartTime=${await exo.preSaleStartTime.call()}`);
  console.log(`preSaleDeadline=${await exo.preSaleDeadline.call()}`);
  console.log(`preSaleEnded=${await exo.preSaleEnded.call()}`);
  console.log('');
  console.log(`availableICOFund=${await exo.availableICOFund.call()}`);
  console.log(`ICOStartTime=${await exo.ICOStartTime.call()}`);
  console.log(`ICODeadline=${await exo.ICODeadline.call()}`);
  console.log(`ICOEnded=${await exo.ICOEnded.call()}`);
  console.log(`airdropCarrier=${await exo.airdropCarrier.call()}`);
};

contract('EXOToken', accounts => {
  const owner = accounts[0];
  const treasuryCarrier = accounts[1];
  const preSaleCarrier = accounts[2];
  const airdropCarrier = accounts[3];

  const fastForwardToAfterPreSale = async exo => {
    await exo.setPreSaleCarrier(preSaleCarrier);
    await exo.startPreSale();
    await helpers.increaseTime(PRESALE_DURATION.toNumber() + 1);
  };

  const fastForwardToAfterICO = async exo => {
    await fastForwardToAfterPreSale(exo);
    await exo.startICO();
    await helpers.increaseTime(ICO_DURATION.toNumber() + 1);
  };

  it('should have the correct parameters as deployed', () => {
    return EXOToken.deployed().then(async exo => {
      const totalSupply = await exo.totalSupply.call();
      const minBalanceForStakeReward = await exo.minBalanceForStakeReward.call();
      const lockedTreasuryFund = await exo.lockedFunds.call("treasury");
      const lockedPreSaleFund = await exo.lockedFunds.call("preSale");
      const preSaleEthToExo = await exo.preSaleEthToExo.call();
      const preSaleDuration = await exo.preSaleDuration.call();
      const availableICOFund = await exo.availableICOFund.call();
      const minICOTokensBoughtEveryPurchase = await exo.minICOTokensBoughtEveryPurchase.call();
      const maxICOTokensBought= await exo.maxICOTokensBought.call();
      const ICOEthToExo = await exo.ICOEthToExo.call();
      const ICODuration = await exo.ICODuration.call();
      const airdropAmount = await exo.airdropAmount.call();

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

  it('should start the pre-sale', () => {
    return newEXOToken().then(async exo => {
      const preSaleDuration = await exo.preSaleDuration.call();
      await exo.setPreSaleCarrier(preSaleCarrier);

      exo.startPreSale().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'The pre-sale should be started');

        const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
        const startTime = await exo.preSaleStartTime.call();
        const deadline = await exo.preSaleDeadline.call();

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
    return newEXOToken({lockedPreSaleFund: 0}).then(async exo => {
      await exo.setPreSaleCarrier(preSaleCarrier);

      exo.startPreSale().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale should NOT be started');

        const startTime = await exo.preSaleStartTime.call();
        const deadline = await exo.preSaleDeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should NOT start the pre-sale if no carrier is set', () => {
    return newEXOToken().then(async exo => {
      exo.startPreSale().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale should NOT be started');

        const startTime = await exo.preSaleStartTime.call();
        const deadline = await exo.preSaleDeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should NOT start the pre-sale if it has already been started before', () => {
    return newEXOToken().then(async exo => {
      await exo.setPreSaleCarrier(preSaleCarrier);
      await exo.startPreSale();

      const expectedStartTime = await exo.preSaleStartTime.call();
      const expectedDeadline = await exo.preSaleDeadline.call();

      exo.startPreSale().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale should NOT be started');

        const startTime = await exo.preSaleStartTime.call();
        const deadline = await exo.preSaleDeadline.call();

        assert(startTime.eq(expectedStartTime), 'The start time should be unchanged');
        assert(deadline.eq(expectedDeadline), 'The deadline should be unchanged');
      });
    });
  });

  it('should NOT start the pre-sale if caller is NOT owner', () => {
    return newEXOToken().then(async exo => {
      await exo.setPreSaleCarrier(preSaleCarrier);

      exo.startPreSale({from: accounts[3]}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale should NOT be started');

        const startTime = await exo.preSaleStartTime.call();
        const deadline = await exo.preSaleDeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should end the pre-sale', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);

      exo.endPreSale().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'The pre-sale should be ended');

        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'EndPreSale') {
            assert(log.args.deadline.sub(log.args.startTime).eq(PRESALE_DURATION), 'The published start time and deadline should be correct');
            assert(log.args.remainingPreSaleFund.eq(LOCKED_PRESALE_FUND), 'The published remaining pre-sale fund should be correct');
          }
        }
        assert(await exo.preSaleEnded.call(), 'The pre-sale should be flagged as ended');
      });
    });
  });

  it('should NOT end the pre-sale if it has NOT been started', () => {
    return newEXOToken().then(async exo => {
      await exo.setPreSaleCarrier(preSaleCarrier);
      
      exo.endPreSale().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale should NOT be ended');

        const startTime = await exo.preSaleStartTime.call();
        const deadline = await exo.preSaleDeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
        assert(! await exo.preSaleEnded.call(), 'The pre-sale should NOT be flagged as ended');
      });
    });
  });

  it('should NOT end the pre-sale if its deadline has NOT passed', () => {
    return newEXOToken().then(async exo => {
      await exo.setPreSaleCarrier(preSaleCarrier);
      await exo.startPreSale();
      
      exo.endPreSale().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale should NOT be ended');
        assert(! await exo.preSaleEnded.call(), 'The pre-sale should NOT be flagged as ended');
      });
    });
  });

  it('should NOT end the pre-sale if it has already been ended', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.endPreSale();

      exo.endPreSale().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale should NOT be ended');
      });
    });
  });

  it('should NOT end the pre-sale if caller is NOT owner', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);

      exo.endPreSale({from: accounts[4]}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The pre-sale should NOT be ended');
        assert(! await exo.preSaleEnded.call(), 'The pre-sale should NOT be flagged as ended');
      });
    });
  });

  it('should sell EXO tokens at ICO for an amount of ETH', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.startICO();

      const buyer = accounts[6];
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).add(new BN(1)).div(exp), "ether"));
      const expectedExoBought = amount.mul(ICO_ETH_TO_EXO);
      const expectedBuyerBalance = (await exo.balanceOf(buyer)).add(expectedExoBought);
      const expectedContractBalance = web3.eth.getBalance(exo.address).add(amount);
      const expectedICOFund = (await exo.availableICOFund.call()).sub(expectedExoBought);
      const expectedICOTokensBought = (await exo.ICOTokensBought.call(buyer)).add(expectedExoBought);
      const expectedTotalICOTokensBought = (await exo.totalICOTokensBought.call()).add(expectedExoBought);
      
      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'EXO tokens should be sold');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'Transfer') {
              assert.equal(log.args.from, exo.address, 'The transfer should originate from EXO token contract');
              assert.equal(log.args.to, buyer, 'The transfer should be designated to buyer');
              assert(log.args.value.eq(expectedExoBought), 'The transfer value should be equal to EXO tokens bought');
            }
          }

          const buyerBalance = await exo.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exo.address);
          const remainingICOFund = await exo.availableICOFund.call();
          const ICOTokensBought = await exo.ICOTokensBought.call(buyer);
          const totalICOTokensBought = await exo.totalICOTokensBought.call();
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be correct');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be correct');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be correct');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be correct');
          assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be correct');
        });
    });
  });

  it('should NOT sell EXO tokens at ICO for ETH less than the minimum amount set per purchase', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.startICO();

      const buyer = accounts[6];
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).sub(new BN(1000)).div(exp), "ether"));
      const expectedExoBought = 0;
      const expectedBuyerBalance = await exo.balanceOf(buyer);
      const expectedContractBalance = web3.eth.getBalance(exo.address);
      const expectedICOFund = await exo.availableICOFund.call();
      const expectedICOTokensBought = await exo.ICOTokensBought.call(buyer);
      const expectedTotalICOTokensBought = await exo.totalICOTokensBought.call();

      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exo.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exo.address);
          const remainingICOFund = await exo.availableICOFund.call();
          const ICOTokensBought = await exo.ICOTokensBought.call(buyer);
          const totalICOTokensBought = await exo.totalICOTokensBought.call();
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
          assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be unchanged');
        });
    });
  });

  it('should NOT sell EXO tokens at ICO for ETH more than the maximum amount set for all purchases', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.startICO();

      const buyer = accounts[6];
      let amount = new BN(web3.toWei(MAX_ICO_TOKENS_BOUGHT.div(ICO_ETH_TO_EXO).sub(new BN(100000)).div(exp), "ether"));
      await exo.buyICOTokens({from: buyer, value: amount});

      const expectedExoBought = 0;
      const expectedBuyerBalance = await exo.balanceOf(buyer);
      const expectedContractBalance = web3.eth.getBalance(exo.address);
      const expectedICOFund = await exo.availableICOFund.call();
      const expectedICOTokensBought = await exo.ICOTokensBought.call(buyer);
      const expectedTotalICOTokensBought = await exo.totalICOTokensBought.call();

      amount = new BN(100001);

      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exo.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exo.address);
          const remainingICOFund = await exo.availableICOFund.call();
          const ICOTokensBought = await exo.ICOTokensBought.call(buyer);
          const totalICOTokensBought = await exo.totalICOTokensBought.call();
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
    }).then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.startICO();

      const buyer = accounts[6];
      const amount = MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).add(new BN(1));
      const expectedExoBought = 0;
      const expectedBuyerBalance = await exo.balanceOf(buyer);
      const expectedContractBalance = web3.eth.getBalance(exo.address);
      const expectedICOFund = await exo.availableICOFund.call();
      const expectedICOTokensBought = await exo.ICOTokensBought.call(buyer);
      const expectedTotalICOTokensBought = await exo.totalICOTokensBought.call();

      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exo.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exo.address);
          const remainingICOFund = await exo.availableICOFund.call();
          const ICOTokensBought = await exo.ICOTokensBought.call(buyer);
          const totalICOTokensBought = await exo.totalICOTokensBought.call();
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
          assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be unchanged');
        });
    });
  });

  it('should NOT sell EXO tokens at ICO if ICO has NOT been started', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);

      const buyer = accounts[6];
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).div(exp), "ether"));
      const expectedExoBought = 0;
      const expectedBuyerBalance = await exo.balanceOf(buyer);
      const expectedContractBalance = web3.eth.getBalance(exo.address);
      const expectedICOFund = await exo.availableICOFund.call();
      const expectedICOTokensBought = await exo.ICOTokensBought.call(buyer);
      const expectedTotalICOTokensBought = await exo.totalICOTokensBought.call();

      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exo.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exo.address);
          const remainingICOFund = await exo.availableICOFund.call();
          const ICOTokensBought = await exo.ICOTokensBought.call(buyer);
          const totalICOTokensBought = await exo.totalICOTokensBought.call();
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
          assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be unchanged');
        });
    });
  });

  it('should NOT sell EXO tokens at ICO if its deadline has passed', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterICO(exo);

      const buyer = accounts[6];
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).div(exp), "ether"));
      const expectedExoBought = 0;
      const expectedBuyerBalance = await exo.balanceOf(buyer);
      const expectedContractBalance = web3.eth.getBalance(exo.address);
      const expectedICOFund = await exo.availableICOFund.call();
      const expectedICOTokensBought = await exo.ICOTokensBought.call(buyer);
      const expectedTotalICOTokensBought = await exo.totalICOTokensBought.call();

      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exo.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exo.address);
          const remainingICOFund = await exo.availableICOFund.call();
          const ICOTokensBought = await exo.ICOTokensBought.call(buyer);
          const totalICOTokensBought = await exo.totalICOTokensBought.call();
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
          assert(totalICOTokensBought.eq(expectedTotalICOTokensBought), 'The total ICO tokens bought should be unchanged');
        });
    });
  });

  it('should start the ICO', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);

      exo.startICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'ICO should be started');

        const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
        const startTime = await exo.ICOStartTime.call();
        const deadline = await exo.ICODeadline.call();

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
    return newEXOToken().then(async exo => {
      exo.startICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be started');

        const startTime = await exo.ICOStartTime.call();
        const deadline = await exo.ICODeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should NOT start the ICO if the pre-sale has NOT been ended', () => {
    return newEXOToken().then(async exo => {
      await exo.setPreSaleCarrier(preSaleCarrier);
      await exo.startPreSale();

      exo.startICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be started');

        const startTime = await exo.ICOStartTime.call();
        const deadline = await exo.ICODeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should NOT start the ICO if it has already been started before', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.startICO();
      const expectedStartTime = await exo.ICOStartTime.call();
      const expectedDeadline = await exo.ICODeadline.call();

      exo.startICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be started');

        const startTime = await exo.ICOStartTime.call();
        const deadline = await exo.ICODeadline.call();

        assert(startTime.eq(expectedStartTime), 'The start time should be unchanged');
        assert(deadline.eq(expectedDeadline), 'The deadline should be unchanged');
      });
    });
  });

  it('should NOT start the ICO if there is no available fund', () => {
    return newEXOToken({availableICOFund: 0}).then(async exo => {
      await fastForwardToAfterPreSale(exo);

      exo.startICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be started');

        const startTime = await exo.ICOStartTime.call();
        const deadline = await exo.ICODeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should NOT start the ICO if caller is NOT owner', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);

      exo.startICO({from: accounts[6]}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be started');

        const startTime = await exo.ICOStartTime.call();
        const deadline = await exo.ICODeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
      });
    });
  });

  it('should end the ICO', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterICO(exo);

      exo.endICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'The ICO should be ended');

        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'EndICO') {
            assert(log.args.deadline.sub(log.args.startTime).eq(ICO_DURATION), 'The published start time and deadline should be correct');
            assert(log.args.totalICOTokensBought.eq(0), 'The published total ICO tokens bought should be correct');
          }
        }
        assert(await exo.ICOEnded.call(), 'The ICO should be flagged as ended');
        assert((await exo.totalICOTokensBought.call()).eq(0), 'The total ICO tokens bought should be correct');
      });
    });
  });

  it('should NOT end the ICO if it has NOT been started', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      
      exo.endICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be ended');

        const startTime = await exo.ICOStartTime.call();
        const deadline = await exo.ICODeadline.call();

        assert(startTime.eq(new BN(0)), 'The start time should be equal to 0');
        assert(deadline.eq(new BN(0)), 'The deadline should be equal to 0');
        assert(! await exo.ICOEnded.call(), 'The ICO should NOT be flagged as ended');
      });
    });
  });

  it('should NOT end the ICO if its deadline has not passed', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.startICO();
      
      exo.endICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be ended');
        assert(! await exo.ICOEnded.call(), 'The ICO should NOT be flagged as ended');
      });
    });
  });

  it('should NOT end the ICO if it has already been ended', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterICO(exo);
      await exo.endICO();
      
      exo.endICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be ended');
      });
    });
  });

  it('should NOT end the ICO if caller is NOT owner', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterICO(exo);
      
      exo.endICO({from: accounts[6]}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The ICO should NOT be ended');
        assert(! await exo.ICOEnded.call(), 'The ICO should NOT be flagged as ended');
      });
    });
  });

  it('should release the remaining ICO fund to owner', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterICO(exo);
      const availableICOFund = await exo.availableICOFund.call();
      const expectedOwnerBalance = (await exo.balanceOf.call(owner)).add(availableICOFund);

      exo.releaseRemainingICOFundToOwner().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'Remaining ICO fund should be released to owner');

        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'Transfer') {
            assert.equal(log.args.from, exo.address, 'The transfer should originate from EXO Token contract');
            assert.equal(log.args.to, owner, 'The transfer should be designated to owner');
            assert(log.args.value.eq(availableICOFund), 'The transfer should be equal to available ICO fund');
          }
        }

        const ownerBalance = await exo.balanceOf.call(owner);
        const remainingICOFund = await exo.availableICOFund.call();
        assert(ownerBalance.eq(expectedOwnerBalance), 'Owner balance should be correct');
        assert(remainingICOFund.eq(0), 'Remaining ICO fund should be 0');
      });
    });
  });

  it('should NOT release the ICO fund to owner if ICO has NOT been started', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      const availableICOFund = await exo.availableICOFund.call();
      const expectedOwnerBalance = await exo.balanceOf.call(owner);

      exo.releaseRemainingICOFundToOwner().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Remaining ICO fund should NOT be released to owner');

        const ownerBalance = await exo.balanceOf.call(owner);
        const remainingICOFund = await exo.availableICOFund.call();
        assert(ownerBalance.eq(expectedOwnerBalance), 'Owner balance should be unchanged');
        assert(remainingICOFund.eq(availableICOFund), 'Remaining ICO fund should be unchanged');
      });
    });
  });

  it('should NOT release the ICO fund to owner if ICO has NOT been ended', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.startICO();

      const availableICOFund = await exo.availableICOFund.call();
      const expectedOwnerBalance = await exo.balanceOf.call(owner);

      exo.releaseRemainingICOFundToOwner().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Remaining ICO fund should NOT be released to owner');

        const ownerBalance = await exo.balanceOf.call(owner);
        const remainingICOFund = await exo.availableICOFund.call();
        assert(ownerBalance.eq(expectedOwnerBalance), 'Owner balance should be unchanged');
        assert(remainingICOFund.eq(availableICOFund), 'Remaining ICO fund should be unchanged');
      });
    });
  });

  it('should NOT release the ICO fund to owner if there is no fund to release', () => {
    return newEXOToken({availableICOFund: 0}).then(async exo => {
      await fastForwardToAfterICO(exo);
      const availableICOFund = await exo.availableICOFund.call();
      const expectedOwnerBalance = await exo.balanceOf.call(owner);

      exo.releaseRemainingICOFundToOwner().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Remaining ICO fund should NOT be released to owner');

        const ownerBalance = await exo.balanceOf.call(owner);
        const remainingICOFund = await exo.availableICOFund.call();
        assert(ownerBalance.eq(expectedOwnerBalance), 'Owner balance should be unchanged');
        assert(remainingICOFund.eq(availableICOFund), 'Remaining ICO fund should be unchanged');
      });
    });
  });

  it('should NOT release the ICO fund to owner if caller is NOT owner', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterICO(exo);
      const availableICOFund = await exo.availableICOFund.call();
      const expectedOwnerBalance = await exo.balanceOf.call(owner);

      exo.releaseRemainingICOFundToOwner({from: accounts[6]}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Remaining ICO fund should NOT be released to owner');

        const ownerBalance = await exo.balanceOf.call(owner);
        const remainingICOFund = await exo.availableICOFund.call();
        assert(ownerBalance.eq(expectedOwnerBalance), 'Owner balance should be unchanged');
        assert(remainingICOFund.eq(availableICOFund), 'Remaining ICO fund should be unchanged');
      });
    });
  });

  it('should allow owner to claim Ether fund raised in ICO', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.startICO();

      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).div(exp), "ether"));
      const exoBought = amount.mul(ICO_ETH_TO_EXO);
      await exo.buyICOTokens({from: accounts[7], value: amount});

      const availableICOFund = await exo.availableICOFund.call();
      const contractBalance = web3.eth.getBalance(exo.address);
      assert(availableICOFund.eq(AVAILABLE_ICO_FUND.sub(exoBought)), 'The remaining ICO fund should be correct');
      assert(contractBalance.eq(amount), 'The contract balance should be correct');
      await helpers.increaseTime(ICO_DURATION.toNumber() + 1);

      const initialOwnerEthBalance = web3.eth.getBalance(owner);

      exo.claimEtherFundRaisedInICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 1, 'Ether fund raised should be claimed by owner');

        for (let i = 0; i < result.logs.length; i++) {
          const log = result.logs[i];
          if (log.event === 'TransferETH') {
            assert(log.args.from, exo.address, 'The transfer should originate from EXO Token contract');
            assert(log.args.to, owner, 'The transfer should be designated to owner');
            assert(log.args.value.eq(amount), 'The transfer value should be correct');
          }
        }

        const contractBalance = web3.eth.getBalance(exo.address);
        const ownerEthBalance = web3.eth.getBalance(owner);
        assert(contractBalance.eq(new BN(0)), 'Remaining contract balance should be 0');
        assert(ownerEthBalance.gt(initialOwnerEthBalance), 'Owner ETH balance should be greater than before');
      });
    });
  });

  it('should NOT allow owner to claim Ether fund raised in ICO if ICO has NOT started', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      const expectedContractBalance = web3.eth.getBalance(exo.address);
      const expectedOwnerEthBalance = web3.eth.getBalance(owner);

      exo.claimEtherFundRaisedInICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Ether fund raised should NOT be claimed by owner');

        const contractBalance = web3.eth.getBalance(exo.address);
        const ownerEthBalance = web3.eth.getBalance(owner);
        assert(contractBalance.eq(expectedContractBalance), 'Remaining contract balance should be unchanged');
        assert(ownerEthBalance.lt(expectedOwnerEthBalance), 'Owner ETH balance should be less than before');
      });
    });
  });

  it('should NOT allow owner to claim Ether fund raised in ICO if ICO has NOT ended', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.startICO();

      const expectedContractBalance = web3.eth.getBalance(exo.address);
      const expectedOwnerEthBalance = web3.eth.getBalance(owner);

      exo.claimEtherFundRaisedInICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Ether fund raised should NOT be claimed by owner');

        const contractBalance = web3.eth.getBalance(exo.address);
        const ownerEthBalance = web3.eth.getBalance(owner);
        assert(contractBalance.eq(expectedContractBalance), 'Remaining contract balance should be unchanged');
        assert(ownerEthBalance.lt(expectedOwnerEthBalance), 'Owner ETH balance should be less than before');
      });
    });
  });

  it('should NOT allow owner to claim Ether fund raised in ICO if there is no fund', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterICO(exo);

      const expectedContractBalance = web3.eth.getBalance(exo.address);
      const expectedOwnerEthBalance = web3.eth.getBalance(owner);

      exo.claimEtherFundRaisedInICO().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Ether fund raised should NOT be claimed by owner');

        const contractBalance = web3.eth.getBalance(exo.address);
        const ownerEthBalance = web3.eth.getBalance(owner);
        assert(contractBalance.eq(expectedContractBalance), 'Remaining contract balance should be unchanged');
        assert(ownerEthBalance.lt(expectedOwnerEthBalance), 'Owner ETH balance should be less than before');
      });
    });
  });

  it('should NOT allow owner to claim Ether fund raised in ICO if caller is NOT owner', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.startICO();

      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).div(exp), "ether"));
      const exoBought = amount.mul(ICO_ETH_TO_EXO);
      await exo.buyICOTokens({from: accounts[7], value: amount});

      const availableICOFund = await exo.availableICOFund.call();
      const expectedContractBalance = web3.eth.getBalance(exo.address);
      assert(availableICOFund.eq(AVAILABLE_ICO_FUND.sub(exoBought)), 'The remaining ICO fund should be correct');
      assert(expectedContractBalance.eq(amount), 'The contract balance should be correct');
      await helpers.increaseTime(ICO_DURATION.toNumber() + 1);

      const expectedOwnerEthBalance = web3.eth.getBalance(owner);

      exo.claimEtherFundRaisedInICO({from: accounts[6]}).then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'Ether fund raised should NOT be claimed by owner');

        const contractBalance = web3.eth.getBalance(exo.address);
        const ownerEthBalance = web3.eth.getBalance(owner);
        assert(contractBalance.eq(expectedContractBalance), 'Remaining contract balance should be unchanged');
        assert(ownerEthBalance.lte(expectedOwnerEthBalance), 'Owner ETH balance should be less than or equal to before');
      });
    });
  });

  it('should airdrop to a recipient with a specific amount of tokens', () => {
    return newEXOToken().then(async exo => {
      const recipient = accounts[4];
      const airdropAmount = await exo.airdropAmount.call();
      const expectedICOFund = (await exo.availableICOFund.call()).sub(airdropAmount);
      const expectedStakeBalance = (await exo.stakeBalanceOf.call(recipient)).add(airdropAmount);

      await exo.setAirdropCarrier(airdropCarrier);
      await fastForwardToAfterICO(exo);

      exo.airdrop(recipient, {from: airdropCarrier})
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
          const availableICOFund = await exo.availableICOFund.call();
          const stakeBalance = await exo.stakeBalanceOf.call(recipient);
          assert(availableICOFund.eq(expectedICOFund), 'The remaining ICO fund should be 10 tokens less');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be 10 tokens more');
          assert(await exo.airdropped(recipient) == true, 'The recipient should be marked as airdropped');
        });
    })
  });

  it('should reject airdrops from non-carrier accounts', () => {
    return newEXOToken().then(async exo => {
      const recipient = accounts[5];
      const expectedICOFund = await exo.availableICOFund.call();
      const expectedStakeBalance = await exo.stakeBalanceOf.call(recipient);

      await exo.setAirdropCarrier(airdropCarrier);
      await fastForwardToAfterICO(exo);

      exo.airdrop(recipient, {from: treasuryCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const availableICOFund = await exo.availableICOFund.call();
          const stakeBalance = await exo.stakeBalanceOf.call(recipient);
          assert(availableICOFund.eq(expectedICOFund), 'The remaining ICO fund should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be unchanged');
          assert(await exo.airdropped(recipient) == false, 'The recipient should NOT be marked as airdropped');
        });
    });
  });

  it('should fail airdrop if the available ICO fund is insufficient', () => {
    return newEXOToken({
      availableICOFund: AIRDROP_AMOUNT.sub(new BN(1)).div(exp).toNumber()
    }).then(async exo => {
      const recipient = accounts[6];
      const expectedICOFund = await exo.availableICOFund.call();
      const expectedStakeBalance = await exo.stakeBalanceOf.call(recipient);

      await exo.setAirdropCarrier(airdropCarrier);
      await fastForwardToAfterICO(exo);

      exo.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const availableICOFund = await exo.availableICOFund.call();
          const stakeBalance = await exo.stakeBalanceOf.call(recipient);
          assert(availableICOFund.eq(expectedICOFund), 'The remaining ICO fund should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be unchanged');
          assert(await exo.airdropped(recipient) == false, 'The recipient should NOT be marked as airdropped');
        });
    });
  });

  it('should reject airdrops designated to the same account more than once', () => {
    return newEXOToken().then(async exo => {
      const recipient = accounts[5];

      await exo.setAirdropCarrier(airdropCarrier);
      await fastForwardToAfterICO(exo);

      await exo.airdrop(recipient, {from: airdropCarrier});
      const airdropped = await exo.airdropped.call(recipient);
      assert(airdropped, 'The account designated should already be marked as airdropped');

      const expectedICOFund = await exo.availableICOFund.call();
      const expectedStakeBalance = await exo.stakeBalanceOf.call(recipient);

      exo.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const availableICOFund = await exo.availableICOFund.call();
          const stakeBalance = await exo.stakeBalanceOf.call(recipient);
          assert(availableICOFund.eq(expectedICOFund), 'The remaining ICO fund should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be unchanged');
        });
    });
  });

  it('should deposit stake with ZERO interest applied if the staking is NOT for at least 7 days since last start time', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);

      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = (await exo.balanceOf.call(account)).sub(deposit);
      const expectedStakeBalance = (await exo.stakeBalanceOf.call(account)).add(deposit);

      await fastForwardToAfterICO(exo);

      exo.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake deposit should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'DepositStake') {
              assert.equal(log.args.staker, account, 'The stake should be deposited by staker');
              assert(log.args.value.div(exp).eq(new BN(50)), 'The stake value should be 50 tokens');
            }
          }
          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be 50 tokens less');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be 50 tokens more');
        });
    });
  });

  it('should deposit stake with interest applied to current stake', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: account});
      await helpers.increaseTime(7*24*3600);

      const deposit = (new BN(50)).mul(exp);
      const expectedInterest = await exo.calculateInterest.call({from: account});
      const expectedBalance = (await exo.balanceOf.call(account)).sub(deposit);
      const expectedStakeBalance = (await exo.stakeBalanceOf.call(account)).add(deposit).add(expectedInterest);

      exo.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake deposit should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'DepositStake') {
              assert.equal(log.args.staker, account, 'The stake should be deposited by staker');
              assert(log.args.value.div(exp).eq(new BN(50)), 'The published stake value should be correct');
            }
          }
          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be correct');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be correct');
        });
    });
  });

  it('should NOT deposit stake if balance is insufficient', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 49*exp);

      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = await exo.balanceOf.call(account);
      const expectedStakeBalance = await exo.stakeBalanceOf.call(account);

      await fastForwardToAfterICO(exo);

      exo.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT deposit stake if deposit value is NOT more than ZERO', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);

      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = await exo.balanceOf.call(account);
      const expectedStakeBalance = await exo.stakeBalanceOf.call(account);

      await fastForwardToAfterICO(exo);

      exo.depositStake(0, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT deposit stake if ICO has NOT started', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);

      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = await exo.balanceOf.call(account);
      const expectedStakeBalance = await exo.stakeBalanceOf.call(account);

      await fastForwardToAfterPreSale(exo);

      exo.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT deposit stake if ICO has NOT ended', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);

      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = await exo.balanceOf.call(account);
      const expectedStakeBalance = await exo.stakeBalanceOf.call(account);

      await fastForwardToAfterPreSale(exo);
      await exo.startICO();

      exo.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT deposit stake if caller is owner', () => {
    return newEXOToken().then(async exo => {
      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = await exo.balanceOf.call(owner);
      const expectedStakeBalance = await exo.stakeBalanceOf.call(owner);

      await fastForwardToAfterICO(exo);

      exo.depositStake(50*exp, {from: owner})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exo.balanceOf.call(owner);
          const stakeBalance = await exo.stakeBalanceOf.call(owner);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should withdraw stake with ZERO interest applied if the staking is NOT for at least 7 days since last start time', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: account});

      const withdrawal = (new BN(20)).mul(exp);
      const expectedBalance = (await exo.balanceOf.call(account)).add(withdrawal);
      const expectedStakeBalance = (await exo.stakeBalanceOf.call(account)).sub(withdrawal);

      exo.withdrawStake(20*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake withdrawal should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'WithdrawStake') {
              assert.equal(log.args.staker, account, 'The stake should be withdrawn by staker');
              assert(log.args.value.div(exp).eq(new BN(20)), 'The stake value should be 20 tokens');
            }
          }
          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be 20 tokens more');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be 20 tokens less');
        });
    });
  });

  it('should withdraw stake with interest applied to current stake', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: account});
      await helpers.increaseTime(7*24*3600);

      const withdrawal = (new BN(20)).mul(exp);
      const expectedInterest = await exo.calculateInterest.call({from: account});
      const expectedBalance = (await exo.balanceOf.call(account)).add(withdrawal);
      const expectedStakeBalance = (await exo.stakeBalanceOf.call(account)).add(expectedInterest).sub(withdrawal);

      exo.withdrawStake(20*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake withdrawal should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'WithdrawStake') {
              assert.equal(log.args.staker, account, 'The stake should be withdrawn by staker');
              assert(log.args.value.div(exp).eq(new BN(20)), 'The published stake value should be 20 tokens');
            }
          }
          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be 20 tokens more');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be correct');
        });
    });
  });

  it('should NOT withdraw stake if stake balance is insufficient', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(49*exp, {from: account});

      const withdrawal = (new BN(50)).mul(exp);
      const expectedBalance = await exo.balanceOf.call(account);
      const expectedStakeBalance = await exo.stakeBalanceOf.call(account);

      exo.withdrawStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake withdrawal should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT withdraw stake if withdrawal value is NOT more than ZERO', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: account});

      const withdrawal = (new BN(50)).mul(exp);
      const expectedBalance = await exo.balanceOf.call(account);
      const expectedStakeBalance = await exo.stakeBalanceOf.call(account);

      exo.withdrawStake(0, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake withdrawal should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should update stake balance with interest', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: account});
      await helpers.increaseTime(7*24*3600);

      const expectedInterest = await exo.calculateInterest.call({from: account});
      const expectedStakeBalance = (await exo.stakeBalanceOf.call(account)).add(expectedInterest);

      exo.updateStakeBalance({from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake balance update should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'UpdateStakeBalance') {
              assert.equal(log.args.staker, account, 'The staker account should be correct');
              assert(log.args.balance.eq(expectedStakeBalance), 'The published stake balance should be correct');
            }
          }

          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The updated stake balance should be correct');
        });
    });
  });

  it('should NOT update stake balance with interest if ICO has NOT ended', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);
      await exo.depositStake(50*exp, {from: account});
      await helpers.increaseTime(7*24*3600);

      const expectedStakeBalance = await exo.stakeBalanceOf.call(account);

      exo.updateStakeBalance({from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake balance update should fail');

          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The stake balance should be unchanged');
        });
    });
  });

  it('should update stake balance with owner balance if owner\'s balance is insufficient', () => {
    return newEXOToken({totalSupply: 40000101, minBalanceForStakeReward: 0}).then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(100*exp, {from: account});
      await helpers.increaseTime(1000*24*3600);

      const ownerBalance = await exo.balanceOf.call(owner);
      const expectedStakeBalance = (await exo.stakeBalanceOf.call(account)).add(ownerBalance);

      exo.updateStakeBalance({from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake balance update should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'UpdateStakeBalance') {
              assert.equal(log.args.staker, account, 'The staker account should be correct');
              assert(log.args.balance.eq(expectedStakeBalance), 'The published stake balance should be correct');
            }
          }

          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The updated stake balance should be correct');
        });
    });
  });

  it('should update stake balance with ZERO interest if there is no stake balance', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(0, {from: account});
      await helpers.increaseTime(7*24*3600);

      const expectedStakeBalance = await exo.stakeBalanceOf.call(account);

      exo.updateStakeBalance({from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake balance update should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'UpdateStakeBalance') {
              assert.equal(log.args.staker, account, 'The staker account should be correct');
              assert(log.args.balance.eq(expectedStakeBalance), 'The published stake balance should be correct');
            }
          }

          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The updated stake balance should be unchanged');
        });
    });
  });

  it('should update stake balance with ZERO interest if the staking is NOT for at least 7 days since last start time', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: account});
      await helpers.increaseTime(6*24*3600);

      const expectedStakeBalance = await exo.stakeBalanceOf.call(account);

      exo.updateStakeBalance({from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake balance update should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'UpdateStakeBalance') {
              assert.equal(log.args.staker, account, 'The staker account should be correct');
              assert(log.args.balance.eq(expectedStakeBalance), 'The published stake balance should be correct');
            }
          }

          const stakeBalance = await exo.stakeBalanceOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The updated stake balance should be unchanged');
        });
    });
  });

  it('should NOT update stake balance if caller is owner', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp);
      await helpers.increaseTime(7*24*3600);

      const expectedStakeBalance = await exo.stakeBalanceOf.call(owner);

      exo.updateStakeBalance().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake balance update should fail');

        const stakeBalance = await exo.stakeBalanceOf.call(owner);
        assert(stakeBalance.eq(expectedStakeBalance), 'The stake balance should be unchanged');
      });
    });
  });

  it('should calculate interest to be ZERO if staking is NOT for at least 7 days since last start time in first interest period', () => {
    return newEXOToken().then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: staker});

      const interest = await exo.calculateInterest.call({from: staker});
      assert(interest.eq(new BN(0)), 'The interest should be ZERO');
    });
  });

  it('should calculate interest correctly if staking is for multiple of 7 days since last start time in first interest period', () => {
    return newEXOToken().then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: staker});

      const randomDays = Math.floor((Math.random() * 1095) + 7);
      await helpers.increaseTime(randomDays*24*3600);
      const eligibleStakingDays = (new BN(randomDays)).div(new BN(7)).mul(new BN(7));
      const expectedInterest = (new BN(50)).mul(exp).mul(new BN(10)).mul(eligibleStakingDays).div(new BN(36500));

      const interest = await exo.calculateInterest.call({from: staker});
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
    return newEXOToken().then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);
      await helpers.increaseTime(1096*24*3600); // jump 3+ years into the future
      await exo.depositStake(50*exp, {from: staker});

      const interest = await exo.calculateInterest.call({from: staker});
      assert(interest.eq(new BN(0)), 'The interest should be ZERO');
    });
  });

  it('should calculate interest correctly if staking is for multiple of 7 days since last start time in second interest period', () => {
    return newEXOToken().then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);
      await helpers.increaseTime(1096*24*3600); // jump 3+ years into the future
      await exo.depositStake(50*exp, {from: staker});

      const randomDays = Math.floor((Math.random() * 73000) + 7);
      await helpers.increaseTime(randomDays*24*3600);
      const eligibleStakingDays = (new BN(randomDays)).div(new BN(7)).mul(new BN(7));
      const expectedInterest = (new BN(50)).mul(exp).mul(new BN(5)).mul(eligibleStakingDays).div(new BN(36500));

      const interest = await exo.calculateInterest.call({from: staker});
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
    return newEXOToken().then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: staker});

      const randomDays = Math.floor((Math.random() * 73000) + 1096);
      await helpers.increaseTime(randomDays*24*3600);

      const firstEligibleStakingDays = (new BN(1095)).div(new BN(7)).mul(new BN(7));
      const secondEligibleStakingDays = (new BN(randomDays)).sub(new BN(1092)).div(new BN(7)).mul(new BN(7));
      const expectedFirstInterest = (new BN(50)).mul(exp).mul(new BN(10)).mul(firstEligibleStakingDays).div(new BN(36500));
      const expectedSecondInterest = (new BN(50)).mul(exp).mul(new BN(5)).mul(secondEligibleStakingDays).div(new BN(36500));
      const expectedTotalInterest = expectedFirstInterest.add(expectedSecondInterest);

      const interest = await exo.calculateInterest.call({from: staker});
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
    return newEXOToken().then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);
      await helpers.increaseTime(1093*24*3600);
      await exo.depositStake(50*exp, {from: staker});
      await helpers.increaseTime(4*24*3600);

      const interest = await exo.calculateInterest.call({from: staker});
      assert(interest.eq(new BN(0)), 'The interest should be ZERO');
    });
  });

  it('should calculate interest to be ZERO if there is no stake balance', () => {
    return newEXOToken().then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);

      const interest = await exo.calculateInterest.call({from: staker});
      assert(interest.eq(new BN(0)), 'The interest should be ZERO');
    });
  });

  it('should calculate interest to be exactly as owner\'s remaining balance if the balance is insufficient', () => {
    return newEXOToken({totalSupply: 40000110, minBalanceForStakeReward: 0}).then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: staker});
      await helpers.increaseTime(1093*24*3600);

      const ownerBalance = await exo.balanceOf.call(owner);
      const interest = await exo.calculateInterest.call({from: staker});
      assert(interest.eq(ownerBalance), 'The interest should be equal to owner\'s remaining balance');
    });
  });

  it('should calculate interest to be ZERO if owner\'s remaining balance is ZERO', () => {
    return newEXOToken({totalSupply: 40000100, minBalanceForStakeReward: 0}).then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: staker});
      await helpers.increaseTime(8*24*3600);

      const interest = await exo.calculateInterest.call({from: staker});
      assert(interest.eq(new BN(0)), 'The interest should be ZERO');
    });
  });

  it('should move locked fund to new carrier\'s account and set the new treasury carrier', () => {
    return newEXOToken().then(async exo => {
      const initialLockedFund = await exo.lockedFunds.call('treasury');
      assert(initialLockedFund.eq(LOCKED_TREASURY_FUND), 'The initial locked fund should be correct');

      exo.setTreasuryCarrier(treasuryCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The locked fund should be moved to new carrier\'s account');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'Transfer') {
              assert.equal(log.args.from, exo.address, 'The transfer should originate from EXO Token contract');
              assert.equal(log.args.to, treasuryCarrier, 'The transfer should be designated to new carrier');
              assert(log.args.value.eq(LOCKED_TREASURY_FUND), 'The published transfer value should be correct');
            } else if (log.event === 'SetTreasuryCarrier') {
              assert.equal(log.args.oldCarrier, '0x0000000000000000000000000000000000000000', 'The published old carrier should be correct');
              assert.equal(log.args.newCarrier, treasuryCarrier, 'The published new carrier should be correct');
            }
          }

          const lockedFund = await exo.lockedFunds.call('treasury');
          const carrierSet = await exo.treasuryCarrier.call();
          const newCarrierBalance = await exo.balanceOf.call(treasuryCarrier);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert.equal(carrierSet, treasuryCarrier, 'New carrier should be set');
          assert(newCarrierBalance.eq(initialLockedFund), 'New carrier\'s balance should be correct');
        });
    });
  });

  it('should move fund from old carrier\'s account to new carrier\'s account and set the new treasury carrier', () => {
    return newEXOToken().then(async exo => {
      await exo.setTreasuryCarrier(treasuryCarrier);
      const initialOldCarrierBalance = await exo.balanceOf.call(treasuryCarrier);
      assert(initialOldCarrierBalance.eq(LOCKED_TREASURY_FUND), 'The initial old carrier\'s balance should be correct');
      const newCarrier = accounts[7];

      exo.setTreasuryCarrier(newCarrier)
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

          const lockedFund = await exo.lockedFunds.call('treasury');
          const oldCarrierBalance = await exo.balanceOf.call(treasuryCarrier);
          const carrierSet = await exo.treasuryCarrier.call();
          const newCarrierBalance = await exo.balanceOf.call(newCarrier);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert(oldCarrierBalance.eq(new BN(0)), 'Old carrier\'s balance should be ZERO');
          assert.equal(carrierSet, newCarrier, 'New carrier should be set');
          assert(newCarrierBalance.eq(initialOldCarrierBalance), 'New carrier\'s balance should be correct');
        });
    });
  });

  it('should NOT move treasury fund+set carrier if new carrier\'s account has more than ZERO balance', () => {
    return newEXOToken().then(async exo => {
      const initialLockedFund = await exo.lockedFunds.call('treasury');
      assert(initialLockedFund.eq(LOCKED_TREASURY_FUND), 'The initial locked fund should be correct');
      await exo.transfer(treasuryCarrier, 1*exp);

      exo.setTreasuryCarrier(treasuryCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('treasury');
          const carrierSet = await exo.treasuryCarrier.call();
          const accountBalance = await exo.balanceOf.call(treasuryCarrier);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address ZERO');
          assert(accountBalance.eq((new BN(1)).mul(exp)), 'Account\'s balance should be unchanged');
        });
    });
  });

  it('should NOT move treasury fund+set carrier if old carrier\'s account has ZERO balance', () => {
    return newEXOToken().then(async exo => {
      await exo.setTreasuryCarrier(treasuryCarrier);
      const initialOldCarrierBalance = await exo.balanceOf.call(treasuryCarrier);
      assert(initialOldCarrierBalance.eq(LOCKED_TREASURY_FUND), 'The initial old carrier\'s balance should be correct');
      await exo.transfer(accounts[6], initialOldCarrierBalance.div(exp).toNumber() * exp, {from: treasuryCarrier});
      const newCarrier = accounts[7];

      exo.setTreasuryCarrier(newCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The old carrier\'s fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('treasury');
          const carrierSet = await exo.treasuryCarrier.call();
          const accountBalance = await exo.balanceOf.call(newCarrier);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert.equal(carrierSet, treasuryCarrier, 'Carrier should be unchanged');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move treasury fund+set carrier if new carrier is the same as old carrier', () => {
    return newEXOToken().then(async exo => {
      await exo.setTreasuryCarrier(treasuryCarrier);

      exo.setTreasuryCarrier(treasuryCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The old carrier\'s fund should NOT be moved');
        });
    });
  });

  it('should NOT move treasury fund+set carrier if new carrier has account address of 0x0', () => {
    return newEXOToken().then(async exo => {
      const initialLockedFund = await exo.lockedFunds.call('treasury');
      assert(initialLockedFund.eq(LOCKED_TREASURY_FUND), 'The initial locked fund should be correct');

      exo.setTreasuryCarrier('0x0000000000000000000000000000000000000000')
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('treasury');
          const carrierSet = await exo.treasuryCarrier.call();
          const accountBalance = await exo.balanceOf.call('0x0000000000000000000000000000000000000000');
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address 0x0');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move treasury fund+set carrier if new carrier has account address of owner', () => {
    return newEXOToken().then(async exo => {
      const initialOwnerBalance = await exo.balanceOf.call(owner);
      const initialLockedFund = await exo.lockedFunds.call('treasury');
      assert(initialLockedFund.eq(LOCKED_TREASURY_FUND), 'The initial locked fund should be correct');

      exo.setTreasuryCarrier(owner)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('treasury');
          const carrierSet = await exo.treasuryCarrier.call();
          const ownerBalance = await exo.balanceOf.call(owner);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address 0x0');
          assert(ownerBalance.eq(initialOwnerBalance), 'Owner\'s balance should be unchanged');
        });
    });
  });

  it('should NOT move treasury fund+set carrier if new carrier has account address of another carrier', () => {
    return newEXOToken().then(async exo => {
      const initialLockedFund = await exo.lockedFunds.call('treasury');
      assert(initialLockedFund.eq(LOCKED_TREASURY_FUND), 'The initial locked fund should be correct');

      const callback = async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('treasury');
          const carrierSet = await exo.treasuryCarrier.call();
          const accountBalance = await exo.balanceOf.call(treasuryCarrier);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address ZERO');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
      };

      await exo.setPreSaleCarrier(preSaleCarrier);
      await exo.setAirdropCarrier(airdropCarrier);
      exo.setTreasuryCarrier(preSaleCarrier).then(callback);
      exo.setTreasuryCarrier(airdropCarrier).then(callback);
    });
  });

  it('should NOT move treasury fund+set carrier if caller is NOT owner', () => {
    return newEXOToken().then(async exo => {
      const initialLockedFund = await exo.lockedFunds.call('treasury');
      assert(initialLockedFund.eq(LOCKED_TREASURY_FUND), 'The initial locked fund should be correct');

      exo.setTreasuryCarrier(treasuryCarrier, {from: accounts[7]})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('treasury');
          const carrierSet = await exo.treasuryCarrier.call();
          const accountBalance = await exo.balanceOf.call(treasuryCarrier);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address 0x0');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should move locked fund to new carrier\'s account and set the new pre-sale carrier', () => {
    return newEXOToken().then(async exo => {
      const initialLockedFund = await exo.lockedFunds.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');

      exo.setPreSaleCarrier(preSaleCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The locked fund should be moved to new carrier\'s account');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'Transfer') {
              assert.equal(log.args.from, exo.address, 'The transfer should originate from EXO Token contract');
              assert.equal(log.args.to, preSaleCarrier, 'The transfer should be designated to new carrier');
              assert(log.args.value.eq(LOCKED_PRESALE_FUND), 'The published transfer value should be correct');
            } else if (log.event === 'SetPreSaleCarrier') {
              assert.equal(log.args.oldCarrier, '0x0000000000000000000000000000000000000000', 'The published old carrier should be correct');
              assert.equal(log.args.newCarrier, preSaleCarrier, 'The published new carrier should be correct');
            }
          }

          const lockedFund = await exo.lockedFunds.call('preSale');
          const carrierSet = await exo.preSaleCarrier.call();
          const newCarrierBalance = await exo.balanceOf.call(preSaleCarrier);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert.equal(carrierSet, preSaleCarrier, 'New carrier should be set');
          assert(newCarrierBalance.eq(initialLockedFund), 'New carrier\'s balance should be correct');
        });
    });
  });

  it('should move fund from old carrier\'s account to new carrier\'s account and set the new pre-sale carrier', () => {
    return newEXOToken().then(async exo => {
      await exo.setPreSaleCarrier(preSaleCarrier);
      const initialOldCarrierBalance = await exo.balanceOf.call(preSaleCarrier);
      assert(initialOldCarrierBalance.eq(LOCKED_PRESALE_FUND), 'The initial old carrier\'s balance should be correct');
      const newCarrier = accounts[7];

      exo.setPreSaleCarrier(newCarrier)
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

          const lockedFund = await exo.lockedFunds.call('preSale');
          const oldCarrierBalance = await exo.balanceOf.call(preSaleCarrier);
          const carrierSet = await exo.preSaleCarrier.call();
          const newCarrierBalance = await exo.balanceOf.call(newCarrier);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert(oldCarrierBalance.eq(new BN(0)), 'Old carrier\'s balance should be ZERO');
          assert.equal(carrierSet, newCarrier, 'New carrier should be set');
          assert(newCarrierBalance.eq(initialOldCarrierBalance), 'New carrier\'s balance should be correct');
        });
    });
  });

  it('should NOT move pre-sale fund+set carrier if new carrier\'s account has more than ZERO balance', () => {
    return newEXOToken().then(async exo => {
      const initialLockedFund = await exo.lockedFunds.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');
      await exo.transfer(preSaleCarrier, 1*exp);

      exo.setPreSaleCarrier(preSaleCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('preSale');
          const carrierSet = await exo.preSaleCarrier.call();
          const accountBalance = await exo.balanceOf.call(preSaleCarrier);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address ZERO');
          assert(accountBalance.eq((new BN(1)).mul(exp)), 'Account\'s balance should be unchanged');
        });
    });
  });

  it('should NOT move pre-sale fund+set carrier if old carrier\'s account has ZERO balance', () => {
    return newEXOToken().then(async exo => {
      await exo.setPreSaleCarrier(preSaleCarrier);
      const initialOldCarrierBalance = await exo.balanceOf.call(preSaleCarrier);
      assert(initialOldCarrierBalance.eq(LOCKED_PRESALE_FUND), 'The initial old carrier\'s balance should be correct');
      await exo.transfer(accounts[6], initialOldCarrierBalance.div(exp).toNumber() * exp, {from: preSaleCarrier});
      const newCarrier = accounts[7];

      exo.setPreSaleCarrier(newCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The old carrier\'s fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('preSale');
          const carrierSet = await exo.preSaleCarrier.call();
          const accountBalance = await exo.balanceOf.call(newCarrier);
          assert(lockedFund.eq(new BN(0)), 'Locked fund should be ZERO');
          assert.equal(carrierSet, preSaleCarrier, 'Carrier should be unchanged');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move pre-sale fund+set carrier if new carrier is the same as old carrier', () => {
    return newEXOToken().then(async exo => {
      await exo.setPreSaleCarrier(preSaleCarrier);

      exo.setPreSaleCarrier(preSaleCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The old carrier\'s fund should NOT be moved');
        });
    });
  });

  it('should NOT move pre-sale fund+set carrier if new carrier has account address of 0x0', () => {
    return newEXOToken().then(async exo => {
      const initialLockedFund = await exo.lockedFunds.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');

      exo.setPreSaleCarrier('0x0000000000000000000000000000000000000000')
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('preSale');
          const carrierSet = await exo.preSaleCarrier.call();
          const accountBalance = await exo.balanceOf.call('0x0000000000000000000000000000000000000000');
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address 0x0');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move pre-sale fund+set carrier if new carrier has account address of owner', () => {
    return newEXOToken().then(async exo => {
      const initialOwnerBalance = await exo.balanceOf.call(owner);
      const initialLockedFund = await exo.lockedFunds.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');

      exo.setPreSaleCarrier(owner)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('preSale');
          const carrierSet = await exo.preSaleCarrier.call();
          const ownerBalance = await exo.balanceOf.call(owner);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address 0x0');
          assert(ownerBalance.eq(initialOwnerBalance), 'Owner\'s balance should be unchanged');
        });
    });
  });

  it('should NOT move pre-sale fund+set carrier if new carrier has account address of another carrier', () => {
    return newEXOToken().then(async exo => {
      const initialLockedFund = await exo.lockedFunds.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');

      const callback = async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('preSale');
          const carrierSet = await exo.preSaleCarrier.call();
          const accountBalance = await exo.balanceOf.call(preSaleCarrier);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address ZERO');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
      };

      await exo.setTreasuryCarrier(treasuryCarrier);
      await exo.setAirdropCarrier(airdropCarrier);
      exo.setPreSaleCarrier(treasuryCarrier).then(callback);
      exo.setPreSaleCarrier(airdropCarrier).then(callback);
    });
  });

  it('should NOT move pre-sale fund+set carrier if caller is NOT owner', () => {
    return newEXOToken().then(async exo => {
      const initialLockedFund = await exo.lockedFunds.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');

      exo.setPreSaleCarrier(preSaleCarrier, {from: accounts[7]})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const lockedFund = await exo.lockedFunds.call('preSale');
          const carrierSet = await exo.preSaleCarrier.call();
          const accountBalance = await exo.balanceOf.call(preSaleCarrier);
          assert(lockedFund.eq(initialLockedFund), 'Locked fund should be unchanged');
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address 0x0');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should NOT move pre-sale fund+set carrier if pre-sale has ended', () => {
    return newEXOToken().then(async exo => {
      const initialLockedFund = await exo.lockedFunds.call('preSale');
      assert(initialLockedFund.eq(LOCKED_PRESALE_FUND), 'The initial locked fund should be correct');
      const newCarrier = accounts[7];

      await fastForwardToAfterPreSale(exo);

      exo.setPreSaleCarrier(newCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The locked fund should NOT be moved');

          const carrierSet = await exo.preSaleCarrier.call();
          const accountBalance = await exo.balanceOf.call(newCarrier);
          assert.equal(carrierSet, preSaleCarrier, 'Carrier should be unchanged');
          assert(accountBalance.eq(new BN(0)), 'Account\'s balance should be ZERO');
        });
    });
  });

  it('should set airdrop carrier', () => {
    return newEXOToken().then(async exo => {
      exo.setAirdropCarrier(airdropCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The new airdrop carrier should be set');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'SetAirdropCarrier') {
              assert.equal(log.args.oldCarrier, '0x0000000000000000000000000000000000000000', 'The published old carrier should be correct');
              assert.equal(log.args.newCarrier, airdropCarrier, 'The published new carrier should be correct');
            }
          }

          const carrierSet = await exo.airdropCarrier.call();
          assert.equal(carrierSet, airdropCarrier, 'Carrier should be correct');
        });
    });
  });

  it('should NOT set airdrop carrier if new carrier has account address of owner', () => {
    return newEXOToken().then(async exo => {
      exo.setAirdropCarrier(owner)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status ,16), 0, 'The new airdrop carrier should NOT be set');

          const carrierSet = await exo.airdropCarrier.call();
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address 0x0');
        });
    });
  });

  it('should NOT set airdrop carrier if new carrier is the same as old carrier', () => {
    return newEXOToken().then(async exo => {
      await exo.setAirdropCarrier(airdropCarrier);
      exo.setAirdropCarrier(airdropCarrier)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status ,16), 0, 'The new airdrop carrier should NOT be set');
        });
    });
  });

  it('should NOT set airdrop carrier if new carrier has account address of another carrier', () => {
    return newEXOToken().then(async exo => {
      const callback = async result => {
        assert.equal(parseInt(result.receipt.status ,16), 0, 'The new airdrop carrier should NOT be set');

        const carrierSet = await exo.airdropCarrier.call();
        assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address 0x0');
      };

      await exo.setTreasuryCarrier(treasuryCarrier);
      await exo.setPreSaleCarrier(preSaleCarrier);
      exo.setAirdropCarrier(treasuryCarrier).then(callback);
      exo.setAirdropCarrier(preSaleCarrier).then(callback);
    });
  });

  it('should NOT set airdrop carrier if caller is NOT owner', () => {
    return newEXOToken().then(async exo => {
      exo.setAirdropCarrier(airdropCarrier, {from: accounts[5]})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status ,16), 0, 'The new airdrop carrier should NOT be set');

          const carrierSet = await exo.airdropCarrier.call();
          assert.equal(carrierSet, '0x0000000000000000000000000000000000000000', 'Carrier should have address 0x0');
        });
    });
  });

  it('should get the stake start time of an account', () => {
    return newEXOToken().then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);

      exo.depositStake(50*exp, {from: staker})
        .then(async result => {
          const now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
          const stakeStartTime = await exo.stakeStartTimeOf.call(staker);

          if (! stakeStartTime.eq(new BN(now))) {
            console.log('BLOCK TIMESTAMP INCONSISTENCY', stakeStartTime.valueOf(), now);
          }
          const diff = stakeStartTime.sub(new BN(now)).toNumber();
          assert(diff === -1 || diff === 0, 'The stake start time should be equal to current block time');
        });
    });
  });

  it('should NOT transfer anything to owner account', () => {
    return newEXOToken().then(async exo => {
      const sender = accounts[5];
      await exo.transfer(sender, 100*exp);
      const expectedSenderBalance = await exo.balanceOf.call(sender);
      const expectedOwnerBalance = await exo.balanceOf.call(owner);
      
      exo.transfer(owner, 50*exp, {from: sender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const senderBalance = await exo.balanceOf.call(sender);
          const ownerBalance = await exo.balanceOf.call(owner);
          assert(senderBalance.eq(expectedSenderBalance), 'The sender\'s balance should be unchanged');
          assert(ownerBalance.eq(expectedOwnerBalance), 'The owner\'s balance should be unchanged');
        });
    });
  });

  it('should lock the minimum balance for stake reward in owner\'s account', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      const surplus = (await exo.balanceOf.call(owner)).sub(MIN_BALANCE_FOR_STAKE_REWARD);
      await exo.transfer(account, surplus.div(exp).toNumber()*exp);

      const expectedAccountBalance = await exo.balanceOf.call(account);
      const expectedOwnerBalance = await exo.balanceOf.call(owner);
      assert(expectedAccountBalance.eq(surplus), 'Transfer amount should be correct');
      assert(expectedOwnerBalance.eq(MIN_BALANCE_FOR_STAKE_REWARD), 'Remaining balance should be correct');

      exo.transfer(account, 1)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const accountBalance = await exo.balanceOf.call(account);
          const ownerBalance = await exo.balanceOf.call(owner);
          assert(accountBalance.eq(expectedAccountBalance), 'The account\'s balance should be unchanged');
          assert(ownerBalance.eq(expectedOwnerBalance), 'The owner\'s balance should be unchanged');
        });
    });
  });

  it('should freeze an account requested by owner', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      
      exo.freezeAccount(account, true)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The freeze should complete');

          assert(await exo.isFrozen.call(account), 'The account should be frozen');
        });
    });
  });

  it('should unfreeze an account requested by owner', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      await exo.freezeAccount(account, true);

      exo.freezeAccount(account, false)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The unfreeze should complete');

          assert(! await exo.isFrozen.call(account), 'The account should be unfrozen');
        });
    });
  });

  it('should NOT freeze owner\'s account', () => {
    return newEXOToken().then(async exo => {
      exo.freezeAccount(owner, true)
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The freeze should fail');

          assert(! await exo.isFrozen.call(owner), 'The account should NOT be frozen');
        });
    });
  });

  it('should NOT freeze/unfreeze if caller is NOT owner', () => {
    return newEXOToken().then(async exo => {
      const account = accounts[5];
      
      exo.freezeAccount(account, true, {from: accounts[6]})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The freeze should fail');

          assert(! await exo.isFrozen.call(account), 'The account should NOT be frozen');
        });
    });
  });

  it('should NOT be possible to transfer tokens if sender is frozen', () => {
    return newEXOToken().then(async exo => {
      const sender = accounts[5];
      const recipient = accounts[6];
      const expectedSenderBalance = await exo.balanceOf.call(sender);
      const expectedRecipientBalance = await exo.balanceOf.call(recipient);

      await exo.freezeAccount(sender, true);

      exo.transfer(recipient, 100, {from: sender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const senderBalance = await exo.balanceOf.call(sender);
          const recipientBalance = await exo.balanceOf.call(recipient);
          assert(senderBalance.eq(expectedSenderBalance), 'The sender\'s balance should be unchanged');
          assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be unchanged');
        });
    });
  });

  it('should NOT be possible to transfer tokens if recipient is frozen', () => {
    return newEXOToken().then(async exo => {
      const sender = accounts[5];
      const recipient = accounts[6];
      const expectedSenderBalance = await exo.balanceOf.call(sender);
      const expectedRecipientBalance = await exo.balanceOf.call(recipient);

      await exo.freezeAccount(recipient, true);

      exo.transfer(recipient, 100, {from: sender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const senderBalance = await exo.balanceOf.call(sender);
          const recipientBalance = await exo.balanceOf.call(recipient);
          assert(senderBalance.eq(expectedSenderBalance), 'The sender\'s balance should be unchanged');
          assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be unchanged');
        });
    });
  });

  it('should NOT be possible to transfer allowance tokens if spender is frozen', () => {
    return newEXOToken().then(async exo => {
      const lender = accounts[4];
      const spender = accounts[5];
      const recipient = accounts[6];
      const expectedLenderBalance = await exo.balanceOf.call(lender);
      const expectedRecipientBalance = await exo.balanceOf.call(recipient);

      await exo.approve(spender, 100, {from: lender});
      await exo.freezeAccount(spender, true);

      exo.transferFrom(lender, recipient, 100, {from: spender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const lenderBalance = await exo.balanceOf.call(lender);
          const recipientBalance = await exo.balanceOf.call(recipient);
          assert(lenderBalance.eq(expectedLenderBalance), 'The lender\'s balance should be unchanged');
          assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be unchanged');
        });
    });
  });

  it('should NOT be possible to transfer allowance tokens if lender is frozen', () => {
    return newEXOToken().then(async exo => {
      const lender = accounts[4];
      const spender = accounts[5];
      const recipient = accounts[6];
      const expectedLenderBalance = await exo.balanceOf.call(lender);
      const expectedRecipientBalance = await exo.balanceOf.call(recipient);

      await exo.approve(spender, 100, {from: lender});
      await exo.freezeAccount(lender, true);

      exo.transferFrom(lender, recipient, 100, {from: spender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const lenderBalance = await exo.balanceOf.call(lender);
          const recipientBalance = await exo.balanceOf.call(recipient);
          assert(lenderBalance.eq(expectedLenderBalance), 'The lender\'s balance should be unchanged');
          assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be unchanged');
        });
    });
  });

  it('should NOT be possible to transfer allowance tokens if recipient is frozen', () => {
    return newEXOToken().then(async exo => {
      const lender = accounts[4];
      const spender = accounts[5];
      const recipient = accounts[6];
      const expectedLenderBalance = await exo.balanceOf.call(lender);
      const expectedRecipientBalance = await exo.balanceOf.call(recipient);

      await exo.approve(spender, 100, {from: lender});
      await exo.freezeAccount(recipient, true);

      exo.transferFrom(lender, recipient, 100, {from: spender})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The transfer should fail');

          const lenderBalance = await exo.balanceOf.call(lender);
          const recipientBalance = await exo.balanceOf.call(recipient);
          assert(lenderBalance.eq(expectedLenderBalance), 'The lender\'s balance should be unchanged');
          assert(recipientBalance.eq(expectedRecipientBalance), 'The recipient\'s balance should be unchanged');
        });
    });
  });

  it('should NOT be possible to deposit stake tokens if account is frozen', () => {
    return newEXOToken().then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.freezeAccount(staker, true);

      exo.depositStake(50*exp, {from: staker})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');
        });
    });
  });

  it('should NOT be possible to withdraw stake tokens if account is frozen', () => {
    return newEXOToken().then(async exo => {
      const staker = accounts[5];
      await exo.transfer(staker, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp, {from: staker});
      await exo.freezeAccount(staker, true);

      exo.withdrawStake(50*exp, {from: staker})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake withdrawal should fail');
        });
    });
  });

  it('should NOT be possible to buy ICO tokens if buyer is frozen', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterPreSale(exo);
      await exo.startICO();

      const buyer = accounts[6];
      const amount = new BN(web3.toWei(MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE.div(ICO_ETH_TO_EXO).add(new BN(1)).div(exp), "ether"));
      await exo.freezeAccount(buyer, true);
      
      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');
        });
    });
  });

  it('should NOT be possible to airdrop tokens if carrier is frozen', () => {
    return newEXOToken().then(async exo => {
      const recipient = accounts[4];

      await exo.setAirdropCarrier(airdropCarrier);
      await fastForwardToAfterICO(exo);
      await exo.freezeAccount(airdropCarrier, true);

      exo.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');
          assert(await exo.airdropped(recipient) == false, 'The recipient should NOT be marked as airdropped');
        });
    })
  });

  it('should NOT be possible to receive airdrop tokens if account is frozen', () => {
    return newEXOToken().then(async exo => {
      const recipient = accounts[4];

      await exo.setAirdropCarrier(airdropCarrier);
      await fastForwardToAfterICO(exo);
      await exo.freezeAccount(recipient, true);

      exo.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');
          assert(await exo.airdropped(recipient) == false, 'The recipient should NOT be marked as airdropped');
        });
    })
  });

  // // TO DO
  // it('should burn accumulated interest if deposit fund is withdrawn before minimum stake time', () => {});
  // it('should NOT be possible to deposit or update stake balance before minimum stake time', () => {});
});
