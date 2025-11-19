import { join, dirname, isAbsolute } from 'path';
import { mkdirSync } from 'fs';

/**
 * Универсальная и кроссплатформенная система путей.
 * Гарантирует, что даже на Vercel (где FS read-only) мы будем использовать
 * доступную для записи директорию `/tmp`, а локально сохраняем прежнее поведение.
 */

const PROJECT_ROOT = process.cwd();
const isVercel = Boolean(process.env.VERCEL);
const DEFAULT_RUNTIME_ROOT = isVercel ? join('/tmp', 'cosmic-library') : PROJECT_ROOT;

const WINDOWS_ABSOLUTE_REGEX = /^[a-zA-Z]:[\\/]/;

function isWindowsAbsolutePath(pathValue = '') {
  return WINDOWS_ABSOLUTE_REGEX.test(pathValue);
}

function resolveUserPath(pathValue) {
  if (!pathValue) {
    return null;
  }

  if (isAbsolute(pathValue)) {
    return pathValue;
  }

  if (isWindowsAbsolutePath(pathValue)) {
    // На Windows используем как есть, в *nix окружениях игнорируем такой путь
    return process.platform === 'win32' ? pathValue : null;
  }

  return join(PROJECT_ROOT, pathValue);
}

function ensureDirectory(dirPath) {
  if (!dirPath) return;
  try {
    mkdirSync(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.warn(`[paths] Не удалось создать директорию ${dirPath}:`, error.message);
    }
  }
}

function resolveDirectory(envValue, fallbackDir) {
  const target = resolveUserPath(envValue) || fallbackDir;
  ensureDirectory(target);
  return target;
}

function resolveFile(envValue, fallbackFile) {
  const target = resolveUserPath(envValue) || fallbackFile;
  ensureDirectory(dirname(target));
  return target;
}

const DATA_ROOT = resolveDirectory(process.env.RUNTIME_DATA_DIR, DEFAULT_RUNTIME_ROOT);
const BOOKS_DIR_NAME = process.env.BOOKS_DIR_NAME || 'books';

const BOOKS_DIR = resolveDirectory(process.env.BOOKS_DIR, join(DATA_ROOT, BOOKS_DIR_NAME));
const DB_PATH = resolveFile(process.env.DB_FILE, join(DATA_ROOT, 'database.json'));
const BOOKS_JSON_PATH = resolveFile(process.env.BOOKS_FILE, join(DATA_ROOT, 'books.json'));

export function getDbPath() {
  return DB_PATH;
}

export function getBooksFilePath() {
  return BOOKS_JSON_PATH;
}

export function getBooksDirPath() {
  return BOOKS_DIR;
}

export function getBookFilePath(filename) {
  return join(BOOKS_DIR, filename);
}

