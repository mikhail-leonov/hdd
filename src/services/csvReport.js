const fs = require('fs');
const path = require('path');

/** Quotes a CSV field only when needed (comma, quote, newline). */
function csvField(value) {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 6 -> "6TB", 0.25 -> "250GB" */
function capacityLabel(tb) {
  if (!tb) return '';
  return tb < 1 ? `${Math.round(tb * 1000)}GB` : `${+tb.toFixed(1)}TB`;
}

function buildCsv(models) {
  const lines = ['model,capacity,drive_days,AFR'];
  for (const m of models) {
    lines.push(
      [m.model, capacityLabel(m.tb), m.driveDays, `${m.afr.toFixed(2)}%`].map(csvField).join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}

async function writeCsvReport(models, outFile) {
  await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
  await fs.promises.writeFile(outFile, buildCsv(models), 'utf8');
}

module.exports = { writeCsvReport, buildCsv };
