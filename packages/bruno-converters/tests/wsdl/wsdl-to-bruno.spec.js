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
  });
});
