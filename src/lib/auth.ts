export const LEGACY_OWNER_EMAIL = "mdshahidulridoy@gmail.com";

export function isLegacyOwnerEmail(email: string) {
  return email.trim().toLowerCase() === LEGACY_OWNER_EMAIL;
}
