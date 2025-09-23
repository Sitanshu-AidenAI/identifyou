import { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header.jsx'
import NameForm from './components/NameForm.jsx'
import RoomForm from './components/RoomForm.jsx'
import ChatRoom from './components/ChatRoom.jsx'
import ErrorDisplay from './components/ErrorDisplay.jsx'

function App() {
  const [currentStep, setCurrentStep] = useState('name') 
  const [username, setUsername] = useState('')
  const [roomname, setRoomname] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSharedRoom, setIsSharedRoom] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem("username")
    const savedRoom = localStorage.getItem("roomname")
    
    // Check for room parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const roomFromUrl = urlParams.get('room')

    if (roomFromUrl) {
      setRoomname(roomFromUrl)
      setIsSharedRoom(true)
      localStorage.setItem("roomname", roomFromUrl)
      
      if (savedUser) {
        setUsername(savedUser)
        setCurrentStep('chat')
      } else {
        // If no saved user, go to name form but skip room selection
        setCurrentStep('name')
      }
      
      // Update URL to remove the room parameter for cleaner experience
      window.history.replaceState({}, '', window.location.pathname)
    } else if (savedUser && savedRoom) {
      // Normal session restoration
      setUsername(savedUser)
      setRoomname(savedRoom)
      setCurrentStep('chat')
    }
    
    setIsLoading(false)
  }, [])

  const handleNameSubmit = (name) => {
    setUsername(name)
    localStorage.setItem("username", name)
    
    // If room is already set (from URL), go directly to chat
    if (roomname) {
      setCurrentStep('chat')
    } else {
      setCurrentStep('room')
    }
    
    setError('')
  }

  const handleRoomJoin = (room) => {
    setRoomname(room)
    localStorage.setItem("roomname", room)
    setCurrentStep('chat')
    setError('')
  }

  const handleError = (errorMessage) => {
    setError(errorMessage)
  }

  const resetToNameForm = () => {
    setCurrentStep('name')
    setUsername('')
    setRoomname('')
    setError('')
    // Clear localStorage
    localStorage.removeItem("username")
    localStorage.removeItem("roomname")
  }

  // Show loading state while checking for saved session
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
          <p className="text-gray-300">Restoring session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-gray-200 overflow-hidden bg-gradient-mesh min-h-screen">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 sm:w-64 h-32 sm:h-64 bg-purple-600/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-blue-600/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 sm:w-80 h-40 sm:h-80 bg-pink-600/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <Header />
      
      <ErrorDisplay error={error} />
      
      {currentStep === 'name' && (
        <NameForm 
          onSubmit={handleNameSubmit} 
          onError={handleError} 
          isSharedRoom={isSharedRoom}
          roomname={roomname}
        />
      )}
      
      {currentStep === 'room' && (
        <RoomForm 
          onJoinRoom={handleRoomJoin} 
          onError={handleError}
          username={username}
        />
      )}
      
      {currentStep === 'chat' && (
        <ChatRoom 
          username={username} 
          roomname={roomname}
          onError={handleError}
          onDisconnect={resetToNameForm}
        />
      )}
    </div>
  )
}

export default App
