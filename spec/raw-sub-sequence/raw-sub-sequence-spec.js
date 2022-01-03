const Path  = require('path');
const OS    = require('os');

const { SNAPSHOT_PATH, compareToSnapshot }  = require('../support/utils');
const {
  Definers,
  createWriter,
  createReader,
} = require('../../src');

describe("Sub-Sequence Test 01", function() {
  const { F32, U32, U16, U64, BIG_ENDIAN, LITTLE_ENDIAN, GROUP, SELECT } = Definers;

  const FORMAT = GROUP(
    // Header
    U32('magic',    0x4C4F434F),
    U16('version',  1),
    SELECT(function() {
      // Generator sequence
      return U64('links', [
        U32(),
        F32(),
        F32(),
      ]);
    }),
  );

  const BE_FORMAT = BIG_ENDIAN(FORMAT);
  const LE_FORMAT = LITTLE_ENDIAN(FORMAT);

  const WRITE_PROVIDER = {
    links: [
      [ 32, 1.0, 0.0 ],
      [ 33, 2.0, 1.0 ],
      [ 34, 3.0, 2.0 ],
    ]
  };

  it("should write successfully (BE)", function(done) {
    const writer = createWriter(BE_FORMAT, WRITE_PROVIDER);

    debugger;

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'raw-sub-sequence01-be.bin');
    writer(filePath).then(() => {
      // var result = compareToSnapshot('sub-sequence01-be.snap', filePath);
      // expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  // it("should write successfully (LE)", function(done) {
  //   const writer = createWriter(LE_FORMAT, WRITE_PROVIDER);

  //   var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sub-sequence01-le.bin');
  //   //var filePath = Path.join(SNAPSHOT_PATH, 'sub-sequence01-le.snap');
  //   writer(filePath).then(() => {
  //     var result = compareToSnapshot('sub-sequence01-le.snap', filePath);
  //     expect(result).toBe(true);

  //     done();
  //   }, (error) => { fail(error); done(); });
  // });

  // it("should read successfully (BE)", function(done) {
  //   const writer = createWriter(BE_FORMAT, WRITE_PROVIDER);

  //   var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sub-sequence01-be.bin');
  //   writer(filePath).then(() => {
  //     const reader = createReader(BE_FORMAT);

  //     reader(filePath).then((data) => {
  //       expect(data).toEqual(READ_DATA);

  //       done();
  //     }, (error) => { fail(error); done(); });
  //   }, (error) => { fail(error); done(); });
  // });

  // it("should read successfully (LE)", function(done) {
  //   const writer = createWriter(LE_FORMAT, WRITE_PROVIDER);

  //   var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sub-sequence01-le.bin');
  //   writer(filePath).then(() => {
  //     const reader = createReader(LE_FORMAT);

  //     reader(filePath).then((data) => {
  //       expect(data).toEqual(READ_DATA);

  //       done();
  //     }, (error) => { fail(error); done(); });
  //   }, (error) => { fail(error); done(); });
  // });
});
