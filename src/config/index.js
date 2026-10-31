const path = require('path');
const dotenv = require('dotenv');

// Project root (D:\Projects\hdd) — paths work no matter where the script is started from
const ROOT = path.join(__dirname, '..', '..');

dotenv.config({ path: path.join(ROOT, '.env') });

function str(key, fallback = '') {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

function int(key, fallback) {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

function bool(key, fallback) {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

const fromRoot = (p) => path.resolve(ROOT, p);

// First CLI argument overrides DATA_DIR: node src/index.js D:\Backblaze
const cliDataDir = process.argv[2];

const config = {
  root: ROOT,
  dataDir: cliDataDir ? path.resolve(cliDataDir) : fromRoot(str('DATA_DIR', 'data')),
  recursive: bool('DATA_RECURSIVE', true),
  reportFile: fromRoot(str('REPORT_FILE', 'final_report.csv')),
  // Models with fewer drive-days are left out of the report (0 = keep all)
  minDriveDays: int('MIN_DRIVE_DAYS', 0),
  filenameEncoding: str('ZIP_FILENAME_ENCODING', 'cp866'),
};

module.exports = { config };
