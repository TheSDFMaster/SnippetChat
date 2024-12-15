// Import webSocket module
const WebSocket = require('ws');
// Import mongodb module
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://Admin:M2OVJgzIzekpEjEX@chatapp.h0po0.mongodb.net/?retryWrites=true&w=majority&appName=ChatApp";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
// Create WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });

// On connection
async function run(){
  try{
    await client.connect();
    console.log("Succesfully connected to MongoDB!");
    const db = client.db("SnippetDatas");
    const collection = db.collection("Messages");
    console.log("Documents will be created in SnippetDatas/Messages!");
    wss.on('connection', (ws) => {
      console.log("New connection!")
      // On message reception
      ws.on('message', async (message) => {
        const data = JSON.parse(message);
        if (data.action === "chat"){
          // Log Message
          console.log(`${data.name}: ${data.message}`);
          // Incert in DataBase
          await collection.insertOne(data);
          // Send the message to everyone
          wss.clients.forEach((client) => {
            client.send(JSON.stringify(data));
          });
        } else if (data.action === "log"){
          console.log(`${data.name} joined!`);
          let documents = await collection.find().toArray();
          for (doc in documents){
            ws.send(JSON.stringify(doc))
          };
          wss.clients.forEach((client) => {
            client.send(JSON.stringify({
              name: "SERVER",
              message: `${data.name} joined!`,
              action: "info"
            }))
          });
        } else if (data.action === "leave"){
          console.log(`${data.name} left!`);
          wss.clients.forEach((client) => {
            client.send(JSON.stringify({
            name: "SERVER",
            message: `${data.name} left!`,
            action: "info"
            }))
          });
        };
      });

      // On disconect
      ws.on('close', () => {
        console.log("Connection lost!")
      });
    });
  } catch (err){console.error(err)};
};
run();
// Server location log
console.log('Serveur WebSocket en écoute sur https://vigilant-space-winner-x649p4xxpr4cqvg-8080.app.github.dev/');
