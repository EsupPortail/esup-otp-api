import { Schema } from 'mongoose';

const schema = {
    uid: {
        type: String,
        required: true,
        unique: true
    },
    tenant: {
        type: String,
    },
    mobile: String,
    mail: String
}

const UserSchema = new Schema(schema);
UserSchema.index({uid: 1, tenant: 1}, {name: "uid_tenant_index", unique: true});

export default UserSchema;