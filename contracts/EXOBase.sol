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

    event SelfDestruct(string contractName, address indexed contractAddress);

    /**
     * @dev Initialize contract's name and eternal storage's address.
     *
     * @param _contractName //
     * @param _exoStorageAddress //
     */
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

    modifier onlySuperUser() {
        require(roleHas("owner", msg.sender) || roleHas("admin", msg.sender));
        _;
    }

    modifier onlyRole(string _role) {
        roleCheck(_role, msg.sender, true);
        _;
    }

    modifier exceptRole(string _role) {
        roleCheck(_role, msg.sender, false);
        _;
    }

    /**
     * @dev Check if an address has this role, reverts if it doesn't.
     *
     * @param _role //
     * @param _address //
     * @param _hasRole Should the address have this role?
     */
    function roleCheck(string _role, address _address, bool _hasRole) internal view {
        require(roleHas(_role, _address) == _hasRole);
    }

    /**
     * @dev Check if an address has this role.
     *
     * @param _role //
     * @param _address //
     */
    function roleHas(string _role, address _address) internal view returns (bool) {
        return exoStorage.getBool(keccak256("access.role", _role, _address));
    }

    /**
     * @dev Kill this contract and refund its balance to owner.
     */
    function kill() onlyRole("owner") external {
        // An active contract cannot be killed.
        address contractAddress = exoStorage.getAddress(keccak256("contract.name", contractName));
        address accessAddress = exoStorage.getAddress(keccak256("contract.address", address(this)));
        require(contractAddress != address(this) && accessAddress != address(this));

        SelfDestruct(contractName, address(this));
        selfdestruct(msg.sender);
    }
}
