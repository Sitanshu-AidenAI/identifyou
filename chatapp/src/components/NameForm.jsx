import React, { useState } from "react";

function NameForm({ onSubmit, onError }) {
  const [name, setName] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-purple-900/80 to-gray-900 backdrop-blur-sm flex flex-col justify-center items-center animate-fadeIn p-4">
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
      <div className="sm:py-4 lg:py-6 my-10 rounded-xl shadow-2xl border border-gray-300/50 max-w-lg">
        <div className="flex justify-center items-center">
          <img src="/logo.png" alt="Company Logo" className="h-12 mx-4" />
        </div>
      </div>
      <div
        className={`relative transform transition-all duration-500 ${
          isAnimating ? "scale-110 opacity-50" : "scale-100 opacity-100"
        }`}
      >
        {/* Main card */}
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-4 sm:p-6 md:p-4 lg:p-8 shadow-2xl border border-gray-700/50 max-w-sm sm:max-w-md w-full mx-4 transform  transition-all duration-300">
          {/* Welcome text */}
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
              Welcome!
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm">
              Let's get you started with an amazing chat experience
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Input field */}
            <div className="relative">
              <input
                className="w-full text-sm sm:text-lg p-3 sm:p-4 bg-gray-700/50 backdrop-blur-sm border-2 border-gray-600/50 rounded-xl text-white placeholder-gray-400 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20 transition-all duration-300 hover:border-gray-500"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                maxLength={32}
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/10 to-blue-600/10 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
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

            {/* Submit button */}
            <button
              type="submit"
              disabled={isAnimating}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-purple-400/30 text-sm sm:text-base"
            >
              {isAnimating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Starting...</span>
                </div>
              ) : (
                "Continue to Chat"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-700/50">
            <p className="text-xs sm:text-sm text-gray-400 mb-2">Powered by</p>
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
