// Hide sensitive-looking values (IC / passport / policy / account / phone numbers) in text,
// keeping only the last 4 characters so the right one can still be recognised.
// A "value" is a run of 5+ letters, digits or hyphens that contains at least 4 digits.
// Hyphens are kept so the shape stays readable: 900101-14-5678 -> ••••••-••-5678.

const TOKEN = /[A-Za-z0-9][A-Za-z0-9-]{3,}[A-Za-z0-9]/g;

export function maskSensitive(text: string) {
  return text.replace(TOKEN, (token) => {
    if ((token.match(/\d/g)?.length ?? 0) < 4) return token;
    const keep = token.slice(-4);
    return token.slice(0, -4).replace(/[A-Za-z0-9]/g, "•") + keep;
  });
}
