#!/usr/bin/env node

/**
 * Estimates the gas requirment for deploying a contract
 */

const config = require('../truffle.js');
const Web3 = require('web3');
const fs = require('fs');
const jsonfile = require('jsonfile');
const jsonQuery = require('json-query');
const program = require('commander');

// Set the command parameters
program
  .version('0.0.1')
  .option('-c, --contract [contractName]', 'The contract to estimate gas deployment')
  .option('-n, --network [networkName]', 'The network for deployment')
  .parse(process.argv);

if (! program.contract || ! program.network) {
  program.help();
}

// Initialise web3
let provider = config.networks[program.network].provider;
if (! provider) {
  const host = config.networks[program.network].host;
  const port = config.networks[program.network].port;
  provider = 'http://' + host + ':' + port;
}
const web3Provider = new Web3.providers.HttpProvider(provider);
web3 = new Web3(web3Provider);

// Our precompiled contracts
const json = './build/contracts/' + program.contract + '.json';
const contractJson = JSON.parse(fs.readFileSync(json, 'utf8'));

// Store our results so we can compare
const jsonGasFile = './helpers/gas_estimates.json';

// Start now
if (web3.isConnected()) {
  // See if we have a previous result for this contract to compare
  const jsonData = jsonfile.readFileSync(jsonGasFile);
  const jsonFilter = jsonQuery('**[contract=' + program.contract + ']', {
    data: jsonData,
  });
  const previousGas = jsonFilter.references[0].deploymentGas;

  const info = web3.eth.getBlock('latest');
  const gasEstimate = web3.eth.estimateGas({ data: contractJson.bytecode, gas: info.gasLimit }); // Max Gas Block Limit, cannot exceed this
  console.log('Current Gas: ' + gasEstimate);
  if (previousGas) {
    const gasDiff = gasEstimate - previousGas;
    console.log('Previous Gas: ' + previousGas);
    if (gasDiff < 0) {
      console.log('SAVED GAS =  ' + Math.abs(gasDiff));
    } else {
      console.log('GAS INCREASED =  ' + gasDiff);
    }
  }

  // Write it
  const obj = { contract: program.contract, deploymentGas: gasEstimate };
  jsonfile.writeFile(jsonGasFile, obj, err => {
    if (err) {
      console.error('Error saving gas results');
    }
  });
}
