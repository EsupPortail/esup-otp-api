# Multi-tenants support

## Objectives

Multi-tenants support in esup-otp-api allows to support multiple set of users
in a single instance, each one related to a single organization. Each of these
tenant will have distincts secrets (for user settings and user authentication),
and use distinct set of parameters, allowing a minimal level of isolation and
personalisation.

## Requirements

The user identifier must match the id@scope format, with scope being a suffix
unique to a single tenant. Email address and SAML attribute
eduPersonPrincipalName, for instance, both qualify as valid identifier for this
purpose.

## Configuration

Each tenant must be defined using the following syntax in the configuration file:
```
"tenants": [
    {
        "name": "univ.fr",
        "scopes": [ "univ.fr", "students.univ.fr" ],
        "webauthn": {
            "relying_party": {
                "name": "Univ",
                "id": "univ.fr"
            },
            "allowed_origins": ["https://cas.univ.fr", "https://esup-otp-manager.univ.fr"]
        }
    }
]
```

Each object has the following keys:
- `name` is an arbitrary string, used as tenant identifier
- `scopes` is a list of valid scopes for this tenant
- `webauthn` is an object used to configure WebAuthn authentication for this tenant
- `api_password` may be defined, but will be automatically generated at startup
  when initializing tenant if missing
- `users_secret` may be defined, but will be automatically generated at startup
  when initializing tenant if missing

## Behavior change

If any tenant is defined in configuration, access to the following routes is modified:
- access to administrative routes (ie, routes with /admin prefix) requires
  global API password
- access to protected routes (ie, routes with /protected prefix)
  requires a way to identify the relevant tenant, either via X-Tenant header or
  user identifier parameter, and tenant-specific API password
- access to authentication routes (ie, routes with /user or /esupnfc prefix)
  requires user identifier, and tenant-specific users secret

The global `api_password` will only be used to retrieve tenant-specific
secrets, and global `webauthn` and `users_secret` parameters will be ignored.
