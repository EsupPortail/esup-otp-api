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
- `format`: logging format,  see https://github.com/expressjs/morgan#predefined-formats for details (default: 'dev')
- `console`: log to console (true/false, default to false)
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
