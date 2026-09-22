const MOBILE_DEVICE_TYPE = 'mobile';

function toPlainObject(value) {
    return value?.toObject?.() || value || {};
}

function hasDeviceIdentity(device) {
    return Boolean(device?.gcm_id || device?.token_secret);
}

function addDeviceIfMissing(devices, candidate) {
    if (!hasDeviceIdentity(candidate)) {
        return;
    }

    candidate.type ||= MOBILE_DEVICE_TYPE;
    const candidateKey = candidate.token_secret || candidate.gcm_id;
    const alreadyExists = devices.some(device =>
        device.token_secret === candidateKey || device.gcm_id === candidateKey
    );

    if (!alreadyExists) {
        devices.push(candidate);
    }
}

export function getPushDevices(user) {
    user.push.devices ||= [];

    if (hasDeviceIdentity(user.push.device) || user.push.token_secret) {
        addDeviceIfMissing(user.push.devices, {
            ...toPlainObject(user.push.device),
            type: MOBILE_DEVICE_TYPE,
            token_secret: user.push.token_secret,
            gcm_id_not_registered: user.push.gcm_id_not_registered,
            invalid_gcm_id: user.push.invalid_gcm_id,
        });
    }

    return user.push.devices;
}

export function syncLegacyPushFields(user) {
    const devices = getPushDevices(user);
    const device = devices.find(item => (item.type || MOBILE_DEVICE_TYPE) === MOBILE_DEVICE_TYPE) || devices[0];
    user.push.active = Boolean(device);
    user.push.device.platform = device?.platform || null;
    user.push.device.gcm_id = device?.gcm_id || null;
    user.push.device.manufacturer = device?.manufacturer || null;
    user.push.device.model = device?.model || null;
    user.push.token_secret = device?.token_secret || null;
    user.push.gcm_id_not_registered = device?.gcm_id_not_registered || false;
    user.push.invalid_gcm_id = device?.invalid_gcm_id || false;
}
