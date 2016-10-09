le-challenge-apache
===================

A strategy for node-letsencrypt that adds sites to an Apache web server to
satisfy tls-sni-01 or tls-sni-02 challenges.

Install
-------

```bash
npm install --save le-challenge-apache@2.x
```

Usage
-----

```bash
var leChallenge = require('le-challenge-apache').create({
  apachePath: path.join('~', 'letsencrypt', 'apache')
, apacheBind: "*"
, apachePort: 443
, apacheWebroot: "/var/www" // though nothing should actually be served
// , apacheTemplate: "/path/to/alternative-config-file-template"
, apacheEnable: "ln -s {{{conf}}} /etc/apache2/sites-enabled"
, apacheCheck: "apache2ctl configtest"
, apacheReload: "/etc/init.d/apache2 reload"
, apacheDisable: "rm /etc/apache2/sites-enabled/{{{token}}}.conf"
, debug: false
});

var LE = require('letsencrypt');

LE.create({
  server: LE.stagingServerUrl
, challengeType: "tls-sni-01"
, challenge: leChallenge
});
```

In the shell hooks above, and any alternative configuration file template
provided, the following substitutions are available:

* `{{{token}}}`: the token
* `{{{domain}}}`: the domain for which a certificate is being sought (beware of
  this if using multiple domains per certificate)
* `{{{subject}}}`: the domain for which the generated challenge-fulfilling
  certificate must be used (only available when generating it)
* `{{{cert}}}`: the path to the generated certificate: `apachePath/token.crt`
* `{{{privkey}}}`: the path to the generated private key: `apachePath/token.key`
* `{{{conf}}}`: the path to the generated config file: `apachePath/token.conf`
* `{{{bind}}}`: the value of the `apacheBind` option
* `{{{port}}}`: the value of the `apachePort` option
* `{{{webroot}}}`: the value of the `apacheWebroot` option

Exposed Methods
---------------

For ACME Challenge:

* `set(opts, domain, key, val, done)`
* `get(defaults, domain, key, done)`
* `remove(defaults, domain, key, done)`

For node-letsencrypt internals:

* `getOptions()` returns the internal defaults merged with the user-supplied options
