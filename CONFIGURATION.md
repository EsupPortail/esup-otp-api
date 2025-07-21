# esup-otp-api

## Logging

esup-otp-api provides different log types, configured in the main 'esup.jon'
configuration file. Usage of 'logs/logs.json' file is deprecated.

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
- `level`: logging level
- `console`: log to console (true/false, default to false)
- `file`: log to given file

If `logs.main` key is not defined, no generic message will be logged.

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
