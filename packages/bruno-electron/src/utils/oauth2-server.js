const express = require("express");
const { shell } = require("electron");
let { exec } = require('child_process');
const portToPid = require("./pid-port");
const BRUNO_OAUTH2_SERVER_PORT = 9876;
const BRUNO_OAUTH2_SERVER_CALLBACK_URL = `http://localhost:9876/callback`;

let server;

const freePort = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      const pid = await portToPid(BRUNO_OAUTH2_SERVER_PORT);
      if(pid) {
        if(process.platform === "win32") {
          exec(`taskkill /PID ${pid} /F`)
        }
        else {
          exec(`kill -9 ${pid}`);
        }
      }
      else {
        console.log("port is free");
      }
      resolve();
    }
    catch(err) {
      reject(err);
    }
  });
}

async function getOauth2AuthorizationCodeUsingDefaultBrowser({ authorizeUrl, port = BRUNO_OAUTH2_SERVER_PORT }) {
    await server?.close?.();
    // test and refactor before uncommenting
    // await freePort();
    const redirectUri = BRUNO_OAUTH2_SERVER_CALLBACK_URL;
    const parsedAuthorizeUrl = new URL(authorizeUrl);
    parsedAuthorizeUrl?.searchParams.set('redirect_uri', redirectUri);
    const finalAuthorizeUrl = parsedAuthorizeUrl.href;

    return new Promise((resolve, reject) => {
        const app = express();

        app.get("/callback", (req, res) => {
            const { code } = req.query;
            if (!code) {
                res.status(400).send("Authorization failed. No code received.");
                reject(new Error("No authorization code received"));
                return;
            }

            res.send("Authorization successful. You can close this tab.");
            resolve({ authorizationCode: code });
            server.close();
        });

        server = app.listen(port, () => {
            shell.openExternal(finalAuthorizeUrl);
        });

        // Ensure the server is cleaned up in case of error
        server.on("error", (err) => {
            reject(err);
        });
    });
}

module.exports = { getOauth2AuthorizationCodeUsingDefaultBrowser, BRUNO_OAUTH2_SERVER_CALLBACK_URL };
