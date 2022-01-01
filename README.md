# schreamer

File schema defining and streaming with a composable interface.

This library works by allowing the defining of composable binary format templates that can be used to write and read binary data based of these templates.

File handling is not limited to one file, but rather, a template can define an entire file tree to write and read from.

Once a file template is defined, it can be composed into other templates to create new bigger and better templates.

## TODO:
1. Add "GROUP" format specifier (right now arrays are used, and this will be a problem for composition)
2. Add a "SELECT" format specifier to change the format on the fly (i.e. change the format based on a version specification inside the file)
3. Add ability to have "helpers" for the read provider
4. Write better documentation
5. Ensure all error handling is proper and in-place (some error-handling might currently be missing)
6. Implement a custom interface for creating streams (will make this library much more flexible and useful)

## Documentation

For now, until I complete the documentation, please refer to the unit tests for examples.
