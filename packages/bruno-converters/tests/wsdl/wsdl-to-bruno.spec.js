import { describe, it, expect } from '@jest/globals';
import wsdlToBruno from '../../src/wsdl/wsdl-to-bruno.js';

const wsdlWithSchema = (schemaBody) => `<?xml version="1.0" encoding="UTF-8"?>
<wsdl:definitions name="SignService"
  targetNamespace="http://example.com/sign"
  xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:tns="http://example.com/sign">
  <wsdl:types>
    <xsd:schema targetNamespace="http://example.com/sign">
      ${schemaBody}
    </xsd:schema>
  </wsdl:types>
  <wsdl:message name="SignRequestMessage">
    <wsdl:part name="parameters" element="tns:SignRequest"/>
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

const generateRequestBody = async (schemaBody) => {
  const collection = await wsdlToBruno(wsdlWithSchema(schemaBody));
  return collection.items[0].items[0].request.body.xml;
};

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

      expect(body).toContain('<SignRequest><swedishId>string</swedishId></SignRequest>');
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

      expect(body).toContain('<SignRequest><label>string</label></SignRequest>');
    });
  });

  describe('complex type inheritance', () => {
    it('extends a complex type via xs:complexContent/xs:extension', async () => {
      const body = await generateRequestBody(`
        <xsd:complexType name="BaseType">
          <xsd:sequence>
            <xsd:element name="baseField" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
        <xsd:complexType name="ExtendedType">
          <xsd:complexContent>
            <xsd:extension base="tns:BaseType">
              <xsd:sequence>
                <xsd:element name="extendedField" type="xsd:string"/>
              </xsd:sequence>
            </xsd:extension>
          </xsd:complexContent>
        </xsd:complexType>
        <xsd:element name="SignRequest" type="tns:ExtendedType"/>
      `);

      expect(body).toContain('<baseField>string</baseField><extendedField>string</extendedField>');
    });

    it('extends a complex type via xs:simpleContent/xs:extension', async () => {
      const body = await generateRequestBody(`
        <xsd:complexType name="StringType">
          <xsd:simpleContent>
            <xsd:extension base="xsd:string">
              <xsd:attribute name="lang" type="xsd:string"/>
            </xsd:extension>
          </xsd:simpleContent>
        </xsd:complexType>
        <xsd:element name="SignRequest" type="tns:StringType"/>
      `);

      expect(body).toContain('<SignRequest lang="?">string</SignRequest>');
    });
  });

  describe('SOAP version detection', () => {
    const wsdlWithSchema = (schemaBody, bindingTransport) => `<?xml version="1.0" encoding="UTF-8"?>
<wsdl:definitions name="SignService"
  targetNamespace="http://example.com/sign"
  xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:soap12="http://schemas.xmlsoap.org/wsdl/soap12/"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:tns="http://example.com/sign">
  <wsdl:types>
    <xsd:schema targetNamespace="http://example.com/sign">
      ${schemaBody}
    </xsd:schema>
  </wsdl:types>
  <wsdl:message name="SignRequestMessage">
    <wsdl:part name="parameters" element="tns:SignRequest"/>
  </wsdl:message>
  <wsdl:portType name="SignPortType">
    <wsdl:operation name="Sign">
      <wsdl:input message="tns:SignRequestMessage"/>
    </wsdl:operation>
  </wsdl:portType>
  <wsdl:binding name="SignBinding" type="tns:SignPortType">
    <soap:binding style="document" transport="${bindingTransport}"/>
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

    it('generates SOAP 1.1 headers for soap/http transport', async () => {
      const wsdl = wsdlWithSchema('<xsd:element name="SignRequest"><xsd:complexType><xsd:sequence><xsd:element name="id" type="xsd:string"/></xsd:sequence></xsd:complexType></xsd:element>', 'http://schemas.xmlsoap.org/soap/http');
      const collection = await wsdlToBruno(wsdl);
      const headers = collection.items[0].items[0].request.headers;
      const contentType = headers.find((h) => h.name === 'Content-Type');
      const soapAction = headers.find((h) => h.name === 'SOAPAction');
      expect(contentType.value).toBe('text/xml; charset=utf-8');
      expect(soapAction).toBeDefined();
    });

    it('generates SOAP 1.2 headers for soap12/http transport', async () => {
      const wsdl = wsdlWithSchema('<xsd:element name="SignRequest"><xsd:complexType><xsd:sequence><xsd:element name="id" type="xsd:string"/></xsd:sequence></xsd:complexType></xsd:element>', 'http://www.w3.org/2005/08/addressing/soap/1.2/http');
      const collection = await wsdlToBruno(wsdl);
      const headers = collection.items[0].items[0].request.headers;
      const contentType = headers.find((h) => h.name === 'Content-Type');
      expect(contentType.value).toContain('application/soap+xml');
      expect(contentType.value).toContain('action=');
    });
  });

  describe('response examples', () => {
    const wsdlWithOutput = (schemaBody) => `<?xml version="1.0" encoding="UTF-8"?>
<wsdl:definitions name="SignService"
  targetNamespace="http://example.com/sign"
  xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:tns="http://example.com/sign">
  <wsdl:types>
    <xsd:schema targetNamespace="http://example.com/sign">
      ${schemaBody}
    </xsd:schema>
  </wsdl:types>
  <wsdl:message name="SignRequestMessage">
    <wsdl:part name="parameters" element="tns:SignRequest"/>
  </wsdl:message>
  <wsdl:message name="SignResponseMessage">
    <wsdl:part name="parameters" element="tns:SignResponse"/>
  </wsdl:message>
  <wsdl:portType name="SignPortType">
    <wsdl:operation name="Sign">
      <wsdl:input message="tns:SignRequestMessage"/>
      <wsdl:output message="tns:SignResponseMessage"/>
    </wsdl:operation>
  </wsdl:portType>
  <wsdl:binding name="SignBinding" type="tns:SignPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <wsdl:operation name="Sign">
      <wsdl:input>
        <soap:body use="literal"/>
      </wsdl:input>
      <wsdl:output>
        <soap:body use="literal"/>
      </wsdl:output>
    </wsdl:operation>
  </wsdl:binding>
  <wsdl:service name="SignService">
    <wsdl:port name="SignPort" binding="tns:SignBinding">
      <soap:address location="http://example.com/sign"/>
    </wsdl:port>
  </wsdl:service>
</wsdl:definitions>`;

    it('generates a response example when operation has output', async () => {
      const wsdl = wsdlWithOutput(`
        <xsd:element name="SignRequest">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:element name="id" type="xsd:string"/>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
        <xsd:element name="SignResponse">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:element name="result" type="xsd:boolean"/>
              <xsd:element name="message" type="xsd:string"/>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      `);
      const collection = await wsdlToBruno(wsdl);
      const request = collection.items[0].items[0];
      expect(request.examples).toBeDefined();
      expect(request.examples.length).toBe(1);
      const example = request.examples[0];
      expect(example.name).toBe('Risposta esempio');
      expect(example.response.status).toBe(200);
      expect(example.response.statusText).toBe('OK');
      expect(example.response.body.content).toContain('<result>true</result>');
      expect(example.response.body.content).toContain('<message>string</message>');
    });

    it('does not generate response example when operation has no output', async () => {
      const wsdl = wsdlWithSchema('<xsd:element name="SignRequest"><xsd:complexType><xsd:sequence><xsd:element name="id" type="xsd:string"/></xsd:sequence></xsd:complexType></xsd:element>');
      const collection = await wsdlToBruno(wsdl);
      const request = collection.items[0].items[0];
      expect(request.examples).toBeUndefined();
    });
  });
});
