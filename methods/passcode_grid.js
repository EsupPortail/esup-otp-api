import crypto from 'crypto';

import * as properties from '../properties/properties.js';
import * as utils from '../services/utils.js';
import * as errors from '../services/errors.js';
import { apiDb } from '../controllers/api.js';

import { getInstance } from '../services/logger.js';
const logger = getInstance();


export const name = "passcode_grid";

const { lines, cols, code_type, code_length } = properties.getMethod('passcode_grid');

export async function send_message(user, req, res) {
    const { grid, challenge, validity_time } = user.passcode_grid;

    // Do not change the requested code if it is recent. In this way, an attacker who has only one code will not be able to regenerate the requested code until he finds the right one.
    if (!challenge?.length || Date.now() >= validity_time) {
        user.passcode_grid.challenge = getRandomChallenge(grid);
        user.passcode_grid.validity_time = properties.getMethod('passcode_grid').validity_time * 60 * 1000 + new Date().getTime();
        await apiDb.save_user(user);
    }

    res.send({
        "code": "Ok",
        "message": { challenge: user.passcode_grid.challenge },
    });
}

function generateGrid() {
    return Array.from({ length: lines }, () =>
        Array.from({ length: cols }, () => utils.generate_code_of_type(code_length, code_type))
    );
}

function getRandomChallenge(grid) {
    const lines = grid.length;
    const cols = grid[0].length;

    return [crypto.randomInt(lines), crypto.randomInt(cols)];
}

function getValue(array, challenge) {
    return array[challenge[0]][challenge[1]];
}

/**
 * Indique si le code fourni correspond à celui stocké en base de données
 *
 * @param req requete HTTP contenant le nom la personne recherchee
 * @param res response HTTP
 */
export async function verify_code(user, req) {
    const { grid, challenge, validity_time } = user.passcode_grid;
    if (grid && challenge && Date.now() < validity_time && getValue(grid, challenge) == req.params.otp) {
        user.passcode_grid.challenge = null;
        user.passcode_grid.validity_time = null;
        await apiDb.save_user(user);
        return true;
    } else {
        return false
    }
}

export async function generate_method_secret(user, req, res) {
    user.passcode_grid.grid = generateGrid();
    logger.log('archive', {
        message: [
            {
                uid: req.params.uid,
                clientIp: req.headers['x-client-ip'],
                clientUserAgent: req.headers['client-user-agent'],
                action: 'generate grid'
            }
        ]
    });
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        code: "Ok",
        grid: user.passcode_grid.grid,
    });
}

export async function delete_method_secret(user, req, res) {
    user.passcode_grid.active = false;
    user.passcode_grid.grid = null;
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
        "message": 'Secret removed'
    });
}

export async function user_activate(user, req, res) {
    user.passcode_grid.active = true;
    if (user.passcode_grid.grid) {
        await apiDb.save_user(user);
        res.status(200);
        res.send({
            "code": "Ok",
        });
    } else {
        return generate_method_secret(user, req, res);
    }
}

export function confirm_user_activate(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}

export async function user_deactivate(user, req, res) {
    user.passcode_grid.active = false;
    await apiDb.save_user(user);
    res.status(200);
    res.send({
        "code": "Ok",
    });
}

export function user_desync(user, req, res) {
    throw new errors.UnvailableMethodOperationError();
}
