import { Schema } from 'mongoose';

const schema = {
    id: {
        type: String,
        required: true,
        unique: true,
        auto: true
    },
    name: {
        type: String,
        required: true,
        unique: true,
    },
    webauthn: {
        type: Object,
        "#how_to_relying_party": "The 'id' is a domain, identifying the 'server', the party that manages the authentication. It's value is important, unlike the name, which is just a displayable string.",
        relying_party: {
            type: Object,
            
            name: {
                type: String   
            },
            id: {
                type: String   
            }
        },
        "#how_to_allowed_origins": "List of subdomains where webauthn can be used. Keep in mind it can't be multiple different domains.",
        allowed_origins: {
            type: Array
        }
    },
    api_password: {
        type: String,
        required: true   
    },
    users_secret: {
        type: String,
        required: true   
    }
}    

const TenantSchema = new Schema(schema);

export default TenantSchema;