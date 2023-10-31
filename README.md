# esup-otp-api

esup-otp-api is a RESTful api using NodeJS to generate, send and verify one-time codes for [EsupPortail]

### Version
1.2.1

Runs on Node v17.8.O and npm v8.5.5

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

### Tests
Install mocha : npm install -g mocha .
Simply execute "mocha" in the root directory of the project, the server must be launched before executing the tests


### Update to 1.2.1 (device commercial name)
When a user enables push notifications, API now saves device's commercial name rather than device identifier.<br>
For example, "iPhone SE (2020)" is now recorded and displayed instead of "iPhone12,8".

To apply this update to users already in database before this update, follow the instructions below:<br>
- Uncomment line 66 of [server/routes.js](https://github.com/EsupPortail/esup-otp-api/blob/master/server/routes.js#L66) ("`server.post("/protected/updateDeviceModelToUserFriendlyName", validator.check_api_password, api_controller.updateDeviceModelToUserFriendlyName);`").

- Restart the server.

- Run command `curl -X POST "http://localhost:3000/protected/updateDeviceModelToUserFriendlyName" -H 'Authorization: Bearer api_password'`<br>
Replacing "api_password" with the password defined in your [esup.json](https://github.com/EsupPortail/esup-otp-api/blob/master/properties/esup.json#L6), and replacing "3000" with your API port if required.

**Execute this command only once, and, if possible, before the first push enabling following update to 1.2.1.**

- Recomment line 66 and restart the server.


### See also
- [esup-otp-manager](https://github.com/EsupPortail/esup-otp-manager)
- [esup-otp-cas](https://github.com/EsupPortail/esup-otp-cas)
- [esup-otp-cas-server](https://github.com/EsupPortail/esup-otp-cas-server)

License
----

MIT
   [EsupPortail]: <https://www.esup-portail.org/>
