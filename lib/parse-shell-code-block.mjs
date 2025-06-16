/** ### Parses a markdown shell code block
 * 
 * Each code block in a step-by-step guide must follow this format:
 * 
 * - The first non-empty lines are a description (each line starts '# ')
 * - The next lines are the described command (no lines can start '#')
 * - The command is followed by output lines (each line starts '# ')
 * - The next set of description/command/output follows after a single empty line
 *
 * @typedef {Object} ShellCodeBlockToken
 * @property {'description' | 'command' | 'output'} kind - The type of the token.
 * @property {string[]} lines - The lines of text in the token, trimmed of leading whitespace.
 *
 * @param {string} codeBlock - The markdown shell code block to parse.
 * @returns {ShellCodeBlockToken[]} - An array of nodes (plain objects) representing the parsed code block.
 * @throws {Error} - If the code block is not formatted correctly.
 *
 * @example
 * const codeBlock = '# List current folder\nls\n# LICENSE         node_modules\n# package.json    README.md';
 * const parsed = parseShellCodeBlock(codeBlock);
 * console.log(JSON.stringify(parsed, null, 2));
 * // Output:
 * // [
 * //   {
 * //     "kind": "description",
 * //     "lines": [ "List current folder"]
 * //   },
 * //   {
 * //     "kind": "command",
 * //     "lines": [ "ls" ]
 * //   },
 * //   {
 * //     "kind": "output",
 * //     "lines": [ "LICENSE         node_modules", "package.json    README.md" ]
 * //   }
 * // ]
 */
export function parseShellCodeBlock(codeBlock) {
  const pfx = 'parseShellCodeBlock():';

  // Split into lines (not trimmed yet), handling both \n and \r\n
  const rawLines = codeBlock.split(/\r?\n/);

  // Remove empty (whitespace-only) lines from the start and end.
  const lines = [];
  let didFindNonEmpty = false;
  for (let i=0; i<rawLines.length; i++) {
    const endTrimmedLine = rawLines[i].trimEnd(); // trim trailing whitespace, but not leading
    if (endTrimmedLine === '' && !didFindNonEmpty) continue; // skip leading empty lines
    didFindNonEmpty = true; // found a non-empty line
    lines.push(endTrimmedLine);
  }
  for (let i=lines.length-1; i>=0; i--) {
    if (lines[i] !== '') { // found last non-empty line
      lines.splice(i + 1); // remove all lines after it
      break;
    }
  }
  if (lines.length === 0) return []; // empty code block returns an empty array

  // The first line should be a description.
  if (lines[0] !== '#' && !lines[0].startsWith('# '))
    throw new Error(`${pfx} First non-empty line must be commented "# ..."`);
  /** @type ShellCodeBlockToken[] */
  const result = [{
    kind: 'description',
    lines: [],
  }];
  let current = result[0];

  for (const line of lines) {

    // Record a description or output line.
    if (line.startsWith('# ') || line === '#') { // a well formatted comment line
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
      continue;
    }
    if (line.trimStart().startsWith('#')) { // an ambiguous comment line
      throw new Error(`${pfx} All description and output lines with text must start "# "`);
    }

    // Deal with an empty line.
    if (line === '') {
      if (current.kind === 'output') { // a single empty line signifies end of output
        current = {
          kind: 'description',
          lines: [],
        };
        result.push(current);
      } else {
        const afterOrBefore = current.lines.length ? 'after' : 'before'
        throw new Error(`${pfx} Unexpected empty line ${afterOrBefore} ${current.kind}`);
      }
      continue;
    }

    // Record a command line.
    if (current.kind === 'command') {
      current.lines.push(line);
    } else if (current.kind === 'description') {
      current = {
        kind: 'command',
        lines: [line],
      };
      result.push(current);
    } else {
      throw new Error(`${pfx} Unexpected uncommented line in ${current.kind}`);
    }
  }

  if (current.kind !== 'output')
    throw new Error(`${pfx} Last non-empty line must be output not ${current.kind}`);

  return result;
}

/** ### Runs all parseShellCodeBlock() unit tests
 * @param {import('assert').strictEqual} eq - A function to check that normal usage works as expected.
 * @param {import('assert').throws} throws - A function to check that exceptions are thrown as expected.
 */
