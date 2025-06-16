/** #### Runs all tests
 *
 * @example
 * npm test
 */

import util from 'util';
import { deepEqual as eq, throws } from 'node:assert';
import { testParseRawMarkdown } from './lib/parse-raw-markdown.mjs';
import { testParseShellCodeBlock } from './lib/parse-shell-code-block.mjs';

// Set the default depth to Infinity to remove the nested object depth limit.
util.inspect.defaultOptions.depth = Infinity;

// Check that eq() and throws() work as expected.
eq({a:1}, {a:1}, 'eq() should duck-type check objects');
throws(
  () => { throw RangeError('Some message') },
  { message: /Some message/, name: 'RangeError' },
  "throws() should check the error message and type",
);

// Test library functions.
testParseRawMarkdown(eq, throws);
testParseShellCodeBlock(eq, throws);

// Test the main entry point.
// TODO

console.log('\n\u2705 All tests passed\n');
