import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import Signin from "../components/Signin";
import Signup from "../components/Signup";
import { ArrowLeft, Chrome } from "lucide-react";

export default function AuthPage() {
  const [isSigningIn, setIsSigningIn] = useState(true);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the auth callback
    const handleAuthCallback = async () => {
      // Check if there's a hash in the URL (OAuth callback)
      if (window.location.hash) {
        const { data, error } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setLoading(false);
          navigate("/chat", { replace: true });
          return;
        }
      }

      // Regular session check
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
        if (session) {
          navigate("/chat", { replace: true });
        }
      });
    };

    handleAuthCallback();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session) {
        navigate("/chat", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signUpWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) console.log("Error signing in:", error.message);
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log("Error signing out:", error.message);
      } else {
        // Clear any stored user data
        localStorage.removeItem("username");
        localStorage.removeItem("roomname");
        // Navigate to home page
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white overflow-hidden relative">
        {/* Animated background elements - matching LandingPage */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-24 h-24 sm:w-32 sm:h-32 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
          <div
            className="absolute bottom-20 right-10 w-32 h-32 sm:w-40 sm:h-40 bg-purple-600/10 rounded-full blur-xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-1/2 left-1/3 w-20 h-20 sm:w-24 sm:h-24 bg-purple-400/10 rounded-full blur-xl animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        {/* Header with back button
        <header className="relative flex items-center justify-between p-4 bg-gray-900 text-white shadow-2xl border-b border-purple-500/20 z-50">
          <div className="absolute inset-0 bg-purple-600/5"></div>
          <button
            onClick={() => navigate("/")}
            className="relative flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300 z-10"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <div className="relative z-10">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              IdentifYou
            </h1>
          </div>
          <div className="w-24"></div>
        </header> */}

        {/* Main content area */}
        <main className="relative flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
          <div className="w-full max-w-md space-y-8">
            {/* Toggle buttons */}
            <div className="flex bg-gray-800/50 backdrop-blur-lg rounded-2xl p-2 border border-purple-500/20">
              <button
                onClick={() => setIsSigningIn(true)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                  isSigningIn
                    ? "bg-purple-600 text-white shadow-lg"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsSigningIn(false)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                  !isSigningIn
                    ? "bg-purple-600 text-white shadow-lg"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Auth components */}
            <div className="animate-fadeIn">
              {isSigningIn ? (
                <Signin setIsSigningIn={setIsSigningIn} />
              ) : (
                <Signup setIsSigningIn={setIsSigningIn} />
              )}
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 text-gray-400 bg-gray-900">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={signUpWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl border border-gray-200 cursor-pointer"
            >
              <Chrome className="w-5 h-5" />
              Continue with Google
            </button>
          </div>
        </main>
      </div>
    );
  } else {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 bg-green-500 rounded-full"></div>
          </div>
          <h2 className="text-2xl font-bold">Welcome, {session?.user?.email}</h2>
          <p className="text-gray-300">You are now signed in!</p>
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
            onClick={signOut}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }
}
