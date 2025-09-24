import React, { useState } from "react";

function NameForm({ onSubmit, onError, isSharedRoom = false, roomname = '' }) {
  const [name, setName] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if this is a private room
  const isPrivateRoom = roomname && roomname.match(/^[0-9a-f]{64}$/i)

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (trimmedName.length > 0) {
      if (trimmedName.length > 32) {
        onError("Name too long (max 32 characters)");
        return;
      }
      setIsAnimating(true);
      setTimeout(() => {
        onSubmit(trimmedName);
      }, 300);
    } else {
      onError("Please enter a name first!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-blue-900/80 to-gray-900 backdrop-blur-sm flex flex-col justify-center items-center animate-fadeIn p-3 sm:p-4">
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400/30 rounded-full animate-float"></div>
        <div
          className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-400/30 rounded-full animate-float"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-pink-400/20 rounded-full animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-2/3 right-1/3 w-1 h-1 bg-purple-400/40 rounded-full animate-float"
          style={{ animationDelay: "0.5s" }}
        ></div>
      </div>
      
      {/* Logo container */}
      <div className="mb-6 sm:mb-8 md:mb-6 lg:mb-8">
        <div className="bg-gray-800/60 backdrop-blur-lg py-3 sm:py-4 md:py-3 lg:py-4 px-6 sm:px-8 md:px-6 lg:px-8 rounded-xl shadow-2xl border border-gray-300/50">
          <div className="flex justify-center items-center">
            <img src="/logo.png" alt="Company Logo" className="h-8 sm:h-10 md:h-8 lg:h-12" />
          </div>
        </div>
      </div>

      <div
        className={`relative transform transition-all duration-500 ${
          isAnimating ? "scale-110 opacity-50" : "scale-100 opacity-100"
        }`}
      >
        {/* Main card - Optimized for laptop screens */}
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-4 sm:p-5 md:p-4 lg:p-6 shadow-2xl border border-gray-700/50 w-full max-w-xs sm:max-w-sm md:max-w-xs lg:max-w-md mx-3 sm:mx-4 transform transition-all duration-300">
          
          {/* Welcome text */}
          <div className="text-center mb-4 sm:mb-6 md:mb-4 lg:mb-6">
            <h2 className="text-xl sm:text-2xl md:text-xl lg:text-2xl font-bold mb-2 text-white">
              {isSharedRoom ? 'Join Private Room!' : 'Welcome!'}
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm md:text-xs lg:text-sm leading-relaxed">
              {isSharedRoom 
                ? `You've been invited to a private chat room${isPrivateRoom ? ' 🔒' : ''}` 
                : "Let's get you started with an amazing chat experience"
              }
            </p>
            {isSharedRoom && isPrivateRoom && (
              <div className="mt-2 sm:mt-3 p-2 bg-blue-600/20 border border-blue-600/30 rounded-lg">
                <p className="text-blue-300 text-xs">
                  🔗 Joining via shared link
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-3 lg:space-y-4">
            {/* Input field - Better sizing for laptops */}
            <div className="relative">
              <input
                className="w-full text-sm sm:text-base md:text-sm lg:text-base p-3 sm:p-3.5 md:p-3 lg:p-4 bg-gray-700/50 backdrop-blur-sm border-2 border-gray-600/50 rounded-xl text-white placeholder-gray-400 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20 transition-all duration-300 hover:border-gray-500"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                maxLength={32}
              />
              <div className="absolute inset-0 rounded-xl bg-purple-600/10 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* Character counter */}
            <div className="text-right">
              <span
                className={`text-xs ${
                  name.length > 25 ? "text-yellow-400" : "text-gray-500"
                }`}
              >
                {name.length}/32
              </span>
            </div>

            {/* Submit button - Compact for laptops */}
            <button
              type="submit"
              disabled={isAnimating}
              className="w-full bg-gradient-to-br from-gray-900 via-blue-900/80 to-gray-900 backdrop-blur-sm hover:bg-purple-700 text-white font-semibold py-3 sm:py-3.5 md:py-3 lg:py-4 px-4 sm:px-5 md:px-4 lg:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-purple-400/30 text-sm sm:text-base md:text-sm lg:text-base"
            >
              {isAnimating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm sm:text-base md:text-sm lg:text-base">
                    {isSharedRoom ? 'Joining Room...' : 'Starting...'}
                  </span>
                </div>
              ) : (
                <span className="text-sm sm:text-base md:text-sm lg:text-base">
                  {isSharedRoom ? 'Join Private Room' : 'Continue to Chat'}
                </span>
              )}
            </button>
          </form>

          {/* Footer - Compact */}
          <div className="text-center mt-4 sm:mt-6 md:mt-4 lg:mt-6 pt-3 sm:pt-4 md:pt-3 lg:pt-4 border-t border-gray-700/50">
            <p className="text-xs text-gray-400 mb-1.5 sm:mb-2">Powered by</p>
            <a
              href="https://www.aidenai.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium text-xs sm:text-sm"
            >
              <span>Aiden AI</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NameForm;