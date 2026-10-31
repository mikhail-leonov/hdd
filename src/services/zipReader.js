const yauzl = require('yauzl');
const iconv = require('iconv-lite');

function decodeName(buf, isUtf8, fallbackEncoding) {
  if (isUtf8 || !iconv.encodingExists(fallbackEncoding)) return buf.toString('utf8');
  return iconv.decode(buf, fallbackEncoding);
}

/** Opens a zip and lists its entries (reads only the central directory). */
function openZip(filePath, { filenameEncoding = 'cp866' } = {}) {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true, decodeStrings: false, autoClose: false }, (err, zip) => {
      if (err) return reject(err);

      const entries = [];
      zip.on('error', reject);
      zip.on('entry', (e) => {
        const isUtf8 = (e.generalPurposeBitFlag & 0x800) !== 0;
        const name = decodeName(e.fileName, isUtf8, filenameEncoding).replace(/\\/g, '/');
        entries.push({
          name,
          size: e.uncompressedSize,
          packed: e.compressedSize,
          isDirectory: name.endsWith('/'),
          raw: e,
        });
        zip.readEntry();
      });
      zip.on('end', () => resolve({ zip, entries }));
      zip.readEntry();
    });
  });
}

function openEntryStream(zip, entry) {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry.raw, (err, stream) => (err ? reject(err) : resolve(stream)));
  });
}

module.exports = { openZip, openEntryStream };
