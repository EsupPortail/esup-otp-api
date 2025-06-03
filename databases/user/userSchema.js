import { Schema } from 'mongoose';

const schema = {
    uid: {
        type: String,
        required: true,
        unique: true
    },
    mobile: String,
    mail: String
}

const UserSchema = new Schema(schema);

export default UserSchema;
