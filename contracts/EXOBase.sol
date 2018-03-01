pragma solidity 0.4.18;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./interfaces/EXOStorageInterface.sol";

contract EXOBase is Ownable {
    uint8 public version;

    EXOStorageInterface exoStorage = EXOStorageInterface(0);

    function EXOBase(address _exoStorageAddress) public {
        exoStorage = EXOStorageInterface(_exoStorageAddress);
    }
}