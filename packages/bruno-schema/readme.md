# bruno-schema

The schema definition for collections

### Todo
[ ]  Schema validator

### Collection schema

| Key                    | Description                             |
| -----------------------| --------------------------------------- |
| id                     | Unique id (when persisted to a db)      |
| uid                    | Unique id                               |
| name                   | The collection name                     |
| items                  | The items (folders and requests)        |
| -- uid                 | A unique id                             |
| -- name                | The request name                        |
| -- request             | The request object                      |
| ---- type              | The request type (http, graphql)        |
| ---- url               | The request url                         |
| ---- method            | The request method                      |
| ---- headers           | The request headers (array of key-val)  |
| ---- params            | The request params (array of key-val)   |
| ---- body              | The request body object                 |
| ------ mode            | The request body mode ['none', 'json', 'text', 'xml', 'multipartForm', 'formUrlEncoded'] |
| ------ json            | The json body                           |
| ------ text            | The text body                           |
| ------ xml             | The xml body                            |
| ------ multipartForm   | The multipartForm body                  |
| ------ formUrlEncoded  | The formUrlEncoded body                 |
