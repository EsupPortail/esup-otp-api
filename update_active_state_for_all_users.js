#!/usr/bin/env node

/**
 *  This script only needs to be run once.
 *  It is used to update the "active" and "internally_activated" states of users who have not been read by the API since the upgrade to 2.0. ( https://github.com/EsupPortail/esup-otp-api/commit/7dcfec4b0da25f93049686236d65d1f6df9bdde0 )
 *  
 *  This is not at all mandatory, but it does make the statistics more reliable ( https://github.com/EsupPortail/esup-otp-api/pull/55 https://github.com/EsupPortail/esup-otp-manager/pull/60 )
 */

import { request } from 'undici';
import * as properties from './properties/properties.js';

const api_password = properties.getEsupProperty('api_password');
const port = process.argv[2] || process.env.PORT || 3000;
const url = `http://localhost:${port}`;

/**
 * @import { Dispatcher } from 'undici'
 * @type { Dispatcher.DispatchOptions }
 */
const dispatchOptions = {
    headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + api_password,
    }
};

/**
 * @returns {Promise<String[]>}
 */
async function getUids() {
    try {
        const response = await request(`${url}/protected/users/`, dispatchOptions);

        const json = await response.body.json();
        return json.uids;
    }
    catch (error) {
        console.error("Please specify the API port as an argument to this script. For example: `node ./update_active_state_for_all_users.js 8080`.");
        throw error;
    }
}

const uids = await getUids();
let count = 0;
for (const uid of uids) {
    try {
        await request(`${url}/protected/users/${uid}`, dispatchOptions);
        count++;
    } catch (error) {
        console.error(error);
    }
}

console.log(count, "fetched users");
