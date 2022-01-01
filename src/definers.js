function makeWriter(type, converter) {
  var bufferMethodNames = {
    'be': null,
    'le': null,
  };

  if (type === 'Int8' || type === 'UInt8') {
    bufferMethodNames['be'] = `write${type}`;
    bufferMethodNames['le'] = `write${type}`;
  } else {
    bufferMethodNames['be'] = `write${type}BE`;
    bufferMethodNames['le'] = `write${type}LE`;
  }

  return function(_value, buffer, offset) {
    var value       = _value;
    var endian      = this['endian'];
    var methodName  = bufferMethodNames[endian];

    if (typeof converter === 'function')
      value = converter(value);

    buffer[methodName](value, offset);
  };
}

function makeReader(type) {
  var bufferMethodNames = {
    'be': null,
    'le': null,
  };

  if (type === 'Int8' || type === 'UInt8') {
    bufferMethodNames['be'] = `read${type}`;
    bufferMethodNames['le'] = `read${type}`;
  } else {
    bufferMethodNames['be'] = `read${type}BE`;
    bufferMethodNames['le'] = `read${type}LE`;
  }

  return async function(node) {
    var endian      = this['endian'];
    var methodName  = bufferMethodNames[endian];

    await this.waitOnData(node.byteSize);

    var result = this.readBuffer[methodName](this.readBufferOffset);
    this.updateReadBufferOffset(this.readBufferOffset + node.byteSize);

    return result;
  };
}

function makeStringWriter(type) {
  return function(_value) {
    var value = _value;
    if (typeof value !== 'string')
      value = ('' + value);

    return Buffer.from(value, type);
  };
}

function makeStringReader(type) {
  return async function(byteLength, bufferSize) {
    var bytesNeeded = byteLength;
    if (bytesNeeded > bufferSize)
      bytesNeeded = bufferSize;

    var stringBuffer = Buffer.alloc(0);

    while(1) {
      if ((byteLength - stringBuffer.length) < bytesNeeded)
        bytesNeeded = byteLength - stringBuffer.length;

      await this.waitOnData(bytesNeeded);

      stringBuffer = Buffer.concat([
        stringBuffer,
        this.readBuffer.slice(this.readBufferOffset, this.readBufferOffset + bytesNeeded),
      ]);

      this.updateReadBufferOffset(this.readBufferOffset + bytesNeeded);

      if (stringBuffer.length >= byteLength)
        break;
    }

    return stringBuffer.toString(type);
  };
}

function makeNode(defintion, _childrenKey) {
  var childrenKey = _childrenKey || 'children';
  var children    = defintion[childrenKey];

  if (!children && !_childrenKey)
    children = defintion['value'];

  if (!children || !(children instanceof Array)) {
    if (children && children.type) {
      children.parent = defintion;

      if (typeof children.validate === 'function')
        children.validate(children);
    }

    return defintion;
  }

  for (var i = 0, il = children.length; i < il; i++) {
    var child = children[i];
    if (!child || !child.type)
      continue;

    child.parent = defintion;

    if (typeof child.validate === 'function')
      child.validate(child);
  }

  return defintion;
}

function getStringByteSize(type) {
  return function (node, _value) {
    var value = _value;
    if (typeof value !== 'string')
      value = ('' + value);

    return Buffer.byteLength(value, type);
  };
}

function baseTypeValidator(node) {
  if (!(node.parent && node.parent.value instanceof Array)) {
    if (!node.name)
      throw new Error(`Node '${node.type.toUpperCase()}' must have a name`);
  }
}

function BIG_ENDIAN(...children) {
  return makeNode({
    type: 'big_endian',
    children: (children.length === 1 && children[0] instanceof Array) ? children[0] : children,
  });
}

function LITTLE_ENDIAN(...children) {
  return makeNode({
    type: 'little_endian',
    children: (children.length === 1 && children[0] instanceof Array) ? children[0] : children,
  });
}

function DIR(path, ...children) {
  return makeNode({
    type: 'dir',
    path,
    children: (children.length === 1 && children[0] instanceof Array) ? children[0] : children,
  });
}

function FILE(path, ...children) {
  return makeNode({
    type: 'file',
    path,
    children: (children.length === 1 && children[0] instanceof Array) ? children[0] : children,
  });
}

function GROUP(...children) {
  return makeNode({
    type: 'group',
    children: (children.length === 1 && children[0] instanceof Array) ? children[0] : children,
  });
}

function SELECT(callback) {
  return makeNode({
    type: 'select',
    callback,
  });
}

