const BN = require('bn.js');
const expectThrow = require('./helpers/expectThrow');
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
      const airdropAmount = await exo.airdropAmount.call();
      const recipient = accounts[4];
      const expectedOwnerBalance = (await exo.balanceOf.call(accounts[0])).sub(airdropAmount);
      const expectedStakeBalance = (await exo.stakeOf.call(recipient)).add(airdropAmount);

      exo.setAirdropCarrier(accounts[2]);
      exo.airdrop(recipient, {from: accounts[2]})
        .then(async result => {
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
      const recipient = accounts[4];
      const expectedOwnerBalance = await exo.balanceOf.call(accounts[0]);
      const expectedStakeBalance = await exo.stakeOf.call(recipient);

      await exo.setAirdropCarrier(accounts[2]);
      const airdropCarrier = await exo.airdropCarrier.call();
      assert.equal(airdropCarrier, accounts[2], 'The airdrop carrier\'s address should be set');
      await expectThrow(exo.airdrop(recipient, {from: accounts[3]}));

      const ownerBalance = await exo.balanceOf.call(accounts[0]);
      const stakeBalance = await exo.stakeOf.call(recipient);
      assert(ownerBalance.eq(expectedOwnerBalance), 'The remaining owner\'s balance should be unchanged');
      assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be unchanged');
    });
  });

  it('should fail airdrop if the owner\'s balance is insufficient', () => {
    return EXOToken.new(50000006, 10, 50000000).then(async exo => {
      const recipient = accounts[4];
      const expectedOwnerBalance = await exo.balanceOf.call(accounts[0]);
      const expectedStakeBalance = await exo.stakeOf.call(recipient);

      await exo.setAirdropCarrier(accounts[2]);
      const airdropCarrier = await exo.airdropCarrier.call();
      assert.equal(airdropCarrier, accounts[2], 'The airdrop carrier\'s address should be set');
      await expectThrow(exo.airdrop(recipient, {from: accounts[2]}));

      const ownerBalance = await exo.balanceOf.call(accounts[0]);
      const stakeBalance = await exo.stakeOf.call(recipient);
      assert(ownerBalance.eq(expectedOwnerBalance), 'The remaining owner\'s balance should be unchanged');
      assert(stakeBalance.eq(expectedStakeBalance), 'The recipient\'s stake balance should be unchanged');
    });
  });

  it('should deposit stake with no interest applied', () => {
    return EXOToken.deployed().then(async exo => {
      await exo.transfer(accounts[5], 100*exp);
      const deposit = (new BN(50)).mul(exp);
      const expectedBalance = (await exo.balanceOf.call(accounts[5])).sub(deposit);
      const expectedStakeBalance = (await exo.stakeOf.call(accounts[5])).add(deposit);

      exo.depositStake(50*exp, {from: accounts[5]})
        .then(async result => {
          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'DepositStake') {
              assert.equal(log.args.staker, accounts[5], 'The stake should be deposited by staker');
              assert((new BN(log.args.value)).div(exp).eq(new BN(50)), 'The stake value should be 50 tokens');
            }
          }
          const balance = await exo.balanceOf.call(accounts[5]);
          const stakeBalance = await exo.stakeOf.call(accounts[5]);
          console.log(balance.valueOf(), expectedBalance.valueOf());
          console.log(stakeBalance.valueOf(), expectedStakeBalance.valueOf());
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be 50 tokens less');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be 50 tokens more');
        });
    });
  });

  it('should withdraw stake with no interest applied', () => {
    return EXOToken.deployed().then(async exo => {
      const withdrawal = (new BN(20)).mul(exp);
      const expectedBalance = (await exo.balanceOf.call(accounts[5])).add(withdrawal);
      const expectedStakeBalance = (await exo.stakeOf.call(accounts[5])).sub(withdrawal);

      exo.depositStake(20*exp, {from: accounts[5]})
        .then(async result => {
          for (let i = 0; i < result.logs.length; i++) {
            const log = result.logs[i];
            if (log.event === 'WithdrawStake') {
              assert.equal(log.args.staker, accounts[5], 'The stake should be withdrawn by staker');
              assert((new BN(log.args.value/exp)).eq(new BN(50)), 'The stake value should be 20 tokens');
            }
          }
          const balance = await exo.balanceOf.call(accounts[5]);
          const stakeBalance = await exo.stakeOf.call(accounts[5]);
          assert(balance.eq(expectedBalance), 'The staker\'s balance should be 20 tokens more');
          assert(stakeBalance.eq(expectedStakeBalance), 'The staker\'s stake balance should be 20 tokens less');
        });
    });
  });
});