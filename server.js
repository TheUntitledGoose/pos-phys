const WebSocket = require('ws');

const env = require('dotenv').config();
// Whatcha looking at?
const webhookURL = env.parsed.URL
const webhookURL_AP = env.parsed.URL_AP

const mongoose = require('mongoose');
// Connect to DB
(function connectToDB() {
  mongoose.connect('mongodb://192.168.1.215:32770/bot')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));
})();

async function getFeatures() {
  const features = await db.collection('features').find().toArray();
  const featureState = {};
  features.forEach(f => {
    featureState[f.name] = f.enabled;
  });
  return featureState;
}



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

function sendWebhook(username, unitName, endpoint=false) {

  const webhookBody = {
    username: username, 
    avatar_url: "https://m.byt3.cc/u/LQa9qC.png",
    embeds: [ 
      {
        title: "cheater cheater pumpkin eater",
        description: `${username} be doin ${unitName}`,
        color: 3447003,
        timestamp: new Date().toISOString()
      }
    ]
  };

  fetch(endpoint ? webhookURL_AP : webhookURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookBody),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  })
  .catch(error => {
    console.error('Error sending webhook message:', error);
  });
}


wss.on('connection', function connection(ws) {
  // console.log(`A user connected`);

  var features = getFeatures();
  if (!features.enabled) {
    // not enabled, return no
    ws.send(JSON.stringify({ type: 'close' }));
    return;
  } 

  clients.push(ws);
  
  ws.on('message', function incoming(message) {
    message = JSON.parse(message)
    
    // console.log(message)

    switch (message.type) {
      case 'subscribe':
        console.log(`\n[${getFormattedTimestamp()}] : \x1b[42m[SUBSCRIBE]\x1b[0m`);
        console.log(`  - User:        \x1b[32m${message.username}\x1b[0m (ID: \x1b[32m${message.userID}\x1b[0m)`);
        console.log(`  - Course:      \x1b[32m${message.courseID}\x1b[0m`);
        console.log(`  - Unit:        \x1b[32m${message.unitName}\x1b[0m (ID: \x1b[32m${message.unitID}\x1b[0m)`);
        console.log(`  - Skill Type:  \x1b[32m${message.skillType}\x1b[0m`);
        console.log(`  - Problem ID:  \x1b[32m${message.nameSpace?.problemID || 'N/A'}\x1b[0m`);
        console.log(`  - Page URL:    \x1b[36m${message.page}\x1b[0m\n`);
        break;

      case 'new_problem':
        console.log(`\n[${getFormattedTimestamp()}] : \x1b[42m[NEW PROBLEM]\x1b[0m`);
        console.log(`  - User:        \x1b[32m${message.username}\x1b[0m (ID: \x1b[32m${message.userID}\x1b[0m)`);
        console.log(`  - Course:      \x1b[32m${message.courseID}\x1b[0m`);
        console.log(`  - Unit:        \x1b[32m${message.unitName}\x1b[0m (ID: \x1b[32m${message.unitID}\x1b[0m)`);
        console.log(`  - Skill:       \x1b[32m${message.skillID}\x1b[0m (Type: \x1b[32m${message.skillType}\x1b[0m)`);
        console.log(`  - Problem ID:  \x1b[32m${message.nameSpace?.problemID || 'N/A'}\x1b[0m`);
        console.log(`  - AnswerVals:  \x1b[32m${JSON.stringify(message.answerValues) || 'None'}\x1b[0m`);
        console.log(`  - Page URL:    \x1b[36m${message.page}\x1b[0m\n`);

        sendWebhook(message.username, message.unitName, false)
        break;

      case 'old_problem':
        console.log(`\n[${getFormattedTimestamp()}] : \x1b[41m[OLD PROBLEM]\x1b[0m`);
        console.log(`  - User:        \x1b[31m${message.username}\x1b[0m (ID: \x1b[31m${message.userID}\x1b[0m)`);
        console.log(`  - Course:      \x1b[31m${message.courseID}\x1b[0m`);
        console.log(`  - Unit:        \x1b[31m${message.unitName}\x1b[0m (ID: \x1b[31m${message.unitID}\x1b[0m)`);
        console.log(`  - Skill Type:  \x1b[31m${message.skillType}\x1b[0m`);
        console.log(`  - Problem ID:  \x1b[31m${message.nameSpace?.problemID || 'N/A'}\x1b[0m`);
        console.log(`  - Page URL:    \x1b[36m${message.page}\x1b[0m\n`);
        break;

      case 'disconnect':
        console.log(`\n[${getFormattedTimestamp()}] : \x1b[41m[DISCONNECT]\x1b[0m`);
        console.log(`  - User:        \x1b[31m${message.username}\x1b[0m (ID: \x1b[31m${message.userID}\x1b[0m)`);
        console.log(`  - Last Page:   \x1b[36m${message.page}\x1b[0m\n`);
        break;

      case 'apnew':

        console.log(`\n[${getFormattedTimestamp()}] : \x1b[42m[NEW AP PROBLEM]\x1b[0m`);
        // console.log(`  - User:        \x1b[32m${message.username}\x1b[0m)`);
        console.log(`  - Course:      \x1b[32m${message.unitName}\x1b[0m`);
        console.log(`  - Page URL:    \x1b[36m${message.page}\x1b[0m\n`);

        sendWebhook("AP User", message.unitName, true)
        break;

      default:
        break;
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