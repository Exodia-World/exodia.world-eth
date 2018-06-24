#!/usr/bin/env node

const fs = require('fs');
const CONTRACTS_PATH = '../migrations/outputs/contracts.json';
const RINKEBY_CONTRACTS_PATH = '../migrations/outputs/contracts.rinkeby.json';
const DEV_CONTRACTS_PATH = '../migrations/outputs/contracts.dev.json';

const releaseables = ['EXOToken'];

for (releaseable of releaseables) {
  const contract = require(`../build/contracts/${releaseable}.json`);
  const release = {
    name: contract.contractName,
    env: process.env.RELEASE_ENV ? process.env.RELEASE_ENV : 'dev',
    address: '',
    abi: contract.abi
  };

  let contracts_path;
  if (release.env === 'dev') {
    contracts_path = DEV_CONTRACTS_PATH;
  } else if (release.env === 'staging') {
    contracts_path = RINKEBY_CONTRACTS_PATH;
  } else if (release.env === 'prod') {
    contracts_path = CONTRACTS_PATH;
  } else {
    console.log('Unidentified environment; do nothing.');
    break;
  }
  const contracts = require(contracts_path);
  release.address = contracts[releaseable];

  fs.writeFileSync(`./release/${release.name}.json`, JSON.stringify(release));
}
