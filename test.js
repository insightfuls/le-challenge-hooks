'use strict';

var fs = require('fs');
var path = require('path');

var challenge = require('./').create({
  apachePath: "/tmp/le-challenge-apache-test"
, apacheBind: "*"
, apachePort: 443
, apacheWebroot: "/tmp"
, apacheEnable: "touch /tmp/le-challenge-apache-test/enabled"
, apacheCheck: "touch /tmp/le-challenge-apache-test/checked"
, apacheReload: "touch /tmp/le-challenge-apache-test/reloaded"
, apacheDisable: "touch /tmp/le-challenge-apache-test/disabled"
, debug: true
});

var domain = 'example.com';
var token = 'token-id';
var key = 'secret-key';
var confExpected = fs.readFileSync(path.join(__dirname, 'httpd.conf.expected'), 'utf8');

var opts = challenge.getOptions();
opts.challengeType = "tls-sni-01";

function tryUnlink(path) {
  try {
    fs.unlinkSync(path);
  } catch (err) {
  }
}

if (fs.existsSync("/tmp/le-challenge-apache-test/token-id.crt")) {
  throw new Error("cert already exists");
}
if (fs.existsSync("/tmp/le-challenge-apache-test/token-id.key")) {
  throw new Error("key already exists");
}
if (fs.existsSync("/tmp/le-challenge-apache-test/token-id.conf")) {
  throw new Error("conf already exists");
}
challenge.set(opts, domain, token, key, function (err) {
  // if there's an error, there's a problem
  if (err) {
    throw err;
  }

  if (!fs.existsSync("/tmp/le-challenge-apache-test/token-id.crt")) {
    throw new Error("cert not written");
  }
  if (!fs.existsSync("/tmp/le-challenge-apache-test/token-id.key")) {
    throw new Error("key not written");
  }
  var conf = fs.readFileSync("/tmp/le-challenge-apache-test/token-id.conf", 'utf8');
  if (conf !== confExpected) {
    throw new Error("incorrect configuration");
  }
  if (!fs.existsSync("/tmp/le-challenge-apache-test/enabled")) {
    throw new Error("site not enabled");
  }
  if (!fs.existsSync("/tmp/le-challenge-apache-test/checked")) {
    throw new error("conf not checked");
  }
  if (!fs.existsSync("/tmp/le-challenge-apache-test/reloaded")) {
    throw new error("apache not reloaded");
  }
  tryUnlink("/tmp/le-challenge-apache-test/enabled");
  tryUnlink("/tmp/le-challenge-apache-test/checked");
  tryUnlink("/tmp/le-challenge-apache-test/reloaded");

  challenge.remove(opts, domain, token, function (err) {
    // if there's an error, there's a problem
    if (err) {
      throw err;
    }

    if (fs.existsSync("/tmp/le-challenge-apache-test/token-id.crt")) {
      throw new Error("cert not removed");
    }
    if (fs.existsSync("/tmp/le-challenge-apache-test/token-id.key")) {
      throw new Error("key not removed");
    }
    if (fs.existsSync("/tmp/le-challenge-apache-test/token-id.conf")) {
      throw new Error("conf not removed");
    }
    if (!fs.existsSync("/tmp/le-challenge-apache-test/disabled")) {
      throw new Error("site not disabled");
    }
    if (!fs.existsSync("/tmp/le-challenge-apache-test/checked")) {
      throw new Error("conf not checked");
    }
    if (!fs.existsSync("/tmp/le-challenge-apache-test/reloaded")) {
      throw new Error("apache not reloaded");
    }
    tryUnlink("/tmp/le-challenge-apache-test/disabled");
    tryUnlink("/tmp/le-challenge-apache-test/checked");
    tryUnlink("/tmp/le-challenge-apache-test/reloaded");

    opts.apacheEnable = "/usr/bin/true";
    opts.apacheCheck = "/usr/bin/true";
    opts.apacheReload = "/usr/bin/true";
    opts.apacheDisable = "/usr/bin/true";

    var template = opts.apacheTemplate;
    opts.apacheTemplate = path.join(__dirname, "httpd.conf.alternative");
    challenge.set(opts, domain, token, key, function (err) {
      // if there's an error, there's a problem
      if (err) {
        throw err;
      }

      var conf = fs.readFileSync("/tmp/le-challenge-apache-test/token-id.conf", 'utf8');
      if (conf !== "alternative\n") {
        throw new Error("incorrect configuration");
      }

      opts.apacheTemplate = template;

      tryUnlink("/tmp/le-challenge-apache-test/token-id.crt");
      tryUnlink("/tmp/le-challenge-apache-test/token-id.key");
      tryUnlink("/tmp/le-challenge-apache-test/token-id.conf");

      var next = makeRemoveFailureTest("apacheReload");
      var next = makeRemoveFailureTest("apacheCheck", next);
      var next = makeRemoveFailureTest("apacheDisable", next);
      var next = makeSetFailureTest("apacheReload", next);
      var next = makeSetFailureTest("apacheCheck", next);
      var next = makeSetFailureTest("apacheEnable", next);
      next();
    });
  });
});

function makeRemoveFailureTest(failurePoint, next) {
  return function() {
    challenge.set(opts, domain, token, key, function (err) {
      // if there's an error, there's a problem
      if (err) {
        throw err;
      }

      opts[failurePoint] = "/usr/bin/false";
      challenge.remove(opts, domain, token, function (err) {
        // if there's no error, there's a problem!
        if (!err) {
          throw new Error("remove didn't fail as expected");
        }

        tryUnlink("/tmp/le-challenge-apache-test/enabled");
        tryUnlink("/tmp/le-challenge-apache-test/checked");
        tryUnlink("/tmp/le-challenge-apache-test/reloaded");
        tryUnlink("/tmp/le-challenge-apache-test/disabled");
        tryUnlink("/tmp/le-challenge-apache-test/token-id.crt");
        tryUnlink("/tmp/le-challenge-apache-test/token-id.key");
        tryUnlink("/tmp/le-challenge-apache-test/token-id.conf");

        opts[failurePoint] = "/usr/bin/true";
        if (next) {
          next();
        } else {
          console.info('PASS');
        }
      });
    });
  };
}
function makeSetFailureTest(failurePoint, next) {
  return function() {
    opts[failurePoint] = "/usr/bin/false";
    challenge.set(opts, domain, token, key, function (err) {
      // if there's no error, there's a problem!
      if (!err) {
        throw new Error("remove didn't fail as expected");
      }

      tryUnlink("/tmp/le-challenge-apache-test/enabled");
      tryUnlink("/tmp/le-challenge-apache-test/checked");
      tryUnlink("/tmp/le-challenge-apache-test/reloaded");
      tryUnlink("/tmp/le-challenge-apache-test/token-id.crt");
      tryUnlink("/tmp/le-challenge-apache-test/token-id.key");
      tryUnlink("/tmp/le-challenge-apache-test/token-id.conf");

      opts[failurePoint] = "/usr/bin/true";
      next();
    });
  };
}
