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

    string public name;
    string public symbol;
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
     * @dev Set the necessary values for airdrop, stake payout, etc.
     *
     * @param _totalSupply The total supply of tokens -- it's fixed
     * @param _airdropCarrier The only address privileged to airdrop
     * @param _airdropAmount The amount to airdrops
     * @param _minBalanceAfterAirdrop No airdrop is allowed after the owner's balance hits this
     */
    function EXOToken(
        string _name,
        string _symbol,
        uint256 _totalSupply,
        address _airdropCarrier,
        uint256 _airdropAmount,
        uint256 _minBalanceAfterAirdrop
    ) public
    {
        name = _name;
        symbol = _symbol;
        tokenCreationTime = now;
        totalSupply_ = _totalSupply * uint(10)**decimals;
        balances[msg.sender] = totalSupply_;
        airdropCarrier = _airdropCarrier;
        airdropAmount = _airdropAmount * uint(10)**decimals;
        minBalanceAfterAirdrop = _minBalanceAfterAirdrop * uint(10)**decimals;
    }

    /**
     * @dev Convert token value to its base unit.
     *
     * @param _value Supplied token value
     */
    modifier toBaseUnit(uint256 _value) {
        _value = _value * uint(10)**decimals;
        _;
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
    function depositStake(uint256 _value) public toBaseUnit(_value) returns (bool) {
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
    function withdrawStake(uint256 _value) public toBaseUnit(_value) returns (bool) {
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

    function updateStakeBalance() public returns (uint256) {
        uint256 interest = calculateInterest();
        require(balances[owner] >= interest);
        balances[owner] = balances[owner].sub(interest);

        stakes[msg.sender].balance = stakes[msg.sender].balance.add(interest);
        stakes[msg.sender].startTime = now;

        UpdateStakeBalance(msg.sender, stakes[msg.sender].balance);
        return stakes[msg.sender].balance;
    }

    function calculateInterest() public view returns (uint256) {
        require(stakes[msg.sender].startTime >= tokenCreationTime);
        require(stakes[msg.sender].startTime <= now);
        if (stakes[msg.sender].balance == 0) {return 0;}

        uint256 totalInterest = 0;

        uint interestPeriod = 3 years;
        uint interestEndTime = interestStartTime.add(interestPeriod);
        uint256 interest = _calculateInterest(10, 7 days, tokenCreationTime, interestEndTime);
        totalInterest = totalInterest.add(interest);

        interestPeriod = 500 years;
        uint interestStartTime = interestEndTime.add(1);
        interestEndTime = interestStartTime.add(interestPeriod);
        _calculateInterest(5, 7 days, interestStartTime, interestEndTime);
        totalInterest = totalInterest.add(interest);

        return totalInterest;
    }

    function _calculateInterest(
        uint8 _interestRatePerYear,
        uint _interestCycleLength,
        uint _interestStartTime,
        uint _interestEndTime
    ) internal view returns (uint256)
    {
        uint256 interest = 0;
        if (now >= _interestStartTime && now <= _interestEndTime) {
            uint interestCycles = now.sub(stakes[msg.sender].startTime).div(_interestCycleLength);
            uint eligibleStakingDays = interestCycles.mul(_interestCycleLength);
            interest = stakes[msg.sender].balance.mul(_interestRatePerYear).mul(eligibleStakingDays).div(36500);
        }
        return interest;
    }

}
