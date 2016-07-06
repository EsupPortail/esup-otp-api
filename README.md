# esup-otp-api

esup-otp-api is restful api using NodeJS for generate, send and verify one-time codes for [EsupPortail]

### Version
0.0.1

### Tech

esup-otp-api uses a number of open NodeJS modules:

    "ldap-client": "^3.1.0",
    "mongoose": "4.4.0",
    "nodemailer": "^2.2.1",
    "nodemailer-smtp-transport": "^2.4.1",
    "qrcode-npm": "0.0.3",
    "request": "^2.69.0",
    "restify": "4.0.3",
    "speakeasy": "^2.0.0"

### Installation
- git clone https://github.com/EsupPortail/esup-otp-api.git
- npm install
- change the fields values in esup.sample.json to your installation
- rename esup.sample.json to esup.json
- rename logs/logs.json.sample to logs.json, set the value of level, path and filename
- node run

esup-otp-api runs in http, if you want a secure mode you will need a reverse proxy.
Check https://github.com/Hakall/esup-node-proxy if you want a simple NodeJS reverse proxy.

### Tests
Install mocha : npm install -g mocha .
Simply execute "mocha" in root directory of the project, the server must be launch before execute the tests

### Development

### Todos
 - Write Tests
 - Add Code Comments

License
----

MIT
   [EsupPortail]: <https://www.esup-portail.org/>
