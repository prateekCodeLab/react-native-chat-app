import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize socket connection
const socket = io('http://192.168.1.7:5000', {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

// Message component optimized with React.memo
const MessageItem = React.memo(({ message, username }) => {
  console.log('Message:', message);

  // Handle system messages (username: 'System')
  if (message.username === 'System') {
    return (
      <View style={[styles.messageContainer, styles.systemMessageContainer]}>
        <Text style={[styles.messageText, { fontStyle: 'italic' }]}>{message.text}</Text>
        <Text style={[styles.messageTimestamp, { fontStyle: 'italic' }]}>{message.timestamp}</Text>
      </View>
    );
  }

  // Handle user messages
  return (
    <View style={[styles.messageContainer, {
      alignSelf: message.username && message.username === username ? 'flex-end' : 'flex-start',
      backgroundColor: message.username && message.username === username ? '#e0f7fa' : '#f0f0f0',
    }]}>
      <Text style={styles.messageUsername}>{message.username || 'Unknown'}</Text>
      <Text style={styles.messageText}>{message.text || 'No message'}</Text>
      <Text style={styles.messageTimestamp}>{message.timestamp || 'No timestamp'}</Text>
    </View>
  );
});

const App = () => {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const flatListRef = React.useRef(null);

  // Load credentials from AsyncStorage without auto-authenticating
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('username');
        const storedRoom = await AsyncStorage.getItem('room');
        if (storedUsername && storedRoom) {
          setUsername(storedUsername);
          setRoom(storedRoom);
          // Do not call authenticate here; let the user join manually
        }
      } catch (err) {
        console.error('Failed to load credentials:', err);
        setError('Failed to load saved credentials');
      }
    };
    loadCredentials();
  }, []);

  // Handle socket events
  useEffect(() => {
    socket.on('message', (message) => {
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === message.id)) return prev;
        const newMessages = [...prev, message].slice(-100);
        // Auto-scroll to the latest message
        flatListRef.current?.scrollToEnd({ animated: true });
        return newMessages;
      });
    });

    socket.on('messageHistory', (history) => {
      setMessages(history);
    });

    socket.on('presenceUpdate', (roomUsers) => {
      setUsers(roomUsers);
    });

    socket.on('connect', () => {
      console.log('Connected to server');
      setIsLoading(false);
      setError('');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsLoading(true);
      setError('Disconnected from server');
      // Clear AsyncStorage on disconnect to prevent auto-join on reload
      AsyncStorage.removeItem('username');
      AsyncStorage.removeItem('room');
      setIsAuthenticated(false);
      setUsername('');
      setRoom('');
      setMessages([]);
      setUsers([]);
    });

    return () => {
      socket.off('message');
      socket.off('messageHistory');
      socket.off('presenceUpdate');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  // Handle typing indicator
  useEffect(() => {
    socket.emit('typing', { room, isTyping });
  }, [isTyping, room]);

  // Authenticate user
  const authenticate = (user, rm) => {
    if (!user.trim() || !rm.trim()) {
      setError('Please enter both username and room');
      return;
    }
    setIsLoading(true);
    socket.emit('authenticate', { username: user, room: rm }, async (response) => {
      if (response.status === 'success') {
        setIsAuthenticated(true);
        setError('');
        try {
          await AsyncStorage.setItem('username', user);
          await AsyncStorage.setItem('room', rm);
        } catch (err) {
          console.error('Failed to save credentials:', err);
          setError('Failed to save credentials');
        }
      } else {
        setError(response.message);
      }
      setIsLoading(false);
    });
  };

  // Send message
  const sendMessage = () => {
    if (!text.trim()) return;
    socket.emit(
      'message',
      { room, text, username },
      (response) => {
        if (response.status === 'delivered') {
          setText('');
          setIsTyping(false);
        } else {
          setError('Failed to send message');
        }
      }
    );
  };

  // Deduplicated messages for rendering
  const renderedMessages = useMemo(() => messages, [messages]);

  // Render typing indicators
  const typingUsers = users.filter((user) => user.isTyping && user.username !== username);

  return (
    <SafeAreaView style={styles.container}>
      {!isAuthenticated ? (
        <View style={styles.authContainer}>
          <Text style={styles.title}>Join Chat</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TextInput
            style={styles.joinInput}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.joinInput}
            placeholder="Room"
            value={room}
            onChangeText={setRoom}
            autoCapitalize="none"
          />
          <View style={styles.buttonContainer}>
            <Button
              title="Join Chat"
              onPress={() => authenticate(username, room)}
              disabled={isLoading}
              color="#007AFF"
            />
          </View>
          {isLoading && <ActivityIndicator style={styles.loader} />}
        </View>
      ) : (
        <View style={styles.chatContainer}>
          <View style={styles.presenceContainer}>
            <Text style={styles.presenceText}>
              Online: {users.map((u) => u.username).join(', ') || 'None'}
            </Text>
            {typingUsers.length > 0 && (
              <Text style={[styles.presenceText, { marginTop: 5 }]}>
                {typingUsers.map((u) => u.username).join(', ')} typing...
              </Text>
            )}
          </View>
          <FlatList
            ref={flatListRef}
            data={renderedMessages}
            renderItem={({ item }) => <MessageItem message={item} username={username} />}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={(value) => {
                setText(value);
                setIsTyping(value.length > 0);
              }}
              placeholder="Type a message..."
            />
            <Button title="Send" onPress={sendMessage} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  chatContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  joinInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 15,
  },
  loader: {
    marginTop: 10,
  },
  messageList: {
    flex: 1,
    paddingVertical: 10,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 10,
    maxWidth: '75%',
    marginBottom: 10,
  },
  systemMessageContainer: {
    alignSelf: 'center',
    backgroundColor: '#f0f0f0',
  },
  messageUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333', // Ensure visibility
  },
  messageText: {
    fontSize: 16,
    color: '#333', // Ensure visibility
  },
  messageTimestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4, // Space between text and timestamp
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  presenceContainer: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  presenceText: {
    fontSize: 14,
    color: '#333',
  },
});

export default App;