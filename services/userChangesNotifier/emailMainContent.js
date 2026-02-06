import { cover_transport } from "../utils.js";


const methodName = {
    bypass: "par codes de secours",
    esupnfc: "par NFC avec votre carte multi-service",
    passcode_grid: "par grille de code",
    push: "par notifications sur l’application mobile Esup Auth",
    random_code_mail: "par codes par email",
    random_code: "par codes par SMS",
    totp: "par codes TOTP",
    webauthn: "par facteur physique (WebAuthn)",
}

function joinWithCommasAndEt(items) {
    if (items.length === 1) {
        return items[0];
    }
    else {
        return items.slice(0, -1).join(", ") + ", et " + items.at(-1);
    }
}

/**
 * @param {[[String, Boolean]]} changes
 * @example
 * // returns "L'authentification par facteur physique (WebAuthn) a été activée pour votre compte."
 * await onUserMethodChange(user, [["webauthn", true]])
 * @returns {Promise<String>}
 */
export async function onUserMethodChange(_user, changes) {
    return [...Map.groupBy(changes, ([_method, active]) => active)]
        .map(([active, methods]) => ({
            active,
            methods: methods.map(([method, _active]) => methodName[method])
        }))
        .map(({ active, methods }) =>
            `L’authentification ${joinWithCommasAndEt(methods)} a été ${active ? "activée" : "désactivée"} pour votre compte.`
        )
        .join("\n");
}

const transportChangeMessages = {
    create: {
        mail: "Vous recevrez vos codes d’authentification par mail à l’adresse %NEW_TRANSPORT%",
        sms: "Vous recevrez vos codes d’authentification par SMS au numéro %NEW_TRANSPORT%",
    },
    change: {
        mail: "Vous recevrez vos codes d’authentification par mail à l’adresse %NEW_TRANSPORT% (au lieu de %OLD_TRANSPORT% précédemment)",
        sms: "Vous recevrez vos codes d’authentification par SMS au numéro %NEW_TRANSPORT% (au lieu de %OLD_TRANSPORT% précédemment)",
    },
    delete: {
        mail: "Vous ne recevrez plus de codes d’authentification par mail à l’adresse %OLD_TRANSPORT%",
        sms: "Vous ne recevrez plus de codes d’authentification par SMS au numéro %OLD_TRANSPORT%",
    },
}

export async function onUserTransportChange(_user, transportName, oldTransport, newTransport) {
    let action;
    if (oldTransport && newTransport) {
        if (oldTransport == newTransport) {
            return;
        }
        action = "change";
    } else if (oldTransport) {
        action = "delete";
    } else if (newTransport) {
        action = "create";
    } else {
        return;
    }
    return transportChangeMessages[action][transportName]
        ?.replace("%OLD_TRANSPORT%", cover_transport(oldTransport, transportName))
        ?.replace("%NEW_TRANSPORT%", cover_transport(newTransport, transportName));
}
