import React from "react";
import { DefaultButton, PrimaryButton, Stack, Text, TextField, MessageBar, MessageBarType, FontWeights } from "@fluentui/react";
import { supabase } from "../lib/supabaseClient";

interface InviteModeratorsProps {
    tournamentId: string;
}

interface ModeratorRow {
    id: string;
    email: string;
    user_id: string | null;
    accepted_at: string | null;
    display_name?: string;
}

export function InviteModerators({ tournamentId }: InviteModeratorsProps): JSX.Element {
    const [email, setEmail] = React.useState("");
    const [moderators, setModerators] = React.useState<ModeratorRow[]>([]);
    const [error, setError] = React.useState<string | null>(null);
    const [inviting, setInviting] = React.useState(false);

    const fetchModerators = React.useCallback(async () => {
        const { data } = await supabase
            .from("tournament_moderators")
            .select("id, email, user_id, accepted_at")
            .eq("tournament_id", tournamentId)
            .order("invited_at");

        if (data) {
            // Fetch display names for accepted moderators
            const withNames: ModeratorRow[] = [];
            for (const mod of data) {
                if (mod.user_id) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("display_name")
                        .eq("id", mod.user_id)
                        .single();
                    withNames.push({ ...mod, display_name: profile?.display_name });
                } else {
                    withNames.push(mod);
                }
            }
            setModerators(withNames);
        }
    }, [tournamentId]);

    React.useEffect(() => {
        fetchModerators();
    }, [fetchModerators]);

    const handleInvite = async () => {
        if (!email.trim()) return;
        setError(null);
        setInviting(true);

        const { error: insertError } = await supabase.from("tournament_moderators").insert({
            tournament_id: tournamentId,
            email: email.trim().toLowerCase(),
        });

        setInviting(false);
        if (insertError) {
            setError(insertError.message.includes("duplicate") ? "This email has already been invited." : insertError.message);
        } else {
            setEmail("");
            fetchModerators();
        }
    };

    const handleRemove = async (modId: string) => {
        await supabase.from("tournament_moderators").delete().eq("id", modId);
        fetchModerators();
    };

    const registrationLink = `${window.location.origin}/register?invite=${tournamentId}`;

    return (
        <Stack tokens={{ childrenGap: 16 }}>
            <Text variant="large" styles={{ root: { fontWeight: FontWeights.semibold } }}>
                Moderators
            </Text>

            {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}

            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="end">
                <TextField
                    placeholder="moderator@email.com"
                    value={email}
                    onChange={(_e, val) => setEmail(val ?? "")}
                    styles={{ root: { flex: 1 } }}
                />
                <PrimaryButton text={inviting ? "Inviting..." : "Invite"} onClick={handleInvite} disabled={inviting || !email.trim()} />
            </Stack>

            <Stack tokens={{ childrenGap: 4 }}>
                <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
                    Share this link with moderators to register:
                </Text>
                <TextField readOnly value={registrationLink} styles={{ root: { maxWidth: 500 } }} />
            </Stack>

            {moderators.length > 0 && (
                <Stack tokens={{ childrenGap: 4 }}>
                    {moderators.map((mod) => (
                        <Stack
                            key={mod.id}
                            horizontal
                            horizontalAlign="space-between"
                            verticalAlign="center"
                            styles={{
                                root: {
                                    padding: 8,
                                    backgroundColor: "white",
                                    borderRadius: 4,
                                    border: "1px solid #edebe9",
                                },
                            }}
                        >
                            <Stack>
                                <Text>{mod.display_name ?? mod.email}</Text>
                                {mod.display_name && (
                                    <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
                                        {mod.email}
                                    </Text>
                                )}
                            </Stack>
                            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                                <Text
                                    variant="small"
                                    styles={{
                                        root: {
                                            color: mod.accepted_at ? "#107c10" : "#797775",
                                            fontWeight: FontWeights.semibold,
                                        },
                                    }}
                                >
                                    {mod.accepted_at ? "Accepted" : "Pending"}
                                </Text>
                                <DefaultButton text="Remove" onClick={() => handleRemove(mod.id)} />
                            </Stack>
                        </Stack>
                    ))}
                </Stack>
            )}
        </Stack>
    );
}
