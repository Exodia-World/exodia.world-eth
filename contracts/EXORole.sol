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
    event RoleAdded(string roleName, address account);
    event RoleRemoved(string roleName, address account);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function EXORole(address _exoStorageAddress) EXOBase("EXORole", _exoStorageAddress) public {
        version = 1;
    }

    /**
     * @dev Allow the current owner to transfer control of the contract to a newOwner.
     *
     * @param _newOwner The address to transfer ownership to
     */
    function transferOwnership(address _newOwner) public onlyLatestVersionOf(this) onlyRole("owner") {
        require(_newOwner != address(0));

        exoStorage.deleteBool(keccak256("access.role", "owner", msg.sender));
        exoStorage.setBool(keccak256("access.role",  "owner", _newOwner), true);
        OwnershipTransferred(msg.sender, _newOwner);
    }

    /**
     * @dev Transfer an address' access to this role to another address.
     */
    function roleTransfer(string _role, address _oldAddress, address _address) public onlyLatestVersionOf(this) onlySuperUser {
        _roleRemove(_role, _oldAddress);
        _roleAdd(_role, _address);
    }

    /**
     * @dev Give an address' access to this role.
     */
    function roleAdd(string _role, address _address) public onlyLatestVersionOf(this) onlySuperUser {
        _roleAdd(_role, _address);
    }

    /**
     * @dev Remove an address' access to this role.
     */
    function roleRemove(string _role, address _address) public onlyLatestVersionOf(this) onlySuperUser {
        _roleRemove(_role, _address);
    }

    /**
     * @dev Check if an address has this role.
     *
     * A proxy to EXOBase's roleHas function.
     */
    function hasRoleAccess(string _role, address _address) external view returns (bool) {
        return roleHas(_role, _address);
    }

    /**
     * @dev Give an address' access to this role.
     */
    function _roleAdd(string _role, address _address) internal {
        require(_address != 0x0);
        require(keccak256(_role) != keccak256("owner")); // only one owner to rule them all

        exoStorage.setBool(keccak256("access.role", _role, _address), true);
        RoleAdded(_role, _address);
    }

    /**
     * @dev Remove an address' access to this role.
     */
    function _roleRemove(string _role, address _address) internal {
        require(!roleHas("owner", _address)); // only an owner can remove its access

        exoStorage.deleteBool(keccak256("access.role", _role, _address));
        RoleRemoved(_role, _address);
    }
}
