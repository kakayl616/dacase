export function getAvatarUrl(user: any): string {
  if (!user?.id) return "/discord-default.png";

  if (user.avatar) {
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
  }

  const defaultIndex = Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

export function getBannerUrl(user: any): string | null {
  if (!user?.id || !user?.banner) return null;

  const ext = user.banner.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=600`;
}

export function getBannerColor(user: any): string {
  if (user?.banner_color) return user.banner_color;
  return "#5865F2";
}

export function getDisplayName(user: any): string {
  return user?.global_name || user?.username || "Unknown User";
}

export function formatTag(user: any): string {
  if (user?.discriminator && user.discriminator !== "0") {
    return `${user.username}#${user.discriminator}`;
  }

  return `@${user?.username || "unknown"}`;
}