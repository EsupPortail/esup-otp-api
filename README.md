# esup-otp-api

esup-otp-api is restful api using NodeJS for generate, send and verify one-time codes for [EsupPortail]

### Version
1.1


Run on Node v17.8.O and npm v8.5.5

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

### behind Apache
- https 

```
RequestHeader set X-Forwarded-Proto https
RequestHeader set X-Forwarded-Port 443

<Location />
ProxyPass http://127.0.0.1:3000/
ProxyPassReverse http://127.0.0.1:3000/
</Location>
```

- websocket

```
RewriteEngine On
RewriteCond %{QUERY_STRING} transport=websocket [NC]
RewriteRule /(.*) ws://127.0.0.1:3000/$1 [P]
```

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
