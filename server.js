// Import webSocket module
const WebSocket = require('ws');
const bcrypt = require("bcrypt")
// Import mongodb module
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://Admin:5rdQf3SRYsst1GSn@chatapp.h0po0.mongodb.net/?retryWrites=true&w=majority&appName=ChatApp";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
// Create WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });

const rooms = {
  public:new Map()
}


// On connection
async function run(){
  try{
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    const db = client.db("SnippetData");
    const Public = db.collection("Public");
    const Comptes = db.collection("Comptes")
    wss.on('connection', async (ws) => {
      console.log("New connection!")
      let username = "unknown";
      let pseudo = username
      let users = rooms.public
      let room = "Public"
      let Compte
      // On message reception
      ws.on('message', async (message) => {
        const data = JSON.parse(message);
        if (data.action === "chat"){
          if (users.get(username) === ws && typeof data.message == "string" && data.message.length < 1000 && Compte && !Compte.isMute && data.message.trim() !== ''){
            const box = await command(users, username, Compte.isOp, data.message, Comptes, db)
            if (box[2]){
              if (!box[0]){
                info("Command failed to execute: " + box[1], false, ws, users)
                console.log(username, box[1])
              }else{
                if (box[2] == "nick"){
                  pseudo = box[3]
                }else if (box[2] == "private"){
                  room = box[3]
                  info(username + " left!", true, ws, users)
                  for (const [username, socket] of users.entries()) {
                    if (socket === ws) {
                        users.delete(username);
                    }
                  }
                  if (box[3] in rooms){
                    users = rooms[room]
                    users.set(username, ws)
                    let documents = await db.collection(room).find().toArray();
                    let object = {action:"load", "content":documents};
                    ws.send(JSON.stringify(object))
                    info(`${username} joined!`, true, ws, users)
                  }else{
                    rooms[room] = new Map()
                    users = rooms[room]
                    users.set(username, ws)
                    await db.createCollection(room)
                    let documents = await db.collection(room).find().toArray();
                    let object = {action:"load", "content":documents};
                    ws.send(JSON.stringify(object))
                    info(`${username} joined!`, true, ws, users)
                  }
                }
              }
            }else {
              // Log Message;
              console.log(`${username}: ${data.message}`);
              // Insert in DataBase
              await db.collection(room).insertOne({
                action:"chat",
                username:pseudo,
                message:data.message,
                time:getCurrentTime()
              });
              // Send the message to everyone
              sendToAll(users, {
                  action:"chat",
                  username:pseudo,
                  message:data.message,
                  time:getCurrentTime()
              });
            }
          }
          else{
            info("You cannot send this message!", false, ws, users)
          }
        }else if (data.action === "join"){
          username = data.username;
          pseudo = username
          const isLegal = username && data.password  && !users.has(username) && isGood(username);
          Compte = await Comptes.findOne({username:username});
          if ((Compte && await verifyPassword(data.password, Compte.password) && !Compte.isBanned && isLegal) || (!Compte && isLegal)){
            if (!Compte){
              info("You created a new account!", false, ws, users)
              await Comptes.insertOne({
                username:username,
                password: await hashPassword(data.password),
                isBanned:false,
                isOp:false,
                isMute:false
              })
              console.log(`${data.username} created an account!`);
            }
            users.set(username, ws);
            let documents = await Public.find().toArray();
            let object = {action:"load", "content":documents};
            ws.send(JSON.stringify(object))
            console.log(`${data.username} joined!`);
            console.log("sent data")
            if (Compte.isVanished !== true){
              info(`${data.username} joined!`, true, ws, users)
            }
          }else if(!isLegal){
            if(!username){
              info("You need a username!", false, ws, users)
            }else if(!data.password){
              info("You need a password!", false, ws, users)
            }else if (users.has(username)){
              info("You are already connected!", false, ws, users)
            }else if (!isGood(username)){
              info("Your username must contains 3-15 characters. They must be only letters and numbers and can't start with a digit.", false, ws, users)
            }
          }else if (!await verifyPassword(data.password, Compte.password)){
            info("Incorrect password!", false, ws, users)
          }else if (Compte.isBanned){
            info("You are banned!", false, ws, users)
          }
        }
        else if(data.action == "file"){
          if (users.get(username) === ws){
            console.log(username + " send a file");
            await db.collection(room).insertOne(data)
            sendToAll(users, {
              action: "file",
              username: username,
              "fileName": data.fileName,
              "fileData": data.fileData,
              "fileType": data.fileType,
              time:getCurrentTime()
            });
          }
        }
        else if (data.action == "ping"){
          ws.send(JSON.stringify({
            action: "pong",
            time:getCurrentTime()
          }));
        }
      });

      // On disconnect
      ws.on('close', () => {
        for (const [username, socket] of users.entries()) {
          if (socket === ws) {
              users.delete(username);
          }
        }
        console.log("Connection lost with " + username + "!")
        if (username !== "unknown"){
          if (Compte.isVanished !== true){
            info(username + " left!", true, ws, users)
          }
        }
      });
    });
  } catch (err){console.error(err)};
};
run();
// Server location log
console.log('Server WebSocket is listening on https://vigilant-space-winner-x649p4xxpr4cqvg-8080.app.github.dev/');

