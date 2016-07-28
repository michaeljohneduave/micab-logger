/*
 *
 * (C) 2016 Michael Eduave
 * MIT LICENSE
 *
 */

var io = require("socket.io-client");
var util = require('util');
var os = require('os');
var winston = require('winston');

var miCabLogger = exports.miCabLogger = function (options) {
  winston.Transport.call(this, options);
  options = options || {};

  this.name = 'miCabLogger';
  this.hostname = options.hostname || os.hostname();
  this.host = options.host || '127.0.0.1';
  this.port = options.port || 28777;
  this.node_name = options.node_name || process.title;
  this.pid = options.pid || process.pid;
  this.timestamp = options.timestamp || false;
  this.timestampFn = typeof options.timestamp === 'function' ? options.timestamp : getIsoDate;

  // Connection state
  this.log_queue = [];
  this.connected = false;
  this.socket = null;
  this.retries = 0;

  // Protocol definition
  this.delimiter = '\r\n';

  this.connect();
};

//
// Inherit from `winston.Transport`.
//
util.inherits(miCabLogger, winston.Transport);

//
// Define a getter so that `winston.transports.Syslog`
// is available and thus backwards compatible.
//
winston.transports.miCabLogger = miCabLogger;


miCabLogger.prototype.log = function (level, msg, meta, callback) {
  var self = this;
  var meta = winston.clone(meta || {});
  var log_entry;

  if (self.silent) {
    return callback(null, true);
  }

  log_entry = {
    nodeName : self.node_name,
    hostname : self.hostname,
    msg : msg,
    meta : meta,
    logLevel : level,
    timestamp : new Date()
  }


  if (!self.connected) {
    self.log_queue.push({
      message: log_entry,
      callback: function () {
        self.emit('logged');
        callback(null, true);
      }
    });
  } else {
    self.sendLog(log_entry, function () {
      self.emit('logged');
      callback(null, true);
    });
  }
};

miCabLogger.prototype.connect = function () {
  var self = this;

  this.socket = io("http://" + self.host + ":" + self.port);

  this.socket.on("connect", function () {
    console.log("connected");
    self.announce();
  });

  this.socket.on("error", function (err) {
    console.log(err);
  });


  // this.socket.on('error', function (err) {
  //   self.connected = false;
  //   self.error = true
  //   self.socket.destroy();

  //   if (self.retries < 3) {
  //     self.retries++;

  //     setTimeout(function () {
  //       self.connect();
  //     }, 100);
  //   } else {
  //     self.log_queue = [];
  //     self.silent = true;
  //     setTimeout(function() {
  //       self.retries = 0;
  //       self.silent = false;
  //       self.connect();
  //     }, 5000);
  //   }
  // });

  // this.socket.on('timeout', function() {
  //   if (self.socket.readyState !== 'open') {
  //     self.socket.destroy();
  //   }
  // });

  // this.socket.on('close', function () {
  //   self.connected = false;
  //   if (self.error == false) {
  //     self.connect();
  //   } else {
  //     self.error = true;
  //   }

  // });

  // this.socket.connect(self.port, self.host, function () {
  //   self.announce();
  // });
};

miCabLogger.prototype.announce = function () {
  this.socket.emit("test", {asd : 1});
  this.connected = true;
  this.flush();
};

miCabLogger.prototype.flush = function () {
  for (var i = 0; i < this.log_queue.length; i++) {
    this.sendLog(this.log_queue[i].message, this.log_queue[i].callback);
    this.emit('logged');
  }
  this.log_queue.length = 0;
};

miCabLogger.prototype.sendLog = function (message, callback) {
  this.socket.emit("test", message);
  callback();
};

var getIsoDate = function(){
  return new Date().toISOString();
}
