export const schema = {
    "totp": {
        "activate": {
            type: Boolean,
        },
        "transports": {
            type: Array,
        }
    },
    "random_code": {
        "activate": {
            type: Boolean,
        },
        "transports": {
            type: Array,
        default: ["sms"]
        }
    },
   "random_code_mail": {
        "activate": {
            type: Boolean,
        },
        "transports": {
            type: Array,
            default: ["mail"]
        }
    },
    "bypass": {
        "activate": {
            type: Boolean,
        },
        "transports": {
            type: Array,
        }
    },
    "passcode_grid": {
        "activate": {
            type: Boolean,
        },
        "transports": {
            type: Array,
        }
    },
    "push": {
        "activate": {
            type: Boolean,
        },
        "transports": {
            type: Array,
        }
    },
    "esupnfc": {
        "activate": {
            type: Boolean,
        },
        "transports": {
            type: Array,
        }
    },
    "webauthn": {
        "activate": {
            type: Boolean,
        },
        "transports": {
            type: Array,
        }
    }
}
