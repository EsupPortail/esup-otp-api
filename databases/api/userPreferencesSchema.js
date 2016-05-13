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
            default: global.properties.esup.transports
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
            default: global.properties.esup.transports
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
            default: global.properties.esup.transports
        }
    },
}
