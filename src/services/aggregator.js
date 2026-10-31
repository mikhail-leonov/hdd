/**
 * Streams drive-stats rows (one row = one drive on one day) into per-model totals.
 * Only date, serial_number, model, capacity_bytes and failure are parsed.
 */

const REQUIRED = {
  date: 'date',
  serial: 'serial_number',
  model: 'model',
  cap: 'capacity_bytes',
  failure: 'failure',
};

/** Splits only the first maxIdx+1 fields instead of all ~190. */
function splitUpTo(line, maxIdx) {
  const out = new Array(maxIdx + 1);
  let start = 0;
  for (let i = 0; i <= maxIdx; i++) {
    const comma = line.indexOf(',', start);
    if (comma === -1) {
      out[i] = line.slice(start);
      for (let j = i + 1; j <= maxIdx; j++) out[j] = '';
      break;
    }
    out[i] = line.slice(start, comma);
    start = comma + 1;
  }
  return out;
}

class DriveStatsAggregator {
  constructor() {
    this.models = new Map();
    this.rows = 0;
    this.badRows = 0;
    this.minDate = null;
    this.maxDate = null;
    this.cols = null;
    this._date = null;
  }

  /** Call with the header line of every CSV. Throws if it is not a drive-stats file. */
  beginFile(headerLine) {
    const names = headerLine.replace(/^\uFEFF/, '').split(',').map((s) => s.trim().toLowerCase());
    const c = {};
    for (const [key, name] of Object.entries(REQUIRED)) c[key] = names.indexOf(name);
    const missing = Object.keys(REQUIRED).filter((k) => c[k] < 0).map((k) => REQUIRED[k]);
    if (missing.length) throw new Error(`not a drive-stats CSV (missing columns: ${missing.join(', ')})`);
    c.max = Math.max(...Object.keys(REQUIRED).map((k) => c[k]));
    this.cols = c;
  }

  addRow(line) {
    const c = this.cols;
    const f = splitUpTo(line, c.max);
    const date = f[c.date];
    const model = (f[c.model] || '').trim();
    const serial = f[c.serial];
    if (!date || !model || !serial) {
      this.badRows++;
      return;
    }
    if (date !== this._date) {
      this._date = date;
      if (!this.minDate || date < this.minDate) this.minDate = date;
      if (!this.maxDate || date > this.maxDate) this.maxDate = date;
    }
    this.rows++;

    let m = this.models.get(model);
    if (!m) {
      m = { model, capacity: 0, driveDays: 0, failures: 0, serials: new Set() };
      this.models.set(model, m);
    }
    m.driveDays++;
    m.serials.add(serial);
    if (m.capacity <= 0) {
      const cap = Number(f[c.cap]);
      if (cap > 0) m.capacity = cap;
    }
    if (f[c.failure] === '1') m.failures++;
  }
}

module.exports = { DriveStatsAggregator };
