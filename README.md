# esup-otp-api

esup-otp-api is restful api using NodeJS for generate, send and verify one-time codes for [EsupPortail]

### Version
0.9.0

Run on Node v4.* and npm v2

### Requirement

Require [Mongodb](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu)

```bash
sudo service mongod start
```

### Installation
- git clone https://github.com/EsupPortail/esup-otp-api.git
- npm install
- change the fields values in properties/esup.json to your installation, some explanations are in #how_to attributes
- in properties/esup.json, hostname of smtp server needs to be setted to work
- npm start

esup-otp-api runs in http, if you want a secure mode you will need a reverse proxy.
Check https://github.com/Hakall/esup-node-proxy if you want a simple NodeJS reverse proxy.

### Si derrière Apache
- https 

> RequestHeader set X-Forwarded-Proto https
 RequestHeader set X-Forwarded-Port 443

- websocket

> RewriteEngine On
  RewriteCond %{QUERY_STRING} transport=websocket [NC]
  RewriteRule /(.*) ws://esup-otp-api-serveur/$1 [P]


### Tests
Install mocha : npm install -g mocha .
Simply execute "mocha" in root directory of the project, the server must be launch before execute the tests


### See also
- [esup-otp-manager](https://github.com/EsupPortail/esup-otp-manager)
- [esup-otp-cas](https://github.com/EsupPortail/esup-otp-cas)

License
----

MIT
   [EsupPortail]: <https://www.esup-portail.org/>
