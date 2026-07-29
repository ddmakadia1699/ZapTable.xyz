// Stable per-device id for the social layer (client-only). Lets a guest join
// "meet & chat" without ordering or giving a phone number.
export function getSid(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem("zaptable:sid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("zaptable:sid", sid);
  }
  return sid;
}
