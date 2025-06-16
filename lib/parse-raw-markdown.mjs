import fmCjs from 'front-matter';
import hljs from 'highlight.js';
import { marked } from 'marked';
import { parseShellCodeBlock } from './parse-shell-code-block.mjs';

/** ### Apply the correct type to the common-js front-matter parser
 * @type {(md: string) => import('front-matter').FrontMatterResult}
 */
// @ts-ignore
const fm = fmCjs;

const markedDefaultOptions = marked.getDefaults();

const afterHighlightHandler = (result) => {
  const pfx = 'afterHighlightHandler():';
  const children = result?._emitter?.rootNode?.children;
  if (!Array.isArray(children)) throw Error(
    `${pfx} _emitter.rootNode.children is type "${typeof children}" not an array`);
  // console.log('afterHighlightHandler', result._emitter.rootNode.children);
  result.value = children.map(highlightJsChildToNode);
;
}

/** ### Recursively transforms a highlight.js child to a node */
function highlightJsChildToNode(child) {
  if (typeof child === 'string') return child; // Return plain text directly
  const {
    children, // sub-nodes for nested structures
    scope: kind, // the type of the child, e.g. 'string', 'variable.language', etc.
  } = child;
  return { kind, subnodes: children.map(highlightJsChildToNode) };
}

hljs.addPlugin({
  'after:highlight': afterHighlightHandler,
});

/**
 * @typedef MarkdownNode - A node representing a parsed markdown element.
 * @type {string|MarkdownNodeObject|import('./parse-shell-code-block.mjs').ShellCodeBlockToken}
 * 
 * @typedef MarkdownNodeObject - When the node is not a string, it's an object with a `kind` property.
 * @type {Object}
 * @property {MarkdownNodeAlign[]} [align] - The alignment of columns in a table, if applicable.
 * @property {boolean} [block] - Whether the HTML token is a block element, if applicable.
 * @property {Object} [data] - frontmatter.
 * @property {number} [depth] - The depth of the heading, if applicable (1-6).
 * @property {string} [href] - The URL of a link or image, if applicable.
 * @property {MarkdownNodeKind} kind - The type of the node, e.g. 'heading', 'paragraph', 'blockquote', etc.
 * @property {string} [language] - The programming language of a code block, if applicable.
 * @property {boolean} [ordered] - Whether a list is ordered or unordered, if applicable.
 * @property {boolean} [pre] - Whether the HTML token is a preformatted element, if applicable.
 * @property {MarkdownNodeSeverity} [severity] - The severity of an alert, if applicable, e.g. 'note', 'tip', etc.
 * @property {MarkdownNode[]} [subnodes] - An array of sub-nodes representing the content of the node.
 * @property {string} [title] - The title of a link or image, if applicable.
 *
 * @typedef MarkdownNodeAlign - A string representing the alignment of a table column, or `null` if not specified.
 * @type {'center'|'left'|'right'|null}
 * 
 * @typedef MarkdownNodeKind - The type of the markdown node
 * @type {'alert'|'blockquote'|'br'|'code'|'comment'|'del'|'em'|'codespan'|'frontmatter'|'heading'|'hr'|'html'|'image'|'link'|'list'|'list_item'|'paragraph'|'strong'|'table'|'table_header'|'table_row'|'table_cell'}
 * 
 * @typedef MarkdownNodeSeverity - The severity of an alert, if applicable, e.g. 'note', 'tip', etc.
 * @type {'caution'|'important'|'note'|'tip'|'warning'}
 */

/** ### Parses the raw markdown content of a file
 * 
 * Markdown content in a step-by-step guide must follow this format:
 * 
 * TODO describe the format
 *
 * Note that this function defers parsing shell code blocks to
 * [parseShellCodeBlock()](./parse-shell-code-block.mjs)
 *
 * @param {string} rawMarkdown - The unprocessed content of a markdown file, to parse.
 * @returns {MarkdownNode[]} - An array of nodes representing the parsed markdown file.
 * @throws {Error} - If the code block is not formatted correctly.
 *
 * @example
 * const rawMarkdown = '# Heading\n\n> This is a *blockquote.*\n\n## Subheading\n\nSome  \ntext\nhere.\n';
 * console.log(parseRawMarkdown(rawMarkdown));
 * // Output:
 * // [
 * //   { kind: 'heading', depth: 1, subnodes: ['Heading'] },
 * //   { kind: 'blockquote', subnodes: [{
 * //     kind: 'paragraph', subnodes: [
 * //       'This is a ', { kind: 'em', subnodes: ['blockquote.'] },
 * //     ]}
 * //   ]},
 * //   { kind: 'blockquote', subnodes: ['This is a blockquote.'] },
 * //   { kind: 'heading', depth: 2, subnodes: ['Subheading'] },
 * //   { kind: 'paragraph', subnodes: ['Some', { kind: 'br' }, 'text\nhere.'] },
 * // ]
 */
