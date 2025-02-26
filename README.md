# esup-otp-api

esup-otp-api is a RESTful api using NodeJS to generate, send and verify one-time codes for [EsupPortail]

### Version
1.7.3

Runs on Node v20.11.1 and npm v10.2.4

### Requirement

Requires [Mongodb](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu)

```bash
sudo service mongod start
```

### Installation
- git clone https://github.com/EsupPortail/esup-otp-api.git
- npm install
- copy or rename sample configuration file properties/esup.json.dist as properties/esup.json
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

### ip location

Push method displays " à proximité de $city" on the mobile device.

It uses [ip-location-api](https://github.com/sapics/ip-location-api) to get city location from browser IP.

This nodejs module is downloading & computing files into node_modules/ip-location-api/data/1kw/ through an internal task ran twice weekly.

Details:
- to update manually those files, run `ILA_FIELDS=city npm run updatedb`
- where `city` comes from [ip_location.reload](https://github.com/EsupPortail/esup-otp-api/blob/master/methods/push.js#L50)
- the directory data/1kw is computed from those fields (cf ip-location-api [code](https://github.com/sapics/ip-location-api/blob/95b7329db402b5872473f48c90469c2d77de23e2/src/setting.mjs#L167))

### See also
- [esup-otp-manager](https://github.com/EsupPortail/esup-otp-manager)
- [esup-otp-cas](https://github.com/EsupPortail/esup-otp-cas)
- [esup-otp-cas-server](https://github.com/EsupPortail/esup-otp-cas-server)

License
----

MIT
   [EsupPortail]: <https://www.esup-portail.org/>
