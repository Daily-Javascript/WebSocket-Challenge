'use strict';

const should = require('should');
const io = require('socket.io-client');

const socketURL = 'http://localhost:5000';

const options = {
  transports: ['websocket'],
  'force new connection': true
};

const chatUser1 = {'name':'Tom'};
const chatUser2 = {'name':'Sally'};
const chatUser3 = {'name':'Dana'};

describe('Testing The Chat Server', () => {

  /* Test 1 - A Single User */
  it('Should broadcast new user once they connect', (done) => {
    let client = io.connect(socketURL, options);

    client.on('connect', (data) => {
      client.emit('connection name',chatUser1);
    });

    client.on('new user', (usersName) => {
      usersName.should.be.type('string');
      usersName.should.equal(chatUser1.name + ' has joined.');
      /* If this client doesn't disconnect it will interfere
      with the next test */
      client.disconnect();
      done();
    });
  });

  /* Test 2 - Two Users */
  it('Should broadcast new user to all users', (done) => {
    let client1 = io.connect(socketURL, options);

    client1.on('connect', (data) => {
      client1.emit('connection name', chatUser1);

      /* Since first client is connected, we connect
      the second client. */
      let client2 = io.connect(socketURL, options);

      client2.on('connect', (data) => {
        client2.emit('connection name', chatUser2);
      });

      client2.on('new user', (usersName) => {
        usersName.should.equal(chatUser2.name + ' has joined.');
        client2.disconnect();
      });

    });

    let numberOfUsers = 0;
    client1.on('new user', (usersName) => {
      numberOfUsers += 1;

      if(numberOfUsers === 2){
        usersName.should.equal(chatUser2.name + ' has joined.');
        client1.disconnect();
        done();
      }
    });
  });

  /* Test 3 - User sends a message to chat room. */
  it('Should be able to broadcast messages', (done) => {
    let client1, client2, client3;
    let message = 'Hello World';
    let messages = 0;

    let checkMessage = (client) => {
      client.on('message', (msg) => {
        message.should.equal(msg);
        client.disconnect();
        messages++;
        if(messages === 3){
          done();
        };
      });
    };

    client1 = io.connect(socketURL, options);
    checkMessage(client1);

    client1.on('connect', (data) => {
      client2 = io.connect(socketURL, options);
      checkMessage(client2);

      client2.on('connect', (data) => {
        client3 = io.connect(socketURL, options);
        checkMessage(client3);

        client3.on('connect', (data) => {
          client2.send(message);
        });
      });
    });
  });

  /* Test 4 - User sends a private message to another user. */
  it('Should be able to send private messages', (done) => {
    let client1, client2, client3;
    let message = {to: chatUser1.name, txt:'Private Hello World'};
    let messages = 0;

    let completeTest = () => {
      messages.should.equal(1);
      client1.disconnect();
      client2.disconnect();
      client3.disconnect();
      done();
    };

    let checkPrivateMessage = (client) => {
      client.on('private message', (msg) => {
        message.txt.should.equal(msg.txt);
        msg.from.should.equal(chatUser3.name);
        messages++;
        if(client === client1){
          /* The first client has received the message
          we give some time to ensure that the others
          will not receive the same message. */
          setTimeout(completeTest, 40);
        };
      });
    };

    client1 = io.connect(socketURL, options);
    checkPrivateMessage(client1);

    client1.on('connect', (data) => {
      client1.emit('connection name', chatUser1);
      client2 = io.connect(socketURL, options);
      checkPrivateMessage(client2);

      client2.on('connect', (data) => {
        client2.emit('connection name', chatUser2);
        client3 = io.connect(socketURL, options);
        checkPrivateMessage(client3);

        client3.on('connect', (data) => {
          client3.emit('connection name', chatUser3);
          client3.emit('private message', message)
        });
      });
    });
  });
});
