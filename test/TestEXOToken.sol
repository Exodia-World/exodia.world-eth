pragma solidity ^0.4.18;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/EXOToken.sol";

contract TestEXOToken {

    EXOToken exo = new EXOToken(100000000, 10, 50000000);
    uint256 exp = 10**18;

    function testInitialParametersUsingDeployedContract() public {
        EXOToken deployedExo = EXOToken(DeployedAddresses.EXOToken());

        Assert.equal(deployedExo.totalSupply(), 100000000*exp, "The total supply of EXO should be 100000000");
        Assert.equal(deployedExo.airdropCarrier(), 0, "The address of airdrop carrier should be 0");
        Assert.equal(deployedExo.airdropAmount(), 10*exp, "The airdrop amount of EXO per account should be 10");
        Assert.equal(deployedExo.minBalanceAfterAirdrop(), 50000000*exp, "The minimum balance after airdrop should be 50000000");
    }

    function testInitialParametersWithNewEXOToken() public {
        Assert.equal(exo.totalSupply(), 100000000*exp, "The total supply of EXO should be 100000000");
        Assert.equal(exo.airdropCarrier(), 0, "The address of airdrop carrier should be 0");
        Assert.equal(exo.airdropAmount(), 10*exp, "The airdrop amount of EXO per account should be 10");
        Assert.equal(exo.minBalanceAfterAirdrop(), 50000000*exp, "The minimum balance after airdrop should be 50000000");
    }

    function testAirdropWithOwnerAsCarrierAndRecipient() public {
        uint256 expectedOwnerBalance = 100000000*exp - 10*exp;
        uint256 expectedStakeBalance = 10*exp;
        address recipient = 0xe6ec8641F1192f728B1e8A2FAc819B755276a9A5;

        exo.setAirdropCarrier(this);
        bool result = exo.airdrop(recipient);

        Assert.equal(result, true, "The airdrop should be successfully completed");
        Assert.equal(exo.balanceOf(this), expectedOwnerBalance, "The remaining owner's balance should be 99999990");
        Assert.equal(exo.stakeOf(recipient), expectedStakeBalance, "The recipient's stake balance should be 10");
    }

    function testDepositStakeWithZeroInterest() public {
        uint256 expectedBalance = 100000000*exp - 60*exp;
        uint256 expectedStakeBalance = 50*exp;

        bool result = exo.depositStake(50);

        Assert.equal(result, true, "The stake deposit should be successfully completed");
        Assert.equal(exo.balanceOf(this), expectedBalance, "The remaining balance should be 99999940");
        Assert.equal(exo.stakeOf(this), expectedStakeBalance, "The sender's stake balance should be 60");
    }

    function testWithdrawStakeWithZeroInterest() public {
        uint256 expectedBalance = 100000000*exp - 30*exp;
        uint256 expectedStakeBalance = 20*exp;

        bool result = exo.withdrawStake(30);

        Assert.equal(result, true, "The stake withdrawal should be successfully completed");
        Assert.equal(exo.balanceOf(this), expectedBalance, "The remaining balance should be 99999970");
        Assert.equal(exo.stakeOf(this), expectedStakeBalance, "The sender's stake balance should be 30");
    }

}
