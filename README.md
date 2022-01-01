# schreamer 😱

File schema defining and streaming with a composable interface.

This library works by defining composable binary format templates that can be used to write and read binary data based of these templates.

File handling is not limited to one file, but rather, a template can define an entire file tree to write and read from.

Once a file template is defined, it can be composed into other templates to create new bigger and better templates.

## Example

You can read or write to multiple files at once. Nodes are composable.
```javascript
const {
  Definers,
  createWriter,
  createReader,
} = require('schreamer');

const { FILE, DIR, U8, U16, U32, F32 } = Definers;

// Specify format
const FILES = GROUP(
  FILE('multi-file01.bin',
    // Header
    U32('magic',    0x4C4F434F),
    U16('version',  1),
    // String
    U16('string',   LATIN1()),
    // Complex sequence
    U32('items', [
      U8('type'),
      F32('value'),
    ]),
  ),
  FILE('multi-file02.bin',
    // Header
    U32('magic',    0x40000000),
    U16('version',  2),
    // String
    U16('string',   LATIN1()),
    // Sequence of bytes
    U32('items', [
      U8(),
    ]),
  ),
);

// Compose format into another format
const PROJECT = DIR('project',
  FILES,
);

const WRITE_PROVIDER = {
  'multi-file01.bin': {
    // Provide value for 'string' node
    'string': 'Hello world!',

    // provide items via a generator function
    // for 'items' node.
    'items': function*(userContext) {
      // 'userContext' is provided by the user
      // and so can be anything, such as maybe
      // a class instance to pull data from.

      // First yield the length of items
      yield 4;

      yield { type: 1, value: Math.PI };
      yield { type: 2, value: 123.456 };
      yield { type: 3, value: 6.666 };
      yield { type: 4, value: Math.sqrt(2) };
    },
  },
  'multi-file02.bin': {
    // Provide value for 'string' node
    'string': () => 'Some other data!',

    // Provide values for 'items' node
    items: [ 0, 6, 1, 12, 10 ],
  },
};

// Create writer, giving it the format and provider
const writer = createWriter(PROJECT, WRITE_PROVIDER);

// Provide a path directly
writer('/tmp/schreamer/path/to/write/to').then(() => {
  console.log('Files written successfully!');
}, (error) => console.error('Failed to write!', error));

// Or, provide options
writer({
  writeBufferSize: 1024 * 16,
  path: '/tmp/schreamer/path/to/write/to',
  // You can optionally handle your own stream creation.
  // This can be useful for example if you are using streams
  // other than file streams.
  // createWritableStream: () => {
  //   return myCustomWritableStream;
  // }
}).then(() => {
  console.log('Files written successfully!');
}, (error) => console.error('Failed to write!', error));

// Now, read the data just written
const reader = createReader(PROJECT);
reader('/tmp/schreamer/path/to/write/to').then((data) => {
  // 'data' now contains the data read
  // {
  //   'multi-file01.bin': {
  //     'string': 'Hello world!',
  //     'items': [
  //       { type: 1, value: 3.141592653589793 };
  //       { type: 2, value: 123.456 };
  //       { type: 3, value: 6.666 };
  //       { type: 4, value: 1.4142135623730951 };
  //     ],
  //   },
  //   'multi-file02.bin': {
  //     'string': 'Some other data!',
  //     'items': [ 0, 6, 1, 12, 10 ],
  //   }
  // }
}, (error) => console.error('Failed to read!', error));
```

## Terminology

1. Format = The binary file format, specified by Definers. At the top-most level this is just another Node.
2. Provider = A simple object of key/value pairs used to provide data to a writer.
3. Definer = A simple method that returns a Node to define how to read or write data.
4. Node = A simple object that defines the structure of the data to be read or written.

## How schreamer works

Schreamer works by composing "Definers" into a format. Definers are simply methods that return object "nodes". These nodes specify
the type of data to be read or written.

