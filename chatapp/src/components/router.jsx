import { createBrowserRouter } from "react-router-dom";
import ChatPage from "../pages/ChatPage";
import IdentifYouLanding from "../pages/LandingPage";
import AuthPage from "../pages/AuthPage";
import ProtectedRoute from "./ProtectedRoute";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <IdentifYouLanding />,
    },
    {
        path: "/auth",
        element: <AuthPage />,
    },
    {
        path: "/chat",
        element: 
        <ProtectedRoute>
          <ChatPage />
        </ProtectedRoute>,
    },
    {
        path: "/room/:roomId",
        element: 
        <ProtectedRoute>
          <ChatPage />
        </ProtectedRoute>,
    }
]);