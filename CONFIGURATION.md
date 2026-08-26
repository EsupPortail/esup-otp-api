# esup-otp-api
## esup.json
| key | description | example |
|-----|-------------|---------|
| `casVhost` | Authentication page URI (using CORS, esup-otp-api prevents WebSockets not coming from the authentication page). | `"cas.univ.fr"` |
| `otherHosts` | (Optional) If multiple `casVhost` instances are required (for example, if multiple test CAS servers use the same instance of esup-otp-api). | `["https://cas2.univ.fr"]` |
| `proxyUrl` | (Optional) If specified, the API will use this proxy. Depending on your network configuration, this may be necessary for sending SMS, emails, and push notifications. | `"http://username:password@univ.fr:3127"` |
| `api_password` | Secures requests from esup-otp-manager and the CAS server (the same `api_password` must be configured on both esup-otp-api, esup-otp-manager, and esup-otp-cas). | `"1t1J8xF0nphdAOSRGudoTz97AeIQS4Xw"` |
| `users_secret` | Secures requests originating from the authentication page (the same `users_secret` must be configured on both esup-otp-api and esup-otp-cas). | `"1t1J8xF0nphdAOSRGudoTz97AeIQS4Xw"` |
| `apiDb` | See [#apiDb](#apidb).  | `"mongodb"` |
| `userDb` | See [#userDb](#userdb).  | `"mongodb"` |
| `auto_create_user` | (Optional) Automatically create user if it does not already exist in userDb. | `true` |
| `webauthn` | (Optional) See [#WebAuthn](#webauthn). |  |
| `tenants` | (Optional) See [Multi-tenants.md](Multi-tenants.md). |  |
| `mongodb` | See [#Database](#database). |  |
| `ldap` | (Optional) See [#Database](#database). |  |
| `mysql` | (Optional) See [#Database](#database). |  |
| `methods` | See [#methods](#methods). |  |
| `transports` | Do not change. |  |
| `mailer` | See [#mailer](#mailer). |  |
| `sms` | See [#sms](#sms). |  |
| `esupnfc.server_ip` | (Optional) The esup-nfc-tag-server's IP address (to accept only esupnfc requests originating from this server). | `"194.167.248.50"` |
| `userChangesNotifier` | (Optional) See [Notify users by email when their accounts get updated](#notify-users-by-email-when-their-accounts-get-updated) |  |
| `logs` | See [#logs](#logs). |  |
| `trustedProxies` | See [#trustedProxies](#trustedproxies). |  |

## Database
esup-otp-api's database is divided into two parts: [`apiDb`](#apidb) and [`userDb`](#userdb).

### apiDb
`apiDb` contains user authentication method data (method activation status, secrets, one-time codes, etc.).<br />
This data is stored in a MongoDB database. (So just keep `"apiDb": "mongodb"`.)

### userDb
`userDb` contains the user's email address and phone number. These are used to send one-time codes. `userDb` also contains the `displayName`, which helps managers search for users.<br />
The `userDb` can be the same `mongodb` database as the `apiDb`, or an `ldap` server or a `mysql` database. This allows existing data (`pagerTelephoneNumber`, `supannMailPerso`, `displayName`) to be used.<br />
To do this:
1. In `userDb`, specify the type of database to use. For example, `"userDb": "ldap",`.
2. In the corresponding entry, specify the name of the attribute in the database.<br />
For example:
```json
    "ldap": {
        "uri": "ldap://ldap.univ.fr",
        "baseDn": "dc=univ,dc=fr",
        "adminDn": "cn=admin,dc=univ,dc=fr",
        "password": "ExZI6HLkVm7OHslUUPK5YKl4A3W9jdwy",
        "transport": {
            "mail": "supannMailPerso",
            "sms": "pagerTelephoneNumber"
        },
        "displayName": "displayName"
    },
```

## WebAuthn
| key | description |
|-----|-------------|
| `relying_party.id` | See [https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#id_2](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#id_2). |
| `relying_party.name` | See [https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#name](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#name). |
| `allowed_origins` | List of subdomains (of `relying_party.id`) on which WebAuthn can be used. |

## methods
### Common attributes for all methods
| key | description |
|-----|-------------|
| `activate` | If the method is enabled. Upon first startup, this setting is read from the database, so modifying the file will no longer have any effect. To change the enable status, use esup-otp-manager in "Admin" view. |
| `priority` | Defines the display order of the method. (The highest number will be displayed first.) |
| `transports` | Do not change. |

### Paramètres utilisés plusieurs méthodes
| key | description |
|-----|-------------|
| `code_type` | Do not change. |
| `code_length` | Do not change. |

### Paramètres spécifiques aux méthodes
#### totp
| key | description |
|-----|-------------|
| `autoActivateWithPush` | If the user enables notifications but has not already enabled TOTP, TOTP will be automatically enabled and configured in their Esup Auth app. |
| `name` | The label attached to the TOTP code, as displayed in the users' app. (Enter the name of the organization.) |

#### random_code
| key | description |
|-----|-------------|
| `validity_time` | When a code is sent to the user, specify how long (in minutes) it is valid. |

#### random_code_mail
See [#random_code](#random_code)

#### bypass
| key | description |
|-----|-------------|
| `codes_number` | Specifies how many codes will be generated at a time. |

#### passcode_grid
| key | description |
|-----|-------------|
| `lines` | How many rows will the passcode_grid contain. |
| `cols` | How many columns will the passcode_grid contain. |
| `validity_time` | When the user is asked for a code (for example, `B2`), how many minutes they have to enter it. It also specifies how long the user must wait before they can request another code. (A legitimate user may request another set of coordinates if their card is poorly printed or slightly faded, whereas a hacker who has managed to obtain a code could keep requesting new coordinates repeatedly until they are asked for the code they obtained.) |

#### push
| key | description |
|-----|-------------|
| `serviceAccount` | See [README#get-google-cloud-serviceaccount](README.md#get-google-cloud-serviceaccount). |
| `validity_time` | How many minutes does the user have to confirm the notification? |
| `trustGcm_id` |  |
| `notification` | Enables notification sending. Otherwise (if `"notification": false`), only pending will work. |
| `pending` | Allows the user to confirm authentication by opening the app rather than clicking on the notification. (This is particularly useful if the user does not allow notifications from Esup Auth.) |
| `title` | The label displayed in the users' app. (Enter the name of the organization.)
| `body` | The text of the notification. |
| `text1` | First part of the authentication validation request text. |
| `text2` | Remaining part of the authentication validation request text, displayed only if the login request was successfully traced based on its IP address. |
| `nbMaxFails` | During initial set-up, Esup Auth app uses a 6-digit code (read from the QR code). `nbMaxFails` prevents a hacker from trying countless codes until they find the right one (and thus triggering the method instead of the legitimate user). |

#### esupnfc
See [https://www.esup-portail.org/wiki/spaces/esupotp/pages/1104871427/ESUP-OTP#ESUPOTP-AuthentificationvialescartesNFC](https://www.esup-portail.org/wiki/spaces/esupotp/pages/1104871427/ESUP-OTP#ESUPOTP-AuthentificationvialescartesNFC).

## mailer
| key | description |
|-----|-------------|
| `sender_mail` | Sender's email address. |
| `sender_name` | Sender's name. |
| `port` | SMTP server port. |
| `hostname` | SMTP server address. |
| `auth` | See [https://nodemailer.com/smtp#authentication](https://nodemailer.com/smtp#authentication). |
| `use_proxy` | if it is necessary to use the `proxyUrl` (configured above) to access the SMTP server. |
| `use_templates` | Generate emails from the [transports/email_templates/random_code_mail/html.eta](transports/email_templates/random_code_mail/html.eta) file. In older email clients, [properties/messages.json#transport.code.mail](properties/messages.json#L31-L34) will still be displayed. |
| `accept_self_signed_certificate` | Whether an SMTP server that uses a self-signed certificate is accepted. |

## sms
Define the API called by esup-otp-api to send SMS messages.<br />
In `url` and `body`, the substrings “\$phoneNumber\$” and “\$message\$” will be replaced with the corresponding values.

## Notify users by email when their accounts get updated
In [properties/esup.json](properties/esup.json):
- If it hasn't already been done, configure the `mailer`,
- Set `userChangesNotifier.enabled` to `true`.

### Determine which addresses to send the emails to
The [services/userChangesNotifier](services/userChangesNotifier) directory contains 3 different "providers":
- [getEmailAddressFromApi.js](services/userChangesNotifier/getEmailAddressFromApi.js)
- [getEmailAddressFromLDAP.js](services/userChangesNotifier/getEmailAddressFromLDAP.js)
- [getEmailAddressFromUser.js](services/userChangesNotifier/getEmailAddressFromUser.js)

To choose the one you want, configure `userChangeNotificationEmailAddressProvider` (in [properties/esup.json](properties/esup.json)) with a value from "getEmailAddressFromApi", "getEmailAddressFromLDAP", and "getEmailAddressFromUser".<br />
See below for the specific configuration of each provider.

Note that if the user already has an email address configured in [`userDb`](#userdb), this address will be added to the recipients. And if the notification concerns a change/deletion of an email address, the old address will also be added to the recipients.

#### getEmailAddressFrom**LDAP**
In [properties/esup.json](properties/esup.json):
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
By default, `"uri"`, `"adminDn"`, `"password"`, `"baseDn"`, `"timeout"`, and `"connectTimeout"` are those configured for `"ldap"` earlier in the [esup.json](properties/esup.json#L35-L43).<br />
By default, `"uidAttribute"` is set to `ldap.uid` (if configured in [esup.json](properties/esup.json#L35-L43)) or `"uid"` (otherwise).<br />
By default, `"mailAttributes"` is set to `["mail", "supannMailPerso"]`.

#### getEmailAddressFrom**Api**
In [properties/esup.json](properties/esup.json):
```json
    "userChangesNotifier": {
        "enabled": true,
        "EmailAddressProvider": "getEmailAddressFromApi"
    },
```
Then edit file [services/userChangesNotifier/getEmailAddressFromApi.js](services/userChangesNotifier/getEmailAddressFromApi.js) to call the API you want and return the email address(es). (Note that `query` corresponds to request query params. So in the example, it calls GET https://wsgroups.example.com/searchUserTrusted?id=toto&attrs=mail)

#### getEmailAddressFrom**User**
In [properties/esup.json](properties/esup.json):
```json
    "userChangesNotifier": {
        "enabled": true,
        "EmailAddressProvider": "getEmailAddressFromUser"
    },
```
Then edit file [services/userChangesNotifier/getEmailAddressFromUser.js](services/userChangesNotifier/getEmailAddressFromUser.js) to retrieve the email address in the way you want.

### Customize these emails
The "`mainContent`" is generated in [services/userChangesNotifier/emailMainContent.js](services/userChangesNotifier/emailMainContent.js).<br />
This mainContent will be injected into [services/userChangesNotifier/email_templates/userChangesNotifier](services/userChangesNotifier/email_templates/userChangesNotifier). In these files, you can customize the rest of the email (add logos, links, ...).

## Logs
esup-otp-api provides different log types, configured in [properties/esup.json](properties/esup.json).

Regardless of the log type, there are some common settings:
| key | description |
|-----|-------------|
| `console` | (Optional) log to console (default: `"console": false,`) |
| `file` | (Optional) Path to log file. |

### main
Generic logs are configured with the following key:
```json
"logs": {
    "main": {
        "level": "info",
        "console": false,
        "file": "logs/main.log"
    }
}
```
| key | description |
|-----|-------------|
| `level` | (Optional) logging level, in "error", "warn", "info", "http", "verbose", "debug", et "silly" (default: `"level": "info"`). |

If `logs.main` key is not defined, no generic message will be logged.

### access
Traffic logs, for HTTP queries, are configured with the following key:
```json
"logs": {
    "access": {
        "format": "dev",
        "console": false,
        "file": "logs/access.log"
    }
}
```
| key | description |
|-----|-------------|
| `format` | (Optional) logging format, see [*morgan pre-defined formats*](https://github.com/expressjs/morgan#predefined-formats) (default: `"format": "dev"`). |

If `logs.access` key is not defined, no traffic will be logged.

### audit
Logs of user method activation/deactivation
```json
"logs": {
    "audit": {
        "console": false,
        "file": "logs/audit.log"
    }
}
```
If `logs.audit` key is not defined, no audit message will be logged.

## trustedProxies
Like [Express](https://expressjs.com/en/guide/behind-proxies.html), esup-otp-api use [proxy-addr](https://www.npmjs.com/package/proxy-addr) to determine the source IP address of requests.<br/>
To determine the IP address, `proxy-addr` reads the `x-forwarded-for` header, ignoring the IPs configured in `trustedProxies` (the reverse proxy must be configured so that the x-forwarded-for header is properly set).<br />
In [properties/esup.json](properties/esup.json), configure the IPs of your reverse proxies.<br/>
For more information, see [Express behind proxies](https://expressjs.com/en/guide/behind-proxies.html) and [proxyaddr](https://github.com/jshttp/proxy-addr#proxyaddrreq-trust)<br/>
