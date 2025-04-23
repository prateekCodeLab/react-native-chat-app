
# 💬 React Native Real-Time Chat App

A simple yet powerful real-time chat application built using **React Native (frontend)** and **Node.js + Socket.IO (backend)**.
 
> 📱 Works on mobile via **Expo**  
> 🔄 Real-time messaging using **WebSockets**  
> 🔐 Includes basic room join, username auth, message timestamps, and typing indicators

---

## 🚀 Features

- 📲 React Native frontend built with Expo
- ⚡ Real-time chat using **Socket.IO**
- 🧑‍🤝‍🧑 Join any chat room by entering a username and room name
- 💬 Send and receive messages instantly
- 🕒 Timestamp shown for every message
- 👀 Shows online users and typing indicator
- 🔐 No login required — dummy auth via username and room
- 🔄 Message deduplication and auto-scroll

---

## 🛠️ Technologies Used

### 🔧 Frontend (Mobile App)
- React Native
- Expo
- socket.io-client
- AsyncStorage (for local session save)

### 🔧 Backend (Server)
- Node.js
- Express
- Socket.IO
- Moment.js (timestamps)

---

## 📦 Folder Structure

```bash
chat-app/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── ...
├── frontend/
│   ├── App.js
│   ├── package.json
│   └── ...
└── README.md
```

---

## ⚙️ How to Run

### 💻 Backend (Node.js)

Navigate to the backend folder:

```bash
cd backend
npm install
npm start
```

This starts the Socket.IO server at `http://localhost:5000`  
You’ll see logs like:

```
Server running on port 5000.
```

---

### 📱 Frontend (React Native)

Navigate to the frontend folder:

```bash
cd frontend
npm install
npx expo start
```

Then:

- Scan the QR code using **Expo Go** app on your Android/iOS phone  
- *(Make sure your phone and PC are on the same Wi-Fi network)*

You can also run it on:

- Android/iOS **emulator**  
- Or using **Expo DevTools** in the browser

---

## ✍️ Author

👨‍💻 Developed by **Prateek Kumar**  
📧 Email: [prateekkmr3151@gmail.com](mailto:prateekkmr3151@gmail.com)  
🌐 GitHub: [github.com/prateekCodeLab](https://github.com/prateekCodeLab)
