import * as properties from '../../properties/properties.js';

export const schema = {
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
    random_code_mail: {
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
            manufacturer: {
                type: String,
                default: null
            },
            model: {
                type: String,
                default: null
            }
        },
        activation_code:{
            type: String,
            default: null
        },
        activation_fail:{
            type: String,
            default: null
        },
        active: {
            type: Boolean,
            default: false
        },
        transports: {
            type: Array,
            default: properties.getEsupProperty('transports')
        },
        token_secret:{
            type: String,
            default: null
            },
        code : String,
        validity_time: Number,
        lt:{
            type: String,
            default: null
            },
    },
    esupnfc: {
        code : String,
        active: {
            type: Boolean,
            default: false
        },
        transports: {
            type: Array,
            default: properties.getEsupProperty('transports')
        }
    },
    last_send_message: { 
        method: { type: String },
        time: { type: Number }, 
        auto: { type: Boolean },
        verified: { type: Boolean },
    },
}
