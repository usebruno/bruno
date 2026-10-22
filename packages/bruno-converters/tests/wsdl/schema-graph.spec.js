import { describe, it, expect } from '@jest/globals';
import parseXML from '../../src/wsdl/parse-xml';
import { collectWsdlSchemas } from '../../src/wsdl/schema-graph';

const wsdlWithTypes = (types) => `<?xml version="1.0" encoding="UTF-8"?>
<wsdl:definitions name="Svc"
  targetNamespace="http://example.com/svc"
  xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:tns="http://example.com/svc">
  <wsdl:types>${types}</wsdl:types>
</wsdl:definitions>`;

const getDefinitions = async (wsdl) => {
  const doc = await parseXML(wsdl);
  return doc['wsdl:definitions'];
};

const makeResolver = (documents) => async (baseUri, ref) => {
  const uri = new URL(ref, baseUri).href;
  if (!(uri in documents)) {
    throw new Error(`not found: ${uri}`);
  }
  return { text: documents[uri], uri };
};

describe('collectWsdlSchemas', () => {
  it('follows an import chain, resolving each schemaLocation relative to the file that declared it', async () => {
    const definitions = await getDefinitions(wsdlWithTypes(`
      <xsd:schema targetNamespace="http://example.com/messages">
        <xsd:import namespace="http://example.com/a" schemaLocation="nested/a.xsd"/>
      </xsd:schema>
    `));
    const resolve = makeResolver({
      'file:///base/nested/a.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/a">
        <xs:import namespace="http://example.com/b" schemaLocation="../b.xsd"/>
      </xs:schema>`,
      'file:///base/b.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/b"/>`
    });

    const { schemas, warnings } = await collectWsdlSchemas({ definitions, uri: 'file:///base/Service.wsdl', resolve });

    expect(warnings).toEqual([]);
    expect(schemas.map((s) => s.uri)).toEqual([
      'file:///base/Service.wsdl',
      'file:///base/nested/a.xsd',
      'file:///base/b.xsd'
    ]);
  });

  it('stops when two schemas import each other in a cycle', async () => {
    const definitions = await getDefinitions(wsdlWithTypes(`
      <xsd:schema targetNamespace="http://example.com/messages">
        <xsd:import namespace="http://example.com/a" schemaLocation="a.xsd"/>
      </xsd:schema>
    `));
    const resolve = makeResolver({
      'file:///base/a.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/a">
        <xs:import namespace="http://example.com/b" schemaLocation="b.xsd"/>
      </xs:schema>`,
      'file:///base/b.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/b">
        <xs:import namespace="http://example.com/a" schemaLocation="a.xsd"/>
      </xs:schema>`
    });

    const { schemas, warnings } = await collectWsdlSchemas({ definitions, uri: 'file:///base/Service.wsdl', resolve });

    expect(warnings).toEqual([]);
    expect(schemas).toHaveLength(3);
  });

  it('gives an included schema the namespace of the schema that included it', async () => {
    const definitions = await getDefinitions(wsdlWithTypes(`
      <xsd:schema targetNamespace="http://example.com/messages">
        <xsd:include schemaLocation="chunk.xsd"/>
      </xsd:schema>
    `));
    const resolve = makeResolver({
      'file:///base/chunk.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
        <xs:element name="Chunk" type="xs:string"/>
      </xs:schema>`
    });

    const { schemas } = await collectWsdlSchemas({ definitions, uri: 'file:///base/Service.wsdl', resolve });

    expect(schemas[1].node.targetNamespace).toBe('http://example.com/messages');
  });

  it('keeps the inline schemas and warns when no resolver was provided', async () => {
    const definitions = await getDefinitions(wsdlWithTypes(`
      <xsd:schema targetNamespace="http://example.com/messages">
        <xsd:import namespace="http://example.com/a" schemaLocation="a.xsd"/>
      </xsd:schema>
    `));

    const { schemas, warnings } = await collectWsdlSchemas({ definitions });

    expect(schemas).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('a.xsd');
    expect(warnings[0]).toContain('no schema resolver');
  });

  it('skips a schema it cannot fetch and carries on with the rest', async () => {
    const definitions = await getDefinitions(wsdlWithTypes(`
      <xsd:schema targetNamespace="http://example.com/messages">
        <xsd:import namespace="http://example.com/missing" schemaLocation="missing.xsd"/>
        <xsd:import namespace="http://example.com/a" schemaLocation="a.xsd"/>
      </xsd:schema>
    `));
    const resolve = makeResolver({
      'file:///base/a.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/a"/>`
    });

    const { schemas, warnings } = await collectWsdlSchemas({ definitions, uri: 'file:///base/Service.wsdl', resolve });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('missing.xsd');
    expect(schemas.map((s) => s.node.targetNamespace)).toEqual([
      'http://example.com/messages',
      'http://example.com/a'
    ]);
  });

  it('ignores an import that has no schemaLocation to follow', async () => {
    const definitions = await getDefinitions(wsdlWithTypes(`
      <xsd:schema targetNamespace="http://example.com/messages">
        <xsd:import namespace="http://example.com/known-elsewhere"/>
      </xsd:schema>
    `));

    const { schemas, warnings } = await collectWsdlSchemas({ definitions, uri: 'file:///base/Service.wsdl', resolve: makeResolver({}) });

    expect(warnings).toEqual([]);
    expect(schemas).toHaveLength(1);
  });
});
