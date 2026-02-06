/**
 * @param {*} user 
 * @returns { Promise <? String | String[] > }
 */
export async function getEmailAddress(user) {
    return `${user.uid}@example.org`;
}
