module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    rinkeby: {
      host: "127.0.0.1",
      port: 8545,
      from: "", // testnet main account address
      network_id: 4
    }
  }
};