The underlying system manages opening files for you, filling or
writing buffers from/to the file-system, and walking the format
of "nodes" to know how to read or write data.

Readers and writers are created by calling `createReader` or `createWriter` respectively. These two methods accept two parameters, a `format`, and a `provider`.

The `format` given to a reader or a writer defines the binary structure of the data being read or written.

The `provider` given to a writer generates or provides the data needed to write to the file-system. *Note: Currently readers do not have any use for providers, but they are still part of the code as they might find a use in the future.*

When a provider provides data to the underlying system it can do so either in raw format, or by providing callbacks that will be called to fetch the required data.

For sequences, these provider callbacks can be generator functions. If they are, then the generator function is expected to `yield` the length of the sequence first, before yielding the remaining items of the sequence. Generator methods are used to provide an efficient means of managing data (instead of copying potentially large data into new formats needed for writing).

## Methods

> **createWriter(*template, dataProvider*)**
>
> Create a writer using the specified template and data provider.
>
> `template`: The top-most node of a template created by definers.
>
> `dataProvider`: An object, keyed by node name, that provides data to the writer.
>
> **Return value**: A writer method, which when called, will return a promise and write the data specified by the `template` and `dataProvider`.

<br>

> **writer(*path|options*)**
>
> Writer returned from `createWriter`. Call this method to actually write data to the underlying file-system.
>
> `path|options`: This can be a string, in which case it specifies a path. This can be a path to a folder if your template contains multiple files, or it can be the full path to a file otherwise. If an object is provided, then you can specify the options `writeBufferSize` (integer), `path` (string), and `createWritableStream` (function).
>
> **Return value**: A `Promise` that will resolve successfully on success, or be rejected with an error on failure.

<br>

> **createReader(*template*)**
>
> Create a writer using the specified template and data provider.
>
> `template`: The top-most node of a template created by definers.
>
> **Return value**: A reader method, which when called, will return a promise and read the data specified by the `template`. The success result of the returned promise will be an object containing the read data, keyed by node name.

<br>

> **reader(*path|options*)**
>
> Reader returned from `createReader`. Call this method to actually read data from the underlying file-system.
>
> `path|options`: This can be a string, in which case it specifies a path. This can be a path to a folder if your template contains multiple files, or it can be the full path to a file otherwise. If an object is provided, then you can specify the options `readBufferSize` (integer), `path` (string), and `createReadableStream` (function).
>
> *Note: `readBufferSize` is currently a hint. Buffer sizes may end up larger than this value*.
>
> **Return value**: A `Promise` that will resolve successfully with the data read on success, or be rejected with an error on failure.

## Definers

> **BIG_ENDIAN(*...children*)**
>
> Switch to big endian mode. This definer can be used anywhere, and can be used to switch the endianness at any time.
>
> Example:
> ```javascript
> GROUP(
>   LITTLE_ENDIAN(
>     // Header is in little endian
>     U32('header'),
>     U16('version'),
>     // Array of items is in big endian
>     BIG_ENDIAN(
>       U16('array', [
>         U32(),
>       ])
>     ),
>   ),
> )
> ```

<br>

> **LITTLE_ENDIAN(*...children*)**
>
> Switch to little endian mode. This definer can be used anywhere, and can be used to switch the endianness at any time.
>
> Example:
> ```javascript
> GROUP(
>   LITTLE_ENDIAN(
>     // Header is in little endian
>     U32('header'),
>     U16('version'),
>     // Array of items is in big endian
>     BIG_ENDIAN(
>       U16('array', [
>         U32(),
>       ])
>     ),
>   ),
> )
> ```

<br>

> **DIR(*path, ...children*)**
>
> Select a new directory in a file-system tree. Relative paths are possible, so for example the path can be `'.'` or `'..'`. `DIR` nodes are optional. If not provided, then the path specified for the writer/reader will be used as the path.
>
> Example:
> ```javascript
> GROUP(
>   DIR('nodes',
>     // Will load {path}/nodes/nodes.bin
>     FILE('nodes.bin',
>       ...
>     ),
>     // Will load {path}/nodes/manifest.bin
>     FILE('manifest.bin',
>       ...
>     )
>   ),
>   DIR('project',
>     // Will load {path}/project/...
>     ...
>   )
> )
> ```

