/** Annualized failure rate, % per drive-year (Backblaze method). */
function afr(failures, driveDays) {
  return driveDays ? (failures / driveDays) * 365 * 100 : NaN;
}

/** 95% confidence interval of AFR (Byar's approximation for a Poisson count). */
function afrInterval(failures, driveDays, z = 1.96) {
  if (!driveDays) return [NaN, NaN];
  const x = failures;
  const lower = x === 0 ? 0 : x * (1 - 1 / (9 * x) - z / (3 * Math.sqrt(x))) ** 3;
  const y = x + 1;
  const upper = y * (1 - 1 / (9 * y) + z / (3 * Math.sqrt(y))) ** 3;
  return [afr(lower, driveDays), afr(upper, driveDays)];
}

/** 6001175126016 -> 6, 12000138625024 -> 12, 250059350016 -> 0.25 */
function capacityTb(bytes) {
  if (!(bytes > 0)) return 0;
  const tb = bytes / 1e12;
  return tb < 1 ? Math.round(tb * 100) / 100 : Math.round(tb * 10) / 10;
}

function buildModelStats(agg, { minDriveDays }) {
  return [...agg.models.values()]
    .map((m) => {
      const [ciLow, ciHigh] = afrInterval(m.failures, m.driveDays);
      return {
        model: m.model,
        tb: capacityTb(m.capacity),
        drives: m.serials.size,
        driveDays: m.driveDays,
        failures: m.failures,
        afr: afr(m.failures, m.driveDays),
        ciLow,
        ciHigh,
        lowData: m.driveDays < minDriveDays,
      };
    })
    .sort((a, b) => a.tb - b.tb || a.afr - b.afr || a.model.localeCompare(b.model));
}

module.exports = { afr, afrInterval, capacityTb, buildModelStats };
