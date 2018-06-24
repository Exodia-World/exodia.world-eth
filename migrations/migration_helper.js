const jsonfile = require('jsonfile');
const CONTRACTS_PATH = './migrations/outputs/contracts.json'; // relative to base directory
const RINKEBY_CONTRACTS_PATH = './migrations/outputs/contracts.rinkeby.json';
const DEV_CONTRACTS_PATH = './migrations/outputs/contracts.dev.json';

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

function getContractsPath(network) {
  if (network === 'main') {
    return CONTRACTS_PATH;
  } else if (network === 'rinkeby') {
    return RINKEBY_CONTRACTS_PATH;
  } else {
    return DEV_CONTRACTS_PATH;
  }
}

function loadContracts(network) {
  console.log('Loading contracts..');
  return jsonfile.readFileSync(getContractsPath(network));
}

function saveContracts(contracts, network) {
  console.log('Saving contracts..');
  jsonfile.writeFileSync(getContractsPath(network), contracts);
}

module.exports = {
  getNetworkName,
  getContractsPath,
  loadContracts,
  saveContracts
};