<br>

> **FILE(*fileName, ...children*)**
>
> Select a file in a file-system tree. `FILE` nodes are optional if a full path to a file is specified for your writer/reader. If a full file path isn't specified for your writer/reader, then the code will panic without a `FILE` node.
> Example:
> ```javascript
> GROUP(
>   DIR('nodes',
>     // Will load {path}/nodes/nodes.bin
>     FILE('nodes.bin',
>       ...
>     ),
>     // Will load {path}/nodes/manifest.bin
>     FILE('manifest.bin',
>       ...
>     )
>   ),
>   DIR('project',
>     // Will load {path}/project/...
>     ...
>   )
> )
> ```

<br>

> **GROUP(*...children*)**
>
> Group nodes into a single node.
>
> Example:
> ```javascript
> const HEADER_FORMAT = GROUP(
>   U32('magic'),
>   U16('version'),
>   U32('dataOffset'),
> );
>
> const CUSTOM_FILE_FORMAT = GROUP(
>   // Header node
>   HEADER,
>   // Data
>   GROUP(
>     U32('data', [
>       U16()
>     ])
>   ),
> );
> ```

<br>

> **SELECT(*callback*)**
> `SELECT` is a "conditional node" that can be thought of as an `if` statement. It takes a method as its single argument, and is expected to return a new node to follow. It can be used, for example, to select the file format based of a version header.
>
> Example:
> ```javascript
> const FORMAT_V1 = ...;
> const FORMAT_V2 = ...;
>
> const FORMAT = GROUP(
>   U32('magic'),
>   U16('version'),
>   SELECT(({ dataContext }) => {
>     if (dataContext.version === 2)
>       return FORMAT_V2;
>     else
>       return FORMAT_V1;
>   }),
> );
> ```

<br>

> **I8(*name, value*)**
>
> Specifies an signed 8-bit integer data point. `name` is optional only if this node is part of a sequence. `value` is the default value to use if none is provided by the provider.
>

<br>

> **U8(*name, value*)**
>
> Specifies an unsigned 8-bit integer data point. `name` is optional only if this node is part of a sequence. `value` is the default value to use if none is provided by the provider. `value` can also be an array to specify the start of a sequence. If `value` is an array (specifying a sequence), then the **length** of the sequence--specified by this node--would be written as an unsigned 8-bit integer.
>
> Example:
> ```javascript
> const SEQUENCE = GROUP(
>   // Specify a sequence of the following format
>   // U8 = length of sequence
>   // ...[U32] bytes in sequence
>   U8('sequence', [
>     U32()
>   ])
> );
>
> const COMPLEX_SEQUENCE = GROUP(
>   // Specify a sequence of the following format
>   // U8 = length of sequence
>   // ...[{ type: U32, value: F32 }] sequence
>   U8('sequence', [
>     U32('type'),
>     F32('value'),
>   ])
> );
> ```

<br>

> **I16(*name, value*)**
>
> Specifies an signed 16-bit integer data point. `name` is optional only if this node is part of a sequence. `value` is the default value to use if none is provided by the provider.
>

<br>

> **U16(*name, value*)**
> Specifies an unsigned 16-bit integer data point. `name` is optional only if this node is part of a sequence. `value` is the default value to use if none is provided by the provider. `value` can also be an array to specify the start of a sequence. If `value` is an array (specifying a sequence), then the **length** of the sequence--specified by this node--would be written as an unsigned 16-bit integer.
>

<br>

> **I32(*name, value*)**
>
> Specifies an signed 32-bit integer data point. `name` is optional only if this node is part of a sequence. `value` is the default value to use if none is provided by the provider.
>

