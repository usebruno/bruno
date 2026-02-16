const visualizeNotes = (res) => {
  let response = res.body;

  let notes = response?.notes || {};
  let responseRuntime = notes.runtime_sec || 0;

  notes.runtime = new Date(responseRuntime * 1000).toISOString().substr(11, 8);

  if (typeof response?.data === 'undefined' && typeof response?.rows === 'object') {
    response.data = response?.rows?.map(function (data) {
      return data?.values;
    });
  }

  const templateScript = `
    <script id="template" type="text/x-handlebars-template">
      {{#if response.data}}
          <div>
              <p>Total rows: {{notes.result_rows}}</p>
              <p>Query count: {{notes.query_count}}</p>
              <p>Duration: {{notes.runtime}}</p>
          </div>
          <table id="data_table">
              {{#each response.data}}
                  {{#if @first}}
                      <tr>
                          {{#each this}}
                              <th>
                                  {{#with (lookup ../../response.fields @index)~}}
                                      <small>
                                          {{name}} ({{type}})<br>
                                          {{data_type}}<br>
                                      </small>
                                  {{/with}}
                                  {{this}}
                              </th>
                          {{/each}}
                      </tr>
                  {{else}}
                      <tr id="row_{{@key}}" class="data_row">
                          {{#each this}}
                              <td>{{this}}</td>
                          {{/each}}
                      </tr>
                  {{/if}}
              {{/each}}
          </table>
      {{else if response.results}}
          <table id="data_table">
              <tr>
                  {{#each response.results.[0]}}
                      <th>{{@key}}</th>
                  {{/each}}
              </tr>
              {{#each response.results}}
                  <tr id="row_{{@key}}" class="data_row">
                      {{#each this}}
                          <td>{{this}}</td>
                      {{/each}}
                  </tr>
              {{/each}}
          </table>
      {{else}}
          <div class="error">
              <h1>Error</h1>
              {{#if response.notes}}
                  {{response.notes.error}}
              {{else}}
                  No response
              {{/if}}
          </div>
      {{/if}}
    </script>
  `;

  const mainScript = `
    <script>
      document.addEventListener("DOMContentLoaded", function() {
        let data = ${JSON.stringify({
          response,
          notes
        })}
        let source = document.getElementById("template").innerHTML;
        let template = Handlebars.compile(source);
        document.body.innerHTML = template(data);
        document.getElementById('data_table').addEventListener('click', function(e) {
          var row = e.target.closest('tr.data_row');
          if (row) {
              row.classList.toggle('marked');
          }
        });
      });
    </script>
  `;

  const style = `
    <style type="text/css">
        div {
            margin-bottom: 8px;
        }
        div p {
            font-family: courier;
            font-size: 12px;
            line-height: 1.2;
            color: #afafaf;
            margin: 0;
        }
        div.error {
            padding: 20px;
            background-color: #ffcece;
            color: #792626;
            font-size: 18px;
        }
        div.error h1 {
            color: #dd4545;
            line-height: 50px;
            font-size: 28px;
            font-weight: bold;
            text-transform: uppercase;
        }
        table {
            background-color: #454545;
            color: #dedede;
            font-size: 12px;
            width: 100%;
            border: 1px solid #cdcdcd;
            border-collapse: collapse;
        }
        table th, table td {
            border: 1px solid #797979;
        }
        table th {
            font-size: 14px;
            font-weight: bold;
            background-color: #565656;
            text-align: left;
            vertical-align: bottom;
        }
        table th, table th:first-child, table th:last-child {
            padding: 4px;
        }
        table th small {
            font-size: 10px;
            color: #afafaf;
        }
        table tr:hover {
            background-color:#505050;
        }
        table tr.marked:nth-child(even) {
            background-color: #707070;
        }
        table tr.marked:nth-child(odd) {
            background-color: #696969;
        }
        table td {
            padding: 2px;
        }
        table td, table td:first-child, table td:last-child {
            padding: 3px;
        }
    </style>
  `;

  const htmlString = `
    <html>
      <head>
        ${style}
      </head>
      <body>
        <script src="https://rawgit.com/components/handlebars.js/master/handlebars.js"></script>
        ${templateScript}
        ${mainScript}
      </body>
    </html>
  `;

  return htmlString;
};

module.exports = visualizeNotes;
