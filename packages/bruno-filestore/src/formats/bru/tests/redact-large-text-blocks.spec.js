const { redactLargeBruTextBlocks, restoreRedactedBlocks } = require('../utils/redact-large-text-blocks');
const { parseBruRequest, parseBruCollection } = require('../index');

const parseViaRedaction = (content, parser) => {
  const { skeleton, blocks } = redactLargeBruTextBlocks(content);
  return restoreRedactedBlocks(parser(skeleton), blocks);
};

const toCRLF = (content) => content.replace(/\n/g, '\r\n');

const requestBru = `meta {
  name: Redaction Test
  type: http
  seq: 1
}

get {
  url: https://example.com/api
  body: json
}

headers {
  content-type: application/json
}

body:json {
  {
    "hello": "world",
    "nested": {
      "a": 1,
      "b": [1, 2, 3]
    }
  }
}

body:text {
  This is a text body
  spanning multiple lines
}

script:pre-request {
  const x = 1;
  if (x) {
    console.log("hi");
  }
}

script:post-response {
  bru.setVar("y", 2);
}

tests {
  test("ok", function() {
    expect(1).to.equal(1);
  });
}

docs {
  # Title

  Some **markdown** docs with a fenced block:

      code line stays indented
}
`;

const graphqlBru = `meta {
  name: GraphQL Test
  type: graphql
  seq: 1
}

post {
  url: https://example.com/graphql
  body: graphql
}

body:graphql {
  {
    launchesPast {
      launch_site {
        site_name
      }
    }
  }
}

body:graphql:vars {
  {
    "limit": 10
  }
}
`;

const grpcBru = `meta {
  name: gRPC Test
  type: grpc
  seq: 1
}

grpc {
  url: grpc://localhost:50051
  method: /hello.Greeter/SayHello
  methodType: unary
}

body:grpc {
  name: message 1
  content: '''
    {
      "greeting": "hi"
    }
  '''
}

script:grpc:before-call-start {
  const startedAt = 1;
  if (startedAt) {
    bru.setVar("startedAt", startedAt);
  }
}

script:grpc:after-call-end {
  bru.setVar("endedAt", 2);
}

script:grpc:before-message-send {
  bru.setVar("sentAt", bru.grpc.request.message.timestamp);
}

script:grpc:after-message-receive {
  bru.setVar("receivedAt", bru.grpc.response.message.timestamp);
}

tests {
  test("hook ran", function() {
    expect(bru.getVar("startedAt")).to.equal(1);
  });
}
`;

const xmlSparqlBru = `meta {
  name: Others
  type: http
  seq: 1
}

post {
  url: https://example.com
  body: xml
}

body:xml {
  <xml>
    <name>John</name>
  </xml>
}

body:sparql {
  SELECT * WHERE {
    ?s ?p ?o .
  }
  LIMIT 10
}
`;

const collectionBru = `headers {
  x-trace: enabled
}

script:pre-request {
  bru.setEnvVar("base", "https://example.com");
}

tests {
  test("collection level", function() {
    expect(true).to.equal(true);
  });
}

docs {
  # Collection docs

  Notes for the whole collection.
}
`;

const folderBru = `meta {
  name: My Folder
  seq: 2
}

docs {
  # Folder docs
}
`;

const blankLinesBru = `meta {
  name: Blanks
  type: http
  seq: 1
}

post {
  url: https://example.com
  body: json
}

body:json {

  {
    "a": 1
  }


}
`;

const appBru = `meta {
  name: App Request
  type: http
  seq: 1
}

get {
  url: https://example.com
  body: none
  auth: none
}

app {
  enabled: true
  code: '''
    <div id="x">hi</div>
    <style>
    body {
      color: red;
    }
    </style>
    <script>
      function go() {
        return { ok: 1 };
      }
    </script>
  '''
}

docs {
  # Docs after the app block
}
`;

const standaloneAppBru = `meta {
  name: Dashboard
  type: app
  seq: 2
}

app {
  code: '''
    <div id="app">standalone</div>
  '''
}
`;

