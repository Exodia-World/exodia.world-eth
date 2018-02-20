var EXOToken = artifacts.require("EXOToken");

module.exports = function(deployer) {
  deployer.deploy(
    EXOToken,
    100000000, // total supply
    50000000, // minimum balance for stake reward
    10000000, // locked treasury fund
    5000000, // locked pre-sale fund
    7300, // pre-sale price (1 ETH = 7300 EXO)
    1209600, // pre-sale duration
    25000000, // available ICO fund
    3650, // minimum ICO tokens bought every purchase (1 ETH)
    18250, // maximum ICO tokens bought for all purchases (5 ETH)
    3650, // ICO price (1 ETH = 3650 EXO)
    2419200, // ICO duration
    10 // airdrop amount
  );
};