export function parseRawMarkdown(rawMarkdown) {
  const pfx = 'parseRawMarkdown():';

  // Remove any frontmatter, and convert it to a JavaScript object.
  const { attributes: frontmatter, body: rawMarkdownBody } = fm(rawMarkdown);

  const lexer = new marked.Lexer(markedDefaultOptions); // TODO maybe reuse same lexer
  const markedTokensAndLinks = lexer.lex(rawMarkdownBody);
  // const markedLinks = markedTokensAndLinks.links; // TODO - use the links, or otherwise remove this line
  // if (Object.keys(markedLinks).length) console.log('TODO do something with markedLinks', markedLinks);
  const markedTokens = [...markedTokensAndLinks];

  const markdownNodes = markedTokens
    .map(tokenToNode)
    .filter(Boolean); // Remove null values (spaces)

  // Prepend any frontmatter to the tokens, or otherwise return tokens directly.
  if (Object.keys(frontmatter).length === 0) return markdownNodes;
  return [
    { kind: 'frontmatter', data: frontmatter },
    ...markdownNodes,
  ];
}

/** ### Recursively transforms a `marked` token to a node
 * 
// address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul

 * #### `token` has these properties, which are all optional except `type`
 *
 * - `align`: Alignment of columns, if a table token
 * - `block`: Whether an HTML token is a block element
 * - `depth`: The depth of a heading (1-6)
 * - `header`: The header text of a table token
 * - `href`: The URL of an image or link token
 * - `items`: Items in a list
 * - `lang`: Language, if a fenced code block
 * - `ordered`: Whether a list is ordered or unordered
 * - `pre`: Whether an HTML token is a preformatted element, like <pre>
 * - `rows`: Rows in a table token (2D array)
 * - `text`: The text content of the token
 * - `title`: The title of an image or link token
 * - `tokens`: Sub-tokens for nested structures
 * - `type`: The type of the token, renamed to `kind` in a MarkdownNode
 * 
 * #### The recognised 'block' values for `type`
 * 
 * - `"blockquote"`
 * - `"code"`
 * - `"heading"`
 * - `"hr"`
 * - `"list"`
 * - `"list_item"`
 * - `"paragraph"`
 * - `"table"`
 * 
 * #### The recognised 'inline' values for `type`
 * 
 * - `"br"`
 * - `"codespan"`
 * - `"del"`
 * - `"em"`
 * - `"image"`
 * - `"link"`
 * - `"strong"`
 * 
 * #### Special values for `type`
 * 
 * - `"html"` - can be block or inline, and has `block` and `pre` properties
 * - `"space"` - a space token, which is ignored - TODO maybe don't ignore it?
 * - `"text"` - a plain text token, which becomes a scalar string, not an object
 * 
 * #### Values for `type` which are not yet supported
 * 
 * TODO try to produce and handle these:
 * 
 * - `"def"`
 * - `"checkbox"`
 * - `"escape"`
 * - `"tag"`
 *
 * #### The `kind` of MarkdownNode is the same as `type`, plus
 * 
 * - `"alert"` - for GitHub style alerts (blockquotes with a special format)
 * - `"comment"` - for HTML comments
 * - `"frontmatter"` - for frontmatter at the start of a markdown file
 * - 

 *
 * @param {import('marked').Token} token - The Marked token to transform.
 * @returns {MarkdownNode} - The transformed node.
 * @throws {Error} - If the token type is not supported.
 */
