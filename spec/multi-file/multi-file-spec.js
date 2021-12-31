const Path  = require('path');
const OS    = require('os');

const { SNAPSHOT_PATH, compareToSnapshot }  = require('../support/utils');
const { Definers, createWriter }            = require('../../src');

describe("Test01", function() {
  const { U32, U16, BIG_ENDIAN, LITTLE_ENDIAN, LATIN1, FILE } = Definers;

  const FORMAT = [
    FILE('multi-file01.bin',
      // Header
      U32('magic',    0x4C4F434F),
      U16('version',  1),
      U16('string',   LATIN1()),
    ),
    FILE('multi-file02.bin',
      // Header
      U32('magic',    0x40000000),
      U16('version',  2),
      U16('string',   LATIN1()),
    ),
  ];

  const BE_FORMAT = BIG_ENDIAN(FORMAT);
  const LE_FORMAT = LITTLE_ENDIAN(FORMAT);

  const PROVIDER = {
    'multi-file01.bin': {
      'string': 'File 01',
    },
    'multi-file02.bin': {
      'string': 'File 02',
    }
  };

  it("should write successfully (BE)", function(done) {
    const writer = createWriter(BE_FORMAT, PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'multi-file', 'be');
    writer(filePath).then(() => {
      var result = compareToSnapshot(Path.join('multi-file', 'be', 'multi-file01.snap'), Path.join(filePath, 'multi-file01.bin'));
      expect(result).toBe(true);

      result = compareToSnapshot(Path.join('multi-file', 'be', 'multi-file02.snap'), Path.join(filePath, 'multi-file02.bin'));
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  it("should write successfully (LE)", function(done) {
    const writer = createWriter(LE_FORMAT, PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'multi-file', 'le');
    writer(filePath).then(() => {
      var result = compareToSnapshot(Path.join('multi-file', 'le', 'multi-file01.snap'), Path.join(filePath, 'multi-file01.bin'));
      expect(result).toBe(true);

      result = compareToSnapshot(Path.join('multi-file', 'le', 'multi-file02.snap'), Path.join(filePath, 'multi-file02.bin'));
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  // it("should read successfully (BE)", function() {

  // });

  // it("should read successfully (LE)", function() {

  // });
});
