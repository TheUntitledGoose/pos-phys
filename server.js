const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 5959 });

console.log(`Running on port 5959`)

let clients = [];

function getFormattedTimestamp() {
  const now = new Date();
  const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
  };
  return now.toLocaleString('en-US', options).replace(',', '');
}

wss.on('connection', function connection(ws) {
  console.log(`A user connected`);
  clients.push(ws);
  
  ws.on('message', function incoming(message) {
    message = JSON.parse(message)
    
    // console.log(message)

    if (message.type == 'subscribe') {
    
      console.log(`[${getFormattedTimestamp()}] : \x1b[42m[${message.type}]\x1b[0m: User \x1b[32m${message.username}\x1b[0m has opened \x1b[32m${message.unitName}\x1b[0m, unit \x1b[32m${message.unitID}\x1b[0m, skill type \x1b[32m${message.skillType}\x1b[0m, problemID \x1b[32m${message.nameSpace.problemID}\x1b[0m`);
      
    } else if (message.type == 'new_problem') {
    
      // console.log('Received:', message);
      console.log(`[${getFormattedTimestamp()}] : \x1b[42m[${message.type}]\x1b[0m: User \x1b[32m${message.username}\x1b[0m has opened a new problem in \x1b[32m${message.unitName}\x1b[0m, unit \x1b[32m${message.unitID}\x1b[0m, skill type \x1b[32m${message.skillType}\x1b[0m, problemID \x1b[32m${message.nameSpace.problemID}\x1b[0m`);
      
    } else if (message.type == 'old_problem') {
    
      // console.log('Received:', message);
      console.log(`[${getFormattedTimestamp()}] : \x1b[30;41m[${message.type}]\x1b[0m: User \x1b[31m${message.username}\x1b[0m has opened an old problem in \x1b[31m${message.unitName}\x1b[0m, unit \x1b[31m${message.unitID}\x1b[0m, skill type \x1b[31m${message.skillType}\x1b[0m, problemID \x1b[31m${message.nameSpace.problemID}\x1b[0m`);

      
    }
  });

  ws.on('close', () => {
    clients = clients.filter(client => client !== ws); // Remove the client from the array
    console.log('Client disconnected');
  });

  // Send a message to all connected clients
  // setInterval(() => {
  //   ws.send(JSON.stringify({type: 'runFunction', payload: {info: "Hello Clients!"}}));
  // }, 10000); 
});

// broadcast
function broadcast(message) {
  clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
          client.send(message); // Send the message to the client
      }
  });
}