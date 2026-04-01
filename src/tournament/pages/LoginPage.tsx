import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { PrimaryButton, Stack, Text, TextField, MessageBar, MessageBarType } from "@fluentui/react";
import { useAuth } from "../context/AuthContext";

export function LoginPage(): JSX.Element {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const { signIn, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as any)?.from?.pathname ?? "/dashboard";

    React.useEffect(() => {
        if (user) {
            navigate(from, { replace: true });
        }
    }, [user, navigate, from]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const result = await signIn(email, password);
        setLoading(false);
        if (result.error) {
            setError(result.error);
        }
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#faf9f8" }}>
            <Stack
                tokens={{ childrenGap: 16 }}
                styles={{ root: { width: 400, padding: 32, backgroundColor: "white", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" } }}
            >
                <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
                    MODAQ Tournament
                </Text>
                <Text variant="large">Sign In</Text>

                {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}

                <form onSubmit={handleSubmit}>
                    <Stack tokens={{ childrenGap: 12 }}>
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
                        />
                        <PrimaryButton text={loading ? "Signing in..." : "Sign In"} type="submit" disabled={loading} />
                    </Stack>
                </form>

                <Text variant="small">
                    Don&apos;t have an account?{" "}
                    <Link to="/register">Register</Link>
                </Text>
            </Stack>
        </div>
    );
}
