# Exodia.World #

A decentralized digital gaming marketplace and platform that enables game studios to sell their games directly to players all around the world without a middleman in a secure and transparent way.

---

## Security Checklist ##
### EXO Token ###
**Basic**

- [x] Explicitly set variable and function modifiers
- [x] Explicitly define all variable types
- [_] Ensure that constant functions are truly constant
- [x] Check for dynamically bounded loops

**General**

- [_] Keep the code small and simple
- [_] Handle known and expected errors
- [_] Test the corner cases of every function
- [_] Include fail-safe mode

**Contract**

- [x] Review multi-contract interactions
- [_] Restrict the amount of "money" stored and transferred
- [_] Formally verify the contract
- [x] Use Checks-Effects-Interactions pattern
- [x] Use pull instead of push transfer
- [_] Check for re-entrancy attacks
- [_] Check for harmful Ether transfers (send/receive)
- [_] Check for harmful fails caused by OOGs and Max. Callstack Depth
- [_] Check for insecure authorization (e.g., use of tx.origin)
- [_] Check for "dirty higher order bits"
- [x] Check for insecure random number generation