pragma solidity 0.4.18;

import "./interfaces/EXOStorageInterface.sol";

/**
 * @title EXO Base
 *
 * @dev Act as the base for almost every EXO contract.
 */
contract EXOBase {
    uint8 public version;
    string public contractName;
    EXOStorageInterface exoStorage = EXOStorageInterface(0);

    function EXOBase(string _contractName, address _exoStorageAddress) public {
        contractName = _contractName;
        exoStorage = EXOStorageInterface(_exoStorageAddress);
    }

    /**
     * @dev Only allow access from the latest version of the EXO contract.
     */
    modifier onlyLatestVersionOf(address _contract) {
        require(address(_contract) == exoStorage.getAddress(keccak256("contract.name", contractName)));
        _;
    }

    modifier onlyOwner() {
        roleCheck("owner", msg.sender);
        _;
    }

    modifier onlyAdmin() {
        roleCheck("admin", msg.sender);
        _;
    }

    modifier onlySuperUser() {
        require(roleHas("owner", msg.sender) || roleHas("admin", msg.sender));
        _;
    }

    modifier onlyRole(string _role) {
        roleCheck(_role, msg.sender);
        _;
    }
  
    /**
     * @dev Check if an address has this role.
     */
    function roleHas(string _role, address _address) internal view returns (bool) {
        return exoStorage.getBool(keccak256("access.role", _role, _address));
    }

    /**
     * @dev Check if an address has this role, reverts if it doesn't.
     */
    function roleCheck(string _role, address _address) internal view {
        require(roleHas(_role, _address) == true);
    }
}