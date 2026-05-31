const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/delete-user',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let d=''; res.on('data', c => d+=c); res.on('end', () => console.log('STATUS', res.statusCode, 'BODY', d.substring(0, 100)));
});
req.write('{"uid": "123"}'); req.end();
