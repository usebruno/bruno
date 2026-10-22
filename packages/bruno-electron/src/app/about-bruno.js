const fs = require('fs');
const path = require('path');

const logo = fs.readFileSync(path.join(__dirname, '../about/256x256.png')).toString('base64');

module.exports = function aboutBruno({ version }) {
  const currentYear = new Date().getFullYear();
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1, user-scalable=yes">
        <title>About Brunommerce</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                text-align: center;
                margin: 0;
                padding: 10px;
                background-color: #f4f4f4;
                color: #333;
            }
            .logo {
                margin-top: 0px;
            }
            .title {
                font-size: 24px;
                margin-top: 5px;
                font-weight: bold;
                color: #222;
            }
            .description {
                font-size: 12px;
                color: #222;
                margin-top: 5px;
            }
            .buttons {
                margin-top: 5px;
            }
            .footer {
                margin-top: 5px;
                padding: 5px;
                font-size: 14px;
                color: #555;
            }
            .link {
                display: inline-block;
                margin-top: 10px;
                padding: 10px 15px;
                background-color: #F4AA41;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.3s;
            }
            .link:hover {
                background-color: #F4AA41;
            }
        </style>
    </head>
    <body>
      <div class="logo">
      </div>
        <img src="data:image/png;base64,${logo}" width="100" alt="Brunommerce" />
      <h2 class="title">Brunommerce ${version}</h2>
      <div class="description">Unofficial fork of Bruno</div>
      <footer class="footer">
          Based on Bruno, ©2022 Anoop M D, Anusree P S and Contributors (MIT License)
      </footer>
    </body>
    </html>
  `;
};
