// RpcClient.js
// MIT/X11-like license.  See LICENSE.txt.
// Copyright 2013 BitPay, Inc.
//
var http = require('http');
var https = require('https');
var log = require('../util/log');
var WebSocket = require('ws');
var messageID = 0;
function RpcClient(opts) {
  opts = opts || {};
  this.host = opts.host || '127.0.0.1';
  this.port = opts.port || 8332;
  this.user = opts.user || 'user';
  this.pass = opts.pass || 'pass';
  this.protocol = (opts.protocol == 'http') ? http : https;
  this.batchedCalls = null;
  this.disableAgent = opts.disableAgent || false;
  this.rejectUnauthorized = opts.rejectUnauthorized || false;
  this.authenticated = false;
  ws = new WebSocket("ws://127.0.0.1:9109/ws");
  ws.on('open', function open() {
    console.log("open handler", ws);
    var method = 'authenticate';
    var creds = '["user", "pass"]';
    var	message = '{"jsonrpc":"1.0","id":"'+messageID+'","method":"'+method+'","params":'+creds+'}';
    ws.send(message);
    this.authenticated = true;
  });
  this.ws = ws;
  console.log("outside handler", this.ws);
  console.log(this.authenticated);
}

RpcClient.prototype.batch = function(batchCallback, resultCallback) {
  this.batchedCalls = [];
  batchCallback();
  rpc.call(this, this.batchedCalls, resultCallback);
  this.batchedCalls = null;
}

var callspec = {
  addMultiSigAddress: '',
  addNode: '',
  backupWallet: '',
  createMultiSig: '',
  createRawTransaction: '',
  decodeRawTransaction: '',
  dumpPrivKey: '',
  encryptWallet: '',
  estimateFee: 'int',
  getAccount: '',
  getAccountAddress: 'str',
  getAddedNodeInfo: '',
  getAddressesByAccount: '',
  getBalance: 'str int',
  getBestBlockHash: '',
  getBlock: '',
  getBlockCount: '',
  getBlockHash: 'int',
  getBlockNumber: '',
  getBlockTemplate: '',
  getCoinSupply: '',
  getConnectionCount: '',
  getDifficulty: '',
  getGenerate: '',
  getHashesPerSec: '',
  getInfo: '',
  getMemoryPool: '',
  getMiningInfo: '',
  getNewAddress: '',
  getPeerInfo: '',
  getRawMemPool: '',
  getRawTransaction: 'str int',
  getReceivedByAccount: 'str int',
  getReceivedByAddress: 'str int',
  getTransaction: '',
  getTxOut: 'str int bool',
  getTxOutSetInfo: '',
  getWork: '',
  help: '',
  importAddress: 'str str bool',
  importPrivKey: 'str str bool',
  keyPoolRefill: '',
  listAccounts: 'int',
  listAddressGroupings: '',
  listReceivedByAccount: 'int bool',
  listReceivedByAddress: 'int bool',
  listSinceBlock: 'str int',
  listTransactions: 'str int int',
  listUnspent: 'int int',
  listLockUnspent: 'bool',
  lockUnspent: '',
  move: 'str str float int str',
  sendFrom: 'str str float int str str',
  sendMany: 'str str int str', //not sure this is will work
  sendRawTransaction: '',
  sendToAddress: 'str float str str',
  setAccount: '',
  setGenerate: 'bool int',
  setTxFee: 'float',
  signMessage: '',
  signRawTransaction: '',
  stop: '',
  submitBlock: '',
  validateAddress: '',
  verifyMessage: '',
  walletLock: '',
  walletPassPhrase: 'string int',
  walletPassphraseChange: '',
};

var slice = function(arr, start, end) {
  return Array.prototype.slice.call(arr, start, end);
};

function generateRPCMethods(constructor, apiCalls, rpc) {
  function createRPCMethod(methodName, argMap) {
    return function() {
      var limit = arguments.length - 1;
      if (this.batchedCalls) var limit = arguments.length;
      for (var i = 0; i < limit; i++) {
        if (argMap[i]) arguments[i] = argMap[i](arguments[i]);
      };
      if (this.batchedCalls) {
        this.batchedCalls.push({
          jsonrpc: '2.0',
          method: methodName,
          params: slice(arguments),
          id: "bitcore"
        });
      } else {
        if (this.authenticated) {
          rpc.call(this, {
            method: methodName,
            params: slice(arguments, 0, arguments.length - 1),
            id: "bitcore"
          }, arguments[arguments.length - 1]);
        } else {
          setTimeout(function() {
          rpc.call(this, {
            method: methodName,
            params: slice(arguments, 0, arguments.length - 1),
            id: "bitcore"
          }, arguments[arguments.length - 1]);}, 1000);
        }
      }
    };
  };

  var types = {
    str: function(arg) {
      return arg.toString();
    },
    int: function(arg) {
      return parseFloat(arg);
    },
    float: function(arg) {
      return parseFloat(arg);
    },
    bool: function(arg) {
      return (arg === true || arg == '1' || arg == 'true' || arg.toString().toLowerCase() == 'true');
    },
  };

  for (var k in apiCalls) {
    if (apiCalls.hasOwnProperty(k)) {
      var spec = apiCalls[k].split(' ');
      for (var i = 0; i < spec.length; i++) {
        if (types[spec[i]]) {
          spec[i] = types[spec[i]];
        } else {
          spec[i] = types.string;
        }
      }
      var methodName = k.toLowerCase();
      constructor.prototype[k] = createRPCMethod(methodName, spec);
      constructor.prototype[methodName] = constructor.prototype[k];
    }
  }
}

function rpc(request, callback) {
  var self = this;
  console.log(self);
  self.ws.send(JSON.stringify(request), function(error) {
    callback(error);
  });
};

generateRPCMethods(RpcClient, callspec, rpc);

module.exports = RpcClient;
