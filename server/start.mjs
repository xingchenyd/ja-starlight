import { readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { configureRuntime } from './config.mjs';

if (!process.env.STARLIGHT_CONFIG_FILE || !process.env.STARLIGHT_DATA_DIR) throw new Error('Private configuration and data paths are required');
configureRuntime(JSON.parse(await readFile(process.env.STARLIGHT_CONFIG_FILE, 'utf8')));
await access(join(process.env.STARLIGHT_DATA_DIR, 'restore-complete.json'));
process.env.NODE_ENV = 'production';
process.env.HOST ??= '127.0.0.1';
const entry = resolve(process.env.STARLIGHT_STANDALONE_ENTRY || 'dist/standalone/server.js');
await import(pathToFileURL(entry).href);
