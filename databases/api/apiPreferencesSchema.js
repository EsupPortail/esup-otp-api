var properties = require(__dirname + '/../../properties/properties');

exports.schema = {
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
    }  
}
