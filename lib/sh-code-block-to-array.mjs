/** @fileoverview Transforms a markdown shell code-block to a JSONable array
 * 
 * @usage
 * 
 * Given a markdown file with a shell code block like this...
 * 
 * ```sh
 * # The `--version` or `-v` flag makes some-command exit without doing anything.
 * some-command --version
 * # v1.2.3
 * ```
 * 
 * ...passing the code block string to shCodeBlockToArray() transforms it into
 * a JavaScript array, which stringifies to:
 * 
 * ```json
 * [
 *   {
 *     "kind": "description",
 *     "lines": [
 *       "The `--version` or `-v` flag makes some-command exit without doing anything."
 *     ]
 *   },
 *   {
 *     "kind": "command",
 *     "lines": [
 *       "some-command --version"
 *     ]
 *   },
 *   {
 *     "kind": "output",
 *     "lines": [
 *       "v1.2.3"
 *     ]
 *   }
 * ]
 * ```
 */

export function shCodeBlockToArray(codeBlock) {
  const pfx = 'shCodeBlockToArray():';

  // Remove leading/trailing whitespace, e.g. empty lines at start and end.
  const trimmedLines = codeBlock.trim();
  if (trimmedLines === '') return []; // empty code block returns an empty array

  // Split into lines, handling both \n and \r\n
  const lines = trimmedLines.split(/\r?\n/);

  // The first line should be a description.
  if (!lines[0].startsWith('# '))
    throw new Error(`${pfx} First non-empty line must be commented "# ..."`);
  const result = [{
    kind: 'description',
    lines: [],
  }];
  let current = result[0];

  for (const line of lines) {
    if (line.startsWith('# ')) { // a comment line
      const trimmedLine = line.slice(2).trim(); // remove '# ' and trailing whitespace
      if (current.kind === 'command') {
        current = {
          kind: 'output',
          lines: [trimmedLine],
        };
        result.push(current);
      } else { // could be in a description or output
        current.lines.push(trimmedLine);
      }
    } else if (line.trim() === '') { // an empty line
      if (current.kind === 'output') { // a single empty line signifies end of output
        current = {
          kind: 'description',
          lines: [],
        };
        result.push(current);
      } else {
        throw new Error(`${pfx} Unexpected empty line in ${current.kind}`);
      }
    } else { // a command line
      if (current.kind === 'command') {
        current.lines.push(line.trimEnd()); // don't trim leading whitespace
      } else {
        throw new Error(`${pfx} Unexpected uncommented line in ${current.kind}`);
      }
    }
  }

  if (current.kind !== 'output')
    throw new Error(`${pfx} Last block must be output not ${current.kind}`);

  return result;
}

export function testShCodeBlockToArray(eq, throws) {
    const fn = shCodeBlockToArray;

    eq(fn(''), [], 'Empty code block should return an empty array');
    eq(fn('  \n\t\n\n'), [], 'Code block with only whitespace should return an empty array');
}
