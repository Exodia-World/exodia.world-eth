pragma solidity 0.4.18;

/**
 * @title EXORole's Interface
 *
 * @dev An interface for the EXORole contract.
 */
interface EXORoleInterface {
    modifier onlyLatestVersionOf(address _contract) {_;}
    modifier onlyRole(string _role) {_;}
    modifier onlySuperUser() {_;}

    function transferOwnership(address _newOwner) external onlyLatestVersionOf(this) onlyRole("owner");
    function roleTransfer(string _role, address _oldAddress, address _address) external onlyLatestVersionOf(this) onlySuperUser();
    function roleAdd(string _role, address _address) external onlyLatestVersionOf(this) onlySuperUser();
    function roleRemove(string _role, address _address) external onlyLatestVersionOf(this) onlySuperUser();
}
