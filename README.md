# Exodia.World #

A decentralized digital gaming marketplace and platform that enables game studios to sell their games directly to players all around the world without a middleman in a secure and transparent way.

---

## Security Checklist ##
### EXO Token ###
**Basic**
- [x] Explicitly set variable and function modifiers
- [x] Explicitly define all variable types
- [ ] Ensure that constant functions are truly constant
- [x] Check for dynamically bounded loops

**General**
- [ ] Keep the code small and simple
- [ ] Handle known and expected errors
- [ ] Test the corner cases of every function
- [ ] Include fail-safe mode

**Contract**
- [x] Review multi-contract interactions
- [ ] Restrict the amount of "money" stored and transferred
- [ ] Formally verify the contract
- [x] Use Checks-Effects-Interactions pattern
- [x] Use pull instead of push transfer
- [ ] Check for re-entrancy attacks
- [ ] Check for harmful Ether transfers (send/receive)
- [ ] Check for harmful fails caused by OOGs and Max. Callstack Depth
- [ ] Check for insecure authorization (e.g., use of tx.origin)
- [ ] Check for "dirty higher order bits"
- [x] Check for insecure random number generation