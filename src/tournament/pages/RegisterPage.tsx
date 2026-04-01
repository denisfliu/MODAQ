import React from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { PrimaryButton, Stack, Text, TextField, MessageBar, MessageBarType } from "@fluentui/react";
import { useAuth } from "../context/AuthContext";

export function RegisterPage(): JSX.Element {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [displayName, setDisplayName] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const { signUp, user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const inviteTournamentId = searchParams.get("invite");

    React.useEffect(() => {
        if (user) {
            navigate("/dashboard", { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const result = await signUp(email, password, displayName);
        setLoading(false);
        if (result.error) {
            setError(result.error);
        } else {
            setSuccess(true);
        }
    };

    if (success) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#faf9f8" }}>
                <Stack
                    tokens={{ childrenGap: 16 }}
                    styles={{ root: { width: 400, padding: 32, backgroundColor: "white", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" } }}
                >
                    <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
                        Registration Successful
                    </Text>
                    <Text>Check your email to confirm your account, then sign in.</Text>
                    <Link to="/login">Go to Sign In</Link>
                </Stack>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#faf9f8" }}>
            <Stack
                tokens={{ childrenGap: 16 }}
                styles={{ root: { width: 400, padding: 32, backgroundColor: "white", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" } }}
            >
                <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
                    MODAQ Tournament
                </Text>
                <Text variant="large">
                    {inviteTournamentId ? "Register as Moderator" : "Create Account"}
                </Text>

                {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}

                <form onSubmit={handleSubmit}>
                    <Stack tokens={{ childrenGap: 12 }}>
                        <TextField
                            label="Display Name"
                            required
                            value={displayName}
                            onChange={(_e, val) => setDisplayName(val ?? "")}
                        />
                        <TextField
                            label="Email"
                            type="email"
                            required
                            value={email}
                            onChange={(_e, val) => setEmail(val ?? "")}
                        />
                        <TextField
                            label="Password"
                            type="password"
                            required
                            value={password}
                            onChange={(_e, val) => setPassword(val ?? "")}
                            description="At least 6 characters"
                        />
                        <PrimaryButton
                            text={loading ? "Creating account..." : "Register"}
                            type="submit"
                            disabled={loading}
                        />
                    </Stack>
                </form>

                <Text variant="small">
                    Already have an account?{" "}
                    <Link to="/login">Sign In</Link>
                </Text>
            </Stack>
        </div>
    );
}
