import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AboutCreator from './pages/AboutCreator';
import Redirect from './pages/Redirect';
import Navbar from './components/Navbar';

const App: React.FC = () => {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<AboutCreator />} />
                <Route path="/redirect" element={<Redirect />} />
                <Route path="/app" element={<Dashboard />} />
            </Routes>
        </Router>
    );
};

export default App;
