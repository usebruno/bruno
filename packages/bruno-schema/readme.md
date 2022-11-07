# bruno-schema

The schema definition for collections

### Publish to Npm Registry
```bash
npm publish --access=public
```

### Collection schema
```bash
id                       Unique id (when persisted to a db)
uid                      Unique id
name                     collection name
items                    Items (folders and requests)
  |-uid                  A unique id   
  |-name                 Item name 
  |-type                 Item type  (folder, http-request, graphql-request)
  |-request              Request object
    |-url                Request url
    |-method             Request method
    |-headers            Request headers (array of key-val)
    |-params             Request params (array of key-val)
    |-body               Request body object  
      |-mode             Request body mode
      |-json             Request json body
      |-text             Request text body
      |-xml              Request xml body
      |-multipartForm    Request multipartForm body
      |-formUrlEncoded   Request formUrlEncoded body
```
