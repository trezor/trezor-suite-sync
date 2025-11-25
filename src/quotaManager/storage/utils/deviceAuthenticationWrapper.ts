/**
 * Wrapper for @trezor/device-authenticity to handle ESM/CJS interop issues.
 *
 * The @trezor/device-authenticity package is CommonJS but requires ESM-only @noble/curves.
 * Dynamic import() solves this because it works in both CJS and ESM contexts.
 */
type DeviceAuthModule = typeof import('@trezor/device-authenticity');

let deviceAuthModule: DeviceAuthModule | null = null;

const loadModule = async (): Promise<DeviceAuthModule> => {
    if (!deviceAuthModule) {
        deviceAuthModule = await import('@trezor/device-authenticity');
    }

    return deviceAuthModule;
};

export const verifyAuthenticityProof: DeviceAuthModule['verifyAuthenticityProof'] =
    async params => {
        const module = await loadModule();

        return module.verifyAuthenticityProof(params);
    };

export const parseCertificate: DeviceAuthModule['parseCertificate'] = cert => {
    // This is synchronous in the original, but we need async wrapper
    // So we'll need to make our usage async
    throw new Error('Use async version');
};

export const getDeviceAuthenticityConfig = async () => {
    const module = await loadModule();

    return module.deviceAuthenticityConfig;
};

export const getDeviceAuthenticityBlacklistConfig = async () => {
    const module = await loadModule();

    return module.deviceAuthenticityBlacklistConfig;
};
