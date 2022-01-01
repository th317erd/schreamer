const Path  = require('path');
const OS    = require('os');

const { SNAPSHOT_PATH, compareToSnapshot }  = require('../support/utils');
const {
  Definers,
  createWriter,
  createReader,
} = require('../../src');

describe("Sub-Sequence Test 01", function() {
  const { U8, F32, U32, U16, BIG_ENDIAN, LITTLE_ENDIAN, GROUP } = Definers;

  const FORMAT = GROUP(
    // Header
    U32('magic',    0x4C4F434F),
    U16('version',  1),
    // Generator sequence
    U16('fibonacci', [
      U16('value'),
      U16('items', [
        F32('divisor'),
        F32('value'),
      ])
    ]),
    // Raw sequence
    U8('itemsRaw', [
      U8(),
    ]),
    // Raw sequence created via callback
    U8('items', [
      U8('value1'),
      U8('value2'),
    ]),
  );

  const BE_FORMAT = BIG_ENDIAN(FORMAT);
  const LE_FORMAT = LITTLE_ENDIAN(FORMAT);

  function *fibonacci() {
    var lastValue = 0;
    var value = 1;

    yield 0;
    yield 1;

    for (var i = 0; i < 16; i++) {
      var temp = lastValue;

      lastValue = value;
      value = value + temp;

      yield value;
    }
  }

  const WRITE_PROVIDER = {
    fibonacci: function*() {
      // Size of sequence
      yield 18;

      // Sequence
      for (var value of fibonacci()) {
        var items = [];
        for (var i = 1; i < 10; i++) {
          items.push({
            divisor: i,
            value: value / i,
          });
        }

        yield {
          value,
          items,
        };
      }
    },
    itemsRaw: [ 1, 2, 3 ],
    items: () => [
      { value1: 1, value2: 2 },
      { value1: 3, value2: 4 },
    ]
  };

  const READ_DATA = JSON.parse('{"magic":1280262991,"version":1,"fibonacci":[{"value":0,"items":[{"divisor":1,"value":0},{"divisor":2,"value":0},{"divisor":3,"value":0},{"divisor":4,"value":0},{"divisor":5,"value":0},{"divisor":6,"value":0},{"divisor":7,"value":0},{"divisor":8,"value":0},{"divisor":9,"value":0}]},{"value":1,"items":[{"divisor":1,"value":1},{"divisor":2,"value":0.5},{"divisor":3,"value":0.3333333432674408},{"divisor":4,"value":0.25},{"divisor":5,"value":0.20000000298023224},{"divisor":6,"value":0.1666666716337204},{"divisor":7,"value":0.1428571492433548},{"divisor":8,"value":0.125},{"divisor":9,"value":0.1111111119389534}]},{"value":1,"items":[{"divisor":1,"value":1},{"divisor":2,"value":0.5},{"divisor":3,"value":0.3333333432674408},{"divisor":4,"value":0.25},{"divisor":5,"value":0.20000000298023224},{"divisor":6,"value":0.1666666716337204},{"divisor":7,"value":0.1428571492433548},{"divisor":8,"value":0.125},{"divisor":9,"value":0.1111111119389534}]},{"value":2,"items":[{"divisor":1,"value":2},{"divisor":2,"value":1},{"divisor":3,"value":0.6666666865348816},{"divisor":4,"value":0.5},{"divisor":5,"value":0.4000000059604645},{"divisor":6,"value":0.3333333432674408},{"divisor":7,"value":0.2857142984867096},{"divisor":8,"value":0.25},{"divisor":9,"value":0.2222222238779068}]},{"value":3,"items":[{"divisor":1,"value":3},{"divisor":2,"value":1.5},{"divisor":3,"value":1},{"divisor":4,"value":0.75},{"divisor":5,"value":0.6000000238418579},{"divisor":6,"value":0.5},{"divisor":7,"value":0.4285714328289032},{"divisor":8,"value":0.375},{"divisor":9,"value":0.3333333432674408}]},{"value":5,"items":[{"divisor":1,"value":5},{"divisor":2,"value":2.5},{"divisor":3,"value":1.6666666269302368},{"divisor":4,"value":1.25},{"divisor":5,"value":1},{"divisor":6,"value":0.8333333134651184},{"divisor":7,"value":0.7142857313156128},{"divisor":8,"value":0.625},{"divisor":9,"value":0.5555555820465088}]},{"value":8,"items":[{"divisor":1,"value":8},{"divisor":2,"value":4},{"divisor":3,"value":2.6666667461395264},{"divisor":4,"value":2},{"divisor":5,"value":1.600000023841858},{"divisor":6,"value":1.3333333730697632},{"divisor":7,"value":1.1428571939468384},{"divisor":8,"value":1},{"divisor":9,"value":0.8888888955116272}]},{"value":13,"items":[{"divisor":1,"value":13},{"divisor":2,"value":6.5},{"divisor":3,"value":4.333333492279053},{"divisor":4,"value":3.25},{"divisor":5,"value":2.5999999046325684},{"divisor":6,"value":2.1666667461395264},{"divisor":7,"value":1.8571428060531616},{"divisor":8,"value":1.625},{"divisor":9,"value":1.4444444179534912}]},{"value":21,"items":[{"divisor":1,"value":21},{"divisor":2,"value":10.5},{"divisor":3,"value":7},{"divisor":4,"value":5.25},{"divisor":5,"value":4.199999809265137},{"divisor":6,"value":3.5},{"divisor":7,"value":3},{"divisor":8,"value":2.625},{"divisor":9,"value":2.3333332538604736}]},{"value":34,"items":[{"divisor":1,"value":34},{"divisor":2,"value":17},{"divisor":3,"value":11.333333015441895},{"divisor":4,"value":8.5},{"divisor":5,"value":6.800000190734863},{"divisor":6,"value":5.666666507720947},{"divisor":7,"value":4.857142925262451},{"divisor":8,"value":4.25},{"divisor":9,"value":3.777777671813965}]},{"value":55,"items":[{"divisor":1,"value":55},{"divisor":2,"value":27.5},{"divisor":3,"value":18.33333396911621},{"divisor":4,"value":13.75},{"divisor":5,"value":11},{"divisor":6,"value":9.166666984558105},{"divisor":7,"value":7.857142925262451},{"divisor":8,"value":6.875},{"divisor":9,"value":6.111111164093018}]},{"value":89,"items":[{"divisor":1,"value":89},{"divisor":2,"value":44.5},{"divisor":3,"value":29.66666603088379},{"divisor":4,"value":22.25},{"divisor":5,"value":17.799999237060547},{"divisor":6,"value":14.833333015441895},{"divisor":7,"value":12.714285850524902},{"divisor":8,"value":11.125},{"divisor":9,"value":9.88888931274414}]},{"value":144,"items":[{"divisor":1,"value":144},{"divisor":2,"value":72},{"divisor":3,"value":48},{"divisor":4,"value":36},{"divisor":5,"value":28.799999237060547},{"divisor":6,"value":24},{"divisor":7,"value":20.571428298950195},{"divisor":8,"value":18},{"divisor":9,"value":16}]},{"value":233,"items":[{"divisor":1,"value":233},{"divisor":2,"value":116.5},{"divisor":3,"value":77.66666412353516},{"divisor":4,"value":58.25},{"divisor":5,"value":46.599998474121094},{"divisor":6,"value":38.83333206176758},{"divisor":7,"value":33.28571319580078},{"divisor":8,"value":29.125},{"divisor":9,"value":25.88888931274414}]},{"value":377,"items":[{"divisor":1,"value":377},{"divisor":2,"value":188.5},{"divisor":3,"value":125.66666412353516},{"divisor":4,"value":94.25},{"divisor":5,"value":75.4000015258789},{"divisor":6,"value":62.83333206176758},{"divisor":7,"value":53.85714340209961},{"divisor":8,"value":47.125},{"divisor":9,"value":41.88888931274414}]},{"value":610,"items":[{"divisor":1,"value":610},{"divisor":2,"value":305},{"divisor":3,"value":203.3333282470703},{"divisor":4,"value":152.5},{"divisor":5,"value":122},{"divisor":6,"value":101.66666412353516},{"divisor":7,"value":87.14286041259766},{"divisor":8,"value":76.25},{"divisor":9,"value":67.77777862548828}]},{"value":987,"items":[{"divisor":1,"value":987},{"divisor":2,"value":493.5},{"divisor":3,"value":329},{"divisor":4,"value":246.75},{"divisor":5,"value":197.39999389648438},{"divisor":6,"value":164.5},{"divisor":7,"value":141},{"divisor":8,"value":123.375},{"divisor":9,"value":109.66666412353516}]},{"value":1597,"items":[{"divisor":1,"value":1597},{"divisor":2,"value":798.5},{"divisor":3,"value":532.3333129882812},{"divisor":4,"value":399.25},{"divisor":5,"value":319.3999938964844},{"divisor":6,"value":266.1666564941406},{"divisor":7,"value":228.14285278320312},{"divisor":8,"value":199.625},{"divisor":9,"value":177.44444274902344}]}],"itemsRaw":[1,2,3],"items":[{"value1":1,"value2":2},{"value1":3,"value2":4}]}');

  it("should write successfully (BE)", function(done) {
    const writer = createWriter(BE_FORMAT, WRITE_PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sub-sequence01-be.bin');
    writer(filePath).then(() => {
      var result = compareToSnapshot('sub-sequence01-be.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  it("should write successfully (LE)", function(done) {
    const writer = createWriter(LE_FORMAT, WRITE_PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sub-sequence01-le.bin');
    writer(filePath).then(() => {
      var result = compareToSnapshot('sub-sequence01-le.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  it("should read successfully (BE)", function(done) {
    const writer = createWriter(BE_FORMAT, WRITE_PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sub-sequence01-be.bin');
    writer(filePath).then(() => {
      const reader = createReader(BE_FORMAT);

      reader(filePath).then((data) => {
        expect(data).toEqual(READ_DATA);

        done();
      }, (error) => { fail(error); done(); });
    }, (error) => { fail(error); done(); });
  });

  it("should read successfully (LE)", function(done) {
    const writer = createWriter(LE_FORMAT, WRITE_PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sub-sequence01-le.bin');
    writer(filePath).then(() => {
      const reader = createReader(LE_FORMAT);

      reader(filePath).then((data) => {
        expect(data).toEqual(READ_DATA);

        done();
      }, (error) => { fail(error); done(); });
    }, (error) => { fail(error); done(); });
  });
});
