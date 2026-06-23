import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import Navbar from "./components/Navbar";
import Toasts from "./components/Toasts";
import ProtectedRoute from "./components/ProtectedRoute";
import { Empty } from "./components/ui";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Hackathons from "./pages/Hackathons";
import HackathonDetail from "./pages/HackathonDetail";
import HackathonForm from "./pages/HackathonForm";
import Teams from "./pages/Teams";
import TeamProfile from "./pages/TeamProfile";
import Dashboard from "./pages/Dashboard";
import UserProfile from "./pages/UserProfile";

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                    <Navbar />
                    <Toasts />
                    <Routes>
                        <Route path="/" element={<Navigate to="/hackathons" replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/hackathons" element={<Hackathons />} />
                        <Route
                            path="/hackathons/new"
                            element={
                                <ProtectedRoute>
                                    <HackathonForm />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/hackathons/:id" element={<HackathonDetail />} />
                        <Route path="/teams" element={<Teams />} />
                        <Route path="/teams/:id" element={<TeamProfile />} />
                        <Route path="/users/:id" element={<UserProfile />} />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="*"
                            element={
                                <div className="page">
                                    <div className="container">
                                        <Empty icon="🛰️" title="Page not found" subtitle="The page you're looking for doesn't exist." />
                                    </div>
                                </div>
                            }
                        />
                    </Routes>
                </SocketProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
