pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title EXO Token
 *
 * @dev Implementation of the EXO Token by Exodia.World.
 */
contract EXOToken is StandardToken, Ownable {

    struct Stake {
        uint256 balance;
        uint startTime;
    }

    string public name = "EXO";
    string public symbol = "EXO";
    uint8 public decimals = 18;
    uint tokenCreationTime;

    address public airdropCarrier;
    uint256 public airdropAmount;
    uint256 public minBalanceAfterAirdrop;

    mapping (address => Stake) public stakes;

    event DepositStake(address indexed staker, uint256 indexed value);
    event WithdrawStake(address indexed staker, uint256 indexed value);
    event UpdateStakeBalance(address indexed staker, uint256 indexed balance);
    
    /**
     * @dev Set token information.
     *
     * @param _totalSupply The total supply of tokens -- it's fixed
     * @param _airdropAmount The amount to airdrops
     * @param _minBalanceAfterAirdrop No airdrop is allowed after the owner's balance hits this
     */
    function EXOToken(
        uint256 _totalSupply,
        uint256 _airdropAmount,
        uint256 _minBalanceAfterAirdrop
    ) public
    {
        tokenCreationTime = now;
        totalSupply_ = _totalSupply * uint(10)**decimals;
        balances[msg.sender] = totalSupply_;
        airdropAmount = _airdropAmount * uint(10)**decimals;
        minBalanceAfterAirdrop = _minBalanceAfterAirdrop * uint(10)**decimals;
    }

    /**
     * @dev Transfer free tokens from the owner's account.
     *
     * The free tokens are added to the _to address' staking balance.
     * @param _to The address which the airdrop is designated to
     */
    function airdrop(address _to) public returns (bool) {
        require(msg.sender == airdropCarrier);
        require(_to != address(0));
        uint256 balanceAfterAirdrop = balances[owner].sub(airdropAmount);
        require(balanceAfterAirdrop >= minBalanceAfterAirdrop);

        balances[owner] = balanceAfterAirdrop;
        stakes[_to].balance = stakes[_to].balance.add(airdropAmount);

        Transfer(owner, _to, airdropAmount);
        return true;
    }

    /**
     * @dev Deposit stake to Exodia.World.
     *
     * Deposited stake is added to the staker's staking balance.
     * @param _value The amount of EXO to deposit
     */
    function depositStake(uint256 _value) public returns (bool) {
        require(balances[msg.sender] >= _value);

        uint256 totalBalanceBeforeDeposit = balances[msg.sender].add(stakes[msg.sender].balance);

        updateStakeBalance();
        balances[msg.sender] = balances[msg.sender].sub(_value);
        stakes[msg.sender].balance = stakes[msg.sender].balance.add(_value);

        uint256 totalBalanceAfterDeposit = balances[msg.sender].add(stakes[msg.sender].balance);
        assert(totalBalanceBeforeDeposit == totalBalanceAfterDeposit);
        DepositStake(msg.sender, _value);
        return true;
    }

    /**
     * @dev Withdraw stake from Exodia.World.
     *
     * Withdrawn stake is added to the staker's liquid balance.
     * @param _value The amount of EXO to withdraw
     */
    function withdrawStake(uint256 _value) public returns (bool) {
        require(stakes[msg.sender].balance >= _value);

        uint256 totalBalanceBeforeWithdrawal = balances[msg.sender].add(stakes[msg.sender].balance);

        updateStakeBalance();
        stakes[msg.sender].balance = stakes[msg.sender].balance.sub(_value);
        balances[msg.sender] = balances[msg.sender].add(_value);

        uint256 totalBalanceAfterWithdrawal = balances[msg.sender].add(stakes[msg.sender].balance);
        assert(totalBalanceBeforeWithdrawal == totalBalanceAfterWithdrawal);
        WithdrawStake(msg.sender, _value);
        return true;
    }

    /**
     * @dev Update a staker's balance with staking interest.
     */
    function updateStakeBalance() public returns (uint256) {
        uint256 interest = calculateInterest();
        require(balances[owner] >= interest);

        balances[owner] = balances[owner].sub(interest);
        stakes[msg.sender].balance = stakes[msg.sender].balance.add(interest);
        stakes[msg.sender].startTime = now;

        UpdateStakeBalance(msg.sender, stakes[msg.sender].balance);
        return stakes[msg.sender].balance;
    }

    /**
     * @dev Calculate interest of a staker's balance since last staking.
     *
     * Everything is hardcoded to simplify things.
     * 10% for the first 3 years and 5% for the rest until all tokens have been distributed.
     * The interest is gained every 7 days.
     * For example, staking of 5 EXO for 16 days would yield 5 EXO * 0.0273% (rate per day) * 14 (days).
     */
    function calculateInterest() public view returns (uint256) {
        require(stakes[msg.sender].startTime >= tokenCreationTime);
        require(stakes[msg.sender].startTime <= now);
        if (stakes[msg.sender].balance == 0) {return 0;}

        uint256 totalInterest = 0;

        // 10% for the first 3 years.
        uint interestPeriod = 3 years;
        uint interestEndTime = interestStartTime.add(interestPeriod);
        uint256 interest = _calculateInterest(10, 7 days, tokenCreationTime, interestEndTime);
        totalInterest = totalInterest.add(interest);

        // 5% for the rest.
        interestPeriod = 500 years; // some nonsensical time (or is it?)
        uint interestStartTime = interestEndTime.add(1);
        interestEndTime = interestStartTime.add(interestPeriod);
        _calculateInterest(5, 7 days, interestStartTime, interestEndTime);
        totalInterest = totalInterest.add(interest);

        return balances[owner] >= totalInterest ? totalInterest : balances[owner];
    }

    /**
     * @dev Set the address of airdrop carrier.
     *
     * @param _airdropCarrier The only address privileged to airdrop
     */
    function setAirdropCarrier(address _airdropCarrier) public onlyOwner returns (bool) {
        airdropCarrier = _airdropCarrier;
        return true;
    }

    /**
     * @dev Get the stake balance of an account.
     *
     * @param _staker The staker's account address
     */
    function stakeOf(address _staker) public view returns (uint256) {
        return stakes[_staker].balance;
    }

    /**
     * @dev Internal function to calculate interest for a time period.
     *
     * @param _interestRatePerYear //
     * @param _interestCycleLength The length of a cycle in days
     * @param _interestStartTime The start time of an interest period
     * @param _interestEndTime The end time of an interest period
     */
    function _calculateInterest(
        uint8 _interestRatePerYear,
        uint _interestCycleLength,
        uint _interestStartTime,
        uint _interestEndTime
    ) internal view returns (uint256)
    {
        uint256 interest = 0;
        if (now >= _interestStartTime && now <= _interestEndTime) {
            // Example: 34 days / 7 days = 4 cycles with a remainder.
            uint interestCycles = now.sub(stakes[msg.sender].startTime).div(_interestCycleLength);
            // Example: 4 cycles * 7 days = 28 days.
            uint eligibleStakingDays = interestCycles.mul(_interestCycleLength);
            // Example: interest = balance * (10%/365 * 28 days).
            interest = stakes[msg.sender].balance.mul(_interestRatePerYear).mul(eligibleStakingDays).div(36500);
        }
        return interest;
    }

}
