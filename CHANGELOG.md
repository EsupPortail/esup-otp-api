# Changelog

## v2.3.0 (2026-04-15) ([release](https://github.com/EsupPortail/esup-otp-api/releases/tag/v2.3.0))
### Breaking changes
- Use `x-forwarded-for` header (instead of `x-real-ip` previously) to determine the IP address (and thus the city to display) in push notifications [2d06e5d](https://github.com/EsupPortail/esup-otp-api/commit/2d06e5dc2035c57ef7f7d779899ca4d67b11fc3f)<br />
If you haven't already, **be sure to configure [`trustedProxies`](properties/esup.json#L195)** (see [CONFIGURATION.md](CONFIGURATION.md#trustedproxies))
- Some refactor<br />
**Requires running `npm install`**

### Added
- Enable DeepLink [5e79cfb](https://github.com/EsupPortail/esup-otp-api/commit/5e79cfbe8c495732f79f96e7c66dc9114290172c), [343c6e8](https://github.com/EsupPortail/esup-otp-api/commit/343c6e891da8ff91e774190120e0a1730aa96fec)<br />
This feature requires esup-otp-manager >= v2.0.1 (esup-otp-api remains compatible with previous versions of esup-otp-manager; deep links will just not be displayed).

### [login.js](public/login.js) (Does not affect esup-otp-cas for Apereo CAS <= 7.2)
#### Fixed
- Prevent double form submit on Chromium based browsers [9774ffd](https://github.com/EsupPortail/esup-otp-api/commit/9774ffd3508f7217a8e4d973ab9f35f2038cf405)

#### Added
- If no method is enabled, use `window.open` to open esup-otp-manager [0e70047](https://github.com/EsupPortail/esup-otp-api/commit/0e700472a42d90460c159ed87f02f1f0bc3a3fd4)<br />
Once the user has enabled a method, esup-otp-manager will display a button to return to the MFA login page ([esup-otp-manager@5177975](https://github.com/EsupPortail/esup-otp-manager/commit/5177975fb8e8214ec8b516651b83a85068dcc7da))
- Suggest activating a stronger method [d3edf01](https://github.com/EsupPortail/esup-otp-api/commit/d3edf01c80f8895cb0ae1b909d9c5f4602967dde)<br />
If the user has activated only "weak" methods, display a message encouraging them to activate a "stronger" method.<br />
By default, this applies only to users who have only single-use backup codes.<br />
To apply this to other methods: edit `methodsRequiringExplicitChoice` in [login.js](public/login.js#L741)<br />
To customize the displayed message: edit `activateMoreMethods_html` ([In French](public/login.js#L65) and [in English](public/login.js#L115))

## v2.2.3 (2026-03-19) ([release](https://github.com/EsupPortail/esup-otp-api/releases/tag/v2.2.3))
- cleanup unused routes [7b85e57](https://github.com/EsupPortail/esup-otp-api/commit/7b85e57)

## v2.2.2 (2026-03-19) ([release](https://github.com/EsupPortail/esup-otp-api/releases/tag/v2.2.2))
- feat: Notify users by email when their accounts get updated (require "npm install") [b3d44da](https://github.com/EsupPortail/esup-otp-api/commit/b3d44da) (default: disabled, see [CONFIGURATION.md](CONFIGURATION.md#notify-users-by-email-when-their-accounts-get-updated) for more details)
- chore(deps): update dependencies (**requires "npm install"**)

- login.js (changes only affecting esup-otp-cas >= 7.3, esup-otp-cas-server, and esup-otp-shibboleth):
  - feat: Display method list rather than last used method when it is single-use backup codes #77 [fc60876](https://github.com/EsupPortail/esup-otp-api/commit/fc60876)
  - feat: show the user the last method they validated on their device #77 [aa339b9](https://github.com/EsupPortail/esup-otp-api/commit/aa339b9)
  - feat: differentiate between TOTP and single-use backup codes [581ebf0](https://github.com/EsupPortail/esup-otp-api/commit/581ebf0)

- various improvements (Full Changelog: https://github.com/EsupPortail/esup-otp-api/compare/v2.2.1...v2.2.2 )

## v2.2.1 (2026-01-22) ([release](https://github.com/EsupPortail/esup-otp-api/releases/tag/v2.2.1))
- chore: update dependencies (**requires "npm install"**)
- various improvements (Full Changelog: https://github.com/EsupPortail/esup-otp-api/compare/v2.2.0...v2.2.1 )

## v2.2.0 (2025-11-07) ([release](https://github.com/EsupPortail/esup-otp-api/releases/tag/v2.2.0))
- upgrade login.js to an ESM module<br />
Breaking esup-otp-cas v2.1.0-cas_v7.3.x (Please use esup-otp-cas v2.2.0-cas_v7.3.x if you are on Apereo CAS 7.3)
- chore: update dependencies (**requires "npm install"**)

## v2.1.0 (2025-10-09) ([release](https://github.com/EsupPortail/esup-otp-api/releases/tag/v2.1.0))
- Centralize the common code from [esup-otp-cas](https://github.com/EsupPortail/esup-otp-cas), [esup-otp-cas-server](https://github.com/EsupPortail/esup-otp-cas-server), and [esup-otp-shibboleth](https://github.com/Renater/esup-otp-shibboleth/) in [esup-otp-api](https://github.com/EsupPortail/esup-otp-api/tree/master/public). (The corresponding commits of esup-otp-api are prefixed with `[login.js]`)
- chore: update dependencies (requires "npm install")

## v2.0.2 (2025-09-26) ([release](https://github.com/EsupPortail/esup-otp-api/releases/tag/v2.0.2))
- fix: undefined esupnfc.active [55c2119](https://github.com/EsupPortail/esup-otp-api/commit/55c2119f34274f208fa68271e770811932eacdf6)<br />
(which could cause errors on esup-otp-cas)

## v2.0.1 (2025-09-23) ([release](https://github.com/EsupPortail/esup-otp-api/releases/tag/v2.0.1))
- fix `get_uids()` (used by [./update_active_state_for_all_users.js](https://github.com/EsupPortail/esup-otp-api/blob/master/update_active_state_for_all_users.js) script)

## v2.0.0 (2025-09-22) ([release](https://github.com/EsupPortail/esup-otp-api/releases/tag/v2.0.0))
- feat: dynamic grid method (require esup-otp-manager >= v2.0.0) by @floriannari [3a3ba5f](https://github.com/EsupPortail/esup-otp-api/commit/3a3ba5f17e6bf54d59117e7e44355a6c66aecf8c)
- feat: simplify the use of esupnfc (thanks to Esup Auth V2) [549507f](https://github.com/EsupPortail/esup-otp-api/commit/549507fdf7a5e345a116876e9a7c5bdab3be5393) [0cc9046](https://github.com/EsupPortail/esup-otp-api/commit/0cc9046bfe6d70a65698d712d35d7e7ed1f70722) (require esupnfc.server_infos in esup.json)
- Adaptations for Esup Auth V2 by @floriannari [33c3cee](https://github.com/EsupPortail/esup-otp-api/commit/33c3cee7c54ae8a2269988b2ed87047d88561539) [ae5b893](https://github.com/EsupPortail/esup-otp-api/commit/ae5b8931793f592c59d30cb3f84a338dc2520d7b)
- feat: statistics by @vbonamy [1172b10](https://github.com/EsupPortail/esup-otp-api/commit/1172b10ca773c985ff0ede31bf717edaf2094144) [1a91876](https://github.com/EsupPortail/esup-otp-api/commit/1a9187677b82f6caee9f1982d0e21a7002933b28) (Please run the script [./update_active_state_for_all_users.js](https://github.com/EsupPortail/esup-otp-api/blob/master/update_active_state_for_all_users.js) at least once to improve the statistics reliability.)
- improve logs by @guillomovitch **breaking change** logs are no longer configured in logs/logs.json, but in [properties/esup.json](https://github.com/EsupPortail/esup-otp-api/blob/v2.0.0/properties/esup.json#L175) [e8d9bc8](https://github.com/EsupPortail/esup-otp-api/commit/e8d9bc871a579650fba8c79a97b85a61fc04a1ad)
- add trustedProxies configuration by @floriannari [8ea378c](https://github.com/EsupPortail/esup-otp-api/commit/8ea378c68f6ec38f4955109910f093698f77c880) [0972deb](https://github.com/EsupPortail/esup-otp-api/commit/0972deb39bc5eedbdececc9473301bbfddc4a1b2)
- improve CONF by @floriannari [cf0409a](https://github.com/EsupPortail/esup-otp-api/commit/cf0409aeb4cdc90b076598d28854a63af01de487) [b0e10f4](https://github.com/EsupPortail/esup-otp-api/commit/b0e10f4ff5fbc51d96043a3cbb6249e2f7410244)
- limit SMS spam by @floriannari [b21114c](https://github.com/EsupPortail/esup-otp-api/commit/b21114caf69be6e2196108ff5643be91b67c8aa2)
- feat: initialize ip-location-api asynchronously by @floriannari [7bb771e](https://github.com/EsupPortail/esup-otp-api/commit/7bb771e9ba73d861d6f00817ff875025f473e2c0)
- chore: update dependencies (requires "npm install") by @floriannari
- Follow "auto_create_user" configuration setting for all userDb (breaking change for ldap and mysql) [c68cd65](https://github.com/EsupPortail/esup-otp-api/commit/c68cd65298d71a63b8b056da0af759cb5050d8f9)

**Full Changelog**: https://github.com/EsupPortail/esup-otp-api/compare/v1.7.3...v2.0.0

## v1.7.3 (2024-12-04) ([release](https://github.com/EsupPortail/esup-otp-api/releases/tag/v1.7.3))
- stop disabling push if bad gcm_id [d593b90](https://github.com/EsupPortail/esup-otp-api/commit/d593b90a132b47ff61feb76a0677750932420c26)
