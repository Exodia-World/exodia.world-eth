# Exodia.World

A decentralized digital gaming marketplace and platform that enables game studios to sell their games directly to players all around the world without a middleman in a secure and transparent way.

---

# Ethereum Contracts

This project hosts Ethereum contracts for Exodia.World. Contract development, testing, and deployment are performed here.


## Overview

exodia.world-eth is built on top of [Truffle](http://truffleframework.com/). Using Truffle, we can easily write contracts + automated tests and deploy our contracts to any network.


## Initialization

1. Clone this repository.

2. Ensure that npm and node have been installed in the local machine.

3. Run `npm install` to install all dependencies.


## Compilation

    ./truffle compile

Run the above command to build our contracts and store their ABIs into the `build/contracts` directory.

**Note**: This process is optional as it's always run automatically before migration or testing.


## Linting

    ./solhint-x

Run the above command to lint our contracts with Solhint. Fix errors reported and avoid warnings whenever practical.

The goal is to review the lint results for security issues. Use common sense at all times.

**WARNING**: Do NOT change third-party contracts carelessly.


## Testing

    ./truffle test

Run the above command to run all tests (for every contract). To run only specific set of tests, e.g., for EXOToken:

    ./truffle test test/TestEXOToken.js

Add more tests to the `test` directory. Please do so. Code is incomplete without its tests.


## Migration

### Ganache Local Test Network

For development, we use an Ethereum local test network with [ganache-cli](https://github.com/trufflesuite/ganache-cli) as its client. Run the following to start.

    ./ganache-cli-x

Run the below command to migrate our contracts to the Ethereum local test network provided by ganache-cli.

    ./truffle migrate

**Note**: This process is optional as it's always run automatically before testing.

### Rinkeby Public Test Network

    ./truffle migrate --network rinkeby

Before migration, ensure that the account used for deployment as seen in `truffle.js` has enough ether. If that is not the case, request for some at [Rinkeby Faucet](https://faucet.rinkeby.io/).

After a successful *public* migration, append output of the command to the beginning of `migrations/history.txt` file. We can retrieve contract addresses from it later.

**WARNING**: Do NOT use the same account for both testnet and mainnet deployments.

If you want to add or modify the migration scripts, they are all in the `migrations` directory.


## Upgrading

To upgrade individual contracts, run the corresponding scripts in the `migrations` directory. For example:

    ./truffle exec upgrade_exo_token.js --network rinkeby // omit --network flag for local upgrades

Record *public* upgrades in `migrations/history.txt`. This practice will be automated in the future. The latest deployed contract addresses are written in `migrations/contracts.json`.


## Configuration

Much of the configuration can be done in the `truffle.js` or by passing arguments to ganache-cli in `ganache-cli-x`.


## Resources

[Truffle's Documentation](http://truffleframework.com/docs/)


## Security Checklist

This list is compiled from:

- [ConsenSys' Ethereum Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Solidity's Security Considerations](http://solidity.readthedocs.io/en/v0.4.18/security-considerations.html)

### Basic

- Explicitly set variable and function modifiers
- Explicitly define all variable types
- Ensure that constant functions are truly constant
- Check for dynamically bounded loops

### General

- Keep the code small and simple
- Handle known and expected errors
- Test the corner cases of every function
- Include fail-safe mode
- Comply with security best practices and style standards

### Contract

- Review multi-contract interactions
- Restrict the amount of "money" stored and transferred
- Formally verify the contract
- Use Checks-Effects-Interactions pattern
- Use pull instead of push transfer
- Check for re-entrancy attacks
- Check for harmful Ether transfers (send/receive)
- Check for harmful fails caused by OOGs and Max. Callstack Depth
- Check for insecure authorization (e.g., use of tx.origin)
- Check for "dirty higher order bits" - especially if you access msg.data
- Check for insecure random number generation
