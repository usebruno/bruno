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

describe('redactLargeBruTextBlocks', () => {
  describe('matches a normal parse (ohm oracle)', () => {
    const requestCases = [
      ['request with bodies, scripts, tests, docs', requestBru],
      ['graphql query + variables', graphqlBru],
      ['xml + sparql bodies', xmlSparqlBru],
      ['CRLF request', toCRLF(requestBru)],
      ['leading + trailing blank lines in body', blankLinesBru],
      ['CRLF leading + trailing blank lines', toCRLF(blankLinesBru)]
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
