import { findByProps, findByName } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { storage } from "@vendetta/plugin";

const Menu = findByProps("MenuItem");
const { getGuild } = findByProps("getGuild");
const { getCurrentUser } = findByProps("getCurrentUser");
const { getUser } = findByProps("getUser");
const { getChannel } = findByProps("getChannel");
const DiscordAPI = findByProps("banUser", "kickUser", "muteUser");

// Funktion zum Überprüfen, ob der Nutzer Admin ist
function isAdmin(guildId) {
    const guild = getGuild(guildId);
    const user = getCurrentUser();
    const member = guild?.members?.[user.id];
    return member?.roles?.some(role => guild.roles[role]?.permissions & 8); // Admin-Check
}

// Funktion zum Ausführen von Moderationsaktionen
async function executeModerationAction(action, guildId, userId) {
    try {
        if (action === "ban") {
            await DiscordAPI.banUser(guildId, userId, { deleteMessageDays: 0 });
        } else if (action === "kick") {
            await DiscordAPI.kickUser(guildId, userId);
        } else if (action === "mute") {
            await DiscordAPI.muteUser(guildId, userId, { duration: 600000 }); // 10 Min Mute
        }
    } catch (error) {
        console.error(`[ModMenu] Fehler bei ${action}:`, error);
    }
}

// Patchen des User-Kontextmenüs
let unpatch;
export function onLoad() {
    unpatch = before("default", findByProps("UserContextMenu"), ([args], res) => {
        const { userId } = args;
        const user = getUser(userId);
        const channel = getChannel(args.channelId);
        const guildId = channel?.guild_id;

        if (!guildId || !isAdmin(guildId)) return;

        res.props.children.push(
            <Menu.MenuItem
                label="👮 Moderator-Menü"
                action={() => showConfirmationAlert(
                    `Moderator-Menü für ${user.username}`,
                    "Wähle eine Aktion:",
                    [
                        { text: "Kick", style: "destructive", onPress: () => executeModerationAction("kick", guildId, userId) },
                        { text: "Ban", style: "destructive", onPress: () => executeModerationAction("ban", guildId, userId) },
                        { text: "Mute", style: "default", onPress: () => executeModerationAction("mute", guildId, userId) },
                        { text: "Abbrechen", style: "cancel" }
                    ]
                )}
            />
        );
    });
}

export function onUnload() {
    if (unpatch) unpatch();
}