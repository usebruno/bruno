const bruToJson = (input) => {
};

const a = {
  "ver": "1.0",
  "type": "http-request",
  "name": "Send Bulk SMS",
  "method": "GET",
  "url": "https://api.textlocal.in/bulk_json?apiKey=secret=&numbers=919988776655&message=hello&sender=600010",

  "params": [{
    "enabled": true,
    "key": "apiKey",
    "value": "secret"
  }, {
    "enabled": true,
    "key": "numbers",
    "value": "998877665"
  }, {
    "enabled": true,
    "key": "message",
    "value": "hello"
  }],
  "headers": [{
    "enabled": true,
    "key": "Content-Type",
    "value": "application/json"
  }, {
    "enabled": true,
    "key": "Accept-Language",
    "value": "en-US,en;q=0.9,hi;q=0.8"
  }, {
    "enabled": false,
    "key": "transaction-id",
    "value": "{{transactionId}}"
  }],
  "body": {
    "mode": "json",
    "json": "{\n  \"apikey: \"secret\",\n  \"numbers: \"+91998877665\",\n  \"data: {\n    \"sender: \"TXTLCL\",\n    \"messages: [{\n      \"numbers: \"+91998877665\",\n      \"message: \"Hello World\"\n    }]\n  }\n}",
    "graphql": "{\n  launchesPast {\n    launch_site {\n      site_name\n    }\n    launch_success\n  }\n}",
  }
}



export {
  bruToJson
};