const fs = require('fs');
const path = require('path');
const { formatNumber, formatPct, formatTB, formatDuration, formatDate } = require('../utils/format');

const esc = (s) => String(s).replace(/\|/g, '\\|');
const row = (cells) => `| ${cells.map(esc).join(' | ')} |`;

function table(headers, aligns, rows) {
  const sep = aligns.map((a) => (a === 'r' ? '---:' : '---'));
  return [row(headers), `|${sep.join('|')}|`, ...rows.map(row)].join('\n');
}

function buildMarkdown(r) {
  const out = [];
  out.push('# HDD reliability report', '');
  out.push(`- Period: **${r.period.from} … ${r.period.to}**`);
  out.push(`- Source: ${r.sources.archives} archive(s), ${formatNumber(r.sources.csvFiles)} CSV file(s)`);
  out.push(`- Drive-days: ${formatNumber(r.totals.driveDays)}, distinct drives: ${formatNumber(r.totals.drives)}, failures: ${formatNumber(r.totals.failures)}`);
  out.push(`- Overall AFR: **${formatPct(r.totals.afr)}**`);
  out.push(`- Generated: ${formatDate(r.generatedAt)} in ${formatDuration(r.durationMs)}`, '');

  out.push('## AFR by model (smallest to largest capacity)', '');
  out.push(
    table(
      ['Model', 'Capacity', 'AFR'],
      ['l', 'r', 'r'],
      r.models.map((m) => [m.model, formatTB(m.tb), formatPct(m.afr) + (m.lowData ? ' *' : '')]),
    ),
  );
  out.push(
    '',
    `AFR = failures ÷ (drive-days ÷ 365) × 100. ` +
      `\\* fewer than ${formatNumber(r.minDriveDays)} drive-days — too little data, the AFR may be far from the real value.`,
    '',
  );

  const problems = r.archives.flatMap((a) =>
    a.error ? [[a.name, '—', a.error]] : a.problems.map((p) => [a.name, p.file, p.message]),
  );
  if (r.badRows) problems.push(['—', '—', `${formatNumber(r.badRows)} row(s) without date/model/serial skipped`]);
  if (problems.length) {
    out.push('## Problems', '');
    out.push(table(['Archive', 'File', 'Message'], ['l', 'l', 'l'], problems), '');
  }

  return out.join('\n');
}

async function writeMarkdownReport(report, outFile) {
  await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
  await fs.promises.writeFile(outFile, buildMarkdown(report), 'utf8');
}

module.exports = { writeMarkdownReport, buildMarkdown };
