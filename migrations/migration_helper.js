const jsonfile = require('jsonfile');
const CONTRACTS_PATH = './migrations/contracts.json'; // relative to base directory

function getNetworkName(networkId) {
  switch (networkId) {
    case '1':
      return 'main';
    case '4':
      return 'rinkeby';
    default:
      return 'development';
  }
}

function loadContracts() {
  console.log('Loading contracts..');
  return jsonfile.readFileSync(CONTRACTS_PATH);
}

function saveContracts(contracts) {
  console.log('Saving contracts..');
  jsonfile.writeFileSync(CONTRACTS_PATH, contracts);
}

module.exports = {
  getNetworkName,
  loadContracts,
  saveContracts
};
