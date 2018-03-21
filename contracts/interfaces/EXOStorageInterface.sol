pragma solidity 0.4.18;


/**
 * @title EXO Storage's Interface
 *
 * @dev An interface for the EXOStorage contract.
 */
contract EXOStorageInterface {
    // Modifiers
    modifier onlyLatestNetworkContract() {_;}
    // Setters
    function setAddress(bytes32 _key, address _value) external onlyLatestNetworkContract();
    function setUint(bytes32 _key, uint _value) external onlyLatestNetworkContract();
    function setString(bytes32 _key, string _value) external onlyLatestNetworkContract();
    function setBytes(bytes32 _key, bytes _value) external onlyLatestNetworkContract();
    function setBool(bytes32 _key, bool _value) external onlyLatestNetworkContract();
    function setInt(bytes32 _key, int _value) external onlyLatestNetworkContract();
    // Deleters
    function deleteAddress(bytes32 _key) external onlyLatestNetworkContract();
    function deleteUint(bytes32 _key) external onlyLatestNetworkContract();
    function deleteString(bytes32 _key) external onlyLatestNetworkContract();
    function deleteBytes(bytes32 _key) external onlyLatestNetworkContract();
    function deleteBool(bytes32 _key) external onlyLatestNetworkContract();
    function deleteInt(bytes32 _key) external onlyLatestNetworkContract();
    // Getters
    function getAddress(bytes32 _key) external view returns (address);
    function getUint(bytes32 _key) external view returns (uint);
    function getString(bytes32 _key) external view returns (string);
    function getBytes(bytes32 _key) external view returns (bytes);
    function getBool(bytes32 _key) external view returns (bool);
    function getInt(bytes32 _key) external view returns (int);
}
