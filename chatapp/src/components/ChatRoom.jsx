import React, { useState, useEffect, useRef } from 'react'

function ChatRoom({ username, roomname, onError, onDisconnect }) {
  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false) 
  const [isTyping, setIsTyping] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState([])
  const [readyToChat, setReadyToChat] = useState(false) 
  const webSocketRef = useRef(null)
  const chatlogRef = useRef(null)
  const heartbeatIntervalRef = useRef(null) 

  const userCount = connectedUsers.length

  useEffect(() => {
    connectToRoom()
    // Reset connected users when connecting to a new room
    setConnectedUsers([])
    console.log(`🏠 Connecting to room: ${roomname}`)

    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close()
        webSocketRef.current = null
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }
  }, [roomname]) // Only depend on roomname, not username

  useEffect(() => {
    if (chatlogRef.current) {
      chatlogRef.current.scrollTo({
        top: chatlogRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages])

  const connectToRoom = async () => {
    if (isConnecting || isConnected) {
      console.log("Already connecting or connected, skipping connection attempt")
      return
    }

    const cleanedRoomname = roomname.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase()
    
    const hostname = "192.168.2.96:8787" || import.meta.env.VITE_HOST_NAME
    const wsUrl = `ws://${hostname}/api/room/${cleanedRoomname}/websocket`
    console.log(`🔗 Connecting to ${wsUrl}`)
    
    setIsConnecting(true)
    try {
      await attemptConnection(wsUrl)
      console.log(`✅ Successfully connected to ${hostname}`)
    } catch (error) {
      console.error("Connection failed:", error)
      onError(`Unable to connect to chat server: ${error?.message || 'Unknown error'}. Please check if Wrangler dev server is running.`)
    } finally {
      setIsConnecting(false)
    }
  }

  const attemptConnection = (wsUrl) => {
    return new Promise((resolve, reject) => {
      if (webSocketRef.current && webSocketRef.current.readyState !== WebSocket.CLOSED) {
        webSocketRef.current.close()
        webSocketRef.current = null
      }

      console.log(`🔌 Creating WebSocket connection to: ${wsUrl}`)
      const ws = new WebSocket(wsUrl)
      webSocketRef.current = ws

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close()
        }
        reject(new Error("Connection timeout after 5 seconds"))
      }, 5000)

      ws.addEventListener("open", () => {
        clearTimeout(connectionTimeout)
        setIsConnected(true)
        setReadyToChat(false) // Reset ready state
        
        const initMessage = JSON.stringify({ name: username })
        ws.send(initMessage)

        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }))
          }
        }, 20000)
        
        resolve()
      })

      ws.addEventListener("message", (e) => {
        try {
          const data = JSON.parse(e.data)
          
          if (data.type === "pong") {
            return // Just acknowledge, no action needed
          }
          
          if (data.message) {
            addMessage(data.name, data.message)
          } else if (data.joined) {
            addMessage(null, `${data.joined} joined the room`, 'system')
            // Add the joined user to the list (avoid duplicates)
            setConnectedUsers(prev => {
              if (!prev.includes(data.joined)) {
                console.log(`👤 User joined: ${data.joined}, current list:`, [...prev, data.joined])
                return [...prev, data.joined]
              }
              console.log(`👤 User ${data.joined} already in list, current list:`, prev)
              return prev
            })
          } else if (data.quit) {
            addMessage(null, `${data.quit} left the room`, 'system')
            // Remove the user who quit
            setConnectedUsers(prev => {
              const newList = prev.filter(user => user !== data.quit)
              console.log(`👋 User left: ${data.quit}, new list:`, newList)
              return newList
            })
          } else if (data.error) {
            console.error("Server error:", data.error)
            onError(data.error)
          } else if (data.ready) {
            setReadyToChat(true) // Now allow sending messages
            // Add current user to connected users list when ready
            setConnectedUsers(prev => {
              if (!prev.includes(username)) {
                console.log(`✅ Current user ready: ${username}, total users:`, [...prev, username])
                return [...prev, username]
              }
              console.log(`✅ Current user ${username} already in list:`, prev)
              return prev
            })
          }
        } catch (err) {
          console.error("Failed to parse message:", err, "Raw data:", e.data)
        }
      })

      ws.addEventListener("close", (e) => {
        console.log(`🔌 WebSocket closed: code=${e.code}, reason="${e.reason}", wasClean=${e.wasClean}`)
        clearTimeout(connectionTimeout)
        
        // Clear heartbeat interval
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
        
        setIsConnected(false)
        setIsConnecting(false)
        setReadyToChat(false)
        // Clear connected users when disconnected
        setConnectedUsers([])
        
        // Only treat as error if not a clean closure
        if (e.code !== 1000 && e.code !== 1001) {
          const errorMsg = `Connection closed unexpectedly (code: ${e.code}${e.reason ? ', reason: ' + e.reason : ''})`
          console.error(errorMsg)
          reject(new Error(errorMsg))
        }
      })

      ws.addEventListener("error", (e) => {
        console.error("🚨 WebSocket error event:", e)
        console.error("WebSocket state:", ws.readyState, "URL:", ws.url)
        clearTimeout(connectionTimeout)
        
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
        
        setIsConnected(false)
        setIsConnecting(false)
        setReadyToChat(false)
        // Clear connected users when there's an error
        setConnectedUsers([])
        reject(new Error(`WebSocket error (readyState: ${ws.readyState})`))
      })
    })
  }

  const addMessage = (name, text, type = 'message') => {
    const newMessage = {
      id: Date.now() + Math.random(),
      name,
      text,
      timestamp: new Date(),
      type,
      isOwn: name === username
    }
    setMessages(prev => [...prev, newMessage])
  }

  const sendMessage = () => {
    const trimmedMessage = currentMessage.trim()
    if (webSocketRef.current && trimmedMessage && isConnected && readyToChat) {
      if (trimmedMessage.length > 256) {
        onError("Message too long (max 256 characters)")
        return
      }
      
      webSocketRef.current.send(JSON.stringify({ message: trimmedMessage }))
      setCurrentMessage('')
      setIsTyping(false)
      
      if (chatlogRef.current) {
        chatlogRef.current.scrollTo({
          top: chatlogRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value)
    setIsTyping(e.target.value.length > 0)
  }

  return (
    <main className="flex-1 flex flex-col lg:flex-row p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-0">
      {/* Chat Container */}
      <div className="flex-1 flex flex-col bg-gray-800/60 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden min-h-0">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-gray-700/80 to-gray-600/80 backdrop-blur-sm px-3 sm:px-6 py-2 sm:py-4 border-b border-gray-600/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                {isConnected && <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">#{roomname}</h3>
                <p className="text-xs text-gray-300">{userCount} user{userCount !== 1 ? 's' : ''} online</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isTyping && (
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>typing...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div 
          ref={chatlogRef}
          className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3 bg-gradient-to-b from-gray-900/50 to-gray-800/50 min-h-0"
        >
          {messages.map((msg, index) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'} animate-slideIn`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {msg.type === 'system' ? (
                <div className="flex justify-center w-full">
                  <div className="bg-gray-700/50 backdrop-blur-sm text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-600/30">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div className={`max-w-[75%] sm:max-w-xs lg:max-w-md xl:max-w-lg ${msg.isOwn ? 'order-2' : 'order-1'}`}>
                  <div className={`relative group ${msg.isOwn 
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white ml-auto' 
                    : 'bg-gray-700/80 backdrop-blur-sm text-gray-100'
                  } rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
                    
                    {!msg.isOwn && (
                      <div className="text-xs font-semibold text-purple-400 mb-1">
                        {msg.name}
                      </div>
                    )}
                    
                    <div className="text-sm leading-relaxed break-words">
                      {msg.text}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-12 sm:w-16 h-12 sm:h-16 mb-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-6 sm:w-8 h-6 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-300 mb-2">Welcome to the chat!</h3>
              <p className="text-sm sm:text-base text-gray-400">Start the conversation by sending your first message</p>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-gray-700/50 backdrop-blur-sm border-t border-gray-600/50 p-2 sm:p-4 flex-shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex-1 relative">
              <input
                className="w-full bg-gray-600/50 backdrop-blur-sm border border-gray-500/50 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-gray-400 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20 transition-all duration-300 pr-12 sm:pr-16 text-sm"
                type="text"
                value={currentMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isConnected && readyToChat ? "Type your message..." : isConnected ? "Connecting to room..." : "Connecting..."}
                disabled={!isConnected || !readyToChat}
                maxLength={256}
              />
              <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                {currentMessage.length}/256
              </div>
            </div>
            
            <button
              onClick={sendMessage}
              disabled={!isConnected || !readyToChat || !currentMessage.trim()}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white p-2 sm:p-3 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-4 focus:ring-purple-400/30"
            >
              <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-64 bg-gray-800/60 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700/50 p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-[40vh] lg:max-h-none overflow-y-auto lg:overflow-visible">
        {/* Room Info */}
        <div className="bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-xl p-3 sm:p-4 border border-gray-600/30">
          <h4 className="font-semibold text-white mb-2 flex items-center text-sm sm:text-base">
            <svg className="w-4 sm:w-5 h-4 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0" />
            </svg>
            Room Info
          </h4>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Name:</span>
              <span className="text-white font-medium truncate ml-2">#{roomname}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Users:</span>
              <span className="text-green-400 font-medium">{userCount} online</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">You:</span>
              <span className="text-purple-400 font-medium truncate ml-2">{username}</span>
            </div>
          </div>
        </div>

        {/* Online Users List */}
        <div className="bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-xl p-3 sm:p-4 border border-gray-600/30">
          <h4 className="font-semibold text-white mb-3 flex items-center text-sm sm:text-base">
            <svg className="w-4 sm:w-5 h-4 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a4 4 0 11-8-1.464" />
            </svg>
            Online Users ({connectedUsers.length})
          </h4>
          <div className="space-y-2 max-h-24 sm:max-h-32 lg:max-h-40 overflow-y-auto">
            {connectedUsers.map((user, index) => (
              <div 
                key={index} 
                className={`flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 ${
                  user === username 
                    ? 'bg-purple-500/20 border border-purple-500/30' 
                    : 'bg-gray-600/30 hover:bg-gray-600/50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  user === username ? 'bg-purple-400' : 'bg-green-400'
                } animate-pulse`}></div>
                <span className={`text-xs sm:text-sm font-medium truncate ${
                  user === username ? 'text-purple-300' : 'text-gray-300'
                }`}>
                  {user === username ? `${user} (You)` : user}
                </span>
              </div>
            ))}
            {connectedUsers.length === 0 && (
              <div className="text-center py-2 sm:py-4">
                <p className="text-gray-400 text-xs sm:text-sm">No users online</p>
              </div>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className={`rounded-xl p-3 sm:p-4 border transition-all duration-300 ${
          isConnected 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span className={`font-medium text-xs sm:text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isConnected && (
            <button 
              onClick={connectToRoom}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-400/30 text-xs sm:text-sm"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reconnect</span>
              </div>
            </button>
          )}
          
          <button 
            onClick={onDisconnect}
            className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-400/30 text-xs sm:text-sm"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Leave Room</span>
            </div>
          </button>
        </div>
      </div>
    </main>
  )
}

export default ChatRoom