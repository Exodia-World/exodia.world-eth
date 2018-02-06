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
    uint public tokenCreationTime;

    uint256 public lockedTreasuryFund;
    address public treasuryCarrier;

    uint256 public lockedPreSaleFund;
    address public preSaleCarrier;
    uint256 public preSaleEthToExo;
    uint public preSaleStartTime;
    uint public preSaleDuration;
    uint public preSaleDeadline;
    bool public preSaleEnded = false;

    uint256 public initialICOFund;
    uint256 public availableICOFund;
    uint256 public minICOTokensBoughtEveryPurchase; // by one account for one purchase
    uint256 public maxICOTokensBought; // by one account for all purchases
    uint256 public ICOEthToExo;
    uint public ICOStartTime;
    uint public ICODuration; // in seconds
    uint public ICODeadline; // ICOStartTime + ICODuration
    bool public ICOEnded = false;

    uint256 public airdropAmount;
    address public airdropCarrier;

    mapping (address => uint256) public ICOTokensBought; // to keep track of ICO participants' contributions
    mapping (address => bool) public airdropped;
    mapping (address => Stake) public stakes;

    event StartPreSale(uint indexed startTime, uint indexed deadline);
    event EndPreSale(uint indexed startTime, uint indexed deadline, uint256 remainingPreSaleFund);
    event StartICO(uint indexed startTime, uint indexed deadline);
    event EndICO(uint indexed startTime, uint indexed deadline, uint256 totalICOTokensBought);
    event TransferETH(address indexed from, address indexed to, uint256 value);
    event DepositStake(address indexed staker, uint256 indexed value);
    event WithdrawStake(address indexed staker, uint256 indexed value);
    event UpdateStakeBalance(address indexed staker, uint256 indexed balance);
    event SetTreasuryCarrier(address indexed oldCarrier, address indexed newCarrier);
    event SetPreSaleCarrier(address indexed oldCarrier, address indexed newCarrier);
    event SetAirdropCarrier(address indexed oldCarrier, address indexed newCarrier);
    
    /**
     * @dev Set token information.
     *
     * @param _totalSupply The total supply of tokens -- it's fixed
     * @param _lockedTreasuryFund Locked treasury fund, only handed to its carrier account
     * @param _lockedPreSaleFund Locked pre-sale fund, only handed to its carrier account
     * @param _preSaleEthToExo The exchange rate at pre-sale -- from ETH to EXO
     * @param _availableICOFund Total amount of tokens that can be bought in ICO
     * @param _minICOTokensBoughtEveryPurchase The minimum amount of ICO tokens that must be bought by one account for every purchase
     * @param _maxICOTokensBought The maximum amount of ICO tokens that can be bought by one account for all purchases
     * @param _ICOEthToExo The exchange rate at ICO -- from ETH to EXO
     * @param _ICODuration The duration of ICO
     * @param _airdropAmount The airdrop amount for a single account
     */
    function EXOToken(
        uint256 _totalSupply,
        uint256 _lockedTreasuryFund,
        uint256 _lockedPreSaleFund,
        uint256 _preSaleEthToExo,
        uint _preSaleDuration,
        uint256 _availableICOFund,
        uint256 _minICOTokensBoughtEveryPurchase,
        uint256 _maxICOTokensBought,
        uint256 _ICOEthToExo,
        uint _ICODuration,
        uint256 _airdropAmount
    ) public
    {
        tokenCreationTime = now;
        totalSupply_ = _totalSupply.mul(uint(10)**decimals);

        lockedTreasuryFund = _lockedTreasuryFund.mul(uint(10)**decimals);
        lockedPreSaleFund = _lockedPreSaleFund.mul(uint(10)**decimals);
        preSaleEthToExo = _preSaleEthToExo;
        preSaleDuration = _preSaleDuration;

        availableICOFund = _availableICOFund.mul(uint(10)**decimals);
        initialICOFund = availableICOFund;
        minICOTokensBoughtEveryPurchase = _minICOTokensBoughtEveryPurchase.mul(uint(10)**decimals);
        maxICOTokensBought = _maxICOTokensBought.mul(uint(10)**decimals);
        ICOEthToExo = _ICOEthToExo;
        ICODuration = _ICODuration;

        airdropAmount = _airdropAmount.mul(uint(10)**decimals);

        // The remaining balance will be used for annual return on stakes.
        balances[msg.sender] = totalSupply_
            .sub(lockedTreasuryFund)
            .sub(lockedPreSaleFund)
            .sub(availableICOFund);
    }

    /**
     * @dev Everyone can call the function expect owner.
     */
    modifier exceptOwner() {
        require(msg.sender != owner);
        _;
    }

    /**
     * @dev Only the airdrop carrier can call the function.
     */
    modifier onlyAirdropCarrier() {
        require(msg.sender == airdropCarrier);
        _;
    }

    /**
     * @dev Don't accept any ETH without specific functions being called.
     */
    function () public payable {
        revert();
    }

    /**
     * @dev Start the pre-sale.
     */
    function startPreSale() public onlyOwner returns (bool) {
        // Ensure that the pre-sale hasn't been started before.
        require(preSaleStartTime == 0 && preSaleDeadline == 0);
        require(preSaleCarrier != address(0)); // carrier must be set first
        assert(ICOStartTime == 0 && ICODeadline == 0); // has ICO started?

        preSaleStartTime = now;
        preSaleDeadline = preSaleStartTime.add(preSaleDuration);

        StartPreSale(preSaleStartTime, preSaleDeadline);
        return true;
    }

    /**
     * @dev End the pre-sale.
     */
    function endPreSale() public onlyOwner returns (bool) {
        // Ensure that the pre-sale has passed its deadline.
        require(preSaleStartTime > 0 && preSaleDeadline < now);
        require(preSaleEnded == false);

        preSaleEnded = true;

        EndPreSale(preSaleStartTime, preSaleDeadline, balances[preSaleCarrier]);
        return true;
    }

    /**
     * @dev Buy ICO tokens using ETH.
     */
    function buyICOTokens() public payable returns (bool) {
        // Check if the ICO is still active.
        require(ICOStartTime != 0 && ICOStartTime <= now && ICODeadline >= now);

        // Check for serious participants and if we have tokens available.
        uint256 exoBought = msg.value.mul(ICOEthToExo);
        require(availableICOFund >= exoBought && exoBought >= minICOTokensBoughtEveryPurchase);

        // Whales check!
        uint256 totalICOTokensBought = ICOTokensBought[msg.sender].add(exoBought);
        require(totalICOTokensBought <= maxICOTokensBought);

        availableICOFund = availableICOFund.sub(exoBought);
        balances[msg.sender] = balances[msg.sender].add(exoBought);
        ICOTokensBought[msg.sender] = totalICOTokensBought;

        Transfer(this, msg.sender, exoBought);
        return true;
    }

    /**
     * @dev Start the ICO.
     */
    function startICO() public onlyOwner returns (bool) {
        // Ensure that the ICO hasn't been started before.
        require(ICOStartTime == 0 && ICODeadline == 0);
        require(preSaleStartTime > 0 && preSaleDeadline < now); // has pre-sale ended?
        require(availableICOFund > 0);

        ICOStartTime = now;
        ICODeadline = ICOStartTime.add(ICODuration);

        StartICO(ICOStartTime, ICODeadline);
        return true;
    }

    /**
     * @dev End the ICO.
     */
    function endICO() public onlyOwner returns (bool) {
        // Ensure that the ICO has passed its deadline.
        require(ICOStartTime > 0 && ICODeadline < now);
        require(ICOEnded == false);

        ICOEnded = true;

        EndICO(ICOStartTime, ICODeadline, initialICOFund.sub(availableICOFund));
        return true;
    }

    /**
     * @dev Release any remaining ICO fund back to owner after ICO ended.
     */
    function releaseRemainingICOFundToOwner() public onlyOwner returns (bool) {
        require(ICOStartTime > 0 && ICODeadline < now); // has ICO ended?
        require(availableICOFund > 0);

        balances[owner] = balances[owner].add(availableICOFund);
        Transfer(this, owner, availableICOFund);
        availableICOFund = 0;
        return true;
    }

    /**
     * @dev Send ETH fund raised in ICO for owner.
     */
    function claimEtherFundRaisedInICO() public onlyOwner returns (bool) {
        require(ICOStartTime > 0 && ICODeadline < now); // has ICO ended?
        require(this.balance > 0);

        // WARNING: All Ethers will be sent, even for non-ICO-related.
        uint256 fundRaised = this.balance;
        owner.transfer(fundRaised);

        TransferETH(this, owner, fundRaised);
        return true;
    }

    /**
     * @dev Transfer free tokens from the remaining ICO fund.
     *
     * The free tokens are added to the _to address' staking balance.
     * @param _to The address which the airdrop is designated to
     */
    function airdrop(address _to) public onlyAirdropCarrier returns (bool) {
        require(_to != address(0));
        require(airdropped[_to] != true);
        require(ICOStartTime > 0 && ICODeadline < now); // ICO must have ended first
        require(availableICOFund >= airdropAmount);

        // Airdrop to the designated account.
        availableICOFund = availableICOFund.sub(airdropAmount);
        stakes[_to].balance = stakes[_to].balance.add(airdropAmount);
        airdropped[_to] = true;

        Transfer(airdropCarrier, _to, airdropAmount);
        return true;
    }

    /**
     * @dev Deposit stake to Exodia.World.
     *
     * Deposited stake is added to the staker's staking balance.
     * @param _value The amount of EXO to deposit
     */
    function depositStake(uint256 _value) public exceptOwner returns (bool) {
        require(ICOStartTime > 0 && ICODeadline < now); // ICO must have ended first
        require(_value > 0 && balances[msg.sender] >= _value);

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
    function withdrawStake(uint256 _value) public exceptOwner returns (bool) {
        require(ICOStartTime > 0 && ICODeadline < now); // ICO must have ended first
        require(_value > 0 && stakes[msg.sender].balance >= _value);

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
        require(ICOStartTime > 0 && ICODeadline < now); // ICO must have ended first
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
        require(ICOStartTime > 0 && ICODeadline < now); // ICO must have ended first

        if (stakes[msg.sender].balance == 0 || stakes[msg.sender].startTime == 0) {return 0;}
        require(stakes[msg.sender].startTime >= tokenCreationTime && stakes[msg.sender].startTime <= now);

        uint256 totalInterest = 0;

        // 10% for the first 3 years.
        uint interestPeriod = 3 years;
        uint interestEndTime = tokenCreationTime.add(interestPeriod);
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
     * @dev Set new treasury carrier account and transfer fund into its wallet.
     *
     * @param _treasuryCarrier The address of new treasury carrier account
     */
    function setTreasuryCarrier(address _treasuryCarrier) public onlyOwner returns (bool) {
        if (_moveFund(lockedTreasuryFund, treasuryCarrier, _treasuryCarrier)) {
            SetTreasuryCarrier(treasuryCarrier, _treasuryCarrier);
            treasuryCarrier = _treasuryCarrier;
            return true;
        }
        return false;
    }

    /**
     * @dev Set new pre-sale carrier account and transfer fund into its wallet.
     *
     * @param _preSaleCarrier The address of new pre-sale carrier account
     */
    function setPreSaleCarrier(address _preSaleCarrier) public onlyOwner returns (bool) {
        if (_moveFund(lockedPreSaleFund, preSaleCarrier, _preSaleCarrier)) {
            SetPreSaleCarrier(preSaleCarrier, _preSaleCarrier);
            preSaleCarrier = _preSaleCarrier;
            return true;
        }
        return false;
    }

    /**
     * @dev Set the address of airdrop carrier.
     *
     * @param _airdropCarrier The only address privileged to airdrop
     */
    function setAirdropCarrier(address _airdropCarrier) public onlyOwner returns (bool) {
        SetAirdropCarrier(airdropCarrier, _airdropCarrier);
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
     * @dev Get the staking start time of an account.
     *
     * @param _staker The staker's account address
     */
    function stakingStartTimeOf(address _staker) public view returns (uint) {
        return stakes[_staker].startTime;
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

    /**
     * @dev Move remaining fund to a new carrier.
     *
     * @param _lockedFund The fund to release if the first carrier is set
     * @param _oldCarrier The old carrier of fund
     * @param _newCarrier The new carrier of fund
     */
    function _moveFund(uint256 _lockedFund, address _oldCarrier, address _newCarrier) internal onlyOwner returns (bool) {
        // Check for non-sensical address and possibility of abuse.
        require(_oldCarrier != _newCarrier && _newCarrier != address(0));
        require(balances[_newCarrier] == 0); // burn check!

        if (_lockedFund == 0 && _oldCarrier != address(0)) {
            // Move fund from old carrier to new carrier.
            // WARNING: Everything will be transferred.
            balances[_newCarrier] = balances[_oldCarrier];
            balances[_oldCarrier] = 0;
            Transfer(_oldCarrier, _newCarrier, balances[_newCarrier]);
        } else if (_lockedFund > 0 && _oldCarrier == address(0)) {
            // Release fund to new carrier.
            balances[_newCarrier] = _lockedFund;
            _lockedFund = 0;
            Transfer(this, _newCarrier, balances[_newCarrier]);
        } else {
            // Revert if anything unexpected happens.
            revert();
        }

        return true;
    }

}
