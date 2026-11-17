import { File, Paths } from 'expo-file-system';
import type { StateStorage } from 'zustand/middleware';

const fileFor = (name: string) => new File(Paths.document, `${name}.json`);

/**
 * Keeps small JSON documents in the app's documents folder (survives restarts, unlike memory,
 * and needs no extra native module, unlike a database). Writes go to a temporary file that is
 * moved into place, so a crash halfway never leaves a half-written document behind.
 */
export const fileStorage: StateStorage = {
    async getItem(name) {
        try {
            const file = fileFor(name);
            return file.exists ? await file.text() : null;
        } catch {
            return null;
        }
    },

    async setItem(name, value) {
        try {
            const temporary = new File(Paths.document, `${name}.tmp`);
            temporary.create({ overwrite: true });
            temporary.write(value);
            await temporary.move(fileFor(name), { overwrite: true });
        } catch {
            // The in-memory state is still correct; the next change tries to write again.
        }
    },

    async removeItem(name) {
        try {
            const file = fileFor(name);
            if (file.exists) file.delete();
        } catch {
            // Nothing to clean up.
        }
    },
};
