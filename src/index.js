const fs = require('fs');
const path = require('path');
const pc = require('picocolors');

const { config } = require('./config');
const { findZipFiles } = require('./services/scanner');
const { openZip, openEntryStream } = require('./services/zipReader');
const { readLines } = require('./services/lineReader');
const { DriveStatsAggregator } = require('./services/aggregator');
const { buildModelStats, afr } = require('./services/stats');
const { writeCsvReport } = require('./services/csvReport');
const { formatNumber, formatPct, formatDuration } = require('./utils/format');

const DATE_IN_NAME = /(\d{4}-\d{2}-\d{2})/;
const fileDate = (name) => (path.posix.basename(name).match(DATE_IN_NAME) || [])[1] || null;
const isCsv = (e) => !e.isDirectory && /\.csv$/i.test(e.name) && !e.name.startsWith('__MACOSX/');

/** Lists CSV files of every archive (central directory only, fast). */
async function listArchives(zipFiles) {
  const archives = [];
  for (const file of zipFiles) {
    const archive = { name: path.relative(config.dataDir, file), zip: null, csv: [], csvFiles: 0, error: null, problems: [] };
    try {
      const { zip, entries } = await openZip(file, { filenameEncoding: config.filenameEncoding });
      archive.zip = zip;
      archive.csv = entries
        .filter(isCsv)
        .map((e) => ({ ...e, date: fileDate(e.name) }))
        .sort((a, b) => (a.date || a.name).localeCompare(b.date || b.name));
      if (!archive.csv.length) archive.problems.push({ file: '—', message: 'no CSV files inside' });
    } catch (err) {
      archive.error = err.message;
    }
    archives.push(archive);
  }
  return archives;
}

/** Streams one CSV file into the aggregator. Returns number of data rows. */
async function processCsv(zip, entry, agg) {
  const stream = await openEntryStream(zip, entry);
  let header = true;
  let rows = 0;
  let headerError = null;
  await readLines(stream, (line) => {
    if (header) {
      header = false;
      try {
        agg.beginFile(line);
      } catch (err) {
        headerError = err;
        return false;
      }
      return true;
    }
    agg.addRow(line);
    rows++;
    return true;
  });
  if (headerError) throw headerError;
  return rows;
}

async function generateReport() {
  const startedAt = Date.now();

  if (!fs.existsSync(config.dataDir) || !fs.statSync(config.dataDir).isDirectory()) {
    throw new Error(`Data folder not found: ${config.dataDir}`);
  }
  const zipFiles = findZipFiles(config.dataDir, config.recursive);
  if (!zipFiles.length) {
    console.log(pc.yellow(`No .zip files found in ${config.dataDir}`));
    return null;
  }

  const archives = await listArchives(zipFiles);
  const total = archives.reduce((s, a) => s + a.csv.length, 0);
  console.log(pc.cyan(`Found ${archives.length} archive(s), ${total} CSV file(s) in ${config.dataDir}`));

  const agg = new DriveStatsAggregator();
  const seenDates = new Set();
  let done = 0;

  for (const archive of archives) {
    if (archive.error) {
      console.log(pc.red(`${archive.name}: ${archive.error}`));
      continue;
    }
    for (const entry of archive.csv) {
      done++;
      const label = `${pc.dim(`[${done}/${total}]`)} ${archive.name} › ${entry.name}`;

      // The same day in two archives would be counted twice
      if (entry.date && seenDates.has(entry.date)) {
        archive.problems.push({ file: entry.name, message: 'skipped: this date was already read from another file' });
        console.log(`${label} ${pc.yellow('— duplicate date, skipped')}`);
        continue;
      }

      const t0 = Date.now();
      try {
        const rows = await processCsv(archive.zip, entry, agg);
        if (entry.date) seenDates.add(entry.date);
        archive.csvFiles++;
        console.log(`${label} ${pc.dim(`— ${formatNumber(rows)} rows, ${((Date.now() - t0) / 1000).toFixed(1)} s`)}`);
      } catch (err) {
        archive.problems.push({ file: entry.name, message: err.message });
        console.log(`${label} ${pc.red(`— ${err.message}`)}`);
      }
    }
    archive.zip.close();
  }

  if (!agg.rows) {
    console.log(pc.yellow('No drive-stats rows were read — nothing to report.'));
    return null;
  }

  const models = buildModelStats(agg, config);
  const failures = models.reduce((s, m) => s + m.failures, 0);
  const report = {
    generatedAt: new Date(),
    durationMs: Date.now() - startedAt,
    period: { from: agg.minDate, to: agg.maxDate },
    minDriveDays: config.minDriveDays,
    models,
    badRows: agg.badRows,
    archives,
    sources: { archives: archives.length, csvFiles: archives.reduce((s, a) => s + a.csvFiles, 0) },
    totals: {
      driveDays: agg.rows,
      drives: models.reduce((s, m) => s + m.drives, 0),
      failures,
      afr: afr(failures, agg.rows),
    },
  };

  const outFile = config.reportFile;
  await writeCsvReport(models.filter((m) => !m.lowData), outFile);

  console.log(pc.green(`\nReport: ${outFile}`));
  console.log(
    pc.green(
      `${models.length} models, ${formatNumber(report.totals.driveDays)} drive-days, ` +
        `${formatNumber(failures)} failures, AFR ${formatPct(report.totals.afr)} — ${formatDuration(report.durationMs)}`,
    ),
  );
  return outFile;
}

generateReport().catch((err) => {
  console.error(pc.red(err.stack || err.message));
  process.exit(1);
});
