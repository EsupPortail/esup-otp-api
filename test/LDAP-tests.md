To run tests with an LDAP userdb :

1. Download `ldap-server.jar` from https://github.com/intoolswetrust/ldap-server/releases into `test` folder.
2. Run `java -jar .\ldap-server.jar -p 389 .\ldap.ldif`.
3. In `./test/test.js`, replace `"userDb": "mongodb",` with `"userDb": "ldap",`.
4. Run `node --test ./test/test.js`