# esup-otp-api

esup-otp-api is a RESTful api using NodeJS to generate, send and verify one-time codes for [EsupPortail]

### Version
1.7.2

Runs on Node v20.11.1 and npm v10.2.4

### Requirement

Requires [Mongodb](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu)

```bash
sudo service mongod start
```

### Installation
- git clone https://github.com/EsupPortail/esup-otp-api.git
- npm install
- change the fields values in properties/esup.json to your installation, some explanations are in #how_to attributes
- in properties/esup.json, hostname of smtp server needs to be set to work
- npm start

esup-otp-api runs in http, if you want a secure mode you will need a reverse proxy.

### Behind Apache
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

### Systemd

```
[Unit]
Description=esup-otp-api nodejs app
Documentation=https://github.com/EsupPortail/esup-otp-api
After=network.target

[Service]
Type=simple
User=esup
WorkingDirectory=/opt/esup-otp-api
ExecStart=/usr/bin/node run
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Tests
npm test


### See also
- [esup-otp-manager](https://github.com/EsupPortail/esup-otp-manager)
- [esup-otp-cas](https://github.com/EsupPortail/esup-otp-cas)
- [esup-otp-cas-server](https://github.com/EsupPortail/esup-otp-cas-server)

License
----

MIT
   [EsupPortail]: <https://www.esup-portail.org/>
