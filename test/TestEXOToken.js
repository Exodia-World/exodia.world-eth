const BN = require('bn.js');
const EXOToken = artifacts.require('EXOToken');
const helpers = require('./helpers');
const toBN = helpers.toBN;
const exp = (new BN(10)).pow(new BN(18));

const TOTAL_SUPPLY = (new BN(100000000)).mul(exp);
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
  console.log(`tokenCreationTime=${await exo.tokenCreationTime.call()}`);
  if (target) {
    console.log('');
    console.log(`target's balance=${await exo.balanceOf.call(target)}`);
    console.log(`target's stake balance=${await exo.stakeOf.call(target)}`);
    console.log(`target's staking start time=${await exo.stakingStartTimeOf.call(target)}`);
    console.log(`ICO tokens bought by target=${await exo.ICOTokensBought.call(target)}`);
    console.log(`is target airdropped?=${await exo.airdropped.call(target)}`);
    console.log('');
  }
  console.log(`owner=${owner}`);
  console.log(`owner's ETH balance=${await web3.eth.getBalance(owner)}`);
  console.log(`owner's EXO balance=${await exo.balanceOf.call(owner)}`);
  console.log('');
  console.log(`lockedTreasuryFund=${await exo.lockedTreasuryFund.call()}`);
  console.log(`treasuryCarrier=${treasuryCarrier}`);
  console.log(`treasuryCarrier's EXO balance=${await exo.balanceOf.call(treasuryCarrier)}`);
  console.log('');
  console.log(`lockedPreSaleFund=${await exo.lockedPreSaleFund.call()}`);
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
      const lockedTreasuryFund = await exo.lockedTreasuryFund.call();
      const lockedPreSaleFund = await exo.lockedPreSaleFund.call();
      const preSaleEthToExo = await exo.preSaleEthToExo.call();
      const preSaleDuration = await exo.preSaleDuration.call();
      const availableICOFund = await exo.availableICOFund.call();
      const minICOTokensBoughtEveryPurchase = await exo.minICOTokensBoughtEveryPurchase.call();
      const maxICOTokensBought= await exo.maxICOTokensBought.call();
      const ICOEthToExo = await exo.ICOEthToExo.call();
      const ICODuration = await exo.ICODuration.call();
      const airdropAmount = await exo.airdropAmount.call();

      assert(totalSupply.eq(TOTAL_SUPPLY), 'The total supply of EXO should be set');
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
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be correct');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be correct');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be correct');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be correct');
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

      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exo.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exo.address);
          const remainingICOFund = await exo.availableICOFund.call();
          const ICOTokensBought = await exo.ICOTokensBought.call(buyer);
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
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

      amount = new BN(100001);

      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exo.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exo.address);
          const remainingICOFund = await exo.availableICOFund.call();
          const ICOTokensBought = await exo.ICOTokensBought.call(buyer);
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
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

      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exo.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exo.address);
          const remainingICOFund = await exo.availableICOFund.call();
          const ICOTokensBought = await exo.ICOTokensBought.call(buyer);
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
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

      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exo.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exo.address);
          const remainingICOFund = await exo.availableICOFund.call();
          const ICOTokensBought = await exo.ICOTokensBought.call(buyer);
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
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

      exo.buyICOTokens({from: buyer, value: amount})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'EXO tokens should NOT be sold');

          const buyerBalance = await exo.balanceOf(buyer);
          const contractBalance = web3.eth.getBalance(exo.address);
          const remainingICOFund = await exo.availableICOFund.call();
          const ICOTokensBought = await exo.ICOTokensBought.call(buyer);
          assert(buyerBalance.eq(expectedBuyerBalance), 'Buyer\'s balance should be unchanged');
          assert(contractBalance.eq(expectedContractBalance), 'Contract\'s balance should be unchanged');
          assert(remainingICOFund.eq(expectedICOFund), 'Remaining ICO fund should be unchanged');
          assert(ICOTokensBought.eq(expectedICOTokensBought), 'Total ICO tokens bought by buyer should be unchanged');
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
      const expectedStakeBalance = (await exo.stakeOf.call(recipient)).add(airdropAmount);

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
          const stakeBalance = await exo.stakeOf.call(recipient);
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
      const expectedStakeBalance = await exo.stakeOf.call(recipient);

      await exo.setAirdropCarrier(airdropCarrier);
      await fastForwardToAfterICO(exo);

      exo.airdrop(recipient, {from: treasuryCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const availableICOFund = await exo.availableICOFund.call();
          const stakeBalance = await exo.stakeOf.call(recipient);
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
      const expectedStakeBalance = await exo.stakeOf.call(recipient);

      await exo.setAirdropCarrier(airdropCarrier);
      await fastForwardToAfterICO(exo);

      exo.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const availableICOFund = await exo.availableICOFund.call();
          const stakeBalance = await exo.stakeOf.call(recipient);
          assert(availableICOFund.eq(expectedICOFund), 'The remaining ICO fund should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be unchanged');
          assert(await exo.airdropped(recipient) == false, 'The recipient should NOT be marked as airdropped');
        });
    });
  });

  it('should reject airdrops designated to the same account more than once', () => {
    return newEXOToken().then(async exo => {
      const airdropCarrier = accounts[2];
      const recipient = accounts[5];

      await exo.setAirdropCarrier(airdropCarrier);
      await fastForwardToAfterICO(exo);

      await exo.airdrop(recipient, {from: airdropCarrier});
      const airdropped = await exo.airdropped.call(recipient);
      assert(airdropped, 'The account designated should already be marked as airdropped');

      const expectedICOFund = await exo.availableICOFund.call();
      const expectedStakeBalance = await exo.stakeOf.call(recipient);

      exo.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const availableICOFund = await exo.availableICOFund.call();
          const stakeBalance = await exo.stakeOf.call(recipient);
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
      const expectedStakeBalance = (await exo.stakeOf.call(account)).add(deposit);

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
          const stakeBalance = await exo.stakeOf.call(account);
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
      const expectedStakeBalance = (await exo.stakeOf.call(account)).add(deposit).add(expectedInterest);

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
          const stakeBalance = await exo.stakeOf.call(account);
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
      const expectedStakeBalance = await exo.stakeOf.call(account);

      await fastForwardToAfterICO(exo);

      exo.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeOf.call(account);
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
      const expectedStakeBalance = await exo.stakeOf.call(account);

      await fastForwardToAfterICO(exo);

      exo.depositStake(0, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeOf.call(account);
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
      const expectedStakeBalance = await exo.stakeOf.call(account);

      await fastForwardToAfterPreSale(exo);

      exo.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeOf.call(account);
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
      const expectedStakeBalance = await exo.stakeOf.call(account);

      await fastForwardToAfterPreSale(exo);
      await exo.startICO();

      exo.depositStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be unchanged');
        });
    });
  });

  it('should NOT deposit stake if caller is owner', () => {
    return newEXOToken().then(async exo => {
      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = await exo.balanceOf.call(owner);
      const expectedStakeBalance = await exo.stakeOf.call(owner);

      await fastForwardToAfterICO(exo);

      exo.depositStake(50*exp, {from: owner})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake deposit should fail');

          const balance = await exo.balanceOf.call(owner);
          const stakeBalance = await exo.stakeOf.call(owner);
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
      const expectedStakeBalance = (await exo.stakeOf.call(account)).sub(withdrawal);

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
          const stakeBalance = await exo.stakeOf.call(account);
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
      const expectedStakeBalance = (await exo.stakeOf.call(account)).add(expectedInterest).sub(withdrawal);

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
          const stakeBalance = await exo.stakeOf.call(account);
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
      const expectedStakeBalance = await exo.stakeOf.call(account);

      exo.withdrawStake(50*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake withdrawal should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeOf.call(account);
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
      const expectedStakeBalance = await exo.stakeOf.call(account);

      exo.withdrawStake(0, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake withdrawal should fail');

          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeOf.call(account);
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
      const expectedStakeBalance = (await exo.stakeOf.call(account)).add(expectedInterest);

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

          const stakeBalance = await exo.stakeOf.call(account);
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

      const expectedStakeBalance = await exo.stakeOf.call(account);

      exo.updateStakeBalance({from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake balance update should fail');

          const stakeBalance = await exo.stakeOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The stake balance should be unchanged');
        });
    });
  });

  it('should update stake balance with owner balance if owner\'s balance is insufficient', () => {
    return newEXOToken({totalSupply: 40000101}).then(async exo => {
      const account = accounts[5];
      await exo.transfer(account, 100*exp);
      await fastForwardToAfterICO(exo);
      await exo.depositStake(100*exp, {from: account});
      await helpers.increaseTime(1000*24*3600);

      const ownerBalance = await exo.balanceOf.call(owner);
      const expectedStakeBalance = (await exo.stakeOf.call(account)).add(ownerBalance);

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

          const stakeBalance = await exo.stakeOf.call(account);
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

      const expectedStakeBalance = await exo.stakeOf.call(account);

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

          const stakeBalance = await exo.stakeOf.call(account);
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

      const expectedStakeBalance = await exo.stakeOf.call(account);

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

          const stakeBalance = await exo.stakeOf.call(account);
          assert(stakeBalance.eq(expectedStakeBalance), 'The updated stake balance should be unchanged');
        });
    });
  });

  it('should NOT update stake balance if caller is owner', () => {
    return newEXOToken().then(async exo => {
      await fastForwardToAfterICO(exo);
      await exo.depositStake(50*exp);
      await helpers.increaseTime(7*24*3600);

      const expectedStakeBalance = await exo.stakeOf.call(owner);

      exo.updateStakeBalance().then(async result => {
        assert.equal(parseInt(result.receipt.status, 16), 0, 'The stake balance update should fail');

        const stakeBalance = await exo.stakeOf.call(owner);
        assert(stakeBalance.eq(expectedStakeBalance), 'The stake balance should be unchanged');
      });
    });
  });

  // it('should calculate interest to be ZERO if staking is NOT for at least 7 days since last start time in first interest period', () => {});
  // it('should calculate interest correctly if staking is for multiple of 7 days since last start time in first interest period', () => {});
  // it('should calculate interest to be ZERO if staking is NOT for at least 7 days since last start time in second interest period', () => {});
  // it('should calculate interest correctly if staking is for multiple of 7 days since last start time in second interest period', () => {});
  // it('should calculate interest correctly if staking ranges from one interest period to the next', () => {});
  // it('should calculate interest to be ZERO if staking is NOT for at least 7 days since last start time in the middle of two interest periods', () => {});
  // it('should calculate interest to be ZERO if there is no stake balance', () => {});
  // it('should calculate interest to be exactly as owner\'s remaining balance if the balance is insufficient', () => {});
  // it('should calculate interest to be ZERO if all interest periods have passed', () => {});
  // it('should NOT calculate interest if caller is owner', () => {});

  // it('should move locked fund to new carrier\'s account and set the new treasury carrier', () => {});
  // it('should move fund from old carrier\'s account to new carrier\'s account and set the new treasury carrier', () => {});
  // it('should NOT move treasury fund+set carrier if new carrier\'s account has more than ZERO balance', () => {});
  // it('should NOT move treasury fund+set carrier if old carrier\'s account has ZERO balance', () => {});
  // it('should NOT move treasury fund+set carrier if new carrier is the same as old carrier', () => {});
  // it('should NOT move treasury fund+set carrier if new carrier has account address of 0x0', () => {});
  // it('should NOT move treasury fund+set carrier if new carrier has account address of owner', () => {});
  // it('should NOT move treasury fund+set carrier if new carrier has account address of another carrier', () => {});
  // it('should NOT move treasury fund+set carrier if caller is NOT owner', () => {});

  // it('should move locked fund to new carrier\'s account and set the new pre-sale carrier', () => {});
  // it('should move fund from old carrier\'s account to new carrier\'s account and set the new pre-sale carrier', () => {});
  // it('should NOT move pre-sale fund+set carrier if new carrier\'s account has more than ZERO balance', () => {});
  // it('should NOT move pre-sale fund+set carrier if old carrier\'s account has ZERO balance', () => {});
  // it('should NOT move pre-sale fund+set carrier if new carrier is the same as old carrier', () => {});
  // it('should NOT move pre-sale fund+set carrier if new carrier has account address of 0x0', () => {});
  // it('should NOT move pre-sale fund+set carrier if new carrier has account address of owner', () => {});
  // it('should NOT move pre-sale fund+set carrier if new carrier has account address of another carrier', () => {});
  // it('should NOT move pre-sale fund+set carrier if caller is NOT owner', () => {});
  // it('should NOT move pre-sale fund+set carrier if pre-sale has ended', () => {});

  // it('should set airdrop carrier', () => {});
  // it('should NOT set airdrop carrier if new carrier has account address of owner', () => {});
  // it('should NOT set airdrop carrier if new carrier is the same as old carrier', () => {});
  // it('should NOT set airdrop carrier if new carrier has account address of another carrier', () => {});
  // it('should NOT set airdrop carrier if caller is NOT owner', () => {});

  // it('should get the stake balance of an account', () => {});

  // it('should NOT transfer anything to owner account', () => {});


  // // TO DO
  // it('should display tokens bought/total tokens available for ICO', () => {});

  // // TO BE CONSIDERED
  // it('should freeze an account requested by owner', () => {});
  // it('should apply a transfer cap to any account requested by owner', () => {});
  // transfer cap for owner: 25,000
  // transfer cap for treasury: none
  // transfer cap for pre-sale: none
  // transfer cap for airdrop: 10
});