const Path          = require('path');
const FileSystem    = require('fs');

const SNAPSHOT_PATH = Path.resolve(__dirname, '..', 'snapshots');

function compareToSnapshot(name, _result) {
  var snapshotPath = Path.join(SNAPSHOT_PATH, `${name}`);
  var buffer = FileSystem.readFileSync(snapshotPath);
  var result = _result;

  if (typeof result === 'string')
    result = FileSystem.readFileSync(result);

  return (buffer.compare(result) === 0);
}

module.exports = {
  SNAPSHOT_PATH,
  compareToSnapshot,
};
