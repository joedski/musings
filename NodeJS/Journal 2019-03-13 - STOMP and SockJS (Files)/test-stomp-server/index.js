const path = require('path');
const http = require('http');
const StompServer = require('stomp-broker-js');
const node_static = require('node-static');
const static_directory = new node_static.Server(path.join(__dirname, 'client'));

const server = http.createServer((request, response) => {
  console.log(request.url);
  static_directory.serve(request, response);
});

const stompServer = new StompServer({
  server: server,
  debug: console.log,
  path: '/ws',
  protocol: 'sockjs',
  heartbeat: [2000, 2000]
});

console.log(' [*] Listening on 0.0.0.0:3002');
server.listen(3002, 'localhost');

stompServer.subscribe("/echo", (msg, headers) => {
  if (headers.Authorization !== 'Bearer BEARS') {
    console.warn(`Received message with insufficiently ursine authorization: ${headers.destination}: ${msg}`);
    return
  }
  var topic = headers.destination;
  console.log(`topic:${topic} messageType: ${typeof msg}`, msg, headers);
  stompServer.send('/echo', headers, `Hello from server! ${msg}`);
});
