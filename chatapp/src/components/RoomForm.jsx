import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import FormSidebar from "./FormSidebar";
import BackButton from "./ui/BackButton";

function RoomForm({ onJoinRoom, onError, username }) {
  const [roomName, setRoomName] = useState("");
  const [isCreatingPrivate, setIsCreatingPrivate] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const publicRooms = [
    {
      name: "Anti Bullying",
      index: 1,
    },
    {
      name: "Domestic Issues",
      index: 2,
    },
    {
      name: "Get Identified",
      index: 3,
    },
    {
      name: "Introductions",
      index: 4,
    },
    {
      name: "Study Group",
      index: 5,
    },
  ];

  // Add this derived state inside RoomForm
  const filteredRooms = publicRooms.filter((room) =>
    room.name.toLowerCase().includes(roomName.toLowerCase())
  );

  const handleJoinPublic = () => {
    const trimmedRoom = roomName.trim();
    if (trimmedRoom) {
      setIsJoining(true);
      const cleanedRoom = trimmedRoom
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .toLowerCase();
      if (cleanedRoom) {
        setTimeout(() => {
          onJoinRoom(cleanedRoom);
        }, 500);
      } else {
        setIsJoining(false);
        onError("Please enter a valid room name!");
      }
    } else {
      onError("Please enter a room name!");
    }
  };

  const handleCreatePrivate = async () => {
    setIsCreatingPrivate(true);
    try {
      const host = import.meta.env.VITE_HOST_NAME || window.location.host;
      const protocol =
        window.location.protocol === "https:" ? "https://" : "http://";
      const response = await fetch(`${protocol}${host}/api/room`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to create room (${response.status})`);
      }

      const privateRoomId = await response.text();
      setTimeout(() => {
        onJoinRoom(privateRoomId);
      }, 300);
    } catch (err) {
      onError(
        `Error creating private room: ${err.message}. Make sure Wrangler dev server is running.`
      );
    } finally {
      setIsCreatingPrivate(false);
    }
  };

  return (
    <>
      {/* FormSidebar Component */}
      <div className="flex justify-between">
        <BackButton />
        <FormSidebar />
      </div>
      
      <div className="fixed inset-0 z-40 bg-gradient-to-br from-gray-900 via-blue-900/80 to-gray-900 backdrop-blur-sm flex flex-col justify-center items-center animate-fadeIn p-4">
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/6 w-32 h-32 bg-purple-600/10 rounded-full blur-xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/6 w-40 h-40 bg-blue-600/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-pink-600/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>
      <div className="py-6 my-10 rounded-xl shadow-2xl border border-gray-300/50 max-w-lg">
        <div className="flex justify-center items-center">
          <img src="/logo.png" alt="Company Logo" className="h-12 mx-4" />
        </div>
      </div>

      <div
        className={`relative transform transition-all duration-500 ${
          isJoining || isCreatingPrivate
            ? "scale-110 opacity-50"
            : "scale-100 opacity-100"
        }`}
      >
        {/* Main card */}
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-4 sm:p-6 md:p-7 lg:p-8 shadow-2xl border border-gray-700/50 max-w-sm sm:max-w-md md:max-w-lg w-full mx-4 transform transition-all duration-300">
          {/* Welcome back message */}
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2">
              Welcome back, <span className="text-white">{username}!</span>
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm md:text-base">
              Choose how you want to join the conversation
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Public Room Section */}
            <div className="bg-gray-700/30 rounded-xl p-4 sm:p-6 border border-gray-600/30 hover:border-purple-400/50 transition-all duration-300">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white">
                  Join Public Room
                </h3>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="relative">
                  <input
                    className="w-full text-sm sm:text-base md:text-lg p-3 sm:p-4 bg-gray-600/50 backdrop-blur-sm border-2 border-gray-500/50 rounded-xl text-white placeholder-gray-400 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20 transition-all duration-300 hover:border-gray-400"
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Choose from popular rooms"
                    // autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleJoinPublic();
                      }
                    }}
                  />

                  {/* Dropdown Arrow */}
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        showDropdown ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700/95 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                      <div className="p-0">
                        {filteredRooms.length > 0
                          ? filteredRooms.map((room, index) => (
                              <button
                                key={index}
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-purple-600/30 rounded-lg transition-all duration-200 flex items-center space-x-3"
                                onClick={() => {
                                  setRoomName(room.name);
                                  setShowDropdown(false);
                                }}
                              >
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="capitalize">{room.name}</span>
                              </button>
                            ))
                          : null}
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 rounded-xl bg-green-600/10 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 sm:py-3 md:py-4 px-4 sm:px-6 md:px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-green-400/30 text-sm sm:text-base md:text-lg"
                  onClick={handleJoinPublic}
                  disabled={isCreatingPrivate || isJoining}
                >
                  {isJoining ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Joining...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <svg
                        className="w-3 sm:w-4 md:w-5 h-3 sm:h-4 md:h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Join Room</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
              <div className="relative bg-gray-800 px-4 text-gray-400 font-medium text-xs sm:text-sm md:text-base">
                OR
              </div>
            </div>

            {/* Private Room Section */}
            <div className="bg-gray-700/30 rounded-xl p-4 sm:p-6 border border-gray-600/30 hover:border-blue-400/50 transition-all duration-300">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-3 animate-pulse"></div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white">
                  Create Private Room
                </h3>
              </div>

              <p className="text-gray-300 text-xs sm:text-sm md:text-base mb-3 sm:mb-4">
                Create a secure, private room that only you can share with
                others
              </p>

              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 sm:py-3 md:py-4 px-4 sm:px-6 md:px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-400/30 text-sm sm:text-base md:text-lg"
                onClick={handleCreatePrivate}
                disabled={isCreatingPrivate || isJoining}
              >
                {isCreatingPrivate ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <svg
                      className="w-3 sm:w-4 md:w-5 h-3 sm:h-4 md:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span>Create Private Room</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

export default RoomForm;