function isGood(str) {
	return (
		typeof str === 'string' &&
		str.length >= 3 &&
		str.length <= 15 &&
		!(/^\s*$/.test(str)) && // Check if the string is not empty or just whitespace
		!(/^\d/.test(str)) && // Ensure the string does not start with a digit
		/^[a-zA-Z0-9]+$/.test(str) // Ensure the string contains only alphanumeric characters, no spaces
	);
}

async function hashPassword(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log("New password created!")
  return hash;
}

async function verifyPassword(password, storedHash) {
  try{
    const match = await bcrypt.compare(password, storedHash);
    return match;
  }
  catch(err){
    return false
  }
}

function sendToAll(users, Object) {
  users.forEach((ws, username) => {
    ws.send(JSON.stringify(Object));
  });
}

function getCurrentTime() {
	const now = new Date();
	// Convert the time to Quebec City's time zone
	const options = { timeZone: 'America/Toronto', hour12: false };
	const formatter = new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		...options
	});

	const [date, time] = formatter.format(now).split(', ');
	const [hour, minute] = time.split(':');

	return `${date} ${hour}:${minute}`;
}


async function command(users, username, isOp, message, Comptes, db){
  const slices = message.split(" ");
  const cmd = slices[0].slice(1);
  let targetName = slices[1];
  const target = users.get(targetName)
  const user = users.get(username)
  const supplementaries = message.slice(2+(cmd+targetName).length)
  let storage;
  const commands = {
    "kick":function(){
      if (isOp){
        try{
          info(supplementaries ? "You have been kicked out: " + supplementaries : "You have been kicked out because of God's will.", false, target, users)
          target.close();
          return [true, ""]
        }catch(err){
          return [false, err]
        }
      }else{;
        return [false, "You need Op for this"]
      }
    },
    "ban":async function(){
      if (isOp){
        try{
          await Comptes.updateOne({username:target}, {$set: {isBanned:true}})
          if (targetName in users){
            info(supplementaries ? "You have been banned: " + supplementaries:"You have been banned because of God's will.", false, target, users)
            target.close();
            info("The user is now banned", false, user, users)
          }
          return [true, ""]
        }catch(err){
          return [false, err]
        }
      }else{
        return [false, "You need Op for this"]
      }
    },
    "unban":async function(){
      if (isOp){
        try{
          await Comptes.updateOne({username:target},{$set:{isBanned:false}});
          info("The user isn't banned anymore", false, user, users)
          return [true, ""]
        }catch(err){
          return [false, err]
        }
      }else{
        return [false, "You need Op for this"]
      }
    },
    "op":async function(){
      if (isOp){
        try{
          await Comptes.updateOne({username:target},{$set:{isOp:true}});
          info("You are now op!", false, target, users)
          info("The user is now an Admin", false, user, users)
          return [true, ""]
        }catch(err){
          return [false, err]
        }
      }else{
        return [false, "You need Op for this"]
      }
    },
    "deop":async function(){
      if (isOp){
        try{
          await Comptes.updateOne({username:target},{$set:{isOp:false}});
          if (targetName in users){
            info("You aren't op anymore!", false, target, users)
          }
          info("The user isn't an Admin anymore", false, user, users)
          return [true, ""]
        }catch(err){
          return [false, err]
        }
      }else{
        return [false, "You need Op for this"]
      }
    },
    "msg":function(){
      try{
        if (targetName in users){
          target.send(JSON.stringify({
            action:"chat",
            message: supplementaries,
            username:"["+user+"]",
            time: getCurrentTime()
          }));
          user.send(JSON.stringify({
            action:"chat",
            message: supplementaries,
            username:"["+user+"]",
            time: getCurrentTime()
          }))
          return [true, ""]
        }else{
          return [false, "This user is currently not online"]
        }
      }
      catch(err){
        return [false, err]
      }
    },
    "mute":async function(){
      if (isOp){
        try{
          await Comptes.updateOne({username:targetName}, {$set: {isMute:true}})
          if (targetName in users){
            info(supplementaries ? "You have been muted: " + supplementaries:"You have been muted because of God's will.", false, target, users) 
          }
          info("The user is now muted", false, user, users)
          return [true, ""]
        }catch(err){
          return [false, err]
        }
      }else{
        return [false, "You need Op for this"]
      }
    },
    "unmute":async function(){
      if (isOp){
        try{
          await Comptes.updateOne({username:targetName}, {$set: {isMute:false}})
          if (targetName in users){
            info(supplementaries ? "You have been unmuted: " + supplementaries:"You have been unmuted because of God's will.", false, target, users) 
          }
          info("The user isn't muted anymore", false, user, users)
          return [true, ""]
        }catch(err){
          return [false, err]
        }
      }else{
        return [false, "You need Op for this"]
      }
    },
    "nick":function(){
      if (isOp){
        try{
          if (isGood(targetName)){
            storage = targetName
            info("Your username as been change for " + targetName, false, user, users)
            return [true, ""]
          }else{
            return [false, "Your username must contains 3-15 characters. They must be only letters and numbers and can't start with a digit."]
          }
        }catch(err){
          return [false, err]
        }
      }else{
        return [false, "You need Op for this"]
      }
    },
    "private":async function(){
      try{
        if (targetName && supplementaries){
          const room = await db.collection("Rooms").findOne({name:targetName})
          console.log(room)
          if (room){
            if (verifyPassword(supplementaries, room.password)){
              storage = targetName
              return [true, ""]
            }else{
              return [false, "Incorrect password!"]
            }
          }else{
            db.collection("Rooms").insertOne({
              name:targetName,
              password:await hashPassword(supplementaries)
            })
            storage = targetName
            return [true, ""]
          }
        }else{
          return [false, "You need to enter a room name and its password! To create a room enter a new name and a password."]
        }
      }catch(err){
        return [false, err]
      }
    },
    "vanish":async function(){
      if (isOp){
        try{
          if (!targetName){
            targetName = username
            console.log(targetName)
          }
          const Compte = await Comptes.findOne({username:targetName})
          if (Compte){
            if (Compte.isVanished){
              Comptes.updateOne({username:targetName},{$set:{isVanished:false}})
              if (users.has(targetName)){
                info(`${targetName} joined!`, true, target, users)
              }else{
                info("The user isn't vanished anymore", false, user, users)
              }
            }else{
              Comptes.updateOne({username:targetName},{$set:{isVanished:true}})
              if (users.has(targetName)){
                info(targetName + " left!", true, target, users)
              }else{
                info("The user is now vanished", false, user, users)
              }
            }
            return [true, ""]
          }else{
            return [false, "This user doesn't exist"]
          }
        }catch(err){
          return [false, err]
        }
      }else{
        return [false, "You need Op for this"]
      }
    }
  }
  if (message.startsWith("/")){
    if(cmd in commands){
      const value = await commands[cmd]();
      value.push(cmd);
      value.push(storage)
      return value;
    }else{
      return [false, "Unknown command", cmd, storage]
    }
  }else{
    return [true, "", false];
  }
}

function info(message, all, target, users){
  if (all){
    users.forEach((ws, username) => {
      ws.send(JSON.stringify({
        action:"info",
        username:"SERVER",
        message:message,
        time:getCurrentTime()
      }))
    })
  }else{
    target.send(JSON.stringify({
      action:"info",
      username:"SERVER",
      message:message,
      time:getCurrentTime()
    }))
  }
}