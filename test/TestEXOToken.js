const BN = require('bn.js');
const EXOToken = artifacts.require('EXOToken');
const exp = (new BN(10)).pow(new BN(18));

contract('EXOToken', accounts => {
  it('should have the correct parameters as deployed', () => {
    return EXOToken.deployed().then(async exo => {
      const totalSupply = await exo.totalSupply.call();
      const airdropCarrier = await exo.airdropCarrier.call();
      const airdropAmount = await exo.airdropAmount.call();
      const minBalanceAfterAirdrop = await exo.minBalanceAfterAirdrop.call();

      assert(totalSupply.div(exp).eq(new BN(100000000)), 'The total supply of EXO should be 100000000');
      assert.equal(airdropCarrier, 0, 'The address of airdrop carrier should be 0');
      assert(airdropAmount.div(exp).eq(new BN(10)), 'The airdrop amount of EXO per account should be 10');
      assert(minBalanceAfterAirdrop.div(exp).eq(new BN(50000000)), 'The minimum balance after airdrop should be 50000000');
    });
  });

  it('should airdrop to a recipient with a specific amount of tokens', () => {
    return EXOToken.deployed().then(async exo => {
      const airdropCarrier = accounts[2];
      const recipient = accounts[4];
      const airdropAmount = await exo.airdropAmount.call();
      const expectedOwnerBalance = (await exo.balanceOf.call(accounts[0])).sub(airdropAmount);
      const expectedStakeBalance = (await exo.stakeOf.call(recipient)).add(airdropAmount);

      await exo.setAirdropCarrier(airdropCarrier);
      exo.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 1, 'The airdrop should complete');

          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'Transfer') {
              assert.equal(log.args.from, accounts[0], 'The airdrop should be transferred from owner');
              assert.equal(log.args.to, recipient, 'The airdrop should be transferred to recipient');
              assert(airdropAmount.div(exp).eq(new BN(log.args.value/exp)), 'The airdrop value should be as configured');
            }
          }
          const ownerBalance = await exo.balanceOf.call(accounts[0]);
          const stakeBalance = await exo.stakeOf.call(recipient);
          assert(ownerBalance.eq(expectedOwnerBalance), 'The remaining owner\'s balance should be 10 tokens less');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be 10 tokens more');
        });
    })
  });

  it('should reject airdrops from non-carrier accounts', () => {
    return EXOToken.deployed().then(async exo => {
      const airdropCarrier = accounts[2];
      const recipient = accounts[5];
      const expectedOwnerBalance = await exo.balanceOf.call(accounts[0]);
      const expectedStakeBalance = await exo.stakeOf.call(recipient);

      await exo.setAirdropCarrier(airdropCarrier);
      exo.airdrop(recipient, {from: accounts[3]})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const ownerBalance = await exo.balanceOf.call(accounts[0]);
          const stakeBalance = await exo.stakeOf.call(recipient);
          assert(ownerBalance.eq(expectedOwnerBalance), 'The remaining owner\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be unchanged');
        });
    });
  });

  it('should fail airdrop if the owner\'s balance is insufficient', () => {
    return EXOToken.new(50000006, 10, 50000000).then(async exo => {
      const airdropCarrier = accounts[2];
      const recipient = accounts[6];
      const expectedOwnerBalance = await exo.balanceOf.call(accounts[0]);
      const expectedStakeBalance = await exo.stakeOf.call(recipient);

      await exo.setAirdropCarrier(airdropCarrier);
      exo.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const ownerBalance = await exo.balanceOf.call(accounts[0]);
          const stakeBalance = await exo.stakeOf.call(recipient);
          assert(ownerBalance.eq(expectedOwnerBalance), 'The remaining owner\'s balance should be unchanged');
          assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be unchanged');
        });
    });
  });

  it('should reject airdrops designated to the same account more than once', () => {
    return EXOToken.new(100000000, 10, 50000000).then(async exo => {
      const airdropCarrier = accounts[2];
      const recipient = accounts[4];

      await exo.setAirdropCarrier(airdropCarrier);
      await exo.airdrop(recipient, {from: airdropCarrier});
      const airdropped = await exo.airdropped.call(recipient);
      assert(airdropped, 'The account designated should already be airdropped');

      const expectedOwnerBalance = await exo.balanceOf.call(accounts[0]);
      const expectedStakeBalance = await exo.stakeOf.call(recipient);

      exo.airdrop(recipient, {from: airdropCarrier})
        .then(async result => {
          assert.equal(parseInt(result.receipt.status, 16), 0, 'The airdrop should fail');

          const ownerBalance = await exo.balanceOf.call(accounts[0]);
          const stakeBalance = await exo.stakeOf.call(recipient);
          assert(ownerBalance.eq(expectedOwnerBalance), 'The remaining owner\'s balance should be unchanged');
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

  it('should withdraw stake with no interest applied', () => {
    return EXOToken.deployed().then(async exo => {
      const account = accounts[5];
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
});