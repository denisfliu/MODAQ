import React from "react";
import { useNavigate } from "react-router-dom";
import {
    DefaultButton,
    Dialog,
    DialogFooter,
    DialogType,
    Dropdown,
    IDropdownOption,
    MessageBar,
    MessageBarType,
    PrimaryButton,
    Spinner,
    SpinnerSize,
    Stack,
    Text,
    TextField,
    FontWeights,
} from "@fluentui/react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { TournamentLayout } from "../components/TournamentLayout";
import { getKnownFormats } from "../../state/GameFormats";
import { IGameFormat } from "../../state/IGameFormat";

interface TournamentRow {
    id: string;
    name: string;
    director_id: string;
    created_at: string;
}

const knownFormats = getKnownFormats();
const formatOptions: IDropdownOption[] = knownFormats.map((format, index) => ({
    key: index.toString(),
    text: format.displayName ?? `Format ${index + 1}`,
}));

export function DashboardPage(): JSX.Element {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tournaments, setTournaments] = React.useState<TournamentRow[]>([]);
    const [moderatingTournaments, setModeratingTournaments] = React.useState<TournamentRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [showCreate, setShowCreate] = React.useState(false);
    const [newName, setNewName] = React.useState("");
    const [selectedFormat, setSelectedFormat] = React.useState<string>("0");
    const [creating, setCreating] = React.useState(false);
    const [createError, setCreateError] = React.useState<string | null>(null);

    const fetchTournaments = React.useCallback(async () => {
        if (!user) return;

        // Tournaments where user is director
        const { data: directed } = await supabase
            .from("tournaments")
            .select("*")
            .eq("director_id", user.id)
            .order("created_at", { ascending: false });

        setTournaments(directed ?? []);

        // Tournaments where user is moderator
        const { data: modInvites } = await supabase
            .from("tournament_moderators")
            .select("tournament_id")
            .eq("user_id", user.id);

        if (modInvites && modInvites.length > 0) {
            const ids = modInvites.map((m) => m.tournament_id);
            const { data: modTournaments } = await supabase
                .from("tournaments")
                .select("*")
                .in("id", ids)
                .order("created_at", { ascending: false });

            setModeratingTournaments(modTournaments ?? []);
        }

        setLoading(false);
    }, [user]);

    React.useEffect(() => {
        fetchTournaments();
    }, [fetchTournaments]);

    const handleCreate = async () => {
        if (!user || !newName.trim()) return;
        setCreating(true);
        setCreateError(null);

        const gameFormat: IGameFormat = knownFormats[parseInt(selectedFormat, 10)];

        const { error } = await supabase.from("tournaments").insert({
            name: newName.trim(),
            director_id: user.id,
            game_format: gameFormat,
        });

        setCreating(false);
        if (error) {
            setCreateError(error.message);
        } else {
            setShowCreate(false);
            setNewName("");
            fetchTournaments();
        }
    };

    if (loading) {
        return (
            <TournamentLayout>
                <Spinner size={SpinnerSize.large} label="Loading tournaments..." />
            </TournamentLayout>
        );
    }

    return (
        <TournamentLayout>
            <Stack tokens={{ childrenGap: 24 }}>
                <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                    <Text variant="xxLarge" styles={{ root: { fontWeight: FontWeights.bold } }}>
                        My Tournaments
                    </Text>
                    <PrimaryButton text="Create Tournament" onClick={() => setShowCreate(true)} />
                </Stack>

                {tournaments.length === 0 && moderatingTournaments.length === 0 && (
                    <Text styles={{ root: { color: "#605e5c" } }}>
                        No tournaments yet. Create one to get started.
                    </Text>
                )}

                {tournaments.length > 0 && (
                    <Stack tokens={{ childrenGap: 8 }}>
                        <Text variant="large" styles={{ root: { fontWeight: FontWeights.semibold } }}>
                            Directing
                        </Text>
                        {tournaments.map((t) => (
                            <Stack
                                key={t.id}
                                horizontal
                                horizontalAlign="space-between"
                                verticalAlign="center"
                                onClick={() => navigate(`/tournament/${t.id}`)}
                                styles={{
                                    root: {
                                        padding: 16,
                                        backgroundColor: "white",
                                        borderRadius: 4,
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                                        cursor: "pointer",
                                        ":hover": { boxShadow: "0 2px 6px rgba(0,0,0,0.2)" },
                                    },
                                }}
                            >
                                <Text styles={{ root: { fontWeight: FontWeights.semibold } }}>{t.name}</Text>
                                <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
                                    {new Date(t.created_at).toLocaleDateString()}
                                </Text>
                            </Stack>
                        ))}
                    </Stack>
                )}

                {moderatingTournaments.length > 0 && (
                    <Stack tokens={{ childrenGap: 8 }}>
                        <Text variant="large" styles={{ root: { fontWeight: FontWeights.semibold } }}>
                            Moderating
                        </Text>
                        {moderatingTournaments.map((t) => (
                            <Stack
                                key={t.id}
                                horizontal
                                horizontalAlign="space-between"
                                verticalAlign="center"
                                onClick={() => navigate(`/tournament/${t.id}`)}
                                styles={{
                                    root: {
                                        padding: 16,
                                        backgroundColor: "white",
                                        borderRadius: 4,
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                                        cursor: "pointer",
                                        ":hover": { boxShadow: "0 2px 6px rgba(0,0,0,0.2)" },
                                    },
                                }}
                            >
                                <Text styles={{ root: { fontWeight: FontWeights.semibold } }}>{t.name}</Text>
                                <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
                                    {new Date(t.created_at).toLocaleDateString()}
                                </Text>
                            </Stack>
                        ))}
                    </Stack>
                )}
            </Stack>

            <Dialog
                hidden={!showCreate}
                onDismiss={() => setShowCreate(false)}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: "Create Tournament",
                }}
                modalProps={{ isBlocking: true }}
            >
                <Stack tokens={{ childrenGap: 12 }}>
                    {createError && <MessageBar messageBarType={MessageBarType.error}>{createError}</MessageBar>}
                    <TextField
                        label="Tournament Name"
                        required
                        value={newName}
                        onChange={(_e, val) => setNewName(val ?? "")}
                    />
                    <Dropdown
                        label="Game Format"
                        options={formatOptions}
                        selectedKey={selectedFormat}
                        onChange={(_e, option) => {
                            if (option) setSelectedFormat(option.key as string);
                        }}
                    />
                </Stack>
                <DialogFooter>
                    <PrimaryButton text={creating ? "Creating..." : "Create"} onClick={handleCreate} disabled={creating || !newName.trim()} />
                    <DefaultButton text="Cancel" onClick={() => setShowCreate(false)} />
                </DialogFooter>
            </Dialog>
        </TournamentLayout>
    );
}
