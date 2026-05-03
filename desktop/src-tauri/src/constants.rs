pub const DISCORD_CLIENT_ID: &str = "1431978756687265872";

// `proxy.scdinternal.site` (the host upstream uses by default) does NOT resolve
// in DNS as of this build, so every proxied request would burn ~1.5s on retries
// before falling back to a direct fetch. The `images.scdinternal.site` host
// is a working SCDInternal proxy that accepts the same `X-Target` header for
// arbitrary URLs, so we point at it by default.
pub const PROXY_URL: &str = if let Some(url) = option_env!("PROXY_URL") {
    url
} else {
    "https://images.scdinternal.site"
};
pub const DOMAIN_WHITELIST: &[&str] = &[
    "localhost",
    "127.0.0.1",
    "tauri.localhost",
    "api.scdinternal.site",
    "images.scdinternal.site",
    "proxy.scdinternal.site",
    "stream.scdinternal.site",
    "stream-premium.scdinternal.site",
    "storage.scdinternal.site",
];

pub fn is_domain_whitelisted(host: &str) -> bool {
    DOMAIN_WHITELIST.iter().any(|&w| host == w)
}
