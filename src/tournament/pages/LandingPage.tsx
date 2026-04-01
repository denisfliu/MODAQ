import React from "react";
import { Link } from "react-router-dom";
import { PrimaryButton, DefaultButton, Stack, Text } from "@fluentui/react";

export function LandingPage(): JSX.Element {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                backgroundColor: "#faf9f8",
            }}
        >
            <Stack tokens={{ childrenGap: 24 }} horizontalAlign="center" styles={{ root: { textAlign: "center" } }}>
                <Text variant="superLarge" styles={{ root: { fontWeight: 600 } }}>
                    MODAQ Tournament
                </Text>
                <Text variant="large" styles={{ root: { color: "#605e5c", maxWidth: 500 } }}>
                    Manage quiz bowl tournaments with centralized rosters, packets, and live scoring.
                </Text>
                <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign="center">
                    <Link to="/login" style={{ textDecoration: "none" }}>
                        <PrimaryButton text="Sign In" />
                    </Link>
                    <Link to="/register" style={{ textDecoration: "none" }}>
                        <DefaultButton text="Register" />
                    </Link>
                    <Link to="/standalone" style={{ textDecoration: "none" }}>
                        <DefaultButton text="Standalone Mode" />
                    </Link>
                </Stack>
            </Stack>
        </div>
    );
}
