const parser = require('../src/bruToJson');

describe('bruToJson parser', () => {
  describe('body:ws', () => {
    it('infers message and settings | smoke', () => {
      const input = `
body:ws {
    type: json
    name: message 1
    content: '''
      {"foo":"bar"}
    ''' 
}

settings {
      timeout: 30
}
`;

      const expected = {
        body: {
          mode: 'ws',
          ws: [
            {
              content: '{"foo":"bar"}',
              name: 'message 1',
              type: 'json'
            }
          ]
        },
        settings: {
          encodeUrl: false,
          keepAliveInterval: 0,
          timeout: 30
        }
      };

      const output = parser(input);

      // Stub value if it doesn't exist in the input
      expect(output).toHaveProperty('settings.keepAliveInterval');

      // value needs to be a number
      expect(output.settings.keepAliveInterval).toBe(0);
      expect(output).toEqual(expected);
    });
  });
});
