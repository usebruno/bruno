import { describe, it, expect } from '@jest/globals';
import wsdlToBruno from '../../src/wsdl/wsdl-to-bruno.js';
import parseXML from '../../src/wsdl/parse-xml.js';

const wsdlWithTypes = (typesBody, { partElement = 'tns:SignRequest' } = {}) => `<?xml version="1.0" encoding="UTF-8"?>
<wsdl:definitions name="SignService"
  targetNamespace="http://example.com/sign"
  xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:tns="http://example.com/sign">
  <wsdl:types>
    ${typesBody}
  </wsdl:types>
  <wsdl:message name="SignRequestMessage">
    <wsdl:part name="parameters" element="${partElement}"/>
  </wsdl:message>
  <wsdl:portType name="SignPortType">
    <wsdl:operation name="Sign">
      <wsdl:input message="tns:SignRequestMessage"/>
    </wsdl:operation>
  </wsdl:portType>
  <wsdl:binding name="SignBinding" type="tns:SignPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <wsdl:operation name="Sign">
      <wsdl:input>
        <soap:body use="literal"/>
      </wsdl:input>
    </wsdl:operation>
  </wsdl:binding>
  <wsdl:service name="SignService">
    <wsdl:port name="SignPort" binding="tns:SignBinding">
      <soap:address location="http://example.com/sign"/>
    </wsdl:port>
  </wsdl:service>
</wsdl:definitions>`;

const wsdlWithSchema = (schemaBody, schemaAttributes = '') => wsdlWithTypes(`
    <xsd:schema targetNamespace="http://example.com/sign" ${schemaAttributes}>
      ${schemaBody}
    </xsd:schema>
`);

const requestBodyOf = (collection) => collection.items[0].items[0].request.body.xml;

const generateRequestBody = async (schemaBody, schemaAttributes) => {
  return requestBodyOf(await wsdlToBruno(wsdlWithSchema(schemaBody, schemaAttributes)));
};

const SOAP_ENVELOPE_OPEN = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"';

