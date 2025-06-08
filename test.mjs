/** #### Runs all tests
 *
 * @example
 * npm test
 */

import { deepEqual as eq, throws } from "node:assert";
import { testShCodeBlockToArray } from "./lib/sh-code-block-to-array.mjs";

// Check that eq() and throws() work as expected.
eq({a:1}, {a:1}, "eq() should duck-type check objects");
throws(
  () => { throw RangeError("Some message") },
  { message: /Some message/, name: "RangeError" },
  "throws() should check the error message and type",
);

// Test library functions.
testShCodeBlockToArray(eq, throws);

// Test the main entry point.
// TODO

console.log('\n\u2705 All tests passed\n');
