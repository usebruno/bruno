/**
 * RU/EN dictionaries for 1C:Enterprise platform types and HTTP client libraries.
 * Used by native, Connector and OPI snippet clients.
 */

export const platform = {
  ru: {
    New: 'Новый',
    Map: 'Соответствие',
    Structure: 'Структура',
    Undefined: 'Неопределено',
    True: 'Истина',
    False: 'Ложь',
    Insert: 'Вставить',
    HTTPConnection: 'HTTPСоединение',
    HTTPRequest: 'HTTPЗапрос',
    HTTPResponse: 'HTTPОтвет',
    OpenSSLSecureConnection: 'ЗащищенноеСоединениеOpenSSL',
    SetBodyFromString: 'УстановитьТелоИзСтроки',
    SetBodyFromBinaryData: 'УстановитьТелоИзДвоичныхДанных',
    CallHTTPMethod: 'ВызватьHTTPМетод',
    UUID: 'УникальныйИдентификатор',
    String: 'Строка',
    StrReplace: 'СтрЗаменить',
    MemoryStream: 'ПотокВПамяти',
    DataWriter: 'ЗаписьДанных',
    WriteLine: 'ЗаписатьСтроку',
    Write: 'Записать',
    Close: 'Закрыть',
    CloseAndGetBinaryData: 'ЗакрытьИПолучитьДвоичныеДанные',
    BinaryData: 'ДвоичныеДанные',
    CharsCR: 'Символы.ВК',
    CharsLF: 'Символы.ПС',
    Message: 'Сообщить',
    StatusCode: 'КодСостояния',
    GetBodyAsString: 'ПолучитьТелоКакСтроку',
    AtClient: '&НаКлиенте',
    AtServer: '&НаСервере',
    Procedure: 'Процедура',
    EndProcedure: 'КонецПроцедуры',
    PutFile: 'ПоместитьФайл',
    GetFromTempStorage: 'ПолучитьИзВременногоХранилища',
    FormUUID: 'УникальныйИдентификатор'
  },
  en: {
    New: 'New',
    Map: 'Map',
    Structure: 'Structure',
    Undefined: 'Undefined',
    True: 'True',
    False: 'False',
    Insert: 'Insert',
    HTTPConnection: 'HTTPConnection',
    HTTPRequest: 'HTTPRequest',
    HTTPResponse: 'HTTPResponse',
    OpenSSLSecureConnection: 'OpenSSLSecureConnection',
    SetBodyFromString: 'SetBodyFromString',
    SetBodyFromBinaryData: 'SetBodyFromBinaryData',
    CallHTTPMethod: 'CallHTTPMethod',
    UUID: 'UUID',
    String: 'String',
    StrReplace: 'StrReplace',
    MemoryStream: 'MemoryStream',
    DataWriter: 'DataWriter',
    WriteLine: 'WriteLine',
    Write: 'Write',
    Close: 'Close',
    CloseAndGetBinaryData: 'CloseAndGetBinaryData',
    BinaryData: 'BinaryData',
    CharsCR: 'Chars.CR',
    CharsLF: 'Chars.LF',
    Message: 'Message',
    StatusCode: 'StatusCode',
    GetBodyAsString: 'GetBodyAsString',
    AtClient: '&AtClient',
    AtServer: '&AtServer',
    Procedure: 'Procedure',
    EndProcedure: 'EndProcedure',
    PutFile: 'PutFile',
    GetFromTempStorage: 'GetFromTempStorage',
    FormUUID: 'UUID'
  }
};

export const connector = {
  ru: {
    module: 'КоннекторHTTP',
    headers: 'Заголовки',
    additionalParameters: 'ДополнительныеПараметры',
    data: 'Данные',
    result: 'Результат',
    queryParameters: 'ПараметрыЗапроса',
    asText: 'КакТекст',
    callHTTPMethod: 'ВызватьHTTPМетод'
  },
  en: {
    module: 'HTTPConnector',
    headers: 'Headers',
    additionalParameters: 'AdditionalParameters',
    data: 'Data',
    result: 'Result',
    queryParameters: 'QueryParameters',
    asText: 'AsText',
    callHTTPMethod: 'CallHTTPMethod'
  }
};

export const opi = {
  ru: {
    module: 'OPI_ЗапросыHTTP',
    newRequest: 'НовыйЗапрос',
    initialize: 'Инициализировать',
    setUrlParams: 'УстановитьПараметрыURL',
    setStringBody: 'УстановитьСтроковоеТело',
    setFormBody: 'УстановитьFormТело',
    setBinaryBody: 'УстановитьДвоичноеТело',
    addHeader: 'ДобавитьЗаголовок',
    addBearerAuthorization: 'ДобавитьBearerАвторизацию',
    processRequest: 'ОбработатьЗапрос',
    returnText: 'ВернутьОтветКакСтроку',
    returnStatusCode: 'ВернутьКодСостояния',
    result: 'Результат',
    data: 'Данные',
    params: 'ПараметрыURL'
  },
  en: {
    module: 'OPI_HTTPRequests',
    newRequest: 'NewRequest',
    initialize: 'Initialize',
    setUrlParams: 'SetURLParams',
    setStringBody: 'SetStringBody',
    setFormBody: 'SetFormBody',
    setBinaryBody: 'SetBinaryBody',
    addHeader: 'AddHeader',
    addBearerAuthorization: 'AddBearerAuthorization',
    processRequest: 'ProcessRequest',
    returnText: 'ReturnResponseAsString',
    returnStatusCode: 'ReturnStatusCode',
    result: 'Result',
    data: 'Data',
    params: 'URLParameters'
  }
};
