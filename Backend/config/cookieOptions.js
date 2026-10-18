const isProduction = process.env.NODE_ENV === "production";

/**
 * In production the frontend (GitHub Pages) and the API (Render) are on
 * different sites, so cookies must be SameSite=None, which browsers only
 * accept together with Secure. Locally both run on localhost, so "lax" works.
 * clearCookie must use the same options as res.cookie or the browser keeps it.
 */
const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
};

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const refreshCookieOptions = {
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
};

module.exports = {
    isProduction,
    baseCookieOptions,
    refreshCookieOptions,
};
