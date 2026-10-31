const pad = (n) => String(n).padStart(2, '0');

function formatNumber(n) {
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
}

function formatPct(n, digits = 2) {
  return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '—';
}

/** 6 -> "6 TB", 0.25 -> "250 GB" */
function formatTB(tb) {
  if (!tb) return '?';
  return tb < 1 ? `${Math.round(tb * 1000)} GB` : `${+tb.toFixed(1)} TB`;
}

function formatDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

function fileTimestamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

module.exports = { formatNumber, formatPct, formatTB, formatDate, formatDuration, fileTimestamp };
