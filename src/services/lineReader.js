const { StringDecoder } = require('string_decoder');

/**
 * Calls onLine(line) for every non-empty line of a stream.
 * onLine may return false to stop reading early.
 */
function readLines(stream, onLine) {
  return new Promise((resolve, reject) => {
    const decoder = new StringDecoder('utf8');
    let rest = '';
    let stopped = false;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };

    const emit = (line) => {
      if (stopped) return;
      if (onLine(line) === false) {
        stopped = true;
        stream.destroy();
      }
    };

    stream.on('data', (chunk) => {
      const text = rest + decoder.write(chunk);
      let start = 0;
      let idx;
      while (!stopped && (idx = text.indexOf('\n', start)) !== -1) {
        let end = idx;
        if (end > start && text.charCodeAt(end - 1) === 13) end--;
        if (end > start) emit(text.slice(start, end));
        start = idx + 1;
      }
      rest = text.slice(start);
    });
    stream.on('end', () => {
      const last = (rest + decoder.end()).replace(/\r$/, '');
      if (last) emit(last);
      finish();
    });
    stream.on('close', finish);
    stream.on('error', (err) => (stopped ? finish() : reject(err)));
  });
}

module.exports = { readLines };
