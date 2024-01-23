export function sendResponseOK(res) {
    res.status(200);
    res.send({ code: 'Ok' });
}

/**
 * @param {import('../services/errors').EsupOtpApiError} error
 */
export function sendResponseError(res, error) {
    res.status(error.status);
    res.send({
        "code": error.code,
        "message": error.message
    });
}