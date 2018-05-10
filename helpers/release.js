#!/usr/bin/env node

const fs = require('fs');
const releaseables = ['EXOToken'];

for (releaseable of releaseables) {
  const contract = require(`../build/contracts/${releaseable}.json`);
  const release = {
    name: contract.contractName,
    abi: contract.abi
  };

  fs.writeFileSync(`./release/${release.name}.json`, JSON.stringify(release));
}
