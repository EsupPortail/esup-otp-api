import { request } from 'undici';

/**
 * @returns { Promise <? String | String[] > }
 */
export async function getEmailAddress(user) {
    // API example : https://github.com/UnivParis1/wsgroups
    const { body } = await request("https://wsgroups.example.com/searchUserTrusted", {
        method: "GET",
        query: {
            id: user.uid,
            attrs: "mail",
        },
        headers: {
            "Content-Type": "application/json",
        },
    });
    const json = await body.json();
    return json[0]?.mail;
}
