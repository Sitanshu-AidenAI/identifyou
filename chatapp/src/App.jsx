import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ChatPage from "./pages/ChatPage.jsx";
import IdentifYouLanding from "./pages/LandingPage.jsx";

function App() {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<IdentifYouLanding />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
