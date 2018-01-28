var EXOToken = artifacts.require("EXOToken");

module.exports = function(deployer) {
  deployer.deploy(EXOToken, 100000000, 10, 50000000);
};