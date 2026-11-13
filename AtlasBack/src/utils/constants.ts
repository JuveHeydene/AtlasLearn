// Configuration read from the environment (.env, ignored by git) — see .env.example.
// Loaded here because this module can be imported before dotenv.config() in main.ts.
try {
  process.loadEnvFile();
} catch {
  // no .env file: variables are already defined in the environment
}

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name} (see .env.example)`);
  return value;
};

export const JWT_SECRET = required("JWT_SECRET");
export const TOKEN_EXPIRATION = 1000; // Token expiration time in seconds
// Optional: without Gmail credentials, emails are printed to the console (development mode).
export const EMAIL_USER = process.env.EMAIL_USER ?? "";
export const EMAIL_PASS = process.env.EMAIL_PASS ?? "";
export const EMAIL_ENABLED = Boolean(EMAIL_USER && EMAIL_PASS);
