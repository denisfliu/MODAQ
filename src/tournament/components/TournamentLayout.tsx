import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { DefaultButton, Stack, Text } from "@fluentui/react";
import { useAuth } from "../context/AuthContext";

export function TournamentLayout({ children }: { children: React.ReactNode }): JSX.Element {
    const { displayName, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate("/login");
    };

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#faf9f8" }}>
            <Stack
                horizontal
                horizontalAlign="space-between"
                verticalAlign="center"
                styles={{
                    root: {
                        padding: "8px 24px",
                        backgroundColor: "#0078d4",
                        color: "white",
                    },
                }}
            >
                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 16 }}>
                    <Link to="/dashboard" style={{ textDecoration: "none", color: "white" }}>
                        <Text variant="xLarge" styles={{ root: { color: "white", fontWeight: 600 } }}>
                            MODAQ Tournament
                        </Text>
                    </Link>
                </Stack>
                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
                    <Text styles={{ root: { color: "white" } }}>{displayName}</Text>
                    <DefaultButton
                        text="Sign Out"
                        onClick={handleSignOut}
                        styles={{
                            root: { backgroundColor: "transparent", color: "white", borderColor: "white" },
                            rootHovered: { backgroundColor: "rgba(255,255,255,0.1)", color: "white" },
                        }}
                    />
                </Stack>
            </Stack>
            <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>{children}</div>
        </div>
    );
}
