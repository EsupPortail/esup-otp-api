import * as properties from '../properties/properties.js';
import errors from 'restify-errors';

export class EsupOtpApiError extends errors.HttpError {
    constructor(status, message, code = "Error") {
        super({
            statusCode: status,
            code: code,
        }, message);
    }

    static throw(...args) {
        throw new this(...args);
    }
}

class ApiErrorsWithMessageFromProperties extends EsupOtpApiError {
    constructor(status, message, code) {
        super(status, properties.getMessage('error', message), code);
    }
}

export class UserNotFoundError extends ApiErrorsWithMessageFromProperties {
    constructor() {
        super(404, 'user_not_found');
    }
}

export class MethodNotFoundError extends ApiErrorsWithMessageFromProperties {
    constructor() {
        super(404, 'method_not_found');
    }
}

export class UnvailableMethodTransportError extends ApiErrorsWithMessageFromProperties {
    constructor() {
        super(404, 'unvailable_method_transport');
    }
}

export class UnvailableMethodOperationError extends ApiErrorsWithMessageFromProperties {
    constructor() {
        super(404, 'unvailable_method_operation');
    }
}

export class InvalidCredentialsError extends ApiErrorsWithMessageFromProperties {
    constructor() {
        super(401, 'invalid_credentials');
    }
}

export class PushNotRegisteredError extends ApiErrorsWithMessageFromProperties {
    constructor() {
        super(200, 'push_not_registered');
    }
}

export class InvalidMailError extends ApiErrorsWithMessageFromProperties {
    constructor() {
        super(200, 'invalid_mail');
    }
}

export class InvalidSmsError extends ApiErrorsWithMessageFromProperties {
    constructor() {
        super(200, 'invalid_sms');
    }
}
