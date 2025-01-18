const username = "";
const password = "";
let socket

let lastUser = ""
let lastMessage

createConnection()
document.body.innerHTML = "";
const messageContainer = document.createElement("div");
messageContainer.style.position = "relative";
messageContainer.style.height = "calc(100vh - 5%)";
messageContainer.style.overflowY = "scroll";
document.body.appendChild(messageContainer);

const form = document.createElement("form");
form.style.position = "fixed";
form.style.bottom = "0";
form.style.width = "100%";
form.style.height = "5%";

const inputElement = document.createElement("input");
inputElement.type = "text";
inputElement.placeholder = "Envoyer un message";
inputElement.style.width = "65%";

const submitButton = document.createElement("button");
submitButton.textContent = "Submit";
submitButton.style.width = "15%";

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.style.width = "15%";

function handleSubmit(event) {
    event.preventDefault();
    const enteredText = inputElement.value;
    socket.send(JSON.stringify({
        "action": "chat",
        "message": enteredText
    }));
    inputElement.value = "";
}

function handleFilesUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const fileData = e.target.result;
            const time = getCurrentTime();
            socket.send(JSON.stringify({
                "action": "file",
                "fileName": file.name,
                "fileData": fileData,
                "time": time
            }));
        };
        reader.readAsDataURL(file);
    }
}

form.addEventListener("submit", handleSubmit);
fileInput.addEventListener("change", handleFilesUpload);

form.appendChild(inputElement);
form.appendChild(submitButton);
form.appendChild(fileInput);

document.body.appendChild(form);

function createConnection() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Connection already established.");
        return;
    }

    socket = new WebSocket("wss://special-space-rotary-phone-w64954xxjjv2vv7w-8080.app.github.dev");

    // Attach event handlers
    socket.onopen = function () {
        console.log("WebSocket connection opened.");
        socket.send(JSON.stringify({
            "action": "join",
            "username": username,
            "password": password
        }));

        // Ping periodically to keep the connection alive
        setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ "action": "ping" }));
            }
        }, 10000);
    };

    socket.onmessage = function (event) {
        const data = JSON.parse(event.data);

        if (data.action === "pong") {
            // Do nothing for pong
        } else if (data.action === "load") {
            console.log(data);
            const content = data.content;
            for (const doc of content) {
                addMessage(doc.username, doc.time, doc.message)
            }
            messageContainer.scrollTop = messageContainer.scrollHeight;
        } else {
            console.log(data);
            //const message = data.username + ": " + data.message;
            if (data.action !== "info" && document.visibilityState !== "visible") {
                const notif = new Notification(data.username, { body: data.message });
            }
            /*const paragraph = document.createElement("p");
            paragraph.innerHTML = message;
            messageContainer.appendChild(paragraph);
            messageContainer.scrollTop = messageContainer.scrollHeight;*/
            const isScrolled = messageContainer.scrollHeight - messageContainer.scrollTop <= messageContainer.clientHeight + 1
            addMessage(data.username, data.time, data.message)
            if (isScrolled) {
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
        }
    };

    socket.onclose = function () {
        console.log("WebSocket connection closed.");
    };
}

function disconnect() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Closing WebSocket connection...");
        socket.close();
    } else {
        console.log("No active connection to close.");
    }
}

function reconnect() {
    disconnect(); // Close the existing connection if there is one
    setTimeout(createConnection, 1000); // Wait 1 second before reconnecting
}

function disconnect() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Closing WebSocket connection...");
        socket.close();
    } else {
        console.log("No active connection to close.");
    }
}
function reconnect() {
    disconnect();  // Close the existing connection if there is one
    setTimeout(createConnection, 1000);  // Wait 1 second before reconnecting
}

function addMessage(name, time, message){
    if (lastUser == name){
        if (lastMessage){
            const p = document.createElement("p")
            p.textContent = message
            lastMessage.appendChild(p)
        }else{
            lastMessage = document.createElement("div")
            lastMessage.id = "last"
            lastMessage.classList.add("message")
            
            const header = document.createElement("h5");
        	header.style.display = "flex";
        	header.style.alignItems = "center";
        	header.style.gap = "8px";
            header.style.marginBottom = "4px";

            const nameElement = document.createElement("strong");
            nameElement.textContent = name;
            header.appendChild(nameElement);
        
        	const timeSpan = document.createElement("span");
        	timeSpan.textContent = time;
        	timeSpan.style.fontSize = "0.9em";
            timeSpan.style.color = "#888";
        	header.appendChild(timeSpan);
        
        	const p = document.createElement("p");
        	p.textContent = message;
            p.style.marginBottom = "4px";
        
        
        	lastMessage.appendChild(header);
        	lastMessage.appendChild(p);
        }
    }else{
        lastUser = name
        if (lastMessage){
            lastMessage.id = ""
            lastMessage = document.createElement("div")
            lastMessage.id = "last"
            lastMessage.classList.add("message")
            
            const header = document.createElement("h5");
        	header.style.display = "flex";
        	header.style.alignItems = "center";
        	header.style.gap = "8px";
            header.style.marginBottom = "4px";

            const nameElement = document.createElement("strong");
            nameElement.textContent = name;
            header.appendChild(nameElement);
        
        	const timeSpan = document.createElement("span");
        	timeSpan.textContent = time;
        	timeSpan.style.fontSize = "0.9em";
            timeSpan.style.color = "#888";
        	header.appendChild(timeSpan);
        
        	const p = document.createElement("p");
        	p.textContent = message;
            p.style.marginBottom = "4px";
        
        
        	lastMessage.appendChild(header);
        	lastMessage.appendChild(p);
        }else{
            lastMessage = document.createElement("div")
            lastMessage.id = "last"
            lastMessage.classList.add("message")
            
            const header = document.createElement("h5");
        	header.style.display = "flex";
        	header.style.alignItems = "center";
        	header.style.gap = "8px";
            header.style.marginBottom = "4px";

            const nameElement = document.createElement("strong");
            nameElement.textContent = name;
            header.appendChild(nameElement);
        
        	const timeSpan = document.createElement("span");
        	timeSpan.textContent = time;
        	timeSpan.style.fontSize = "0.9em";
            timeSpan.style.color = "#888";
        	header.appendChild(timeSpan);
        
        	const p = document.createElement("p");
        	p.textContent = message;
            p.style.marginBottom = "4px";
        
        
        	lastMessage.appendChild(header);
        	lastMessage.appendChild(p);
        }
    }
    messageContainer.appendChild(lastMessage);
}