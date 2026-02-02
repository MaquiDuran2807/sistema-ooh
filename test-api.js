const http = require('http');

http.get('http://localhost:8080/api/ooh/list', (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const obj = JSON.parse(data);
      console.log('API Works! Records:', obj.length || 'object');
    } catch(e) {
      console.log('Response:', data.substring(0, 300));
    }
  });
}).on('error', e => {
  console.error('Error:', e.message);
});