function I8(name, value) {
  return makeNode({
    type: 'i8',
    name,
    value,
    byteSize: 1,
    writer: makeWriter('Int8'),
    reader: makeReader('Int8'),
    validate: baseTypeValidator,
  });
}

function U8(name, value) {
  return makeNode({
    type: 'u8',
    name,
    value,
    byteSize: 1,
    writer: makeWriter('UInt8'),
    reader: makeReader('UInt8'),
    validate: baseTypeValidator,
  });
}

function I16(name, value) {
  return makeNode({
    type: 'i16',
    name,
    value,
    byteSize: 2,
    writer: makeWriter('Int16'),
    reader: makeReader('Int16'),
    validate: baseTypeValidator,
  });
}

function U16(name, value) {
  return makeNode({
    type: 'u16',
    name,
    value,
    byteSize: 2,
    writer: makeWriter('UInt16'),
    reader: makeReader('UInt16'),
    validate: baseTypeValidator,
  });
}

function I32(name, value) {
  return makeNode({
    type: 'i32',
    name,
    value,
    byteSize: 4,
    writer: makeWriter('Int32'),
    reader: makeReader('Int32'),
    validate: baseTypeValidator,
  });
}

function U32(name, value) {
  return makeNode({
    type: 'u32',
    name,
    value,
    byteSize: 4,
    writer: makeWriter('UInt32'),
    reader: makeReader('UInt32'),
    validate: baseTypeValidator,
  });
}

function I64(name, value) {
  return makeNode({
    type: 'i64',
    name,
    value,
    byteSize: 8,
    writer: makeWriter('BigInt64', BigInt),
    reader: makeReader('BigInt64'),
    validate: baseTypeValidator,
  });
}

function U64(name, value) {
  return makeNode({
    type: 'u64',
    name,
    value,
    byteSize: 8,
    writer: makeWriter('BigUInt64', BigInt),
    reader: makeReader('BigUInt64'),
    validate: baseTypeValidator,
  });
}

function F32(name, value) {
  return makeNode({
    type: 'f32',
    name,
    value,
    byteSize: 4,
    writer: makeWriter('Float'),
    reader: makeReader('Float'),
    validate: baseTypeValidator,
  });
}

function F64(name, value) {
  return makeNode({
    type: 'f64',
    name,
    value,
    byteSize: 8,
    writer: makeWriter('Double'),
    reader: makeReader('Double'),
    validate: baseTypeValidator,
  });
}

function LATIN1(value) {
  return makeNode({
    type: 'latin1',
    kind: 'string',
    value,
    byteSize: getStringByteSize('latin1'),
    writer:   makeStringWriter('latin1'),
    reader:   makeStringReader('latin1'),
    validate: (node) => {
      if (!node.parent || [ 'u8', 'u16', 'u32', 'u64' ].indexOf(node.parent.type) < 0)
        throw new Error('LATIN1 string type must be wrapped in a U8, U16, U32, or U64 to specify the length of the string');
    },
  });
}

function UTF16(value) {
  return makeNode({
    type: 'utf16',
    kind: 'string',
    value,
    byteSize: getStringByteSize('utf16le'),
    writer:   makeStringWriter('utf16le'),
    reader:   makeStringReader('utf16le'),
    validate: (node) => {
      if (!node.parent || [ 'u8', 'u16', 'u32', 'u64' ].indexOf(node.parent.type) < 0)
        throw new Error('UTF16 string type must be wrapped in a U8, U16, U32, or U64 to specify the length of the string');
    },
  });
}

function UTF8(value) {
  return makeNode({
    type: 'utf8',
    kind: 'string',
    value,
    byteSize: getStringByteSize('utf8'),
    writer:   makeStringWriter('utf8'),
    reader:   makeStringReader('utf8'),
    validate: (node) => {
      if (!node.parent || [ 'u8', 'u16', 'u32', 'u64' ].indexOf(node.parent.type) < 0)
        throw new Error('UTF8 string type must be wrapped in a U8, U16, U32, or U64 to specify the length of the string');
    },
  });
}

function CUSTOM(writer, reader, name) {
  return makeNode({
    type: 'custom',
    name,
    writer,
    reader,
    validate: function(node) {
      if (!(node.parent && node.parent.value instanceof Array)) {
        if (!node.name)
          throw new Error(`Node '${node.type.toUpperCase()}' must have a name`);
      }
    }
  });
}

module.exports = {
  BIG_ENDIAN,
  LITTLE_ENDIAN,
  DIR,
  FILE,
  GROUP,
  SELECT,
  I8,
  U8,
  I16,
  U16,
  I32,
  U32,
  I64,
  U64,
  F32,
  F64,
  LATIN1,
  UTF16,
  UTF8,
  CUSTOM,
};
