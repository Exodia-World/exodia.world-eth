pragma solidity 0.4.18;

contract EXOStorageInterface {
    // Modifiers
    modifier onlyLatestNetworkContract() {_;}
    // Getters
    function getAddress(bytes32 _key) external view returns (address);
    function getUint(bytes32 _key) external view returns (uint);
    function getString(bytes32 _key) external view returns (string);
    function getBytes(bytes32 _key) external view returns (bytes);
    function getBool(bytes32 _key) external view returns (bool);
    function getInt(bytes32 _key) external view returns (int);
    // Setters
    function setAddress(bytes32 _key, address _value) onlyLatestNetworkContract external;
    function setUint(bytes32 _key, uint _value) onlyLatestNetworkContract external;
    function setString(bytes32 _key, string _value) onlyLatestNetworkContract external;
    function setBytes(bytes32 _key, bytes _value) onlyLatestNetworkContract external;
    function setBool(bytes32 _key, bool _value) onlyLatestNetworkContract external;
    function setInt(bytes32 _key, int _value) onlyLatestNetworkContract external;
    // Deleters
    function deleteAddress(bytes32 _key) onlyLatestNetworkContract external;
    function deleteUint(bytes32 _key) onlyLatestNetworkContract external;
    function deleteString(bytes32 _key) onlyLatestNetworkContract external;
    function deleteBytes(bytes32 _key) onlyLatestNetworkContract external;
    function deleteBool(bytes32 _key) onlyLatestNetworkContract external;
    function deleteInt(bytes32 _key) onlyLatestNetworkContract external;
}