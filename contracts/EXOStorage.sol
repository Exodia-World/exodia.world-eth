pragma solidity 0.4.18;

import "./interfaces/EXOStorageInterface.sol";


/**
 * @title EXO Eternal Storage
 *
 * @dev Responsible for data storage and address resolution for other EXO contracts.
 */
contract EXOStorage is EXOStorageInterface {
    mapping(bytes32 => uint256) private uIntStorage;
    mapping(bytes32 => string) private stringStorage;
    mapping(bytes32 => address) private addressStorage;
    mapping(bytes32 => bytes) private bytesStorage;
    mapping(bytes32 => bool) private boolStorage;
    mapping(bytes32 => int256) private intStorage;

    /**
     * @dev Only allow access from the latest version of a contract in the network after deployment.
     */
    modifier onlyLatestNetworkContract() {
        // The owner and other contracts are only allowed to set the storage upon deployment
        // to register the initial contracts/settings, afterwards their direct access is disabled.
        if (boolStorage[keccak256("contract.storage.initialized")] == true) {
            // Make sure the access is permitted to only contracts in our Dapp.
            require(addressStorage[keccak256("contract.address", msg.sender)] != 0x0);
        }
        _;
    }

    function EXOStorage() public {
        // Set the main owner upon deployment.
        boolStorage[keccak256("access.role", "owner", msg.sender)] = true;
    }

    /* Set Methods */
    function setAddress(bytes32 _key, address _value) external onlyLatestNetworkContract {
        addressStorage[_key] = _value;
    }

    function setUint(bytes32 _key, uint _value) external onlyLatestNetworkContract {
        uIntStorage[_key] = _value;
    }

    function setString(bytes32 _key, string _value) external onlyLatestNetworkContract {
        stringStorage[_key] = _value;
    }

    function setBytes(bytes32 _key, bytes _value) external onlyLatestNetworkContract {
        bytesStorage[_key] = _value;
    }

    function setBool(bytes32 _key, bool _value) external onlyLatestNetworkContract {
        boolStorage[_key] = _value;
    }

    function setInt(bytes32 _key, int _value) external onlyLatestNetworkContract {
        intStorage[_key] = _value;
    }

    /* Delete Methods */
    function deleteAddress(bytes32 _key) external onlyLatestNetworkContract {
        delete addressStorage[_key];
    }

    function deleteUint(bytes32 _key) external onlyLatestNetworkContract {
        delete uIntStorage[_key];
    }

    function deleteString(bytes32 _key) external onlyLatestNetworkContract {
        delete stringStorage[_key];
    }

    function deleteBytes(bytes32 _key) external onlyLatestNetworkContract {
        delete bytesStorage[_key];
    }

    function deleteBool(bytes32 _key) external onlyLatestNetworkContract {
        delete boolStorage[_key];
    }

    function deleteInt(bytes32 _key) external onlyLatestNetworkContract {
        delete intStorage[_key];
    }

    /* Get Methods */
    function getAddress(bytes32 _key) external view returns (address) {
        return addressStorage[_key];
    }

    function getUint(bytes32 _key) external view returns (uint) {
        return uIntStorage[_key];
    }

    function getString(bytes32 _key) external view returns (string) {
        return stringStorage[_key];
    }

    function getBytes(bytes32 _key) external view returns (bytes) {
        return bytesStorage[_key];
    }

    function getBool(bytes32 _key) external view returns (bool) {
        return boolStorage[_key];
    }

    function getInt(bytes32 _key) external view returns (int) {
        return intStorage[_key];
    }
}
