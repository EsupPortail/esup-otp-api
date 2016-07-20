var properties = require(__dirname + '/../../properties/properties');

exports.schema = {
    "totp": {
        "activate": {
            type: Boolean,
        },
        "sms_window": {
            type: Number,
        },
        "mail_window": {
            type: Number,
        },
        "app_window": {
            type: Number,
        },
        "default_window": {
            type: Number,
        },
        "transports": {
            type: Array,
        }
    },
    "random_code": {
        "activate": {
            type: Boolean,
        },
        "sms_validity": {
            type: Number,
        },
        "mail_validity": {
            type: Number,
        },
        "code_type": {
            type: String,
        },
        "code_length": {
            type: Number,
        },
        "transports": {
            type: Array,
        }
    },
    "bypass": {
        "activate": {
            type: Boolean,
        },
        "codes_number": {
            type: Number,
        },
        "code_type": {
            type: String,
        },
        "code_length": {
            type: Number,
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
    }
}
