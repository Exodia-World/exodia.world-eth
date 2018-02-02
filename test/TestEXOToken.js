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

contract('EXOToken', accounts => {
  const treasuryCarrier = accounts[1];
  const preSaleCarrier = accounts[2];
  const airdropCarrier = accounts[3];

  const fastForwardToAfterICO = async exo => {
    await exo.setPreSaleCarrier(preSaleCarrier);

    // Fast forward to after ICO.
    await exo.startPreSale();
    await helpers.increaseTime(PRESALE_DURATION.add(new BN(1)).toNumber());
    await exo.startICO();
    await helpers.increaseTime(ICO_DURATION.add(new BN(1)).toNumber());
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
            assert(log.args.startTime.eq(new BN(now)), 'The published start time should be equal to current block time');
            assert(log.args.deadline.sub(log.args.startTime).eq(preSaleDuration), 'The published start time and deadline of pre-sale should be correct');
          }
        }
        assert(startTime.eq(new BN(now)), 'The start time should be equal to current block time');
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

  // it('should NOT start the pre-sale if ICO has been started', () => {});
  // it('should NOT start the pre-sale if caller is NOT owner', () => {});
  // it('should end the pre-sale', () => {});
  // it('should NOT end the pre-sale if it has NOT been started', () => {});
  // it('should NOT end the pre-sale if its deadline has NOT passed', () => {});
  // it('should NOT end the pre-sale if it has already been ended', () => {});
  // it('should NOT end the pre-sale if caller is NOT owner', () => {});

  // it('should sell EXO tokens at ICO for an amount of ETH', () => {});
  // it('should NOT sell EXO tokens at ICO for ETH less than the minimum amount set per purchase', () => {});
  // it('should NOT sell EXO tokens at ICO for ETH more than the maximum amount set for all purchases', () => {});
  // it('should NOT sell EXO tokens at ICO if its tokens are insufficient', () => {});
  // it('should NOT sell EXO tokens at ICO if ICO has NOT been started', () => {});
  // it('should NOT sell EXO tokens at ICO if its deadline has passed', () => {});
  // it('should start the ICO', () => {});
  // it('should NOT start the ICO if the pre-sale has NOT been started', () => {});
  // it('should NOT start the ICO if the pre-sale has NOT been ended', () => {});
  // it('should NOT start the ICO if it has already been started before', () => {});
  // it('should NOT start the ICO if there is no available fund', () => {});
  // it('should NOT start the ICO if caller is NOT owner', () => {});
  // it('should end the ICO', () => {});
  // it('should NOT end the ICO if it has NOT been started', () => {});
  // it('should NOT end the ICO if its deadline has not passed', () => {});
  // it('should NOT end the ICO if it has already been ended', () => {});
  // it('should NOT end the ICO if caller is NOT owner', () => {});
  // it('should release the ICO fund to owner', () => {});
  // it('should NOT release the ICO fund to owner if ICO has NOT been started', () => {});
  // it('should NOT release the ICO fund to owner if ICO has NOT been ended', () => {});
  // it('should NOT release the ICO fund to owner if there is no fund to release', () => {});
  // it('should NOT release the ICO fund to owner if caller is NOT owner', () => {});

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

  // it('should deposit stake with interest applied to current stake', () => {});
  // it('should NOT deposit stake if balance is insufficient', () => {});
  // it('should NOT deposit stake if deposit value is NOT more than ZERO', () => {});
  // it('should NOT deposit stake if ICO has NOT ended', () => {});
  // it('should NOT deposit stake if caller is owner', () => {});

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

  // it('should withdraw stake with interest applied to current stake', () => {});
  // it('should NOT withdraw stake if stake balance is insufficient', () => {});
  // it('should NOT withdraw stake if withdrawal value is NOT more than ZERO', () => {});
  // it('should NOT withdraw stake if ICO has NOT ended', () => {});
  // it('should NOT withdraw stake if caller is owner', () => {});

  // it('should update stake balance with interest', () => {});
  // it('should NOT update stake balance with interest if ICO has NOT ended', () => {});
  // it('should NOT update stake balance with interest if owner\'s balance is insufficient', () => {});
  // it('should update stake balance with ZERO interest if there is no stake balance', () => {});
  // it('should update stake balance with ZERO interest if the staking is NOT for at least 7 days since last start time', () => {});
  // it('should NOT update stake balance if caller is owner', () => {});

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

  // // TO BE CONSIDERED
  // it('should freeze an account requested by owner', () => {});
  // it('should apply a transfer cap to any account requested by owner', () => {});
});