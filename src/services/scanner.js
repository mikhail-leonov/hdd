const fs = require('fs');
const path = require('path');

/** Returns absolute paths of all .zip files in dir (sorted naturally). */
function findZipFiles(dir, recursive = true) {
  const result = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (recursive) result.push(...findZipFiles(full, true));
    } else if (ent.isFile() && /\.zip$/i.test(ent.name)) {
      result.push(full);
    }
  }
  return result.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

module.exports = { findZipFiles };
