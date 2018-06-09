#!/usr/bin/env node

const fs = require('fs');
const contracts = require('../migrations/contracts.json');
const releaseables = ['EXOToken'];

for (releaseable of releaseables) {
  const contract = require(`../build/contracts/${releaseable}.json`);
  const release = {
    name: contract.contractName,
    env: process.env.RELEASE_ENV ? process.env.RELEASE_ENV : 'dev',
    address: '',
    abi: contract.abi
  };
  if (release.env === 'dev') {
    release.address = contracts['development'][releaseable];
  } else if (release.env === 'staging') {
    release.address = contracts['rinkeby'][releaseable];
  }

  fs.writeFileSync(`./release/${release.name}.json`, JSON.stringify(release));
}