<br>

> **U32(*name, value*)**
> Specifies an unsigned 32-bit integer data point. `name` is optional only if this node is part of a sequence. `value` is the default value to use if none is provided by the provider. `value` can also be an array to specify the start of a sequence. If `value` is an array (specifying a sequence), then the **length** of the sequence--specified by this node--would be written as an unsigned 32-bit integer.
>

<br>

> **I64(*name, value*)**
>
> Specifies an signed 64-bit integer data point. `name` is optional only if this node is part of a sequence. `value` is the default value to use if none is provided by the provider.
>

<br>

> **U64(*name, value*)**
> Specifies an unsigned 64-bit integer data point. `name` is optional only if this node is part of a sequence. `value` is the default value to use if none is provided by the provider. `value` can also be an array to specify the start of a sequence. If `value` is an array (specifying a sequence), then the **length** of the sequence--specified by this node--would be written as an unsigned 64-bit integer.
>

<br>

> **F32(*name, value*)**
>
> Specifies a 32-bit floating data point. `name` is optional only if this node is part of a sequence. `value` is the default value to use if none is provided by the provider.
>

<br>

> **F64(*name, value*)**
>
> Specifies a 64-bit floating (double) data point. `name` is optional only if this node is part of a sequence. `value` is the default value to use if none is provided by the provider.
>

<br>

> **LATIN1(*value*)**
>
> Specify a `latin1` encoded string. `name` is missing deliberately, and must be specified by the **length** `U8`, `U16`, `U32`, or `U64` parent node (this is required to know the length of the string). `value` is optional, and if present will specify a default value if one is not provided by the provider.
>
> Example:
> ```javascript
> const STRING_FORMAT = GROUP(
>   // The U32 node here specifies the length of the string
>   U32('string', LATIN1('Hello World!')),
> );
>
> // You could always make your own string node with the length specifier built-in:
> const STRING = (name, value) => U32(name, LATIN1(value));
>
> const STRING_FORMAT = GROUP(
>   STRING('string', 'Hello World!'),
> );
> ```

<br>

> **UTF16(*value*)**
>
> Specify a `utf16le` encoded string. `name` is missing deliberately, and must be specified by the **length** `U8`, `U16`, `U32`, or `U64` parent node (this is required to know the length of the string). `value` is optional, and if present will specify a default value if one is not provided by the provider.
>
> Example:
> ```javascript
> const STRING_FORMAT = GROUP(
>   // The U32 node here specifies the length of the string
>   U32('string', UTF16('Hello World!')),
> );
>
> // You could always make your own string node with the length specifier built-in:
> const STRING = (name, value) => U32(name, UTF16(value));
>
> const STRING_FORMAT = GROUP(
>   STRING('string', 'Hello World!'),
> );
> ```

<br>

> **UTF8()**
>
> Specify a `utf8` encoded string. `name` is missing deliberately, and must be specified by the **length** `U8`, `U16`, `U32`, or `U64` parent node (this is required to know the length of the string). `value` is optional, and if present will specify a default value if one is not provided by the provider.
>
> Example:
> ```javascript
> const STRING_FORMAT = GROUP(
>   // The U32 node here specifies the length of the string
>   U32('string', UTF8('Hello World!')),
> );
>
> // You could always make your own string node with the length specifier built-in:
> const STRING = (name, value) => U32(name, UTF8(value));
>
> const STRING_FORMAT = GROUP(
>   STRING('string', 'Hello World!'),
> );
> ```

<br>

