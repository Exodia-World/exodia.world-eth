pragma solidity 0.4.18;

import "./EXOBase.sol";
import "./interfaces/EXORoleInterface.sol";
import "./interfaces/EXOStorageInterface.sol";


/**
 * @title EXO Role
 *
 * @dev Allow role-based access on EXO contracts.
 */
contract EXORole is EXORoleInterface, EXOBase {
    event RoleAdded(string roleName, address indexed account);
    event RoleRemoved(string roleName, address indexed account);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function EXORole(address _exoStorageAddress) public EXOBase("EXORole", _exoStorageAddress) {
        version = 1;
    }

    /**
     * @dev Allow the current owner to transfer control of the contract to a newOwner.
     *
     * @param _newOwner The address to transfer ownership to
     */
    function transferOwnership(address _newOwner) external onlyLatestVersionOf(this) onlyRole("owner") {
        require(_newOwner != address(0));

        exoStorage.deleteBool(keccak256("access.role", "owner", msg.sender));
        exoStorage.setBool(keccak256("access.role", "owner", _newOwner), true);
        OwnershipTransferred(msg.sender, _newOwner);
    }

    /**
     * @dev Transfer an address' access to this role to another address.
     */
    function roleTransfer(string _role, address _oldAddress, address _address)
        external
        onlyLatestVersionOf(this)
        onlySuperUser
    {
        _roleRemove(_role, _oldAddress);
        _roleAdd(_role, _address);
    }

    /**
     * @dev Give an address' access to this role.
     */
    function roleAdd(string _role, address _address) external onlyLatestVersionOf(this) onlySuperUser {
        _roleAdd(_role, _address);
    }

    /**
     * @dev Remove an address' access to this role.
     */
    function roleRemove(string _role, address _address) external onlyLatestVersionOf(this) onlySuperUser {
        _roleRemove(_role, _address);
    }

    /**
     * @dev Give an address' access to this role.
     */
    function _roleAdd(string _role, address _address) internal {
        require(_address != address(0));
        require(keccak256(_role) != keccak256("owner")); // only one owner to rule them all
        require(!roleHas("owner", _address) || keccak256(_role) != keccak256("frozen")); // owner can't be frozen

        exoStorage.setBool(keccak256("access.role", _role, _address), true);
        RoleAdded(_role, _address);
    }

    /**
     * @dev Remove an address' access to this role.
     */
    function _roleRemove(string _role, address _address) internal {
        require(!roleHas("owner", _address)); // no one can remove owner's access

        exoStorage.deleteBool(keccak256("access.role", _role, _address));
        RoleRemoved(_role, _address);
    }
}