function tokenToNode(token) {
  const pfx = 'tokenToNode():';
  const kind = token.type;

  switch (kind) {
    case 'text':
      return token.text; // Return plain text directly
    case 'br':
    case 'hr':
      return { kind };
    case 'code':
      const language = token.lang || 'plaintext';
      if (!new Set(['bash', 'console', 'fish', 'shell', 'sh', 'zsh']).has(language)) {
        const { value } = hljs.highlight(token.text, { language });
        // @ts-expect-error - TODO `value` can contain a `kind` like 'string' or 'variable.language'
        return { kind, language, subnodes: value };
      }
      const subnodes = parseShellCodeBlock(token.text)
        .map((subnode) => {
          const { kind, lines } = subnode;
          if (kind !== 'command') return subnode;
          const { value } = hljs.highlight(lines.join('\n'), { language });
          return {
            kind,
            subnodes: value
          };
        })
      ;
      // @ts-expect-error - TODO `subnodes` can contain a `kind` like 'string' or 'variable.language'
      return { kind, language, subnodes };
    case 'codespan':
      return { kind, subnodes: [token.text] };
    case 'heading':
      return { kind, depth: token.depth, subnodes: [token.text] };
    case 'html':
      // @ts-expect-error - `pre` is definitely present on HTML tokens
      const { block, pre, text } = token;
      if (text.startsWith('<!--') && text.endsWith('-->')) {
        // If the HTML token is a comment, return it as a "comment" node.
        return { kind: 'comment', subnodes: [text.slice(4, -3).trim()] };
      }
      return { block, kind, ...(block ? { pre } : {}), subnodes: [text] };
    case 'image':
    case 'link':
      const { href, title, tokens } = token;
      return { kind, href, ...(title && { title }), subnodes: tokens.map(tokenToNode).filter(Boolean) };
    case 'space':
      return null; // Ignore spaces
    case 'list':
      const { items, ordered } = token;
      return { kind, ordered, subnodes: items.map(tokenToNode).filter(Boolean) };
    // case 'def': // TODO try to produce this
    case 'blockquote':
      const node = { kind, subnodes: token.tokens.map(tokenToNode).filter(Boolean) };
      const firstSubnode = node.subnodes[0];
      if (typeof firstSubnode !== 'object' || firstSubnode.kind !== 'paragraph') return node;
      const firstSubSubnode = firstSubnode.subnodes[0];
      const remainingSubSubnodes = firstSubnode.subnodes.slice(1);
      if (typeof remainingSubSubnodes[0] !== 'object' || remainingSubSubnodes[0].kind === 'br') {
        // If the first sub-subnode is a line break, remove it.
        remainingSubSubnodes.shift();
      }
      if (typeof firstSubSubnode !== 'string' || firstSubSubnode.slice(0, 2) !== '[!') return node;
      const newlinePos = firstSubSubnode.indexOf('\n');
      const rawAlertType = firstSubSubnode.slice(2, newlinePos === -1 ? undefined : newlinePos);
      const matches = rawAlertType.match(/^(CAUTION|IMPORTANT|NOTE|TIP|WARNING)\]\s*$/);
      if (!matches) return node;
      const severity = matches[1].toLowerCase();
      switch (severity) { // `switch ... case` keeps TypeScript happy 
        case 'caution':
        case 'important':
        case 'note':
        case 'tip':
        case 'warning': // Valid alert types
          return { kind: 'alert', severity, subnodes: [
            {
              kind: 'paragraph',
              subnodes: [
                ...(newlinePos === -1 ? [] : [firstSubSubnode.slice(newlinePos + 1)]), // The text directly after the alert type
                ...remainingSubSubnodes, // any other nodes in the first paragraph
              ],
            },
            ...node.subnodes.slice(1), // any following nodes
          ]};
        default:
          throw Error(
            `${pfx} Invalid alert type "${severity}" in "${firstSubSubnode}" - ` +
            'expected one of: caution, important, note, tip, warning');
      }
    case 'table':
      const { align, header, rows } = token;
      return { align, kind, subnodes: [
        {
          kind: 'table_header',
          subnodes: header.map(({ tokens }) => ({
            kind: 'table_cell',
            subnodes: tokens.map(tokenToNode).filter(Boolean),
          })),
        },
        ...(rows.map((row) => ({
          kind: 'table_row',
          subnodes: row.map(({ tokens }) => ({
            kind: 'table_cell',
            subnodes: tokens.map(tokenToNode).filter(Boolean),
          })),
        }))),
      ]};
    case 'del':
    case 'em':
    case 'list_item':
    case 'paragraph':
    case 'strong':
      // console.log(`tokenToNode(): token type "${kind}"`, token);      
      return { kind, subnodes: token.tokens.map(tokenToNode).filter(Boolean) };
    default:
      throw new Error(`Unsupported token type "${kind}"`);
  }
}

/** ### Runs all parseRawMarkdown() unit tests
 * @param {import('assert').strictEqual} eq - A function to check that normal usage works as expected.
 */