> **CUSTOM(*writer, reader, name*)**
> Specify a custom writer and reader node. This node allows you to create a node that will read arbitrary data. `writer` and `reader` need to be methods that will directly write and read to the underlying buffer. `writer` can simply return a `Buffer` object, and the underlying system will write that buffer (in chunks if it is large) to the file-system. `reader` is a bit more complex, as it requires waiting on data buffers to be filled before reading. `name` is optional only if this node is part of a sequence.
>
> Example:
```javascript
// Custom writer that writes a UTF8 encoded,
// string (including the length U16 specifier).
//
// Note: The 'endian'ness must be taken into account
// for full implementation of your custom node.
function customWriter(_value) {
  // 'value' is provided by the default value of the node,
  // or the value for this node as provided by the provider.
  var value     = _value || 'Hello World!';

  // Create a buffer for the string
  var stringBuf = Buffer.from(value);

  // Create a full buffer to contain the U16 length
  // specifier plus the length of the string.
  var buf       = Buffer.alloc(stringBuf.length + 2);

  // Write the length of the string to the buffer
  buf[(this['endian'] === 'be') ? 'writeUInt16BE' : 'writeUInt16LE' ](value.length, 0);

  // Copy the string to the buffer
  stringBuf.copy(buf, 2);

  // Return the buffer to the underlying system to be
  // written to the file-system.
  return buf;
}

// Custom reader that reads a UTF8 encoded,
// string (including the length U16 specifier).
//
// Note: The 'endian'ness must be taken into account
// for full implementation of your custom node.
//
// !!Important!!: It is vitally important NOT to cache
// 'this.readBuffer' or 'this.readBufferOffset' in other
// variables, as they can change at anytime in the
// underlying code.
async function customReader() {
  // First, wait on the two bytes needed to know the
  // length of the string to be read.
  //
  // This could return immediately if the bytes
  // are already available in underlying buffers.
  await this.waitOnData(2);

  // Now read the length of the string,
  // being endian-aware.
  var byteLength = this.readBuffer[(this['endian'] === 'be') ? 'readUInt16BE' : 'readUInt16LE' ](this.readBufferOffset);

  // Make sure to update the read buffer offset
  // anytime you read from the buffer.
  this.updateReadBufferOffset(this.readBufferOffset + 2);

  // Now wait for the full string to be buffered
  await this.waitOnData(byteLength);

  // Read the full string from the readBuffer
  var result = this.readBuffer.slice(this.readBufferOffset, this.readBufferOffset + byteLength);

  // Make sure to update the read buffer offset
  // anytime you read from the buffer.
  this.updateReadBufferOffset(this.readBufferOffset + byteLength);

  // Finally, turn the buffer into a utf8 encoded string
  return result.toString('utf8');
}

const FORMAT = GROUP(
  // Header
  U32('magic',    0xDEADBEEF),
  U16('version',  1),
  CUSTOM(
    customWriter,
    customReader,
    'utf8String',
  ),
);

// You could always create a custom definer
// to make this easier to use.
const UTF8_STRING = (name) => CUSTOM(
  customWriter,
  customReader,
  name,
);

const FORMAT = GROUP(
  // Header
  U32('magic',    0xDEADBEEF),
  U16('version',  1),
  UTF8_STRING('utf8String'),
);
```

## Important Notes

1. Only `U8`, `U16`, `U32`, and `U64` nodes can be used for sequences, and string length specifiers.
2. All nodes require names, unless they are part of a raw array sqeuence.
3. When defining a sequence, if even one node of the sequence isn't named, then the entire sequence will be read as a raw array of arrays (instead of an array of objects).
4. Endianness is not implicit by design. You **MUST** specify the endianness of your operations!

## Compose and publish your own definers!

Want to write a template to read a PNG? A BMP? Binary JSON? Something else? Great! Consider publishing your templates so that others can use them. The more templates created and published and the more useful this library becomes!

## Have an idea to improve this library?

Do you want to be able to read directly from ZIP archives? Maybe stream media? Maybe you want to do something that isn't currently supported? All help in the form of PRs is welcome!

## Known issues

1. If a sequence is larger than the length specifier can contain it won't be trimmed, and can potentially cause file corruption. Make sure you use the correct integer type for the length of your arrays so you don't end up with overflow corruption! PRs welcome!
