import React from "react";
import { DefaultButton, Stack, Text, FontWeights } from "@fluentui/react";

export interface GameCardProps {
    team1Name: string;
    team2Name: string;
    team1Score: number;
    team2Score: number;
    moderatorName?: string;
    status: "pending" | "in_progress" | "completed";
    onClick?: () => void;
    onDownloadQBJ?: () => void;
}

const statusColors: Record<string, string> = {
    pending: "#797775",
    in_progress: "#0078d4",
    completed: "#107c10",
};

const statusLabels: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
};

export function GameCard(props: GameCardProps): JSX.Element {
    const { team1Name, team2Name, team1Score, team2Score, moderatorName, status, onClick, onDownloadQBJ } = props;

    return (
        <Stack
            onClick={onClick}
            styles={{
                root: {
                    padding: 16,
                    backgroundColor: "white",
                    borderRadius: 4,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                    cursor: onClick ? "pointer" : "default",
                    border: `1px solid ${statusColors[status]}`,
                    ":hover": onClick ? { boxShadow: "0 2px 6px rgba(0,0,0,0.2)" } : undefined,
                },
            }}
        >
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Stack tokens={{ childrenGap: 4 }}>
                    <Text styles={{ root: { fontWeight: FontWeights.semibold } }}>{team1Name}</Text>
                    <Text variant="small">vs</Text>
                    <Text styles={{ root: { fontWeight: FontWeights.semibold } }}>{team2Name}</Text>
                </Stack>
                <Stack horizontalAlign="end" tokens={{ childrenGap: 4 }}>
                    <Text variant="xxLarge" styles={{ root: { fontWeight: FontWeights.bold } }}>
                        {team1Score} - {team2Score}
                    </Text>
                    <Text
                        variant="small"
                        styles={{ root: { color: statusColors[status], fontWeight: FontWeights.semibold } }}
                    >
                        {statusLabels[status]}
                    </Text>
                </Stack>
            </Stack>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center" styles={{ root: { marginTop: 8 } }}>
                {moderatorName ? (
                    <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
                        Moderator: {moderatorName}
                    </Text>
                ) : (
                    <span />
                )}
                {onDownloadQBJ && status !== "pending" && (
                    <DefaultButton
                        text="Download QBJ"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDownloadQBJ();
                        }}
                        styles={{ root: { minWidth: 0, padding: "0 8px", height: 28 } }}
                    />
                )}
            </Stack>
        </Stack>
    );
}
