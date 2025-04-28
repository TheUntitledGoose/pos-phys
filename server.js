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
  // console.log(`A user connected`);
  clients.push(ws);
  
  ws.on('message', function incoming(message) {
    message = JSON.parse(message)
    
    // console.log(message)

    if (message.type == 'subscribe') {
    
      console.log(`\n[${getFormattedTimestamp()}] : \x1b[42m[SUBSCRIBE]\x1b[0m`);
      console.log(`  - User:        \x1b[32m${message.username}\x1b[0m (ID: \x1b[32m${message.userID}\x1b[0m)`);
      console.log(`  - Course:      \x1b[32m${message.courseID}\x1b[0m`);
      console.log(`  - Unit:        \x1b[32m${message.unitName}\x1b[0m (ID: \x1b[32m${message.unitID}\x1b[0m)`);
      console.log(`  - Skill Type:  \x1b[32m${message.skillType}\x1b[0m`);
      console.log(`  - Problem ID:  \x1b[32m${message.nameSpace?.problemID || 'N/A'}\x1b[0m`);
      console.log(`  - Page URL:    \x1b[36m${message.page}\x1b[0m\n`);
      
    } else if (message.type == 'new_problem') {
    
      console.log(`\n[${getFormattedTimestamp()}] : \x1b[42m[NEW PROBLEM]\x1b[0m`);
      console.log(`  - User:        \x1b[32m${message.username}\x1b[0m (ID: \x1b[32m${message.userID}\x1b[0m)`);
      console.log(`  - Course:      \x1b[32m${message.courseID}\x1b[0m`);
      console.log(`  - Unit:        \x1b[32m${message.unitName}\x1b[0m (ID: \x1b[32m${message.unitID}\x1b[0m)`);
      console.log(`  - Skill:       \x1b[32m${message.skillID}\x1b[0m (Type: \x1b[32m${message.skillType}\x1b[0m)`);
      console.log(`  - Problem ID:  \x1b[32m${message.nameSpace?.problemID || 'N/A'}\x1b[0m`);
      console.log(`  - AnswerVals:  \x1b[32m${JSON.stringify(message.answerValues) || 'None'}\x1b[0m`);
      console.log(`  - Page URL:    \x1b[36m${message.page}\x1b[0m\n`);

      
    } else if (message.type == 'old_problem') {
    
      console.log(`\n[${getFormattedTimestamp()}] : \x1b[41m[OLD PROBLEM]\x1b[0m`);
      console.log(`  - User:        \x1b[31m${message.username}\x1b[0m (ID: \x1b[31m${message.userID}\x1b[0m)`);
      console.log(`  - Course:      \x1b[31m${message.courseID}\x1b[0m`);
      console.log(`  - Unit:        \x1b[31m${message.unitName}\x1b[0m (ID: \x1b[31m${message.unitID}\x1b[0m)`);
      console.log(`  - Skill Type:  \x1b[31m${message.skillType}\x1b[0m`);
      console.log(`  - Problem ID:  \x1b[31m${message.nameSpace?.problemID || 'N/A'}\x1b[0m`);
      console.log(`  - Page URL:    \x1b[36m${message.page}\x1b[0m\n`);
      
    } else if (message.type == 'disconnect') {

      console.log(`\n[${getFormattedTimestamp()}] : \x1b[41m[DISCONNECT]\x1b[0m`);
      console.log(`  - User:        \x1b[31m${message.username}\x1b[0m (ID: \x1b[31m${message.userID}\x1b[0m)`);
      console.log(`  - Last Page:   \x1b[36m${message.page}\x1b[0m\n`);

    }

  });

  ws.on('close', () => {
    clients = clients.filter(client => client !== ws); // Remove the client from the array
    // console.log('Client disconnected');
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