export function testParseRawMarkdown(eq) {
  const fn = parseRawMarkdown;

  // Can return an empty array.
  eq(fn(''), [], 'Empty markdown should return an empty array');
  eq(fn('  \n\t\r\n\n'), [], 'Markdown with only whitespace should return an empty array');

  // Can parse code blocks.
  eq(fn('~~~js\nconsole.log("Hello, world!");\n~~~'),
    [{ kind: 'code', language: 'js', subnodes:  [
      { kind: 'variable.language', subnodes: ['console'] },
      '.',
      { kind: 'title.function', subnodes: ['log'] },
      '(',
      { kind: 'string', subnodes: ['"Hello, world!"'] },
      ')',
      ';'
    ]}],
    'Should parse a code block with JavaScript language');
  eq(fn('```sh\n# List pwd\nls -la\n# total 123\n# ...\n```'),
    [{ kind: 'code', language: 'sh', subnodes: [
      { kind: 'description', lines: ['List pwd'] },
      { kind: 'command', subnodes: [ { kind: 'built_in', subnodes: [ 'ls' ] }, ' -la' ] },
      { kind: 'output', lines: ['total 123', '...'] },
    ]}],
    'Should parse a shell code block with parseShellCodeBlock()');
  eq(fn('    Indented\n    code\n    block'),
    [{ kind: 'code', language: 'plaintext', subnodes: [ 'Indented\ncode\nblock']}],
    'Should parse an indented code block');

  // Can parse headings with different levels.
  eq(fn('H1\n=='), [{ kind: 'heading', depth: 1, subnodes: ['H1'] }],
    'Should parse H1 heading with underline');
  eq(fn('H2\n--'), [{ kind: 'heading', depth: 2, subnodes: ['H2'] }],
    'Should parse H2 heading with underline');
  eq(fn('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6'),
    [1,2,3,4,5,6].map(depth => ({
      kind: 'heading', depth, subnodes: [`H${depth}`],
    })), 'Should parse headings with different levels');

  // Can parse simple non-nested nodes inside a paragraph.
  eq(fn('Hello'), [{ kind: 'paragraph', subnodes: ['Hello'] }],
    'Single text node should return a paragraph');
  eq(fn('One  \nTwo'), [{ kind: 'paragraph', subnodes: ['One', { kind: 'br' }, 'Two'] }],
    'Two spaces signifies a line break');
  eq(fn('`someVar`'), [{ kind: 'paragraph', subnodes: [{ kind: 'codespan', subnodes: ['someVar'] }] }],
    'Should parse inline code with backticks');
  eq(fn('~single~ ~~double~~'), [{ kind: 'paragraph', subnodes: [
    { kind: 'del', subnodes: ['single'] }, ' ', { kind: 'del', subnodes: ['double'] }] }],
    'Should parse deleted text with single or double tildes');
  eq(fn('*asterisk*_underscore_'), [{ kind: 'paragraph', subnodes: [
      { kind: 'em', subnodes: ['asterisk'] }, { kind: 'em', subnodes: ['underscore'] }] }],
    'Should parse emphasis (italic)');
  eq(fn('__underscore__**asterisk**'), [{ kind: 'paragraph', subnodes: [
      { kind: 'strong', subnodes: ['underscore'] }, { kind: 'strong', subnodes: ['asterisk'] }] }],
    'Should parse strong (bold)');

  // Can parse blockquotes and GitHub style alerts.
  eq(fn('>'),
    [{ kind: 'blockquote', subnodes: []}],
    'Should parse an empty blockquote');
  eq(fn('> block...\n> ...quote'),
    [{ kind: 'blockquote', subnodes: [{ kind: 'paragraph', subnodes: ['block...\n...quote'],}]}],
    'Should parse regular blockquotes');
  eq(fn('> [!NOTE]\n> This is a note'), [
    {
      kind: 'alert',
      severity: 'note',
      subnodes: [ { kind: 'paragraph', subnodes: [ 'This is a note' ] } ]
    }
  ], 'Should parse a GitHub style alert (which leverages blockquote syntax)');
  eq(fn(`
# Example

> [!NOTE]
> Highlights information that users should take into account, even when skimming.

> [!TIP]  
> Optional information to help a user be more successful.
>
> This has two spaces after the [!TIP] which prevents ESLint from running lines together.

> [!IMPORTANT]
> Crucial information necessary for users to succeed.

> [!WARNING]
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action.
`),
  [
    { kind: 'heading', depth: 1, subnodes: [ 'Example' ] },
    {
      kind: 'alert',
      severity: 'note',
      subnodes: [
        {
          kind: 'paragraph',
          subnodes: [
            'Highlights information that users should take into account, even when skimming.'
          ]
        }
      ]
    },
    {
      kind: 'alert',
      severity: 'tip',
      subnodes: [
        {
          kind: 'paragraph',
          subnodes: [ 'Optional information to help a user be more successful.' ]
        },
        {
          kind: 'paragraph',
          subnodes: [
            'This has two spaces after the [!TIP] which prevents ESLint from running lines together.'
          ]
        }
      ]
    },
    {
      kind: 'alert',
      severity: 'important',
      subnodes: [
        {
          kind: 'paragraph',
          subnodes: [ 'Crucial information necessary for users to succeed.' ]
        }
      ]
    },
    {
      kind: 'alert',
      severity: 'warning',
      subnodes: [
        {
          kind: 'paragraph',
          subnodes: [
            'Critical content demanding immediate user attention due to potential risks.'
          ]
        }
      ]
    },
    {
      kind: 'alert',
      severity: 'caution',
      subnodes: [
        {
          kind: 'paragraph',
          subnodes: [ 'Negative potential consequences of an action.' ]
        }
      ]
    }
  ], 'Should parse multiple GitHub style alerts');

  // TODO stress-test blockquotes and alerts

  // Can parse lists.
  eq(fn('1. One\n2. Two'),
    [{ kind: 'list', ordered: true, subnodes: [
      { kind: 'list_item', subnodes: ['One'] }, { kind: 'list_item', subnodes: ['Two'] },
    ]}],
    'Should parse simple ordered lists');
  eq(fn('- One\n- Two'),
    [{ kind: 'list', ordered: false, subnodes: [
      { kind: 'list_item', subnodes: ['One'] }, { kind: 'list_item', subnodes: ['Two'] },
    ]}],
    'Should parse simple unordered lists');

  // Can parse horizontal rules.
  eq(fn('---\n'), [{ kind: 'hr' }], 'Should parse horizontal rules');

  // Can parse HTML tags.
  eq(fn('<!-- comment -->'), [{ kind: 'comment', subnodes: ['comment'] }],
    'Should parse HTML comments');
  eq(fn('<div>Block text</div>'),
    [{ block: true, kind: 'html', pre: false, subnodes: ['<div>Block text</div>'] }],
    'Should parse DIV tags');
  eq(fn('<pre>Preformatted</pre>'),
    [{ block: true, kind: 'html', pre: true, subnodes: ['<pre>Preformatted</pre>'] }],
    'Should parse PRE tags');
  eq(fn('<span>Inline text</span>'),
    [
      {
        kind: 'paragraph',
        subnodes: [
          { block: false, kind: 'html', subnodes: [ '<span>' ] },
          'Inline text',
          { block: false, kind: 'html', subnodes: [ '</span>' ] }
        ]
      }
    ],
    'Should parse SPAN tags');
  eq(fn('<not-recognised />'),
    [{ block: true, kind: 'html', pre: false, subnodes: ['<not-recognised />'] }],
    'Should parse custom HTML tags');
  // eq(fn('<unexpected>Oops!</unexpected>'), [{ kind: 'paragraph', subnodes: [{ kind: 'del', subnodes: ['deleted'] }] }],
  //   'Should parse deleted text with tildes');
  // eq(fn('<def>Definition</def>'), [{ kind: 'paragraph', subnodes: [{ kind: 'del', subnodes: ['deleted'] }] }],
  //   'Should parse deleted text with tildes');

  // Can parse images.
  eq(fn('![Alt text but no title](https://example.com/image.png)'),
    [{ kind: 'paragraph', subnodes: [
      { kind: 'image', href: 'https://example.com/image.png', subnodes: [ 'Alt text but no title' ] }] }],
    'Should parse images with alt text but no title');
  eq(fn('![Alt text with title](https://example.com/image.png "Title")'),
    [{ kind: 'paragraph', subnodes: [
      { kind: 'image', href: 'https://example.com/image.png', title: 'Title', subnodes: [ 'Alt text with title' ] }] }],
    'Should parse images with alt text and title');
  eq(fn('![Linked via a label][label]\n\n[label]: https://example.com/image.png'),
    [{ kind: 'paragraph', subnodes: [
      { kind: 'image', href: 'https://example.com/image.png', subnodes: [ 'Linked via a label' ] }] }],
    'Should parse an image linked to a label');
  eq(fn('![Labelled image with title][label]\n\n[label]: https://example.com/image.png "Title"'),
    [{ kind: 'paragraph', subnodes: [
      { kind: 'image', href: 'https://example.com/image.png', title: 'Title', subnodes: [ 'Labelled image with title' ] }] }],
    'Should parse an image with a title linked to a label');
  // NOTE - two images can't share the same label

  // Can parse links.
  eq(fn('[Link with no title](https://example.com)'),
    [{ kind: 'paragraph', subnodes: [
      { kind: 'link', href: 'https://example.com', subnodes: ['Link with no title'] }] }],
    'Should parse links with text');
  eq(fn('[Link with text and title](https://example.com "Title")'),
    [{ kind: 'paragraph', subnodes: [
      { kind: 'link', href: 'https://example.com', title: 'Title', subnodes: ['Link with text and title'] }] }],
    'Should parse links with text and title');
  eq(fn('[Labelled link with title][label]\n\n[label]: https://example.com "Title"'),
    [{ kind: 'paragraph', subnodes: [
      { kind: 'link', href: 'https://example.com', title: 'Title', subnodes: ['Labelled link with title'] }] }],
    'Should parse labelled links (reference-style links)');
  eq(fn('<https://example.com>'),
    [{ kind: 'paragraph', subnodes: [
      { kind: 'link', href: 'https://example.com', subnodes: ['https://example.com'] }] }],
    'Should parse links enclosed in angle brackets');
  eq(fn('https://example.com'),
    [{ kind: 'paragraph', subnodes: [
      { kind: 'link', href: 'https://example.com', subnodes: ['https://example.com'] }] }],
    'Should parse links not enclosed in angle brackets');
  eq(fn('[Linked via a label][label]\n\n[Also linked via a label][label]\n\n[label]: https://example.com'),
    [
      {
        kind: 'paragraph',
        subnodes: [
          {
            kind: 'link',
            href: 'https://example.com',
            subnodes: [ 'Linked via a label' ]
          }
        ]
      },
      {
        kind: 'paragraph',
        subnodes: [
          {
            kind: 'link',
            href: 'https://example.com',
            subnodes: [ 'Also linked via a label' ]
          }
        ]
      }
    ],
    'Should parse multiple links with the same label');

  // Can parse tables.
  eq(fn('| Header 1 | Header 2 |\n| --: | :-: |\n| Cell 1 | Cell 2 |\n| Cell 3 | Cell 4 |'),
    [{
      align: [ 'right', 'center' ],
      kind: 'table',
      subnodes: [
        {
          kind: 'table_header',
          subnodes: [
            { kind: 'table_cell', subnodes: [ 'Header 1' ] },
            { kind: 'table_cell', subnodes: [ 'Header 2' ] },
          ],
        },
        {
          kind: 'table_row',
          subnodes: [
            { kind: 'table_cell', subnodes: [ 'Cell 1' ] },
            { kind: 'table_cell', subnodes: [ 'Cell 2' ] },
          ],
        },
        {
          kind: 'table_row',
          subnodes: [
            { kind: 'table_cell', subnodes: [ 'Cell 3' ] },
            { kind: 'table_cell', subnodes: [ 'Cell 4' ] },
          ],
        },
      ],
    }],
    'Should parse a simple table');

  // Can parse frontmatter.
  eq(fn('---\ntitle: My Title\n---\n# Heading'), [
    { kind: 'frontmatter', data: { title: 'My Title' } },
    { kind: 'heading', depth: 1, subnodes: ['Heading'] },
    ], 'Should parse frontmatter and any content after it',
  );

  // Test the example from the function JSDocs.
  eq(
    fn('# Heading\n\n> This is a *blockquote.*\n\n## Subheading\n\nSome  \ntext\nhere.\n'),
    [
      { kind: 'heading', depth: 1, subnodes: ['Heading'] },
      { kind: 'blockquote', subnodes: [{
        kind: 'paragraph', subnodes: [
          'This is a ', { kind: 'em', subnodes: ['blockquote.'] },
        ]}
      ]},
      { kind: 'heading', depth: 2, subnodes: ['Subheading'] },
      { kind: 'paragraph', subnodes: ['Some', { kind: 'br' }, 'text\nhere.'] },
    ],
    'Should parse the example from the function JSDocs correctly',
  )
}
