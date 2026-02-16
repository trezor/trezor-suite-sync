export function sanitizeNullBytesDeep(obj: string, seen?: WeakSet<any>): string;
export function sanitizeNullBytesDeep<T>(obj: T, seen?: WeakSet<any>): T;
export function sanitizeNullBytesDeep(obj: unknown, seen = new WeakSet()): unknown {
    if (typeof obj === 'string') {
        return obj.replaceAll('\0', '');
    }

    if (Array.isArray(obj)) {
        if (seen.has(obj)) return obj;
        seen.add(obj);
        for (let i = 0; i < obj.length; i++) {
            obj[i] = sanitizeNullBytesDeep(obj[i], seen);
        }

        return obj;
    }

    if (typeof obj === 'object' && obj !== null) {
        const source = obj as Record<string, unknown>;
        if (seen.has(source)) return source;
        seen.add(source);
        for (const key of Object.keys(source)) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
            source[key] = sanitizeNullBytesDeep(source[key], seen);
        }

        return source;
    }

    return obj;
}
