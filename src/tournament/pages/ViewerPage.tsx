import React from "react";
import { useParams } from "react-router-dom";
import { Spinner, SpinnerSize, Text } from "@fluentui/react";
import { supabase } from "../lib/supabaseClient";
import { ScoreboardView } from "../components/ScoreboardView";

export function ViewerPage(): JSX.Element {
    const { id } = useParams<{ id: string }>();
    const [tournamentName, setTournamentName] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchTournament = async () => {
            if (!id) return;
            const { data } = await supabase.from("tournaments").select("name").eq("id", id).single();
            setTournamentName(data?.name ?? null);
            setLoading(false);
        };
        fetchTournament();
    }, [id]);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <Spinner size={SpinnerSize.large} label="Loading..." />
            </div>
        );
    }

    if (!tournamentName || !id) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <Text variant="large">Tournament not found.</Text>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#faf9f8" }}>
            <div
                style={{
                    padding: "8px 24px",
                    backgroundColor: "#0078d4",
                    color: "white",
                }}
            >
                <Text variant="xLarge" styles={{ root: { color: "white", fontWeight: 600 } }}>
                    {tournamentName} — Live Scores
                </Text>
            </div>
            <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
                <ScoreboardView tournamentId={id} tournamentName={tournamentName} />
            </div>
        </div>
    );
}
