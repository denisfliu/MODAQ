import React from "react";
import {
    DefaultButton,
    PrimaryButton,
    Spinner,
    SpinnerSize,
    Stack,
    Text,
    Toggle,
    FontWeights,
    MessageBar,
    MessageBarType,
} from "@fluentui/react";
import { supabase } from "../lib/supabaseClient";

const YAPP_SERVICE_URL = "https://www.quizbowlreader.com/yapp/api/parse?modaq=true";

interface RoundRow {
    id: string;
    round_number: number;
    packet_name: string | null;
    is_enabled: boolean;
}

interface RoundManagerProps {
    tournamentId: string;
    rounds: RoundRow[];
    onRoundsUpdated: () => void;
}

export function RoundManager({ tournamentId, rounds, onRoundsUpdated }: RoundManagerProps): JSX.Element {
    const [error, setError] = React.useState<string | null>(null);
    const [creating, setCreating] = React.useState(false);
    const [uploadingRoundId, setUploadingRoundId] = React.useState<string | null>(null);

    const handleCreateRound = async () => {
        setCreating(true);
        setError(null);
        const nextNumber = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round_number)) + 1 : 1;

        const { error: insertError } = await supabase.from("rounds").insert({
            tournament_id: tournamentId,
            round_number: nextNumber,
        });

        setCreating(false);
        if (insertError) {
            setError(insertError.message);
        } else {
            onRoundsUpdated();
        }
    };

    const handleToggleEnabled = async (roundId: string, enabled: boolean) => {
        await supabase.from("rounds").update({ is_enabled: enabled }).eq("id", roundId);
        onRoundsUpdated();
    };

    const handleUploadPacket = async (roundId: string) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            setError(null);
            setUploadingRoundId(roundId);

            try {
                let packet;
                const isDocx =
                    file.name.endsWith(".docx") ||
                    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

                if (isDocx) {
                    // Send DOCX to YAPP service for parsing
                    const buffer = await file.arrayBuffer();
                    const response = await fetch(YAPP_SERVICE_URL, {
                        method: "POST",
                        body: buffer,
                        mode: "cors",
                    });

                    if (!response.ok) {
                        let errorMsg = `Parsing service returned error ${response.status}`;
                        if (response.status === 400) {
                            const errBody = await response.json();
                            errorMsg += `: ${errBody.errorMessages?.join(", ") ?? "Unknown error"}`;
                        }
                        setError(errorMsg);
                        setUploadingRoundId(null);
                        return;
                    }

                    const jsonText = await response.text();
                    packet = JSON.parse(jsonText);
                } else {
                    const text = await file.text();
                    packet = JSON.parse(text);
                }

                await supabase
                    .from("rounds")
                    .update({ packet, packet_name: file.name })
                    .eq("id", roundId);
                onRoundsUpdated();
            } catch {
                setError("Failed to parse packet file.");
            }

            setUploadingRoundId(null);
        };
        input.click();
    };

    const handleDeleteRound = async (roundId: string) => {
        await supabase.from("rounds").delete().eq("id", roundId);
        onRoundsUpdated();
    };

    return (
        <Stack tokens={{ childrenGap: 16 }}>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text variant="large" styles={{ root: { fontWeight: FontWeights.semibold } }}>
                    Rounds
                </Text>
                <PrimaryButton text={creating ? "Creating..." : "Add Round"} onClick={handleCreateRound} disabled={creating} />
            </Stack>

            {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}

            {rounds.length === 0 && (
                <Text styles={{ root: { color: "#605e5c" } }}>No rounds yet. Click &quot;Add Round&quot; to create one.</Text>
            )}

            {rounds.map((round) => (
                <Stack
                    key={round.id}
                    horizontal
                    horizontalAlign="space-between"
                    verticalAlign="center"
                    styles={{
                        root: {
                            padding: 12,
                            backgroundColor: "white",
                            borderRadius: 4,
                            border: "1px solid #edebe9",
                        },
                    }}
                >
                    <Stack horizontal tokens={{ childrenGap: 16 }} verticalAlign="center">
                        <Text styles={{ root: { fontWeight: FontWeights.semibold, minWidth: 80 } }}>
                            Round {round.round_number}
                        </Text>
                        <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
                            {round.packet_name ?? "No packet"}
                        </Text>
                    </Stack>
                    <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                        {uploadingRoundId === round.id ? (
                            <Spinner size={SpinnerSize.small} label="Uploading..." labelPosition="right" />
                        ) : (
                            <DefaultButton text="Upload Packet" onClick={() => handleUploadPacket(round.id)} />
                        )}
                        <Toggle
                            label="Enabled"
                            inlineLabel
                            checked={round.is_enabled}
                            onChange={(_e, checked) => handleToggleEnabled(round.id, checked ?? false)}
                        />
                        <DefaultButton text="Delete" onClick={() => handleDeleteRound(round.id)} />
                    </Stack>
                </Stack>
            ))}
        </Stack>
    );
}
