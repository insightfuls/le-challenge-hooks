'use strict';

var Promise = require('bluebird');
var Mustache = require('mustache');
var path = require('path');
var fs = require('fs');
var writeFile = Promise.promisify(fs.writeFile);
var unlink = Promise.promisify(fs.unlink);
var mkdirp = Promise.promisify(require('mkdirp'));
var generate = Promise.promisify(require('le-tls-sni').generate);
var subprocess = require('child_process');

var defaults = {
  apachePath: path.join('~', 'letsencrypt', 'apache')
  //apachePath: path.join(require('os').tmpdir(), 'acme-challenge')
, apacheBind: "*"
, apachePort: 443
, apacheWebroot: "/var/www"
, apacheTemplate: path.join(__dirname, "httpd.conf")
, apacheEnable: "ln -s {{{conf}}} /etc/apache2/sites-enabled"
, apacheCheck: "apache2ctl configtest"
, apacheReload: "/etc/init.d/apache2 reload"
, apacheDisable: "rm /etc/apache2/sites-enabled/{{{token}}}.conf"
, debug: false
};

var Challenge = module.exports;
var confTemplate;
var confSource;

Challenge.create = function (options) {
  var results = {};

  Object.keys(Challenge).forEach(function (key) {
    results[key] = Challenge[key];
  });
  results.create = undefined;

  Object.keys(defaults).forEach(function (key) {
    if ('undefined' === typeof options[key]) {
      options[key] = defaults[key];
    }
  });
  results._options = options;

  results.getOptions = function () {
    return results._options;
  };

  return results;
};

var common = function(args, domain, token) {
  return {
    token: token
  , domain: domain
  , cert: path.join(args.apachePath, token + ".crt")
  , privkey: path.join(args.apachePath, token + ".key")
  , conf: path.join(args.apachePath, token + ".conf")
  , bind: args.apacheBind
  , port: args.apachePort
  , webroot: args.apacheWebroot
  };
};

var exec = Promise.promisify(function (command, message, params, done) {
  var command = Mustache.render(command, params);
  var child = subprocess.exec(command);
  child.on('exit', function(code) {
    if (code === 0) {
      done(null);
    } else {
      done(new Error(message));
    }
  });
});

//
// NOTE: the "args" here in `set()` are NOT accessible to `get()` and `remove()`
// They are provided so that you can store them in an implementation-specific way
// if you need access to them.
//
Challenge.set = function (args, domain, token, secret, done) {
  var certs;
  var params = common(args, domain, token);
  var promise = Promise.resolve();
  if (!confTemplate || confSource !== args.apacheTemplate) {
    promise.then(function() {
      return fs.readFileSync(args.apacheTemplate, 'utf8');
    }).then(function(data) {
      confTemplate = data;
      confSource = args.apacheTemplate;
      Mustache.parse(confTemplate);
    });
  }
  promise.then(function() {
    mkdirp(args.apachePath);
  }).then(function(generated) {
    return generate(args, domain, token, secret);
  }).then(function(generated) {
    certs = generated;
    params.subject = certs.subject;
    return writeFile(params.conf, Mustache.render(confTemplate, params), 'utf8');
  }).then(function() {
    return writeFile(params.privkey, certs.privkey, 'utf8');
  }).then(function() {
    return writeFile(params.cert, certs.cert, 'utf8');
  }).then(function() {
    return exec(args.apacheEnable, "error enabling site", params);
  }).then(function() {
    return exec(args.apacheCheck, "apache configuration error", params);
  }).then(function() {
    return exec(args.apacheReload, "error reloading apache", params);
  }).then(function() {
    done(null);
  },function(err) {
    done(err);
  });
};

Challenge.get = function (defaults, domain, key, done) {
  throw new Error("Challenge.get() has no implementation for apache.");
};

//
// NOTE: the "defaults" here are still merged and templated, just like "args" would be,
// but if you specifically need "args" you must retrieve them from some storage mechanism
// based on domain and key
//
Challenge.remove = function (defaults, domain, token, done) {
  var params = common(defaults, domain, token);
  exec(defaults.apacheDisable, "error disabling site", params).then(function() {
    return exec(defaults.apacheCheck, "apache configuration error", params);
  }).then(function() {
    return exec(defaults.apacheReload, "error reloading apache", params);
  }).then(function() {
    return unlink(params.conf);
  }).then(function() {
    return unlink(params.privkey);
  }).then(function() {
    return unlink(params.cert);
  }).then(function() {
    done(null);
  },function(err) {
    done(err);
  });
};

