import React from "react";
import * as ReactDOM from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { ModaqControl } from "../components/ModaqControl";
import { AuthProvider } from "../tournament/context/AuthContext";
import { AuthGuard } from "../tournament/components/AuthGuard";
import { LandingPage } from "../tournament/pages/LandingPage";
import { LoginPage } from "../tournament/pages/LoginPage";
import { RegisterPage } from "../tournament/pages/RegisterPage";
import { DashboardPage } from "../tournament/pages/DashboardPage";
import { TournamentPage } from "../tournament/pages/TournamentPage";
import { ModeratorGamePage } from "../tournament/pages/ModeratorGamePage";
import { ViewerPage } from "../tournament/pages/ViewerPage";

// This will be filled in by vite. This won't be used by people using the library
declare const __BUILD_VERSION__: string;

// If you want a different Google Sheets ID, replace this with your own
const demoGoogleClientId = "1038902414768-nj056sbrbe0oshavft2uq9et6tvbu2d5.apps.googleusercontent.com";
const demoYappService = "https://www.quizbowlreader.com/yapp/api/parse?modaq=true";

function StandalonePage(): JSX.Element {
    return (
        <ModaqControl
            applyStylingToRoot={true}
            buildVersion={__BUILD_VERSION__}
            googleClientId={demoGoogleClientId}
            yappServiceUrl={demoYappService}
        />
    );
}

function App(): JSX.Element {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/standalone" element={<StandalonePage />} />
                    <Route
                        path="/dashboard"
                        element={
                            <AuthGuard>
                                <DashboardPage />
                            </AuthGuard>
                        }
                    />
                    <Route
                        path="/tournament/:id"
                        element={
                            <AuthGuard>
                                <TournamentPage />
                            </AuthGuard>
                        }
                    />
                    <Route
                        path="/tournament/:id/game/:gameId"
                        element={
                            <AuthGuard>
                                <ModeratorGamePage />
                            </AuthGuard>
                        }
                    />
                    <Route path="/tournament/:id/view" element={<ViewerPage />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

window.onload = () => {
    const element: HTMLElement | null = document.getElementById("root");
    if (element) {
        ReactDOM.render(<App />, element);
    }
};
