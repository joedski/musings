/* eslint-disable no-console */

let messageCount = 0;
let interval = -1;
let currentSubscription;
let currentTimeout;

function send(client) {
  console.log('Sending a message to "/echo"...');
  client.publish({
    headers: { Authorization: 'Bearer BEARS' },
    destination: '/echo',
    body: `Message #${++messageCount}`,
  });
}

const stompClient = new window.StompJs.Client({
  connectHeaders: {
    Authorization: 'Bearer BEARS',
    login: 'Bears',
    passcode: 'Bears',
  },
  debug(message) {
    console.log('DEBUG', message);
  },
  webSocketFactory: () => new window.SockJS('/ws'),
  onWebSocketError(errorEvent) {
    console.log('onWebSocketError', errorEvent);
  },
  onStompError(errorFrame) {
    console.log('onStompError', errorFrame);
  },
  onConnect(frame) {
    console.log('onConnect', frame);

    currentSubscription = stompClient.subscribe('/echo', (frame) => {
      console.log('Got back message on topic "/echo"!');
      console.log('Headers:', frame.headers);
      console.log('Body:', frame.body);
    }, { Authorization: 'Bearer BEARS' });

    send(stompClient);
    interval = setInterval(
      () => {
        send(stompClient);
      },
      5000
    );
  },
  onDisconnect() {
    clearInterval(interval);
  },
});

stompClient.activate();

// const stompClient = window.Stomp.over(socket);

// stompClient.connect({ Authorization: 'Bearer BEARS' },
//   function onConnect(data) {
//     console.log('STOMP is now connected!');

//     // subscription
//     stompClient.subscribe('/echo', (data) => {
//       const ele = document.createElement('div');
//       ele.textContent = data.body;
//       document.body.appendChild(ele);
//       ele.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
//     });

//     // trigger some data
//     let timer = 0;
//     setInterval(() => {
//       stompClient.send('/echo', { Authorization: 'Bearer BEARS' }, String(++timer));
//     }, 6000);
//   },
//   (error) => console.error('connect error:', error)
// );
