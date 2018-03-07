pragma solidity 0.4.18;

import "./ERC20Basic.sol";
import "../../math/SafeMath.sol";
import "../../../EXOBase.sol";

/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is ERC20Basic, EXOBase {
  using SafeMath for uint256;

  /**
   * @dev transfer token for a specified address
   * @param _to The address to transfer to.
   * @param _value The amount to be transferred.
   */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= balanceOf(msg.sender));

    // SafeMath.sub will throw if there is not enough balance.
    balanceOf(msg.sender, balanceOf(msg.sender).sub(_value));
    balanceOf(_to, balanceOf(_to).add(_value));
    Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
   * @dev Get the balance of the specified address.
   *
   * @param _owner The address to query the the balance of
   * @return An uint256 representing the amount owned by the passed address
   */
  function balanceOf(address _owner) public view returns (uint256 balance) {
      return exoStorage.getUint(keccak256("token.balances", _owner));
  }

  /**
   * @dev Get total number of tokens in existence.
   */
  function totalSupply() public view returns (uint256) {
    return exoStorage.getUint(keccak256("token.totalSupply"));
  }

  /**
   * @dev Set the balance of the specified address.
   *
   * @param _owner The address to query the the balance of
   * @param _balance The new balance owned by the passed address
   */
  function balanceOf(address _owner, uint256 _balance) internal {
      exoStorage.setUint(keccak256("token.balances", _owner), _balance);
  }

  /**
   * @dev Set total number of tokens in existence.
   *
   * @param _totalSupply //
   */
  function totalSupply(uint256 _totalSupply) internal {
    exoStorage.setUint(keccak256("token.totalSupply"), _totalSupply);
  }
}
