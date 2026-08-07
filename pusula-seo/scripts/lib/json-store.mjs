import fs from 'node:fs';
import path from 'node:path';

export function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJSON(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function appendJSONL(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(obj) + '\n', 'utf8');
}

export function readJSONL(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}
