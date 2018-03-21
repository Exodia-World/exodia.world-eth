pragma solidity 0.4.18;

import "./zeppelin-solidity/token/ERC20/PausableToken.sol";
import "./EXOBase.sol";

/**
 * @title EXO Token
 *
 * @dev Implementation of the EXO Token by Exodia.World.
 */
contract EXOToken is PausableToken {
    string public constant name = "EXO Token";
    string public constant symbol = "EXO";
    uint8 public constant decimals = 18;
    uint256 public constant PRESALE_ETH_TO_EXO = 7300;
    uint256 public constant ICO_ETH_TO_EXO = 3650;

    uint256 public minBalanceForStakeReward;
    uint256 public preSaleDuration; // in seconds
    uint256 public ICODuration; // in seconds
    uint256 public initialICOFund;
    uint256 public minICOTokensBoughtEveryPurchase; // by one account for one purchase
    uint256 public maxICOTokensBought; // by one account for all purchases
    uint256 public airdropAmount;

    event StartPreSale(uint256 startTime, uint256 deadline);
    event StartICO(uint256 startTime, uint256 deadline);
    event TransferETH(address indexed from, address indexed to, uint256 value);
    event DepositStake(address indexed staker, uint256 value);
    event WithdrawStake(address indexed staker, uint256 value);
    event UpdateStakeBalance(address indexed staker, uint256 balance);
    event SetTreasuryCarrier(address indexed oldCarrier, address indexed newCarrier);
    event SetPreSaleCarrier(address indexed oldCarrier, address indexed newCarrier);
    event SetAirdropCarrier(address indexed oldCarrier, address indexed newCarrier);

    /**
     * @dev Set token information.
     *
     * @param _exoStorageAddress The EXO eternal storage's address
     * @param _totalSupply The total supply of tokens -- it's fixed
     * @param _minBalanceForStakeReward The minimum balance required for stake reward
     * @param _lockedTreasuryFund Locked treasury fund, only handed to its carrier account
     * @param _lockedPreSaleFund Locked pre-sale fund, only handed to its carrier account
     * @param _preSaleDuration The duration of pre-sale period in seconds
     * @param _ICODuration The duration of ICO
     * @param _availableICOFund Total amount of tokens that can be bought in ICO
     * @param _minICOTokensBoughtEveryPurchase The minimum amount of ICO tokens that must be bought by one account for every purchase
     * @param _maxICOTokensBought The maximum amount of ICO tokens that can be bought by one account for all purchases
     * @param _airdropAmount The airdrop amount for a single account
     */
    function EXOToken(
        address _exoStorageAddress,
        uint256 _totalSupply,
        uint256 _minBalanceForStakeReward,
        uint256 _lockedTreasuryFund,
        uint256 _lockedPreSaleFund,
        uint256 _preSaleDuration,
        uint256 _ICODuration,
        uint256 _availableICOFund,
        uint256 _minICOTokensBoughtEveryPurchase,
        uint256 _maxICOTokensBought,
        uint256 _airdropAmount
    ) EXOBase("EXOToken", _exoStorageAddress) public payable
    {
        roleCheck("owner", msg.sender, true);

        // Set all values not stored in the eternal storage.
        minBalanceForStakeReward = _minBalanceForStakeReward.mul(uint(10)**decimals);
        preSaleDuration = _preSaleDuration;
        ICODuration = _ICODuration;
        initialICOFund = _availableICOFund.mul(uint(10)**decimals);
        minICOTokensBoughtEveryPurchase = _minICOTokensBoughtEveryPurchase.mul(uint(10)**decimals);
        maxICOTokensBought = _maxICOTokensBought.mul(uint(10)**decimals);
        airdropAmount = _airdropAmount.mul(uint(10)**decimals);

        bool _isUpgrade = exoStorage.getBool(keccak256("contract.storage.initialized"));
        if (_isUpgrade == false) {
            // Execute everything below only once on initial deployment.
            primaryHolder(msg.sender); // set the primary holder of EXO tokens
            totalSupply(_totalSupply.mul(uint(10)**decimals));
            lockedFundOf("treasury", _lockedTreasuryFund.mul(uint(10)**decimals));
            lockedFundOf("preSale", _lockedPreSaleFund.mul(uint(10)**decimals));
            availableICOFund(initialICOFund);

            // Calculate remaining balance for stake reward.
            balanceOf(
                msg.sender,
                totalSupply().sub(lockedFundOf("treasury")).sub(lockedFundOf("preSale")).sub(initialICOFund)
            );

            assert(balanceOf(msg.sender) >= minBalanceForStakeReward);
        }
    }

    modifier beforePreSale() {
        require(preSaleStartTime() == 0 && preSaleDeadline() == 0);
        _;
    }

    modifier afterPreSale() {
        require(preSaleStartTime() > 0 && preSaleDeadline() < now);
        _;
    }

    modifier beforeOrDuringPreSale() {
        require((preSaleStartTime() == 0 && preSaleDeadline() == 0) || (preSaleStartTime() > 0 && preSaleStartTime() <= now && preSaleDeadline() >= now));
        _;
    }

    modifier beforeICO() {
        require(ICOStartTime() == 0 && ICODeadline() == 0);
        _;
    }

    modifier duringICO() {
        require(ICOStartTime() > 0 && ICOStartTime() <= now && ICODeadline() >= now);
        _;
    }

    modifier afterICO() {
        require(ICOStartTime() > 0 && ICODeadline() < now);
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
    function transfer(address _to, uint256 _value) public whenNotPaused exceptRole("frozen") returns (bool) {
        // Owner and frozen accounts can't receive tokens.
        roleCheck("owner", _to, false);
        roleCheck("frozen", _to, false);

        address primaryHolder_ = primaryHolder();
        require(msg.sender != primaryHolder_ || balanceOf(primaryHolder_).sub(_value) >= minBalanceForStakeReward);

        return super.transfer(_to, _value);
    }

    /**
     * @dev Transfer tokens from one address to another.
     *
     * @param _from The address which you want to send tokens from
     * @param _to The address which you want to transfer to
     * @param _value The amount of tokens to be transferred
     */
    function transferFrom(address _from, address _to, uint256 _value) public whenNotPaused exceptRole("frozen") returns (bool) {
        roleCheck("frozen", _from, false);
        roleCheck("owner", _to, false);
        roleCheck("frozen", _to, false);
        return super.transferFrom(_from, _to, _value);
    }

    /**
     * @dev Start the pre-sale.
     *
     * Note: The pre-sale carrier should be set first before running this function.
     */
    function startPreSale() external whenNotPaused onlySuperUser beforePreSale beforeICO returns (bool) {
        require(lockedFundOf("preSale") > 0);

        preSaleStartTime(now);
        preSaleDeadline(preSaleStartTime().add(preSaleDuration));

        StartPreSale(preSaleStartTime(), preSaleDeadline());
        return true;
    }

    /**
     * @dev Buy ICO tokens using ETH.
     */
    function buyICOTokens() external payable whenNotPaused exceptRole("frozen") duringICO returns (bool) {
        // Check for serious participants and if we have tokens available.
        uint256 exoBought = msg.value.mul(ICO_ETH_TO_EXO);
        require(availableICOFund() >= exoBought && exoBought >= minICOTokensBoughtEveryPurchase);

        // Whales check!
        uint256 totalICOTokensBoughtByAccount = ICOTokensBoughtBy(msg.sender).add(exoBought);
        require(totalICOTokensBoughtByAccount <= maxICOTokensBought);

        availableICOFund(availableICOFund().sub(exoBought));
        balanceOf(msg.sender, balanceOf(msg.sender).add(exoBought));
        ICOTokensBoughtBy(msg.sender, totalICOTokensBoughtByAccount);
        totalICOTokensBought(totalICOTokensBought().add(exoBought));

        assert(totalICOTokensBought() == initialICOFund.sub(availableICOFund())); // check invariant
        Transfer(this, msg.sender, exoBought);
        return true;
    }

    /**
     * @dev Start the ICO.
     */
    function startICO() external whenNotPaused onlySuperUser afterPreSale beforeICO returns (bool) {
        require(availableICOFund() > 0);

        ICOStartTime(now);
        ICODeadline(ICOStartTime().add(ICODuration));

        StartICO(ICOStartTime(), ICODeadline());
        return true;
    }

    /**
     * @dev Release any remaining ICO fund back to primary holder after ICO ended.
     */
    function releaseRemainingICOFundToPrimaryHolder() external whenNotPaused onlyRole("owner") afterICO returns (bool) {
        require(availableICOFund() > 0);

        address primaryHolder_ = primaryHolder();
        balanceOf(primaryHolder_, balanceOf(primaryHolder_).add(availableICOFund()));
        Transfer(this, msg.sender, availableICOFund());
        availableICOFund(0);
        return true;
    }

    /**
     * @dev Send ETH fund raised in ICO for primary holder.
     */
    function claimEtherFundRaisedInICO() external whenNotPaused onlyRole("owner") afterICO returns (bool) {
        require(this.balance > 0);

        // WARNING: All Ethers will be sent, even for non-ICO-related.
        uint256 fundRaised = this.balance;
        address primaryHolder_ = primaryHolder();
        primaryHolder_.transfer(fundRaised);

        TransferETH(this, primaryHolder_, fundRaised);
        return true;
    }

    /**
     * @dev Transfer free tokens from the remaining ICO fund.
     *
     * The free tokens are added to the _to address' staking balance.
     * @param _to The address which the airdrop is designated to
     */
    function airdrop(address _to) external whenNotPaused onlyRole("airdropCarrier") exceptRole("frozen") afterICO returns (bool) {
        roleCheck("frozen", _to, false);
        require(_to != address(0));
        require(isAirdropped(_to) == false);
        require(availableICOFund() >= airdropAmount);

        // Airdrop to the designated account.
        availableICOFund(availableICOFund().sub(airdropAmount));
        stakeBalanceOf(_to, stakeBalanceOf(_to).add(airdropAmount));
        stakeStartTimeOf(_to, now);
        isAirdropped(_to, true);

        Transfer(msg.sender, _to, airdropAmount);
        return true;
    }

    /**
     * @dev Deposit stake to Exodia.World.
     *
     * Deposited stake is added to the staker's staking balance.
     * @param _value The amount of EXO to deposit
     */
    function depositStake(uint256 _value) external whenNotPaused exceptRole("frozen") exceptRole("owner") afterICO returns (bool) {
        require(_value > 0 && balanceOf(msg.sender) >= _value);

        updateStakeBalance();
        balanceOf(msg.sender, balanceOf(msg.sender).sub(_value));
        stakeBalanceOf(msg.sender, stakeBalanceOf(msg.sender).add(_value));

        DepositStake(msg.sender, _value);
        return true;
    }

    /**
     * @dev Withdraw stake from Exodia.World.
     *
     * Withdrawn stake is added to the staker's liquid balance.
     * @param _value The amount of EXO to withdraw
     */
    function withdrawStake(uint256 _value) external whenNotPaused exceptRole("frozen") exceptRole("owner") afterICO returns (bool) {
        require(_value > 0 && stakeBalanceOf(msg.sender) >= _value);

        // No reward if staking has not been for at least 21 days.
        if (now.sub(stakeStartTimeOf(msg.sender)) >= 21 days) {
            updateStakeBalance();
        } else {
            stakeStartTimeOf(msg.sender, now); // re-stake balance even if no reward
        }
        stakeBalanceOf(msg.sender, stakeBalanceOf(msg.sender).sub(_value));
        balanceOf(msg.sender, balanceOf(msg.sender).add(_value));

        WithdrawStake(msg.sender, _value);
        return true;
    }

    /**
     * @dev Update a staker's balance with staking interest.
     */
    function updateStakeBalance() public whenNotPaused exceptRole("frozen") exceptRole("owner") afterICO returns (uint256) {
        // Has the staking been for at least 21 days?
        require(now.sub(stakeStartTimeOf(msg.sender)) >= 21 days);

        address primaryHolder_ = primaryHolder();
        uint256 interest = calculateInterest();
        require(balanceOf(primaryHolder_) >= interest);

        balanceOf(primaryHolder_, balanceOf(primaryHolder_).sub(interest));
        stakeBalanceOf(msg.sender, stakeBalanceOf(msg.sender).add(interest));
        stakeStartTimeOf(msg.sender, now);

        UpdateStakeBalance(msg.sender, stakeBalanceOf(msg.sender));
        return stakeBalanceOf(msg.sender);
    }

    /**
     * @dev Calculate interest of a staker's balance since last staking.
     *
     * Everything is hardcoded to simplify things.
     * 10% for the first 3 years and 5% for the rest until all tokens have been distributed.
     * The interest is gained every 7 days.
     * For example, staking of 5 EXO for 16 days would yield 5 EXO * 0.0273% (rate per day) * 14 (days).
     */
    function calculateInterest() public view exceptRole("owner") afterICO returns (uint256) {
        address primaryHolder_ = primaryHolder();
        if (stakeBalanceOf(msg.sender) == 0 || stakeStartTimeOf(msg.sender) == 0 || balanceOf(primaryHolder_) == 0) {return 0;}

        uint256 totalInterest = 0;
        uint256 stakeDays = 0;
        uint256 eligibleStakeDays = 0;
        uint256 stakeStartTime = stakeStartTimeOf(msg.sender);

        // 10% for the first 3 years.
        uint256 interestPeriod = 3 years;
        uint256 interestStartTime = ICODeadline().add(1); // starts after ICO
        uint256 interestEndTime = interestStartTime.add(interestPeriod);
        // Only runs if the stake start time is within this interest period.
        if (stakeStartTime >= interestStartTime && stakeStartTime <= interestEndTime) {
            // Put an upper boundary for stake end time.
            uint256 stakeEndTime = now > interestEndTime ? interestEndTime : now;
            stakeDays = stakeEndTime.sub(stakeStartTime).div(1 days);
            // Ex: 34 days // 7 days = 4 cycles with a remainder ==> 4 cycles * 7 days = 28 days
            eligibleStakeDays = stakeDays.div(7).mul(7);
            // Ex: interest = 50 EXO * (10%/365 days) * 28 days
            totalInterest = stakeBalanceOf(msg.sender).mul(10).mul(eligibleStakeDays).div(36500);
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
            totalInterest = totalInterest.add(stakeBalanceOf(msg.sender).mul(5).mul(eligibleStakeDays).div(36500));
        }

        return balanceOf(primaryHolder_) >= totalInterest ? totalInterest : balanceOf(primaryHolder_);
    }

    /**
     * @dev Transfer fund into new treasury carrier's address and publish it.
     *
     * At this point, there must be two addresses with access to treasury carrier role.
     * @param _oldTreasuryCarrier The address of old treasury carrier account
     * @param _treasuryCarrier The address of new treasury carrier account
     */
    function setTreasuryCarrier(address _oldTreasuryCarrier, address _treasuryCarrier) external whenNotPaused onlySuperUser returns (bool) {
        if (_oldTreasuryCarrier != address(0)) {
            // Is it really the previous carrier?
            roleCheck("treasuryCarrier", _oldTreasuryCarrier, true);
        }
        roleCheck("treasuryCarrier", _treasuryCarrier, true);
        roleCheck("preSaleCarrier", _treasuryCarrier, false);
        roleCheck("airdropCarrier", _treasuryCarrier, false);

        if (_moveFund("treasury", _oldTreasuryCarrier, _treasuryCarrier)) {
            SetTreasuryCarrier(_oldTreasuryCarrier, _treasuryCarrier);
            return true;
        }
        return false;
    }

    /**
     * @dev Transfer fund into new pre-sale carrier's address and publish it.
     *
     * At this point, there must be two addresses with access to pre-sale carrier role.
     * @param _oldPreSaleCarrier The address of old pre-sale carrier account
     * @param _preSaleCarrier The address of new pre-sale carrier account
     */
    function setPreSaleCarrier(address _oldPreSaleCarrier, address _preSaleCarrier) external whenNotPaused onlySuperUser beforeOrDuringPreSale returns (bool) {
        if (_oldPreSaleCarrier != address(0)) {
            // Is it really the previous carrier?
            roleCheck("preSaleCarrier", _oldPreSaleCarrier, true);
        }
        roleCheck("preSaleCarrier", _preSaleCarrier, true);
        roleCheck("treasuryCarrier", _preSaleCarrier, false);
        roleCheck("airdropCarrier", _preSaleCarrier, false);

        if (_moveFund("preSale", _oldPreSaleCarrier, _preSaleCarrier)) {
            SetPreSaleCarrier(_oldPreSaleCarrier, _preSaleCarrier);
            return true;
        }
        return false;
    }

    /**
     * @dev Move remaining fund to a new carrier.
     *
     * @param _lockedFundName The name of fund to be released if the first carrier is set
     * @param _oldCarrier The old carrier of fund
     * @param _newCarrier The new carrier of fund
     */
    function _moveFund(bytes32 _lockedFundName, address _oldCarrier, address _newCarrier) private onlySuperUser returns (bool) {
        // Check for non-sensical address and possibility of abuse.
        require(_oldCarrier != _newCarrier && _newCarrier != address(0) && _newCarrier != primaryHolder());
        require(balanceOf(_newCarrier) == 0); // burn check!

        uint256 lockedFund = lockedFundOf(_lockedFundName);

        if (lockedFund == 0 && _oldCarrier != address(0)) {
            // Move fund from old carrier to new carrier.
            // WARNING: Everything will be transferred.
            balanceOf(_newCarrier, balanceOf(_oldCarrier));
            balanceOf(_oldCarrier, 0);
            Transfer(_oldCarrier, _newCarrier, balanceOf(_newCarrier));
        } else if (lockedFund > 0 && _oldCarrier == address(0)) {
            // Release fund to new carrier.
            balanceOf(_newCarrier, lockedFund);
            lockedFundOf(_lockedFundName, 0);
            Transfer(this, _newCarrier, balanceOf(_newCarrier));
        } else {
            // Revert if anything unexpected happens.
            revert();
        }

        return true;
    }

    /**
     * @dev Get the primary holder.
     */
    function primaryHolder() public view returns (address) {
        return exoStorage.getAddress(keccak256("token.primaryHolder"));
    }

    /**
     * @dev Get the pre-sale start time.
     */
    function preSaleStartTime() public view returns (uint256) {
        return exoStorage.getUint(keccak256("token.preSaleStartTime"));
    }

    /**
     * @dev Get the pre-sale deadline.
     */
    function preSaleDeadline() public view returns (uint256) {
        return exoStorage.getUint(keccak256("token.preSaleDeadline"));
    }

    /**
     * @dev Get the ICO start time.
     */
    function ICOStartTime() public view returns (uint256) {
        return exoStorage.getUint(keccak256("token.ICOStartTime"));
    }

    /**
     * @dev Get the ICO deadline.
     */
    function ICODeadline() public view returns (uint256) {
        return exoStorage.getUint(keccak256("token.ICODeadline"));
    }

    /**
     * @dev Get the available ICO fund.
     */
    function availableICOFund() public view returns (uint256) {
        return exoStorage.getUint(keccak256("token.availableICOFund"));
    }

    /**
     * @dev Get the total ICO tokens bought.
     */
    function totalICOTokensBought() public view returns (uint256) {
        return exoStorage.getUint(keccak256("token.totalICOTokensBought"));
    }

    /**
     * @dev Get locked fund of a type.
     *
     * @param _type //
     */
    function lockedFundOf(bytes32 _type) public view returns (uint256) {
        return exoStorage.getUint(keccak256("token.lockedFunds", _type));
    }

    /**
     * @dev Get the total ICO tokens (EXO) bought by an address.
     *
     * @param _address //
     */
    function ICOTokensBoughtBy(address _address) public view returns (uint256) {
        return exoStorage.getUint(keccak256("token.ICOTokensBought", _address));
    }

    /**
     * @dev Has an address received airdrop tokens before?
     *
     * @param _address //
     */
    function isAirdropped(address _address) public view returns (bool) {
        return exoStorage.getBool(keccak256("token.airdropped", _address));
    }

    /**
     * @dev Get the stake balance of an account.
     *
     * @param _staker The staker's account address
     */
    function stakeBalanceOf(address _staker) public view returns (uint256) {
        return exoStorage.getUint(keccak256("token.stakes", "balance", _staker));
    }

    /**
     * @dev Get the stake start time of an account.
     *
     * @param _staker The staker's account address
     */
    function stakeStartTimeOf(address _staker) public view returns (uint256) {
        return exoStorage.getUint(keccak256("token.stakes", "startTime", _staker));
    }

    /**
     * @dev Set the primary holder of tokens.
     *
     * @param _holder The address of holder
     */
    function primaryHolder(address _holder) private {
        exoStorage.setAddress(keccak256("token.primaryHolder"), _holder);
    }

    /**
     * @dev Set the pre-sale start time
     *
     * @param _preSaleStartTime //
     */
    function preSaleStartTime(uint256 _preSaleStartTime) private {
        exoStorage.setUint(keccak256("token.preSaleStartTime"), _preSaleStartTime);
    }

    /**
     * @dev Set the pre-sale deadline
     *
     * @param _preSaleDeadline //
     */
    function preSaleDeadline(uint256 _preSaleDeadline) private {
        exoStorage.setUint(keccak256("token.preSaleDeadline"), _preSaleDeadline);
    }

    /**
     * @dev Set the ICO start time
     *
     * @param _ICOStartTime //
     */
    function ICOStartTime(uint256 _ICOStartTime) private {
        exoStorage.setUint(keccak256("token.ICOStartTime"), _ICOStartTime);
    }

    /**
     * @dev Set the ICO deadline
     *
     * @param _ICODeadline //
     */
    function ICODeadline(uint256 _ICODeadline) private {
        exoStorage.setUint(keccak256("token.ICODeadline"), _ICODeadline);
    }

    /**
     * @dev Set the available ICO fund.
     *
     * @param _availableICOFund //
     */
    function availableICOFund(uint256 _availableICOFund) private {
        exoStorage.setUint(keccak256("token.availableICOFund"), _availableICOFund);
    }

    /**
     * @dev Set the total ICO tokens bought.
     *
     * @param _totalICOTokensBought //
     */
    function totalICOTokensBought(uint256 _totalICOTokensBought) private {
        exoStorage.setUint(keccak256("token.totalICOTokensBought"), _totalICOTokensBought);
    }

    /**
     * @dev Set value for the locked fund of a type.
     *
     * @param _type //
     * @param _value //
     */
    function lockedFundOf(bytes32 _type, uint256 _value) private {
        exoStorage.setUint(keccak256("token.lockedFunds", _type), _value);
    }

    /**
     * @dev Set value for the total ICO tokens bought by an address.
     *
     * @param _address //
     * @param _value //
     */
    function ICOTokensBoughtBy(address _address, uint256 _value) private {
        exoStorage.setUint(keccak256("token.ICOTokensBought", _address), _value);
    }

    /**
     * @dev Mark an address' airdrop status.
     *
     * @param _address //
     * @param _isAirdropped //
     */
    function isAirdropped(address _address, bool _isAirdropped) private {
        exoStorage.setBool(keccak256("token.airdropped", _address), _isAirdropped);
    }

    /**
     * @dev Set the stake balance of an account.
     *
     * @param _staker The staker's account address
     * @param _value //
     */
    function stakeBalanceOf(address _staker, uint256 _value) private {
        exoStorage.setUint(keccak256("token.stakes", "balance", _staker), _value);
    }

    /**
     * @dev Set the stake start time of an account.
     *
     * @param _staker The staker's account address
     * @param _value //
     */
    function stakeStartTimeOf(address _staker, uint256 _value) private {
        exoStorage.setUint(keccak256("token.stakes", "startTime", _staker), _value);
    }
}
