var properties = require(__dirname + '/../../properties/properties');

exports.schema = {
    uid: {
        type: String,
        required: true,
        unique: true
    },
    random_code: {
        code: String,
        validity_time: Number,
        active: {
            type: Boolean,
            default: false
        },
        transports: {
            type: Array,
            default: properties.getEsupProperty('transports')
        }
    },
    bypass: {
        codes: {
            type: Array,
            default: []
        },
        used_codes: { type: Number, default: 0 },
        active: {
            type: Boolean,
            default: false
        },
        transports: {
            type: Array,
            default: properties.getEsupProperty('transports')
        }
    },
    totp: {
        secret: {
            type: Object,
            default: {}
        },
        window: Number,
        active: {
            type: Boolean,
            default: false
        },
        transports: {
            type: Array,
            default: properties.getEsupProperty('transports')
        }
    },
    push: {
        device: {
            platform: {
                type: String,
                default: null
            },
            gcm_id: {
                type: String,
                default: null
            },
            phone_number: {
                type: String,
                default: null
            }
        },
        activation_code:{
            type: String,
            default: null
        },
        active: {
            type: Boolean,
            default: false
        },
        transports: {
            type: Array,
            default: []
        }
    },
}
