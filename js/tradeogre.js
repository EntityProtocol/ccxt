'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
// const { ExchangeError, ArgumentsRequired, ExchangeNotAvailable, InsufficientFunds, OrderNotFound, InvalidOrder, DDoSProtection, InvalidNonce, AuthenticationError } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class tradeogre extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'tradeogre',
            'name': 'TradeOgre',
            'country': [ ],
            'rateLimit': 1000,
            'version': 'v1',
            'comment': 'This comment is optional',
            'has': {
                'fetchTickers': true
            },
            'urls': {
                'logo': 'https://example.com/image.jpg',
                'api': {
                    public: 'https://tradeogre.com/api',
                    private: 'https://tradeogre.com/api'
                },
                'www': 'https://tradeogre.com',
                'doc': [
                    'https://tradeogre.com/help/api',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'markets',
                        '/orders/{market}',
                        '/ticker/{market}',
                        '/history/{market}',
                    ],
                },
                'private': {
                    'post': [
                    ],
                },
            },
        });
    }

    nonce () {
        return this.milliseconds () - this.options['timeDifference'];
    }

    async loadTimeDifference () {
        const response = await this.publicGetTime ();
        const after = this.milliseconds ();
        this.options['timeDifference'] = parseInt (after - response['serverTime']);
        return this.options['timeDifference'];
    }

    async fetchMarkets (params = {}) {
        let markets = await this.publicGetMarkets ();
        let result = [];
        for (let i = 0; i < markets.length; i++) {
            let id = Object.keys(markets[i])[0];
            let market = markets[i][id];
            let [ baseId, quoteId ] = id.split ('-');
            let base = this.commonCurrencyCode (baseId.toUpperCase ());
            let quote = this.commonCurrencyCode (quoteId.toUpperCase ());
            let symbol = base + '/' + quote;
            result.push ({
                'id': id,
                'symbol': symbol,
                'baseId': baseId,
                'quoteId': quoteId,
                'base': base,
                'quote': quote,
                'active': true,
            });
        }
        return result;
    }

    async fetchTickers (params = {}) {
        await this.loadMarkets ();
        let response = await this.publicGetMarkets ();
        let result = {};
        let anotherMarketsById = {};
        let marketIds = Object.keys (this.marketsById);
        for (let i = 0; i < marketIds.length; i++) {
            anotherMarketsById[marketIds[i]] = this.marketsById[marketIds[i]];
        }
        for (let i = 0; i < response.length; i++) {
            const key = Object.keys(response[i])[0]
            let market = anotherMarketsById[key];
            result[market['symbol']] = this.parseTicker (response[i][key], market);
        }
        return result;
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = this.milliseconds ();
        let symbol = undefined;
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        let last = this.safeFloat (ticker, 'price');
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high'),
            'low': this.safeFloat (ticker, 'low'),
            'bid': this.safeFloat (ticker, 'bid'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'ask'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': undefined,
            'quoteVolume': undefined,
            'info': ticker,
        };
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        // TODO: Borrowed from zb.js. Needs modification?
        let url = this.urls['api'][api];
        if (api === 'public') {
            url += '/' + this.version + '/' + path;
            if (Object.keys (params).length)
                url += '?' + this.urlencode (params);
        } else {
            let query = this.keysort (this.extend ({
                'method': path,
                'accesskey': this.apiKey,
            }, params));
            let nonce = this.nonce ();
            query = this.keysort (query);
            let auth = this.rawencode (query);
            let secret = this.hash (this.encode (this.secret), 'sha1');
            let signature = this.hmac (this.encode (auth), this.encode (secret), 'md5');
            let suffix = 'sign=' + signature + '&reqTime=' + nonce.toString ();
            url += '/' + path + '?' + auth + '&' + suffix;
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }
};
