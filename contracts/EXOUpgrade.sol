pragma solidity 0.4.18;

import "./EXOBase.sol";
import "./EXOStorage.sol";

/**
 * @title EXO Upgrade
 *
 * @dev Allow upgrades on EXO contracts.
 */
contract EXOUpgrade is EXOBase {
    event ContractUpgraded(address indexed oldContractAddress, address indexed newContractAddress, uint256 createdAt);

    /**
     * @dev Initialize EXOUpgrade.
     *
     * @param _exoStorageAddress The eternal storage address of network
     */
    function EXOUpgrade(address _exoStorageAddress) EXOBase("EXOUpgrade", _exoStorageAddress) public {
        version = 1;
    }

    /**
     * @dev Upgrade the current contract.
     *
     * @param _name The name of an existing contract in the network
     * @param _upgradedContractAddress The new contract's address that will replace the current one
     * @param _forceEther Force the upgrade even if this contract has ether in it
     */
    function upgradeContract(
        string _name,
        address _upgradedContractAddress,
        bool _forceEther
    ) external onlyLatestVersionOf(this) onlyRole("owner")
    {
        // Get the current contract's address and check if it exists.
        address oldContractAddress = exoStorage.getAddress(keccak256("contract.name", _name));
        require(oldContractAddress != address(0));
        if (oldContractAddress.balance > 0) {
            require(_forceEther == true);
        }

        // Replace the address for the name lookup - contract addresses can be looked up by their name or verified by a reverse address lookup.
        exoStorage.setAddress(keccak256("contract.name", _name), _upgradedContractAddress);
        // Add the new contract address for a direct verification using the address (used in EXOStorage to verify its a legit contract using only the msg.sender).
        exoStorage.setAddress(keccak256("contract.address", _upgradedContractAddress), _upgradedContractAddress);
        // Remove the old contract address verification.
        exoStorage.deleteAddress(keccak256("contract.address", oldContractAddress));

        ContractUpgraded(oldContractAddress, _upgradedContractAddress, now);
    }
}
