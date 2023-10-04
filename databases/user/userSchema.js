export const schema = {
    uid: {
        type: String,
        required: true,
        unique: true
    },
    mobile: String,
    mail: String
}