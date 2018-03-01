pragma solidity 0.4.18;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./interfaces/EXOStorageInterface.sol";

contract EXOBase is Ownable {
    uint8 public version;

    EXOStorageInterface exoStorage = EXOStorageInterface(0);

    function EXOBase(address _exoStorageAddress) public {
        exoStorage = EXOStorageInterface(_exoStorageAddress);
    }

   /**
    * @dev Throws if called by any account other than the owner.
    */
    modifier onlyOwner() {
        roleCheck("owner", msg.sender);
        _;
    }

   /**
    * @dev Modifier to scope access to admins.
    */
    modifier onlyAdmin() {
        roleCheck("admin", msg.sender);
        _;
    }

   /**
    * @dev Modifier to scope access to super users.
    */
    modifier onlySuperUser() {
        require(roleHas("owner", msg.sender) || roleHas("admin", msg.sender));
        _;
    }

   /**
    * @dev Reverts if the address doesn't have this role.
    */
    modifier onlyRole(string _role) {
        roleCheck(_role, msg.sender);
        _;
    }
  
   /**
    * @dev Check if an address has this role.
    */
    function roleHas(string _role, address _address) view internal returns (bool) {
        return exoStorage.getBool(keccak256("access.role", _role, _address));
    }

   /**
    * @dev Check if an address has this role, reverts if it doesn't.
    */
    function roleCheck(string _role, address _address) view internal {
        require(roleHas(_role, _address) == true);
    }
}