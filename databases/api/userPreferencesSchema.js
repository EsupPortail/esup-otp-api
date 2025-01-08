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
        generation_date: Number,
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
    passcode_grid: {
        grid: {
            type: [[String]],
            default: null
        },
        generation_date: Number,
        validity_time: Number,
        challenge: [Number, Number],
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
            type: Number,
            default: 0
        },
        active: {
            type: Boolean,
            default: false
        },
        gcm_id_not_registered: {
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
        text: String,
        lt:{
            type: String,
            default: null
            },
    },
    esupnfc: {
        code : String,
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
    webauthn: {
        active: {
            type: Boolean,
            default: false
        },
        transports: {
            type: Array,
            default: properties.getEsupProperty('transports')
        },
        registration: {
            nonce: {
              type: String,
              default: null,
            },
            nonce_date: {
              type: Number,
              default: null
            },
            logged_in_otp: {
              type: String,
              default: null,
            },
            logged_in_otp_validity_time: Number,
        },
        authenticators: {
          type: [{
            credentialID: String,
            credentialPublicKey: String,
            counter: {
              type: Number,
              default: 0,
            },
            name: {
              type: String,
              default: "Authenticator",
            },
          }],
          default: []
        }
    },
    last_send_message: { 
        method: { type: String },
        time: { type: Number }, 
        auto: { type: Boolean },
        verified: { type: Boolean },
    },
}
