const express = require('express');
const packageInfo = require('./package.json');

let app = express();

app.get('/version', function (req, res) {
  res.json({ version: packageInfo.version });
});

let server = app.listen(process.env.PORT || 3001, function () {
  let host = server.address().address;
  let port = server.address().port;

  console.log('Web server started at http://%s:%s', host, port);
});