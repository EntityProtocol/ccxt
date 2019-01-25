const Ccxt = require('./ccxt')

const tradeogre = new Ccxt['tradeogre']()
//tradeogre.fetchMarkets().then((ret) => console.log(ret))
tradeogre.fetchTickers().then((ret) => console.log(ret))
