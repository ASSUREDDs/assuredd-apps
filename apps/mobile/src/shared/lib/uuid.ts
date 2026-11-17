/**
 * A random version 4 UUID. Made on the phone so that a record can be created offline and sent later
 * under the same id. Uniqueness matters here, not secrecy, so Math.random is enough.
 */
export function randomUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const value = Math.floor(Math.random() * 16);
        return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
    });
}
