import { Schema } from 'mongoose';

import { type UserDbAttributesDefinition } from '../../services/userDb/UserDbAttributes.ts';

export default function generateMongooseUserSchema(attributes: UserDbAttributesDefinition): Schema {
    const schema = Object.fromEntries(
        Object.values(attributes)
            .map(attr => [attr, String])
    );

    schema[attributes.uid] = {
        type: String,
        required: true,
        unique: true,
    };

    return new Schema(schema);
}
