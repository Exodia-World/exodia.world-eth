# Exodia.World

A decentralized digital gaming marketplace and platform that enables game studios to sell their games directly to players all around the world without a middleman in a secure and transparent way.

---

# Ethereum Contracts

This project hosts Ethereum contracts for Exodia.World. Contract development, testing, and deployment are performed here.

## Overview

exodia.world-eth is built on top of [Truffle](http://truffleframework.com/). Using Truffle, we can easily write contracts + automated tests and deploy our contracts to any network.

## Initialization

1. Clone this repository.

	git clone git@bitbucket.org:exodia-world/exodia.world-eth.git

2. Ensure that npm and node have been installed in the local machine.

3. Run `npm install` to install all dependencies.

## Development

For development, we use an Ethereum local test network and [ganache-cli](https://github.com/trufflesuite/ganache-cli) as its RPC client. Run the following to start the network.

    ./ganache-cli-x

## Compilation

    ./truffle compile

Run the above command to build our contracts and store their ABIs into the `build/contracts` directory.

**Note**: This process is optional as it's always run automatically before migration or testing.

## Linting

    ./solhint-x

Run the above command to lint our contracts with Solhint. Fix all errors reported and avoid warnings whenever practical.

## Migration

    ./truffle migrate

Run the above command to migrate our contracts to the Ethereum local test network provided by ganache-cli.

**Note**: This process is optional as it's always run automatically before testing.

If you want to add or modify the migration scripts, they are all in the `migrations` directory.

## Testing

    ./truffle test

Run the above command to run all tests (for every contract). To run only specific set of tests, e.g., for EXOToken:

    ./truffle test test/TestEXOToken.js

Add more tests to the `test` directory. Please do so. Code is incomplete without its tests.

## Configuration

Much of the configuration can be done in the `truffle.js` or by passing arguments to ganache-cli in `ganache-cli-x`.

## Resources

[Truffle's Documentation](http://truffleframework.com/docs/)

## Security Checklist

This list is compiled from
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
