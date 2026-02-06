# esup-otp-api

## Notify users by email when their accounts get updated
In properties/esup.json :
- If it hasn't already been done, configure the mailer,
- Set userChangesNotifier.enabled to `true`.

### Determine which address(es) to send the email(s) to
The [services/userChangesNotifier](services/userChangesNotifier) directory contains 3 different "providers":
- [getEmailAddressFromApi.js](services/userChangesNotifier/getEmailAddressFromApi.js)
- [getEmailAddressFromLDAP.js](services/userChangesNotifier/getEmailAddressFromLDAP.js)
- [getEmailAddressFromUser.js](services/userChangesNotifier/getEmailAddressFromUser.js)

To choose the one you want, configure userChangeNotificationEmailAddressProvider (in [properties/esup.json](properties/esup.json)) with a value from "getEmailAddressFromApi", "getEmailAddressFromLDAP", and "getEmailAddressFromUser".
See below for the specific configuration of each provider.

Note that if the user already has an email address configured in esup-otp-api, this address will be added to the recipients. And if the notification concerns a change/deletion of an email address, the old address will also be added to the recipients.


#### Get email addresses from **LDAP**
In esup.json :

```json
    "userChangesNotifier": {
        "enabled": true,
        "EmailAddressProvider": "getEmailAddressFromLDAP",
        "getEmailAddressFromLDAP": {
            "uri": "",
            "adminDn": "",
            "password": "",
            "baseDn": "",
            "uidAttribute": "",
            "mailAttributes": ["mail", "supannMailPerso"],
            "timeout": 0,
            "connectTimeout": 0
        }
    },
```
By default, "uri", "adminDn", "password", "baseDn", "timeout", and "connectTimeout" are those configured for "ldap" earlier in the [esup.json](properties/esup.json#L35-L43).
By default, "uidAttribute" is set to ldap.uid (if configured) or `"uid"` (otherwise).
By default, "mailAttributes" is set to `["mail", "supannMailPerso"]`.

#### Get email addresses from an **API**
In esup.json :

```json
    "userChangesNotifier": {
        "enabled": true,
        "EmailAddressProvider": "getEmailAddressFromApi"
    },
```
Then edit file [services/userChangesNotifier/getEmailAddressFromApi.js](services/userChangesNotifier/getEmailAddressFromApi.js) to call the API you want and return the email address(es). (Note that "query" corresponds to request query params. So in the example, it calls GET "https://wsgroups.example.com/searchUserTrusted?id=toto&attrs=mail")

#### Get email addresses from "user" object
In esup.json :

```json
    "userChangesNotifier": {
        "enabled": true,
        "EmailAddressProvider": "getEmailAddressFromUser"
    },
```
Then edit file [services/userChangesNotifier/getEmailAddressFromUser.js](services/userChangesNotifier/getEmailAddressFromUser.js) to retrieve the email address in the way you want.

### Customize these emails
The "mainContent" is generated in [services/userChangesNotifier/emailMainContent.js](services/userChangesNotifier/emailMainContent.js).
If `mailer.use_templates` is set to `true` in esup.json, then this mainContent will be injected into [transports/email_templates/userChangesNotifier/html.eta](transports/email_templates/userChangesNotifier/html.eta). In this file, you can customize the rest of the email (add logos, links, ...).
(Otherwise, if `mailer.use_templates` is falsy, the email sent will only contain the mainContent)

## Logging

esup-otp-api provides different log types, configured in the main 'esup.json' configuration file.

Generic logs are configured with the following key:
```
"logs": {
    "main": {
        "level": "info",
        "console": false,
        "file": "logs/main.log"
    }
}
```
This object has the following keys:
- `level`: logging level (see [NPM logging levels](https://github.com/winstonjs/winston?tab=readme-ov-file#logging-levels) for values, default: 'info')
- `console`: log to console (true/false, default: false)
- `file`: log to given file

If `logs.main` key is not defined, no generic message will be logged.

Traffic logs, for HTTP queries, are configured with the following key:
```
"logs": {
    "access": {
        "format": "dev",
        "console": false,
        "file": "logs/access.log"
    }
}
```

This object has the following keys:
- `format`: logging format (see [pre-defined formats](https://github.com/expressjs/morgan#predefined-formats) for values,  default: 'dev')
- `console`: log to console (true/false, default: false)
- `file`: log to given file

If `logs.access` key is not defined, no traffic will be logged.

Audit logs are configured with the following key:
```
"logs": {
    "audit": {
        "console": false,
        "file": "logs/audit.log"
    }
}
```

If `logs.audit` key is not defined, no audit message will be logged.
