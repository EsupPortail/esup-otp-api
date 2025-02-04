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

export default UserSchema;