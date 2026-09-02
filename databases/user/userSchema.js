import { Schema } from 'mongoose';

/**
 * @param {import('../../services/userDb/UserDbAttributes.ts').UserDbAttributesDefinition} attributes 
 */
export default function generateMongooseUserSchema(attributes) {
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
