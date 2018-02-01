const BN = require('bn.js');
const EXOToken = artifacts.require('EXOToken');
const helpers = require('./helpers');
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

contract('EXOToken', accounts => {
  const treasuryCarrier = accounts[1];
  const preSaleCarrier = accounts[2];
  const airdropCarrier = accounts[3];

  const fastForwardToAfterICO = async exo => {
    await exo.setPreSaleCarrier(preSaleCarrier);

    // Fast forward to after ICO.
    await exo.startPreSale();
    await helpers.increaseTime(parseInt(PRESALE_DURATION.add(new BN(1)).valueOf()));
    await exo.startICO();
    await helpers.increaseTime(parseInt(ICO_DURATION.add(new BN(1)).valueOf()));
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

  it('should start the pre-sale', () => {});
  it('should NOT start the pre-sale if the locked fund is 0', () => {});
  it('should NOT start the pre-sale if no carrier is set', () => {});
  it('should NOT start the pre-sale if it has already been started before', () => {});
  it('should NOT start the pre-sale if called by non-carrier accounts', () => {});
  it('should NOT start the pre-sale if ICO has been started', () => {});
  it('should end the pre-sale', () => {});
  it('should NOT end the pre-sale if it has NOT been started', () => {});
  it('should NOT end the pre-sale if its deadline has NOT passed', () => {});
  it('should NOT end the pre-sale if it has already been ended', () => {});

  it('should sell EXO tokens at ICO for an amount of ETH', () => {});
  it('should NOT sell EXO tokens at ICO for ETH less than the minimum amount set per purchase', () => {});
  it('should NOT sell EXO tokens at ICO for ETH more than the maximum amount set for all purchases', () => {});
  it('should NOT sell EXO tokens at ICO if its tokens are insufficient', () => {});
  it('should NOT sell EXO tokens at ICO if ICO has NOT been started', () => {});
  it('should NOT sell EXO tokens at ICO if its deadline has passed', () => {});
  it('should start the ICO', () => {});
  it('should NOT start the ICO if the pre-sale has NOT been started', () => {});
  it('should NOT start the ICO if the pre-sale has NOT been ended', () => {});
  it('should NOT start the ICO if it has already been started before', () => {});
  it('should NOT start the ICO if there is no available fund', () => {});
  it('should end the ICO', () => {});
  it('should NOT end the ICO if it has NOT been started', () => {});
  it('should NOT end the ICO if its deadline has not passed', () => {});
  it('should NOT end the ICO if it has already been ended', () => {});
  it('should release the ICO fund to owner', () => {});
  it('should NOT release the ICO fund to owner if ICO has NOT been started', () => {});
  it('should NOT release the ICO fund to owner if ICO has NOT been ended', () => {});
  it('should NOT release the ICO fund to owner if there is no fund to release', () => {});

  it('should airdrop to a recipient with a specific amount of tokens', () => {
    return EXOToken.deployed().then(async exo => {
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
              assert(airdropAmount.div(exp).eq(new BN(log.args.value/exp)), 'The airdrop value should be as configured');
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
    return EXOToken.deployed().then(async exo => {
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
    return EXOToken.new(
      TOTAL_SUPPLY,
      LOCKED_TREASURY_FUND,
      LOCKED_PRESALE_FUND,
      PRESALE_ETH_TO_EXO,
      PRESALE_DURATION,
      AIRDROP_AMOUNT.sub(new BN(1)),
      MIN_ICO_TOKENS_BOUGHT_EVERY_PURCHASE,
      MAX_ICO_TOKENS_BOUGHT,
      ICO_ETH_TO_EXO,
      ICO_DURATION,
      AIRDROP_AMOUNT
    ).then(async exo => {
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
    return EXOToken.deployed().then(async exo => {
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

  it('should deposit stake with no interest applied', () => {
    return EXOToken.deployed().then(async exo => {
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
              assert((new BN(log.args.value/exp)).eq(new BN(50)), 'The stake value should be 50 tokens');
            }
          }
          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be 50 tokens less');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be 50 tokens more');
        });
    });
  });

  it('should deposit stake with interest applied to current stake', () => {});
  it('should NOT deposit stake if balance is insufficient', () => {});
  it('should NOT deposit stake if deposit value is NOT more than ZERO', () => {});
  it('should NOT deposit stake if ICO has NOT ended', () => {});
  it('should deposit stake with ZERO interest applied if the staking is NOT at least for 7 days since last start time', () => {});

  it('should withdraw stake with no interest applied', () => {
    return EXOToken.deployed().then(async exo => {
      const account = accounts[5];
      const withdrawal = (new BN(20)).mul(exp);
      const expectedBalance = (await exo.balanceOf.call(account)).add(withdrawal);
      const expectedStakeBalance = (await exo.stakeOf.call(account)).sub(withdrawal);

      await fastForwardToAfterICO(exo);

      exo.withdrawStake(20*exp, {from: account})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The stake withdrawal should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'WithdrawStake') {
              assert.equal(log.args.staker, account, 'The stake should be withdrawn by staker');
              assert((new BN(log.args.value/exp)).eq(new BN(20)), 'The stake value should be 20 tokens');
            }
          }
          const balance = await exo.balanceOf.call(account);
          const stakeBalance = await exo.stakeOf.call(account);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be 20 tokens more');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be 20 tokens less');
        });
    });
  });

  it('should withdraw stake with interest applied to current stake', () => {});
  it('should NOT withdraw stake if stake balance is insufficient', () => {});
  it('should NOT withdraw stake if withdrawal value is NOT more than ZERO', () => {});
  it('should NOT withdraw stake if ICO has NOT ended', () => {});
  it('should withdraw stake with ZERO interest applied if the staking is NOT at least for 7 days since last start time', () => {});

  it('should update stake balance with interest', () => {});
  it('should NOT update stake balance with interest if ICO has NOT ended', () => {});
  it('should NOT update stake balance with interest if owner\'s balance is insufficient', () => {});
  it('should update stake balance with ZERO interest if there is no stake balance', () => {});
  it('should update stake balance with ZERO interest if the staking is NOT at least 7 days since last start time', () => {});
});