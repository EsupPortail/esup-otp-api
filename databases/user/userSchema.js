import { Schema } from 'mongoose';

import { attributes } from './userUtils.js';

const schema = Object.fromEntries(
    Object.values(attributes)
        .map(attr => [attr, String])
);

schema.uid = {
    type: String,
    required: true,
    unique: true,
};

const UserSchema = new Schema(schema);

export default UserSchema;
