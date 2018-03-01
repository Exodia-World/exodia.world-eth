pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "./EXOBase.sol";

/**
 * @title EXO Token
 *
 * @dev Implementation of the EXO Token by Exodia.World.
 */
contract EXOToken is EXOBase, PausableToken {

    struct Stake {
        uint256 balance;
        uint256 startTime;
    }

    string public name = "EXO";
    string public symbol = "EXO";
    uint8 public decimals = 18;

    uint256 public minBalanceForStakeReward;
    address public treasuryCarrier;
    address public preSaleCarrier;
    uint256 public preSaleEthToExo;
    uint256 public preSaleStartTime;
    uint256 public preSaleDuration;
    uint256 public preSaleDeadline;
    bool public preSaleEnded = false;

    uint256 public initialICOFund;
    uint256 public availableICOFund;
    uint256 public totalICOTokensBought;
    uint256 public minICOTokensBoughtEveryPurchase; // by one account for one purchase
    uint256 public maxICOTokensBought; // by one account for all purchases
    uint256 public ICOEthToExo;
    uint256 public ICOStartTime;
    uint256 public ICODuration; // in seconds
    uint256 public ICODeadline; // ICOStartTime + ICODuration
    bool public ICOEnded = false;

    uint256 public airdropAmount;
    address public airdropCarrier;

    mapping (bytes32 => uint256) public lockedFunds;
    mapping (address => uint256) public ICOTokensBought; // to keep track of ICO participants' contributions
    mapping (address => bool) public airdropped;
    mapping (address => Stake) public stakes;
    mapping (address => bool) public frozenAccounts;

    event StartPreSale(uint256 indexed startTime, uint256 indexed deadline);
    event EndPreSale(uint256 indexed startTime, uint256 indexed deadline, uint256 remainingPreSaleFund);
    event StartICO(uint256 indexed startTime, uint256 indexed deadline);
    event EndICO(uint256 indexed startTime, uint256 indexed deadline, uint256 totalICOTokensBought);
    event TransferETH(address indexed from, address indexed to, uint256 value);
    event DepositStake(address indexed staker, uint256 indexed value);
    event WithdrawStake(address indexed staker, uint256 indexed value);
    event UpdateStakeBalance(address indexed staker, uint256 indexed balance);
    event SetTreasuryCarrier(address indexed oldCarrier, address indexed newCarrier);
    event SetPreSaleCarrier(address indexed oldCarrier, address indexed newCarrier);
    event SetAirdropCarrier(address indexed oldCarrier, address indexed newCarrier);
    event FreezeAccount(address targetAccount, bool isFrozen);
    
    /**
     * @dev Set token information.
     *
     * @param _totalSupply The total supply of tokens -- it's fixed
     * @param _minBalanceForStakeReward The minimum balance required for stake reward
     * @param _lockedTreasuryFund Locked treasury fund, only handed to its carrier account
     * @param _lockedPreSaleFund Locked pre-sale fund, only handed to its carrier account
     * @param _preSaleEthToExo The exchange rate at pre-sale -- from ETH to EXO
     * @param _preSaleDuration The duration of pre-sale period in seconds
     * @param _availableICOFund Total amount of tokens that can be bought in ICO
     * @param _minICOTokensBoughtEveryPurchase The minimum amount of ICO tokens that must be bought by one account for every purchase
     * @param _maxICOTokensBought The maximum amount of ICO tokens that can be bought by one account for all purchases
     * @param _ICOEthToExo The exchange rate at ICO -- from ETH to EXO
     * @param _ICODuration The duration of ICO
     * @param _airdropAmount The airdrop amount for a single account
     */
    function EXOToken(
        address _exoStorageAddress,
        uint256 _totalSupply,
        uint256 _minBalanceForStakeReward,
        uint256 _lockedTreasuryFund,
        uint256 _lockedPreSaleFund,
        uint256 _preSaleEthToExo,
        uint256 _preSaleDuration,
        uint256 _availableICOFund,
        uint256 _minICOTokensBoughtEveryPurchase,
        uint256 _maxICOTokensBought,
        uint256 _ICOEthToExo,
        uint256 _ICODuration,
        uint256 _airdropAmount
    ) EXOBase(_exoStorageAddress) public
    {
        totalSupply_ = _totalSupply.mul(uint(10)**decimals);
        minBalanceForStakeReward = _minBalanceForStakeReward.mul(uint(10)**decimals);

        lockedFunds["treasury"] = _lockedTreasuryFund.mul(uint(10)**decimals);
        lockedFunds["preSale"] = _lockedPreSaleFund.mul(uint(10)**decimals);
        preSaleEthToExo = _preSaleEthToExo;
        preSaleDuration = _preSaleDuration;

        availableICOFund = _availableICOFund.mul(uint(10)**decimals);
        initialICOFund = availableICOFund;
        minICOTokensBoughtEveryPurchase = _minICOTokensBoughtEveryPurchase.mul(uint(10)**decimals);
        maxICOTokensBought = _maxICOTokensBought.mul(uint(10)**decimals);
        ICOEthToExo = _ICOEthToExo;
        ICODuration = _ICODuration;

        airdropAmount = _airdropAmount.mul(uint(10)**decimals);

        // Calculate remaining balance for stake reward.
        balances[msg.sender] = totalSupply_
            .sub(lockedFunds["treasury"])
            .sub(lockedFunds["preSale"])
            .sub(availableICOFund);

        assert(balances[msg.sender] >= minBalanceForStakeReward);
    }

    modifier exceptOwner() {
        require(msg.sender != owner);
        _;
    }
    modifier onlyAirdropCarrier() {
        require(msg.sender == airdropCarrier);
        _;
    }
    modifier beforePreSale() {
        require(preSaleStartTime == 0 && preSaleDeadline == 0);
        _;
    }
    modifier afterPreSale() {
        require(preSaleStartTime > 0 && preSaleDeadline < now);
        _;
    }
    modifier beforeOrDuringPreSale() {
        require((preSaleStartTime == 0 && preSaleDeadline == 0) || (preSaleStartTime > 0 && preSaleStartTime <= now && preSaleDeadline >= now));
        _;
    }
    modifier beforeICO() {
        require(ICOStartTime == 0 && ICODeadline == 0);
        _;
    }
    modifier duringICO() {
        require(ICOStartTime > 0 && ICOStartTime <= now && ICODeadline >= now);
        _;
    }
    modifier afterICO() {
        require(ICOStartTime > 0 && ICODeadline < now);
        _;
    }
    modifier exceptFrozen() {
        require(! frozenAccounts[msg.sender]);
        _;
    }

    /**
     * @dev Don't accept any ETH without specific functions being called.
     */
    function () external payable {
        revert();
    }

    /**
    * @dev Transfer token for a specified address
    *
    * @param _to The address to transfer to.
    * @param _value The amount to be transferred.
    */
    function transfer(address _to, uint256 _value) public whenNotPaused exceptFrozen returns (bool) {
        // Owner and frozen accounts can't receive tokens.
        require(_to != owner && ! frozenAccounts[_to]);
        require(msg.sender != owner || balances[owner].sub(_value) >= minBalanceForStakeReward);

        return super.transfer(_to, _value);
    }

    /**
    * @dev Transfer tokens from one address to another
    *
    * @param _from The address which you want to send tokens from
    * @param _to The address which you want to transfer to
    * @param _value The amount of tokens to be transferred
    */
    function transferFrom(address _from, address _to, uint256 _value) public whenNotPaused exceptFrozen returns (bool) {
        require(! frozenAccounts[_from] && ! frozenAccounts[_to]);
        return super.transferFrom(_from, _to, _value);
    }

    /**
     * @dev Start the pre-sale.
     */
    function startPreSale() external whenNotPaused onlyOwner beforePreSale beforeICO returns (bool) {
        require(preSaleCarrier != address(0)); // carrier must be set first

        preSaleStartTime = now;
        preSaleDeadline = preSaleStartTime.add(preSaleDuration);

        StartPreSale(preSaleStartTime, preSaleDeadline);
        return true;
    }

    /**
     * @dev End the pre-sale.
     */
    function endPreSale() external whenNotPaused onlyOwner afterPreSale returns (bool) {
        require(! preSaleEnded);

        preSaleEnded = true;

        EndPreSale(preSaleStartTime, preSaleDeadline, balances[preSaleCarrier]);
        return true;
    }

    /**
     * @dev Buy ICO tokens using ETH.
     */
    function buyICOTokens() external payable whenNotPaused exceptFrozen duringICO returns (bool) {
        // Check for serious participants and if we have tokens available.
        uint256 exoBought = msg.value.mul(ICOEthToExo);
        require(availableICOFund >= exoBought && exoBought >= minICOTokensBoughtEveryPurchase);

        // Whales check!
        uint256 totalICOTokensBoughtByAccount = ICOTokensBought[msg.sender].add(exoBought);
        require(totalICOTokensBoughtByAccount <= maxICOTokensBought);

        availableICOFund = availableICOFund.sub(exoBought);
        balances[msg.sender] = balances[msg.sender].add(exoBought);
        ICOTokensBought[msg.sender] = totalICOTokensBoughtByAccount;
        totalICOTokensBought = totalICOTokensBought.add(exoBought);

        Transfer(this, msg.sender, exoBought);
        return true;
    }

    /**
     * @dev Start the ICO.
     */
    function startICO() external whenNotPaused onlyOwner afterPreSale beforeICO returns (bool) {
        require(availableICOFund > 0);

        ICOStartTime = now;
        ICODeadline = ICOStartTime.add(ICODuration);

        StartICO(ICOStartTime, ICODeadline);
        return true;
    }

    /**
     * @dev End the ICO.
     */
    function endICO() external whenNotPaused onlyOwner afterICO returns (bool) {
        require(! ICOEnded);

        ICOEnded = true;
        assert(totalICOTokensBought == initialICOFund.sub(availableICOFund));

        EndICO(ICOStartTime, ICODeadline, totalICOTokensBought);
        return true;
    }

    /**
     * @dev Release any remaining ICO fund back to owner after ICO ended.
     */
    function releaseRemainingICOFundToOwner() external whenNotPaused onlyOwner afterICO returns (bool) {
        require(availableICOFund > 0);

        balances[owner] = balances[owner].add(availableICOFund);
        Transfer(this, owner, availableICOFund);
        availableICOFund = 0;
        return true;
    }

    /**
     * @dev Send ETH fund raised in ICO for owner.
     */
    function claimEtherFundRaisedInICO() external whenNotPaused onlyOwner afterICO returns (bool) {
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
    function airdrop(address _to) external whenNotPaused onlyAirdropCarrier exceptFrozen afterICO returns (bool) {
        require(_to != address(0) && ! frozenAccounts[_to]);
        require(airdropped[_to] != true);
        require(availableICOFund >= airdropAmount);

        // Airdrop to the designated account.
        availableICOFund = availableICOFund.sub(airdropAmount);
        stakes[_to].balance = stakes[_to].balance.add(airdropAmount);
        stakes[_to].startTime = now;
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
    function depositStake(uint256 _value) external whenNotPaused exceptFrozen exceptOwner afterICO returns (bool) {
        require(_value > 0 && balances[msg.sender] >= _value);

        updateStakeBalance();
        balances[msg.sender] = balances[msg.sender].sub(_value);
        stakes[msg.sender].balance = stakes[msg.sender].balance.add(_value);

        DepositStake(msg.sender, _value);
        return true;
    }

    /**
     * @dev Withdraw stake from Exodia.World.
     *
     * Withdrawn stake is added to the staker's liquid balance.
     * @param _value The amount of EXO to withdraw
     */
    function withdrawStake(uint256 _value) external whenNotPaused exceptFrozen exceptOwner afterICO returns (bool) {
        require(_value > 0 && stakes[msg.sender].balance >= _value);

        // No reward if staking has not been for at least 21 days.
        if (now.sub(stakes[msg.sender].startTime) >= 21 days) {
            updateStakeBalance();
        } else {
            stakes[msg.sender].startTime = now; // re-stake balance even if no reward
        }
        stakes[msg.sender].balance = stakes[msg.sender].balance.sub(_value);
        balances[msg.sender] = balances[msg.sender].add(_value);

        WithdrawStake(msg.sender, _value);
        return true;
    }

    /**
     * @dev Update a staker's balance with staking interest.
     */
    function updateStakeBalance() public whenNotPaused exceptFrozen exceptOwner afterICO returns (uint256) {
        // Has the staking been for at least 21 days?
        require(now.sub(stakes[msg.sender].startTime) >= 21 days);

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
    function calculateInterest() public view exceptOwner afterICO returns (uint256) {
        if (stakes[msg.sender].balance == 0 || stakes[msg.sender].startTime == 0 || balances[owner] == 0) {return 0;}

        uint256 totalInterest = 0;
        uint256 stakeDays = 0;
        uint256 eligibleStakeDays = 0;
        uint256 stakeStartTime = stakes[msg.sender].startTime;

        // 10% for the first 3 years.
        uint256 interestPeriod = 3 years;
        uint256 interestStartTime = ICODeadline.add(1); // starts after ICO
        uint256 interestEndTime = interestStartTime.add(interestPeriod);
        // Only runs if the stake start time is within this interest period.
        if (stakeStartTime >= interestStartTime && stakeStartTime <= interestEndTime) {
            // Put an upper boundary for stake end time.
            uint256 stakeEndTime = now > interestEndTime ? interestEndTime : now;
            stakeDays = stakeEndTime.sub(stakeStartTime).div(1 days);
            // Ex: 34 days // 7 days = 4 cycles with a remainder ==> 4 cycles * 7 days = 28 days
            eligibleStakeDays = stakeDays.div(7).mul(7);
            // Ex: interest = 50 EXO * (10%/365 days) * 28 days
            totalInterest = stakes[msg.sender].balance.mul(10).mul(eligibleStakeDays).div(36500);
        }

        // 5% for the rest.
        interestStartTime = interestEndTime.add(1);
        if (now >= interestStartTime) {
            uint256 leftOverStakeDays = 0;
            if (stakeStartTime < interestStartTime) {
                leftOverStakeDays = stakeDays.sub(eligibleStakeDays); // ex: 34 days - 28 days = 6 days
                // Put a lower boundary for stake start time.
                stakeStartTime = stakeStartTime < interestStartTime ? interestStartTime : stakeStartTime;
            }
            // Left over staking days from the first period are carried over to this one.
            stakeDays = now.sub(stakeStartTime).div(1 days).add(leftOverStakeDays);
            eligibleStakeDays = stakeDays.div(7).mul(7);
            totalInterest = totalInterest.add(stakes[msg.sender].balance.mul(5).mul(eligibleStakeDays).div(36500));
        }

        return balances[owner] >= totalInterest ? totalInterest : balances[owner];
    }

    /**
     * @dev Set new treasury carrier account and transfer fund into its wallet.
     *
     * @param _treasuryCarrier The address of new treasury carrier account
     */
    function setTreasuryCarrier(address _treasuryCarrier) external whenNotPaused onlyOwner returns (bool) {
        require(_treasuryCarrier != preSaleCarrier && _treasuryCarrier != airdropCarrier);

        if (_moveFund("treasury", treasuryCarrier, _treasuryCarrier)) {
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
    function setPreSaleCarrier(address _preSaleCarrier) external whenNotPaused onlyOwner beforeOrDuringPreSale returns (bool) {
        require(_preSaleCarrier != treasuryCarrier && _preSaleCarrier != airdropCarrier);

        if (_moveFund("preSale", preSaleCarrier, _preSaleCarrier)) {
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
    function setAirdropCarrier(address _airdropCarrier) external whenNotPaused onlyOwner returns (bool) {
        require(_airdropCarrier != airdropCarrier && _airdropCarrier != owner && _airdropCarrier != preSaleCarrier && _airdropCarrier != treasuryCarrier);

        SetAirdropCarrier(airdropCarrier, _airdropCarrier);
        airdropCarrier = _airdropCarrier;
        return true;
    }

    /**
     * @dev Freeze or unfreeze an account.
     *
     * @param _targetAccount The target account to be frozen/unfrozen
     * @param _isFrozen //
     */
    function freezeAccount(address _targetAccount, bool _isFrozen) external whenNotPaused onlyOwner returns (bool) {
        require(_targetAccount != owner);

        frozenAccounts[_targetAccount] = _isFrozen;
        FreezeAccount(_targetAccount, _isFrozen);
        return true;
    }

    /**
     * @dev Get the stake balance of an account.
     *
     * @param _staker The staker's account address
     */
    function stakeBalanceOf(address _staker) external view returns (uint256) {
        return stakes[_staker].balance;
    }

    /**
     * @dev Get the stake start time of an account.
     *
     * @param _staker The staker's account address
     */
    function stakeStartTimeOf(address _staker) external view returns (uint256) {
        return stakes[_staker].startTime;
    }

    /**
     * @dev Get the frozen status of an account.
     *
     * @param _account //
     */
    function isFrozen(address _account) external view returns (bool) {
        return frozenAccounts[_account];
    }

    /**
     * @dev Move remaining fund to a new carrier.
     *
     * @param _lockedFundName The name of fund to be released if the first carrier is set
     * @param _oldCarrier The old carrier of fund
     * @param _newCarrier The new carrier of fund
     */
    function _moveFund(bytes32 _lockedFundName, address _oldCarrier, address _newCarrier) internal onlyOwner returns (bool) {
        // Check for non-sensical address and possibility of abuse.
        require(_oldCarrier != _newCarrier && _newCarrier != address(0) && _newCarrier != owner);
        require(balances[_newCarrier] == 0); // burn check!

        uint256 lockedFund = lockedFunds[_lockedFundName];

        if (lockedFund == 0 && _oldCarrier != address(0)) {
            assert(balances[_oldCarrier] > 0);
            // Move fund from old carrier to new carrier.
            // WARNING: Everything will be transferred.
            balances[_newCarrier] = balances[_oldCarrier];
            balances[_oldCarrier] = 0;
            Transfer(_oldCarrier, _newCarrier, balances[_newCarrier]);
        } else if (lockedFund > 0 && _oldCarrier == address(0)) {
            // Release fund to new carrier.
            balances[_newCarrier] = lockedFund;
            lockedFunds[_lockedFundName] = 0;
            Transfer(this, _newCarrier, balances[_newCarrier]);
        } else {
            // Revert if anything unexpected happens.
            revert();
        }

        return true;
    }
}
