import { fileURLToPath } from 'url';
import * as path from 'node:path';
import fs from 'fs';

/**
 * absolute path of project directory
 */
const base_dir = relativeToAbsolutePath(import.meta.url, '..');

/**
 * relative path from project directory
 */
export function getFileName(filename) {
    return path.relative(base_dir, filename);
}

/**
 * @param { string | URL } import_meta_url 
 */
export function getFileNameFromUrl(import_meta_url) {
    return getFileName(__filename(import_meta_url));
}

/**
 * @param { string | URL } import_meta_url 
 */
export function __filename(import_meta_url) {
    return fileURLToPath(import_meta_url);
}

/**
 * @param { string | URL } import_meta_url 
 */
export function __dirname(import_meta_url) {
    return path.dirname(__filename(import_meta_url));
}

/**
 * @param { string | URL } import_meta_url
 */
export function relativeToAbsolutePath(import_meta_url, relativePath) {
    return path.join(__dirname(import_meta_url), relativePath);
}

export function readJsonSync(filename) {
    return JSON.parse(fs.readFileSync(filename));
}