export function testParseShellCodeBlock(eq, throws) {
  const pfx = 'parseShellCodeBlock():';
  const fn = parseShellCodeBlock;

  // Can return an empty array.
  eq(fn(''), [], 'Empty code block should return an empty array');
  eq(fn('  \n\t\r\n\n'), [], 'Code block with only whitespace should return an empty array');

  // First non-empty line must be correct.
  throws(
    () => fn('   \n \t \r\nsome-command --version'),
    { message: `${pfx} First non-empty line must be commented "# ..."` },
    "Should throw if first non-empty line is not commented",
  );
  throws(
    () => fn(' # Description with leading space'),
    { message: `${pfx} First non-empty line must be commented "# ..."` },
    "Should throw if first line has leading space before hash",
  );
  throws(
    () => fn('\t\n#Description with missing space after hash'),
    { message: `${pfx} First non-empty line must be commented "# ..."` },
    "Should throw if first non-empty line has no space after hash",
  );

  // Description lines must be correct.
  throws(
    () => fn('# Good description,\n# more good desc,\n\t# bad description.'),
    { message: `${pfx} All description and output lines with text must start "# "` },
    "Should throw if a description line has leading space before hash",
  );
  throws(
    () => fn('# Good description,\n# more good desc,\n#bad description.'),
    { message: `${pfx} All description and output lines with text must start "# "` },
    "Should throw if a description line has no space after hash",
  );

  // A description must be immediately followed by a command.
  throws(
    () => fn('\n  \r  \n# Just a description.\n   \r\n\t\t\n\n'),
    { message: `${pfx} Last non-empty line must be output not description` },
    "Should throw if the only non-empty line is a description",
  );
  throws(
    () => fn('# Two lines of\n# description.'),
    { message: `${pfx} Last non-empty line must be output not description` },
    "Should throw if the only non-empty lines are descriptions",
  );
  throws(
    () => fn('\n\n# Description followed by an empty line\n\t\t\nsome-command'),
    { message: `${pfx} Unexpected empty line after description` },
    "Should throw if an empty line follows a description",
  );

  // A command must be immediately followed by output.
  throws(
    () => fn('\n  \r  \n# A description.\nsome-command   \r\n\t\t\n\n'),
    { message: `${pfx} Last non-empty line must be output not command` },
    "Should throw if the only non-empty lines are a description followed by a command",
  );
  throws(
    () => fn('# A description.\ntwo lines of \\\ncommands'),
    { message: `${pfx} Last non-empty line must be output not command` },
    "Should throw if the only non-empty lines are a description followed by a multi-line command",
  );
  throws(
    () => fn('\n\n# Description.\nsome-command-with\n  \nan empty-line'),
    { message: `${pfx} Unexpected empty line after command` },
    "Should throw if a command contains an empty line",
  );

  // Output must be immediately followed by one newline, or the end of the code-block.
  throws(
    () => fn('# Desc.\ncmd\n# Output\nwhat is this?!'),
    { message: `${pfx} Unexpected uncommented line in output` },
    "Should throw if the second line of output is not commented",
  );
  throws(
    () => fn('# Desc.\ncmd\n# Well commented output\n # Badly commented output\n\n'),
    { message: `${pfx} All description and output lines with text must start "# "` },
    "Should throw if the second line of output has a space before the hash",
  );
  throws(
    () => fn('# Desc.\ncmd\n#Badly commented output\t\n'),
    { message: `${pfx} All description and output lines with text must start "# "` },
    "Should throw if a single-line-output has no space after the hash",
  );
  throws(
    () => fn('#\nc\n#\n    \n\t\t\n# 2nd description'),
    { message: `${pfx} Unexpected empty line before description` },
    "Should throw if an output has three empty lines before the next description",
  );

  // Test that valid code blocks are [parsed correctly].
  eq(
    fn('#\nc\n#'),
    [
      { kind: 'description', lines: [''] },
      { kind: 'command',     lines: ['c'] },
      { kind: 'output',      lines: [''] },
    ],
    "Should parse an absolutely minimal valid code block",
  );
  eq(
    fn('  \r\n  \t  \r\n#\t  \t\r\nc\n# \t\t  \r\n  '),
    [
      { kind: 'description', lines: [''] },
      { kind: 'command',     lines: ['c'] },
      { kind: 'output',      lines: [''] },
    ],
    "Should parse a minimal valid code block with CRLF and lots of whitespace",
  );
  eq(
    fn('# A description.\nsome-command --version\n# v1.2.3'),
    [
      { kind: 'description', lines: ['A description.'] },
      { kind: 'command',     lines: ['some-command --version'] },
      { kind: 'output',      lines: ['v1.2.3'] },
    ],
    "Should parse a fairly minimal valid code block (newlines)",
  );
  eq(
    fn('  \r\n# A description.\r\nsome-command --version\r\n# v1.2.3\r\n\r\n  '),
    [
      { kind: 'description', lines: ['A description.'] },
      { kind: 'command',     lines: ['some-command --version'] },
      { kind: 'output',      lines: ['v1.2.3'] },
    ],
    "Should parse a fairly minimal valid code block (CRLF and leading/trailing whitespace)",
  );
  eq(
    fn('\n\t\n#   One  \n# Two\n# \t\tThree\t\nfour \n  five\t\t\n\tsix\n# \t Seven\n# Eight\t \t\n#  Nine\n   '),
    [
      { kind: 'description', lines: ['One', 'Two', 'Three'] },
      { kind: 'command',     lines: ['four', '  five', '\tsix'] },
      { kind: 'output',      lines: ['Seven', 'Eight', 'Nine'] },
    ],
    "Should parse and correctly trim multi-line description, command, and output",
  );
  eq(
    fn('# Desc 1a,\n# desc 1b.\n#\n#\ncmd -1\n# Out 1a\n#\t\t  \n# Out 1c\n\n# Desc 2.\ncmd -2a \\\ncmd 2b\n# Out 2'),
    [
      { kind: 'description', lines: ['Desc 1a,','desc 1b.', '', ''] },
      { kind: 'command',     lines: ['cmd -1'] },
      { kind: 'output',      lines: ['Out 1a', '', 'Out 1c'] },
      { kind: 'description', lines: ['Desc 2.'] },
      { kind: 'command',     lines: ['cmd -2a \\', 'cmd 2b'] },
      { kind: 'output',      lines: ['Out 2'] },
    ],
    "Should parse a valid code block containing two sets of description, command, and output",
  );

  // Test the example from the function JSDocs.
  eq(
    fn('# List current folder\nls\n# LICENSE         node_modules\n# package.json    README.md'),
    [
      { kind: 'description', lines: ['List current folder'] },
      { kind: 'command',     lines: ['ls'] },
      { kind: 'output',      lines: ['LICENSE         node_modules',
                                     'package.json    README.md'] },
    ],
    "Should parse the example from the function JSDocs correctly",
  )
}