const appWithoutCodeBru = `meta {
  name: No Code
  type: http
  seq: 1
}

get {
  url: https://example.com
  body: none
  auth: none
}

app {
  enabled: true
}
`;

const appEmptyCodeBru = `meta {
  name: Empty Code
  type: http
  seq: 1
}

app {
  enabled: true
  code: '''
  '''
}
`;

const docsAboutAppCodeBru = `meta {
  name: Docs About App Code
  type: http
  seq: 1
}

get {
  url: https://example.com
}

docs {
  # How the app block works

  app {
    code: '''
      <div>hi</div>
    '''
  }
}
`;

const appWithoutCodeThenDocsBru = `meta {
  name: No Code Then Docs
  type: http
  seq: 1
}

get {
  url: https://example.com
}

app {
  enabled: true
}

docs {
  Set the code like this:

  code: '''
    <div>hi</div>
  '''
}
`;

describe('redactLargeBruTextBlocks', () => {
  describe('matches a normal parse (ohm oracle)', () => {
    const requestCases = [
      ['request with bodies, scripts, tests, docs', requestBru],
      ['graphql query + variables', graphqlBru],
      ['xml + sparql bodies', xmlSparqlBru],
      ['grpc request with lifecycle hooks', grpcBru],
      ['CRLF grpc request with lifecycle hooks', toCRLF(grpcBru)],
      ['CRLF request', toCRLF(requestBru)],
      ['leading + trailing blank lines in body', blankLinesBru],
      ['CRLF leading + trailing blank lines', toCRLF(blankLinesBru)],
      ['request-level app code', appBru],
      ['CRLF request-level app code', toCRLF(appBru)],
      ['standalone app item', standaloneAppBru],
      ['app block without code', appWithoutCodeBru],
      ['app block with an empty code value', appEmptyCodeBru],
      ['docs documenting an app code block', docsAboutAppCodeBru],
      ['app block without code followed by docs holding a code pair', appWithoutCodeThenDocsBru]
    ];

    it.each(requestCases)('%s', (_name, content) => {
      expect(parseViaRedaction(content, parseBruRequest)).toEqual(parseBruRequest(content));
    });

    const collectionCases = [
      ['collection', collectionBru],
      ['folder', folderBru],
      ['CRLF collection', toCRLF(collectionBru)]
    ];

    it.each(collectionCases)('%s', (_name, content) => {
      expect(parseViaRedaction(content, parseBruCollection)).toEqual(parseBruCollection(content));
    });
  });

  it('extracts each large text block and shrinks the skeleton', () => {
    const { skeleton, blocks } = redactLargeBruTextBlocks(requestBru);
    expect(blocks.length).toBe(6);
    expect(skeleton.length).toBeLessThan(requestBru.length);
    blocks.forEach((block) => {
      expect(skeleton).toContain(block.token);
      expect(skeleton).not.toContain(block.value);
    });
  });

  it('extracts the grpc lifecycle hooks and leaves the dictionary message block in place', () => {
    const { skeleton, blocks } = redactLargeBruTextBlocks(grpcBru);
    // all four lifecycle hooks + tests; `body:grpc` is a dictionary and stays in the skeleton
    expect(blocks.length).toBe(5);
    expect(skeleton.length).toBeLessThan(grpcBru.length);
    blocks.forEach((block) => {
      expect(skeleton).toContain(block.token);
      expect(skeleton).not.toContain(block.value);
    });
  });

  it('keeps the skeleton bounded regardless of block size', () => {
    const blob = 'x'.repeat(4 * 1024 * 1024);
    const bru = `meta {
  name: Huge
  type: http
  seq: 1
}

post {
  url: https://example.com
  body: json
}

body:json {
  { "blob": "${blob}" }
}
`;
    const { skeleton, blocks } = redactLargeBruTextBlocks(bru);
    expect(bru.length).toBeGreaterThan(4 * 1024 * 1024);
    expect(skeleton.length).toBeLessThan(1024);
    expect(blocks[0].value).toContain(blob);
  });

  it('keeps huge app code out of the skeleton, pair and delimiters intact', () => {
    const blob = 'x'.repeat(4 * 1024 * 1024);
    const bru = appBru.replace('<div id="x">hi</div>', `<div>${blob}</div>`);

    const { skeleton, blocks } = redactLargeBruTextBlocks(bru);
    expect(skeleton.length).toBeLessThan(1024);
    expect(skeleton).toMatch(/code: '''\n\s+__BRU_REDACTED_TEXT_BLOCK_\w+__\n\s+'''/);
    expect(skeleton).toContain('enabled: true');
    expect(blocks.some((block) => block.value.includes(blob))).toBe(true);
  });

  it('leaves an app block whose code has no value untouched', () => {
    const { blocks } = redactLargeBruTextBlocks(appEmptyCodeBru);
    expect(blocks).toEqual([]);
  });

  it('leaves a code pair outside the app block untouched', () => {
    const { blocks } = redactLargeBruTextBlocks(docsAboutAppCodeBru);
    expect(blocks.length).toBe(1);
    expect(blocks[0].value).toContain("code: '''");
    expect(blocks[0].value).toContain('<div>hi</div>');
    expect(blocks[0].value).not.toContain('__BRU_REDACTED_TEXT_BLOCK_');
  });

  it('leaves a code pair after an app block that has no code untouched', () => {
    const { blocks } = redactLargeBruTextBlocks(appWithoutCodeThenDocsBru);
    expect(blocks.length).toBe(1);
    expect(blocks[0].value).toContain("code: '''");
    expect(blocks[0].value).not.toContain('__BRU_REDACTED_TEXT_BLOCK_');
  });

  it('leaves dictionary body blocks untouched', () => {
    const multipart = `meta {
  name: Multipart
  type: http
  seq: 1
}

post {
  url: https://example.com
  body: multipartForm
}

body:multipart-form {
  field: value
}
`;
    const { blocks } = redactLargeBruTextBlocks(multipart);
    expect(blocks.length).toBe(0);
    expect(parseViaRedaction(multipart, parseBruRequest)).toEqual(parseBruRequest(multipart));
  });

  it('captures nested braces in content without ending the block early', () => {
    const nested = `body:json {
  {
    "a": {
      "b": [ { "c": 1 } ],
      "d": {}
    }
  }
}

script:pre-request {
  function outer() {
    if (true) {
      return { ok: 1 };
    }
  }
}
`;
    const { blocks } = redactLargeBruTextBlocks(nested);
    expect(blocks.length).toBe(2);
    expect(blocks[0].value).toContain('"c": 1');
    expect(blocks[0].value).toContain('"d": {}');
    expect(blocks[1].value).toContain('return { ok: 1 };');
    expect(parseViaRedaction(nested, parseBruRequest)).toEqual(parseBruRequest(nested));
  });

  it('only redacts blocks at column 0, never indented tags', () => {
    const indented = `docs {
  Nested pseudo-block should be treated as content:
    body:json {
      { "a": 1 }
    }
}
`;
    const { blocks } = redactLargeBruTextBlocks(indented);
    expect(blocks.length).toBe(1);
    expect(blocks[0].value).toContain('body:json {');
  });

  it('returns content unchanged when no large text blocks are present', () => {
    const minimal = `meta {
  name: Bare
  type: http
  seq: 1
}

get {
  url: https://example.com
}
`;
    const { skeleton, blocks } = redactLargeBruTextBlocks(minimal);
    expect(blocks).toEqual([]);
    expect(skeleton).toBe(minimal);
  });
});

describe('restoreRedactedBlocks', () => {
  it('returns the parsed object unchanged when there are no blocks', () => {
    const parsed = { request: { body: { json: 'x' } } };
    expect(restoreRedactedBlocks(parsed, [])).toBe(parsed);
  });
});
