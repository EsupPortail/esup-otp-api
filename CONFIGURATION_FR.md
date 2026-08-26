# esup-otp-api
## esup.json
| clé | description | exemple |
|-----|-------------|---------|
| `casVhost` | URI de la page d’authentification (via CORS, esup-otp-api bloque les WebSocket ne provenant pas de la page d’authentification). | `"cas.univ.fr"` |
| `otherHosts` | (Optionnel) Si `casVhost` ne suffit pas (par exemple si plusieurs serveur CAS de test utilisent la même instance d’esup-otp-api). | `["https://cas2.univ.fr"]` |
| `proxyUrl` | (Optionnel) Si défini, l’API utilisera ce proxy. Suivant votre configuration réseau, cela peut être nécessaire pour l’envoi des SMS, emails, et notifications push. | `"http://username:password@univ.fr:3127"` |
| `api_password` | Permet de sécuriser les requêtes provenant d’esup-otp-manager et du serveur CAS (le même `api_password` doit être configuré côté esup-otp-api, esup-otp-manager, et esup-otp-cas). | `"1t1J8xF0nphdAOSRGudoTz97AeIQS4Xw"` |
| `users_secret` | Permet de sécuriser les requêtes provenant de la page d’authentification (le même `users_secret` doit être configuré côté esup-otp-api, et esup-otp-cas). | `"1t1J8xF0nphdAOSRGudoTz97AeIQS4Xw"` |
| `apiDb` | Voir [#apiDb](#apidb).  | `"mongodb"` |
| `userDb` | Voir [#userDb](#userdb).  | `"mongodb"` |
| `auto_create_user` | (Optionnel) Créer automatiquement l’utilisateur s’il n’existe pas déjà dans la userDb. | `true` |
| `webauthn` | (Optionnel) Voir [#WebAuthn](#webauthn). |  |
| `tenants` | (Optionnel) Voir [Multi-tenants.md](Multi-tenants.md). |  |
| `mongodb` | Voir [#Base-de-données](#base-de-données). |  |
| `ldap` | (Optionnel) Voir [#Base-de-données](#base-de-données). |  |
| `mysql` | (Optionnel) Voir [#Base-de-données](#base-de-données). |  |
| `methods` | Voir [#methods](#methods). |  |
| `transports` | Ne pas modifier. |  |
| `mailer` | Voir [#mailer](#mailer). |  |
| `sms` | Voir [#sms](#sms). |  |
| `esupnfc.server_ip` | (Optionnel) L’adresse IP du serveur esup-nfc-tag-server (pour n’accepter que les requêtes esupnfc provenant de ce serveur). | `"194.167.248.50"` |
| `userChangesNotifier` | (Optionnel) Voir [#Notifier les utilisateurs par email quand leurs paramètres sont modifiés](#notifier-les-utilisateurs-par-email-quand-leurs-paramètres-sont-modifiés) |  |
| `logs` | Voir [#logs](#logs). |  |
| `trustedProxies` | Voir [#trustedProxies](#trustedproxies). |  |

## Base de données
La base de données d’esup-otp-api se divise en 2 : l’[`apiDb`](#apidb) et l’[`userDb`](#userdb).

### apiDb
L’`apiDb` contient les données relatives aux méthodes d’authentification des utilisateurs (état d’activation, secrets, codes à usage unique ...).<br />
Celles-ci sont stockées dans une base mongodb. (Donc laissez `"apiDb": "mongodb"`.)

### userDb
L’`userDb` contient l’adresse email et le numéro de téléphone de l’utilisateur. Ceux-ci sont utilisés pour l’envoi des codes à usage unique. L’`userDb` contient aussi le `displayName`, utilisé pour faciliter la recherche des utilisateurs par les managers.<br />
L’`userDb` peut-être la même DB `mongodb` que l’`apiDb`, ou bien un serveur `ldap` ou une DB `mysql`. Permettant ainsi d’utiliser les données (`pagerTelephoneNumber`, `supannMailPerso`, `displayName`) déjà enregistrées.<br />
Pour cela :
1. Dans `userDb`, définir le type de DB à utiliser. Par exemple `"userDb": "ldap",`.
2. Dans l’entrée correspondante, définir le nom de l’attribut dans la DB.<br />
Par exemple :
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
| clé | description |
|-----|-------------|
| `relying_party.id` | Voir [https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#id_2](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#id_2). |
| `relying_party.name` | Voir [https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#name](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#name). |
| `allowed_origins` | Liste des sous-domaines (de `relying_party.id`) sur lesquels WebAuthn peut être utilisé. |

## methods
### Paramètres communs à toutes les méthodes
| clé | description |
|-----|-------------|
| `activate` | Si la méthode est activée. Lors du premier démarrage, ce paramètre est lu en BDD, donc modifier le fichier n’aura plus d’impact. Pour modifier l’état d’activation, passer par esup-otp-manager, en vue "Administrateur". |
| `priority` | Défini l’ordre d’affichage de la méthode. (Le plus élevé sera affiché en premier.) |
| `transports` | Ne pas modifier. |

### Paramètres utilisés plusieurs méthodes
| clé | description |
|-----|-------------|
| `code_type` | Ne pas modifier. |
| `code_length` | Ne pas modifier. |

### Paramètres spécifiques aux méthodes
#### totp
| clé | description |
|-----|-------------|
| `autoActivateWithPush` | Si l’utilisateur active les notifications alors qu’il n’a pas déjà activé TOTP, TOTP sera automatiquement activé et configuré dans son Application Esup Auth. |
| `name` | Le libellé associé au code TOTP, affiché dans l’application des utilisateurs. (Mettre le nom de l’établissement.) |

#### random_code
| clé | description |
|-----|-------------|
| `validity_time` | Quand un code est envoyé à l’utilisateur, spécifie pendant combien de minutes il est utilisable. |

#### random_code_mail
Voir [#random_code](#random_code)

#### bypass
| clé | description |
|-----|-------------|
| `codes_number` | Combien de codes seront générés à la fois. |

#### passcode_grid
| clé | description |
|-----|-------------|
| `lines` | Combien de lignes contient la grille. |
| `cols` | Combien de colonnes contient la grille. |
| `validity_time` | Quand on demande un code à l’utilisateur (par exemple `B2`), combien de minutes il a pour le renseigner. Définie aussi au bout de combien de temps l’utilisateur peut demander une autre coordonnée. (Un utilisateur légitime peut demander une autre coordonnée si sa carte est mal imprimée ou un peu effacée, alors qu’un pirate qui aurait réussi à avoir un code peut redemander des coordonnées en boucle jusqu’à ce qu’on lui demande le code qu’il a réussi à obtenir.) |

#### push
| clé | description |
|-----|-------------|
| `serviceAccount` | Voir [README#get-google-cloud-serviceaccount](README.md#get-google-cloud-serviceaccount). |
| `validity_time` | Combien l’utilisateur a de minutes pour valider la notification. |
| `trustGcm_id` |  |
| `notification` | Active l’envoi de notification. Sinon (si `"notification": false`) seul le pending fonctionnera. |
| `pending` | Permet à l’utilisateur de valider l’authentification en ouvrant l’application plutôt qu’en cliquant sur la notification. (Utile notamment si l’utilisateur n’autorise pas les notifications provenant d’Esup Auth.) |
| `title` | Le libellé affiché dans l’application des utilisateurs. (Mettre le nom de l’établissement.) |
| `body` | Le texte de la notification. |
| `text1` | Première partie du texte de demande de validation de l’authentification. |
| `text2` | Suite du texte de demande de validation de l’authentification, affiché uniquement si on a réussi à localiser la demande de connexion à partir de son IP. |
| `nbMaxFails` | Lors de l’enrôlement initial, l’application utilise un code à 6 chiffres (récupéré depuis le qrcode). `nbMaxFails` permet d’éviter qu’un pirate puisse essayer pleins de codes jusqu’à trouver le bon (et ainsi activer la méthode à la place de l’utilisateur légitime). |

#### esupnfc
Voir [https://www.esup-portail.org/wiki/spaces/esupotp/pages/1104871427/ESUP-OTP#ESUPOTP-AuthentificationvialescartesNFC](https://www.esup-portail.org/wiki/spaces/esupotp/pages/1104871427/ESUP-OTP#ESUPOTP-AuthentificationvialescartesNFC).

## mailer
| clé | description |
|-----|-------------|
| `sender_mail` | Adresse email de l’expéditeur. |
| `sender_name` | Nom de l’expéditeur. |
| `port` | Port du serveur SMTP. |
| `hostname` | Adresse du serveur SMTP. |
| `auth` | Voir [https://nodemailer.com/smtp#authentication](https://nodemailer.com/smtp#authentication). |
| `use_proxy` | S’il faut passer par le `proxyUrl` configuré plus haut pour accéder au serveur SMTP. |
| `use_templates` | Générer les emails à partie du fichier [transports/email_templates/random_code_mail/html.eta](transports/email_templates/random_code_mail/html.eta). Sur les anciens clients mail, [properties/messages.json#transport.code.mail](properties/messages.json#L31-L34) sera toujours affiché. |
| `accept_self_signed_certificate` | Si on accepte un serveur SMTP utilisant un certificat autosigné. |

## sms
Défini l’API appelée pour envoyer les SMS.<br />
Dans `url` et `body`, "\$phoneNumber\$" et "\$message\$" seront remplacés par la valeur correspondante.<br />
(Le `body` peut-être une String, dans ce cas les variables (`phoneNumber` et `message`) seront urlEncodés. Le `body` peut aussi être directement un JSON, dans ce cas les variables seront escapés/encodés au format JSON.)

## Notifier les utilisateurs par email quand leurs paramètres sont modifiés
Dans [properties/esup.json](properties/esup.json) :
- Si ce n’est pas déjà fait, configurer le `mailer`,
- Définir `userChangesNotifier.enabled` à `true`.

### Déterminer à quelles adresses les emails seront envoyés
Le dossier [services/userChangesNotifier](services/userChangesNotifier) contient 3 différents "providers" :
- [getEmailAddressFromApi.js](services/userChangesNotifier/getEmailAddressFromApi.js)
- [getEmailAddressFromLDAP.js](services/userChangesNotifier/getEmailAddressFromLDAP.js)
- [getEmailAddressFromUser.js](services/userChangesNotifier/getEmailAddressFromUser.js)

Pour choisir le provider utilisé par votre instance, configurer `userChangeNotificationEmailAddressProvider` (in [properties/esup.json](properties/esup.json)) avec une valeur parmi `"getEmailAddressFromApi"`, `"getEmailAddressFromLDAP"`, and `"getEmailAddressFromUser"`.<br />
Voir ci-dessous pour la configuration spécifique à chaque provider.

À noter que si l’utilisateur à déjà d’une adresse e-mail configurée dans la [`userDb`](#userdb), celle-ci sera ajoutée à la liste des destinataires. Idem si la notification concerne la modification ou la suppression d’une adresse e-mail, l’ancienne adresse sera également ajoutée à la liste des destinataires.

#### getEmailAddressFrom**LDAP**
Dans [properties/esup.json](properties/esup.json) :
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
Par défaut, `"uri"`, `"adminDn"`, `"password"`, `"baseDn"`, `"timeout"`, and `"connectTimeout"` sont ceux configuré pour `"ldap"` plus haut dans [esup.json](properties/esup.json#L35-L43).<br />
Par défaut, `"uidAttribute"` vaut `ldap.uid` (si défini dans [esup.json](properties/esup.json#L35-L43)) ou `"uid"` (sinon).<br />
Par défaut, `"mailAttributes"` vaut `["mail", "supannMailPerso"]`.

#### getEmailAddressFrom**Api**
Dans [properties/esup.json](properties/esup.json) :
```json
    "userChangesNotifier": {
        "enabled": true,
        "EmailAddressProvider": "getEmailAddressFromApi"
    },
```
Puis modifier le fichier [services/userChangesNotifier/getEmailAddressFromApi.js](services/userChangesNotifier/getEmailAddressFromApi.js) pour appeler l’API souhaitée, et retourner la/les adresse(s) email(s). (À noter que `query` correspond aux *query params* de la requête. Donc dans cet exemple ça appelle GET https://wsgroups.example.com/searchUserTrusted?id=toto&attrs=mail)

#### getEmailAddressFrom**User**
Dans [properties/esup.json](properties/esup.json) :
```json
    "userChangesNotifier": {
        "enabled": true,
        "EmailAddressProvider": "getEmailAddressFromUser"
    },
```
Puis modifier le fichier [services/userChangesNotifier/getEmailAddressFromUser.js](services/userChangesNotifier/getEmailAddressFromUser.js) pour renvoyer l’adresse email que vous souhaitez.

### Personnaliser les emails envoyés
Le texte principal (`mainContent`) est généré dans [services/userChangesNotifier/emailMainContent.js](services/userChangesNotifier/emailMainContent.js).<br />
Ce texte est ensuite injecté dans [services/userChangesNotifier/email_templates/userChangesNotifier](services/userChangesNotifier/email_templates/userChangesNotifier). Dans ces fichiers, vous pouvez personnaliser le reste de l’email (ajouter des logos, des liens, ...).

## Logs
esup-otp-api fourni plusieurs types de logs, configurés dans le fichier [properties/esup.json](properties/esup.json).

Quel que soit le type de logs, il y a des paramètres communs :
| clé | description |
|-----|-------------|
| `console` | (Optionnel) Si les logs sont aussi affichés dans la console (par défaut, `"console": false,`) |
| `file` | (Optionnel) Chemin vers le fichier de logs. |

### main
Les logs généraux.
```json
"logs": {
    "main": {
        "level": "info",
        "console": false,
        "file": "logs/main.log"
    }
}
```
| clé | description |
|-----|-------------|
| `level` | (Optionnel) Le niveau de logs, parmi "error", "warn", "info", "http", "verbose", "debug", et "silly" (par défaut, `"level": "info"`). |

Si `logs.main` n’est pas défini, les logs généraux ne seront pas loggés.

### access
Logs réseaux, pour logger les requêtes HTTP.
```json
"logs": {
    "access": {
        "format": "dev",
        "console": false,
        "file": "logs/access.log"
    }
}
```
| clé | description |
|-----|-------------|
| `format` | (Optionnel) Le format des logs réseau, voir [*morgan pre-defined formats*](https://github.com/expressjs/morgan#predefined-formats) (par défaut, `"format": "dev"`). |

Si `logs.access` n’est pas défini, les logs HTTP ne seront pas loggés par esup-otp-api.

### audit
Logs des activations/désactivation des méthodes utilisateurs.
```json
"logs": {
    "audit": {
        "console": false,
        "file": "logs/audit.log"
    }
}
```
Si `logs.audit` n’est pas défini, ces logs ne seront pas loggés par esup-otp-api.

## trustedProxies
Comme [Express](https://expressjs.com/en/guide/behind-proxies.html), esup-otp-api utilise [`proxy-addr`](https://www.npmjs.com/package/proxy-addr) pour déterminer l’adresse IP source des requêtes en ignorant les reverse proxy.<br/>
Pour déterminer l’adresse IP, `proxy-addr` lit le header `x-forwarded-for`, en ignorant les adresses configurées dans `trustedProxies` (le proxy doit être configuré pour que le header `x-forwarded-for` soit bien renseigné).<br />
Dans [properties/esup.json](properties/esup.json), configurer les adresses de vos reverse proxies.<br/>
Pour plus d’informations, lire [Express behind proxies](https://expressjs.com/en/guide/behind-proxies.html) et [proxyaddr](https://github.com/jshttp/proxy-addr#proxyaddrreq-trust).
