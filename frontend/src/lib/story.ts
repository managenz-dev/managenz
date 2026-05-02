export const injectPlayerName = (text: string | null | undefined, playerName: string): string => {
  if (!text) return "";
  return text.replace(/\{\{PLAYER_NAME\}\}/g, playerName);
};