describe('wsdl-to-bruno', () => {
  it('should throw error for non-string input', async () => {
    await expect(wsdlToBruno({})).rejects.toThrow('WSDL content must be a string');
  });

  it('should throw error for empty string input', async () => {
    await expect(wsdlToBruno('')).rejects.toThrow('Import WSDL collection failed');
  });

  it('should throw error for invalid XML', async () => {
    await expect(wsdlToBruno('<invalid>xml</invalid>')).rejects.toThrow('Import WSDL collection failed');
  });

  describe('element namespaces', () => {
    it('qualifies the root element with the WSDL prefix and declares it on the envelope', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest" type="xsd:string"/>
      `);

      expect(body).toBe(
        `${SOAP_ENVELOPE_OPEN} xmlns:tns="http://example.com/sign"><soap:Body>`
        + '<tns:SignRequest>string</tns:SignRequest>'
        + '</soap:Body></soap:Envelope>'
      );
    });

    it('leaves local elements unqualified when the schema does not set elementFormDefault', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:element name="name" type="xsd:string"/>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain('<tns:SignRequest><name>string</name></tns:SignRequest>');
    });

    it('qualifies local elements when the schema sets elementFormDefault to qualified', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:element name="name" type="xsd:string"/>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      `, 'elementFormDefault="qualified"');

      expect(body).toContain('<tns:SignRequest><tns:name>string</tns:name></tns:SignRequest>');
    });

    it('lets a form attribute on a local element override elementFormDefault', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:element name="name" type="xsd:string" form="qualified"/>
              <xsd:element name="note" type="xsd:string" form="unqualified"/>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain('<tns:SignRequest><tns:name>string</tns:name><note>string</note></tns:SignRequest>');
    });

    it('qualifies local elements of a named complex type by the form of the schema that declares the type', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest" type="tns:SignRequestType"/>
        <xsd:complexType name="SignRequestType">
          <xsd:sequence>
            <xsd:element name="name" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      `, 'elementFormDefault="qualified"');

      expect(body).toContain('<tns:SignRequest><tns:name>string</tns:name></tns:SignRequest>');
    });

    it('reuses a prefix declared on a schema element for elements referenced from that namespace', async () => {
      const collection = await wsdlToBruno(wsdlWithTypes(`
        <xsd:schema targetNamespace="http://example.com/sign" xmlns:c="http://example.com/common">
          <xsd:import namespace="http://example.com/common"/>
          <xsd:element name="SignRequest">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element ref="c:Party"/>
              </xsd:sequence>
            </xsd:complexType>
          </xsd:element>
        </xsd:schema>
        <xsd:schema targetNamespace="http://example.com/common">
          <xsd:element name="Party" type="xsd:string"/>
        </xsd:schema>
      `));

      expect(requestBodyOf(collection)).toBe(
        `${SOAP_ENVELOPE_OPEN} xmlns:tns="http://example.com/sign" xmlns:c="http://example.com/common"><soap:Body>`
        + '<tns:SignRequest><c:Party>string</c:Party></tns:SignRequest>'
        + '</soap:Body></soap:Envelope>'
      );
    });

    it('generates a prefix for a namespace that no document binds to a prefix', async () => {
      const collection = await wsdlToBruno(wsdlWithTypes(`
        <xsd:schema targetNamespace="http://example.com/sign" xmlns="http://example.com/common">
          <xsd:import namespace="http://example.com/common"/>
          <xsd:element name="SignRequest">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element ref="Party"/>
              </xsd:sequence>
            </xsd:complexType>
          </xsd:element>
        </xsd:schema>
        <xsd:schema targetNamespace="http://example.com/common">
          <xsd:element name="Party" type="xsd:string"/>
        </xsd:schema>
      `));

      expect(requestBodyOf(collection)).toBe(
        `${SOAP_ENVELOPE_OPEN} xmlns:tns="http://example.com/sign" xmlns:ns1="http://example.com/common"><soap:Body>`
        + '<tns:SignRequest><ns1:Party>string</ns1:Party></tns:SignRequest>'
        + '</soap:Body></soap:Envelope>'
      );
    });

    it('generates a prefix when the declared one is already bound to another namespace in the body', async () => {
      const collection = await wsdlToBruno(wsdlWithTypes(`
        <xsd:schema targetNamespace="http://example.com/sign" xmlns:c="http://example.com/common">
          <xsd:import namespace="http://example.com/common"/>
          <xsd:element name="SignRequest">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element ref="c:Party"/>
              </xsd:sequence>
            </xsd:complexType>
          </xsd:element>
        </xsd:schema>
        <xsd:schema targetNamespace="http://example.com/common" xmlns:c="http://example.com/contact">
          <xsd:import namespace="http://example.com/contact"/>
          <xsd:element name="Party">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element ref="c:Email"/>
              </xsd:sequence>
            </xsd:complexType>
          </xsd:element>
        </xsd:schema>
        <xsd:schema targetNamespace="http://example.com/contact">
          <xsd:element name="Email" type="xsd:string"/>
        </xsd:schema>
      `));

      expect(requestBodyOf(collection)).toBe(
        `${SOAP_ENVELOPE_OPEN} xmlns:tns="http://example.com/sign" xmlns:c="http://example.com/common" xmlns:ns1="http://example.com/contact"><soap:Body>`
        + '<tns:SignRequest><c:Party><ns1:Email>string</ns1:Email></c:Party></tns:SignRequest>'
        + '</soap:Body></soap:Envelope>'
      );
    });

    it('escapes markup characters in a declared namespace so the body stays well-formed XML', async () => {
      const collection = await wsdlToBruno(wsdlWithTypes(`
        <xsd:schema targetNamespace="http://example.com/sign" xmlns:q="urn:query?a=1&amp;b=&quot;2&quot;&lt;">
          <xsd:import namespace="urn:query?a=1&amp;b=&quot;2&quot;&lt;"/>
          <xsd:element name="SignRequest">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element ref="q:Party"/>
              </xsd:sequence>
            </xsd:complexType>
          </xsd:element>
        </xsd:schema>
        <xsd:schema targetNamespace="urn:query?a=1&amp;b=&quot;2&quot;&lt;">
          <xsd:element name="Party" type="xsd:string"/>
        </xsd:schema>
      `));
      const body = requestBodyOf(collection);

      expect(body).toContain(' xmlns:q="urn:query?a=1&amp;b=&quot;2&quot;&lt;"><soap:Body>');
      await expect(parseXML(body)).resolves.toBeDefined();
    });

    it('emits bare elements and no extra declarations when the schema has no target namespace', async () => {
      const collection = await wsdlToBruno(wsdlWithTypes(`
        <xsd:schema>
          <xsd:element name="SignRequest" type="xsd:string"/>
        </xsd:schema>
      `, { partElement: 'SignRequest' }));

      expect(requestBodyOf(collection)).toBe(
        `${SOAP_ENVELOPE_OPEN}><soap:Body><SignRequest>string</SignRequest></soap:Body></soap:Envelope>`
      );
    });
  });

  describe('choice content models', () => {
    it('counts a sequence branch of a choice as a single alternative', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:choice>
              <xsd:sequence>
                <xsd:element name="swedishId" type="xsd:string"/>
                <xsd:element name="name" type="xsd:string"/>
              </xsd:sequence>
              <xsd:element name="foreignId" type="xsd:string"/>
            </xsd:choice>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain('<!--You have a CHOICE of the next 2 items at this level-->');
      expect(body).toContain('<swedishId>string</swedishId><name>string</name><foreignId>string</foreignId>');
    });

    it('emits a separate comment for each of two sibling choices', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:choice>
                <xsd:element name="swedishId" type="xsd:string"/>
                <xsd:element name="foreignId" type="xsd:string"/>
              </xsd:choice>
              <xsd:choice>
                <xsd:element name="email" type="xsd:string"/>
                <xsd:element name="phone" type="xsd:string"/>
                <xsd:element name="postalAddress" type="xsd:string"/>
              </xsd:choice>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain(
        '<!--You have a CHOICE of the next 2 items at this level--><swedishId>string</swedishId><foreignId>string</foreignId>'
        + '<!--You have a CHOICE of the next 3 items at this level--><email>string</email>'
      );
    });

    it('adds the alternatives of a choice nested in a choice to the enclosing one', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:choice>
              <xsd:choice>
                <xsd:element name="swedishId" type="xsd:string"/>
                <xsd:element name="foreignId" type="xsd:string"/>
              </xsd:choice>
              <xsd:element name="passportId" type="xsd:string"/>
            </xsd:choice>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain('<!--You have a CHOICE of the next 3 items at this level-->');
    });

    it('comments both levels when a choice sits in a sequence branch of another choice', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:choice>
              <xsd:sequence>
                <xsd:element name="swedishId" type="xsd:string"/>
                <xsd:choice>
                  <xsd:element name="email" type="xsd:string"/>
                  <xsd:element name="phone" type="xsd:string"/>
                </xsd:choice>
              </xsd:sequence>
              <xsd:element name="foreignId" type="xsd:string"/>
            </xsd:choice>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain(
        '<!--You have a CHOICE of the next 2 items at this level--><swedishId>string</swedishId>'
        + '<!--You have a CHOICE of the next 2 items at this level--><email>string</email><phone>string</phone>'
        + '<foreignId>string</foreignId>'
      );
    });
  });

  describe('xsd:any elements', () => {
    it('counts an xsd:any branch of a choice as an alternative', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:choice>
              <xsd:any namespace="##other" processContents="lax"/>
              <xsd:element name="signerExtension" type="xsd:string"/>
            </xsd:choice>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain(
        '<!--You have a CHOICE of the next 2 items at this level-->'
        + '<!--You may enter ANY elements at this point-->'
        + '<signerExtension>string</signerExtension>'
      );
    });

    it('counts an xsd:any that carries no attributes', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:choice>
              <xsd:any/>
              <xsd:element name="signerExtension" type="xsd:string"/>
            </xsd:choice>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain(
        '<!--You have a CHOICE of the next 2 items at this level-->'
        + '<!--You may enter ANY elements at this point-->'
        + '<signerExtension>string</signerExtension>'
      );
    });

    it('marks an xsd:any inside a sequence without a choice comment', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:element name="timestamp" type="xsd:dateTime"/>
              <xsd:any namespace="##other" processContents="lax"/>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain(
        '<timestamp>2024-01-01T00:00:00Z</timestamp><!--You may enter ANY elements at this point-->'
      );
      expect(body).not.toContain('CHOICE');
    });

    it('keeps an xsd:any at its position between two elements', async () => {
      const body = await generateRequestBody(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:element name="timestamp" type="xsd:dateTime"/>
              <xsd:any namespace="##other" processContents="lax"/>
              <xsd:element name="subject" type="xsd:string"/>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain(
        '<timestamp>2024-01-01T00:00:00Z</timestamp>'
        + '<!--You may enter ANY elements at this point-->'
        + '<subject>string</subject>'
      );
    });
  });

  describe('named model groups', () => {
    it('expands an xsd:group reference into the elements it declares', async () => {
      const body = await generateRequestBody(`
        <xsd:group name="identity">
          <xsd:sequence>
            <xsd:element name="swedishId" type="xsd:string"/>
            <xsd:element name="name" type="xsd:string"/>
          </xsd:sequence>
        </xsd:group>
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:group ref="tns:identity"/>
              <xsd:element name="signedAt" type="xsd:dateTime"/>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain(
        '<swedishId>string</swedishId><name>string</name><signedAt>2024-01-01T00:00:00Z</signedAt>'
      );
    });

    it('expands a group at its position between two elements', async () => {
      const body = await generateRequestBody(`
        <xsd:group name="identity">
          <xsd:sequence>
            <xsd:element name="swedishId" type="xsd:string"/>
          </xsd:sequence>
        </xsd:group>
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:element name="before" type="xsd:string"/>
              <xsd:group ref="tns:identity"/>
              <xsd:element name="after" type="xsd:string"/>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain('<before>string</before><swedishId>string</swedishId><after>string</after>');
    });

    it('counts an xsd:group branch of a choice as a single alternative', async () => {
      const body = await generateRequestBody(`
        <xsd:group name="identity">
          <xsd:sequence>
            <xsd:element name="swedishId" type="xsd:string"/>
            <xsd:element name="name" type="xsd:string"/>
          </xsd:sequence>
        </xsd:group>
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:choice>
              <xsd:group ref="tns:identity"/>
              <xsd:element name="foreignId" type="xsd:string"/>
            </xsd:choice>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain(
        '<!--You have a CHOICE of the next 2 items at this level-->'
        + '<swedishId>string</swedishId><name>string</name><foreignId>string</foreignId>'
      );
    });

    it('leaves out a group referenced with maxOccurs of zero', async () => {
      const body = await generateRequestBody(`
        <xsd:group name="identity">
          <xsd:sequence>
            <xsd:element name="swedishId" type="xsd:string"/>
          </xsd:sequence>
        </xsd:group>
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:choice>
              <xsd:group ref="tns:identity" minOccurs="0" maxOccurs="0"/>
              <xsd:element name="foreignId" type="xsd:string"/>
              <xsd:element name="passportId" type="xsd:string"/>
            </xsd:choice>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).not.toContain('swedishId');
      expect(body).toContain(
        '<!--You have a CHOICE of the next 2 items at this level-->'
        + '<foreignId>string</foreignId><passportId>string</passportId>'
      );
    });

    it('resolves an unprefixed group reference by name', async () => {
      const body = await generateRequestBody(`
        <xsd:group name="identity">
          <xsd:sequence>
            <xsd:element name="swedishId" type="xsd:string"/>
          </xsd:sequence>
        </xsd:group>
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:group ref="identity"/>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain('<tns:SignRequest><swedishId>string</swedishId></tns:SignRequest>');
    });

    it('places the elements of a group from another namespace in the namespace that declares the group', async () => {
      const collection = await wsdlToBruno(wsdlWithTypes(`
        <xsd:schema targetNamespace="http://example.com/sign" xmlns:c="http://example.com/common">
          <xsd:import namespace="http://example.com/common"/>
          <xsd:element name="SignRequest">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:group ref="c:identity"/>
                <xsd:element name="signedAt" type="xsd:dateTime" form="qualified"/>
              </xsd:sequence>
            </xsd:complexType>
          </xsd:element>
        </xsd:schema>
        <xsd:schema targetNamespace="http://example.com/common" elementFormDefault="qualified">
          <xsd:group name="identity">
            <xsd:sequence>
              <xsd:element name="swedishId" type="xsd:string"/>
            </xsd:sequence>
          </xsd:group>
        </xsd:schema>
      `));

      expect(requestBodyOf(collection)).toBe(
        `${SOAP_ENVELOPE_OPEN} xmlns:tns="http://example.com/sign" xmlns:c="http://example.com/common"><soap:Body>`
        + '<tns:SignRequest><c:swedishId>string</c:swedishId><tns:signedAt>2024-01-01T00:00:00Z</tns:signedAt></tns:SignRequest>'
        + '</soap:Body></soap:Envelope>'
      );
    });

    it('stops expanding a group that references itself', async () => {
      const body = await generateRequestBody(`
        <xsd:group name="node">
          <xsd:sequence>
            <xsd:element name="label" type="xsd:string"/>
            <xsd:group ref="tns:node"/>
          </xsd:sequence>
        </xsd:group>
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:group ref="tns:node"/>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      `);

      expect(body).toContain('<tns:SignRequest><label>string</label></tns:SignRequest>');
    });
  });
});
