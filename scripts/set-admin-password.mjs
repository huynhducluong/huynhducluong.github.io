import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const configPath = fileURLToPath(new URL("../src/config/supabase.ts", import.meta.url));
const configSource = await readFile(configPath, "utf8");

const readConfigValue = (name) => {
  const match = configSource.match(new RegExp(`${name}:\\s*"([^"]+)"`));
  if (!match) throw new Error(`Could not read ${name} from src/config/supabase.ts.`);
  return match[1];
};

const readHidden = (prompt) => new Promise((resolve, reject) => {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    reject(new Error("Run this command in an interactive VS Code terminal."));
    return;
  }

  process.stdout.write(prompt);
  process.stdin.setEncoding("utf8");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let value = "";

  const finish = () => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.removeListener("data", onData);
    process.stdout.write("\n");
  };

  const onData = (chunk) => {
    for (const character of chunk) {
      if (character === "\u0003") {
        finish();
        reject(new Error("Cancelled."));
        return;
      }
      if (character === "\r" || character === "\n") {
        finish();
        resolve(value);
        return;
      }
      if (character === "\u0008" || character === "\u007f") {
        value = value.slice(0, -1);
        continue;
      }
      value += character;
    }
  };

  process.stdin.on("data", onData);
});

const projectUrl = readConfigValue("url");
const adminEmail = readConfigValue("adminEmail");
let secretKey = "";
let password = "";
let confirmation = "";

try {
  console.log(`Set the Supabase Auth password for ${adminEmail}.`);
  console.log("Nothing entered below is written to the repository or printed back.");
  secretKey = await readHidden("Supabase secret key: ");
  password = await readHidden("New password (12+ characters): ");
  confirmation = await readHidden("Confirm new password: ");

  if (!secretKey) throw new Error("Supabase secret key is required.");
  if (password.length < 12) throw new Error("Use a password with at least 12 characters.");
  if (password !== confirmation) throw new Error("The passwords do not match.");

  const adminClient = createClient(projectUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  const user = data.users.find((item) => item.email?.toLowerCase() === adminEmail.toLowerCase());
  if (!user) throw new Error(`No Supabase Auth user exists for ${adminEmail}.`);

  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, { password });
  if (updateError) throw updateError;

  console.log("Admin password updated successfully. You can now use Password sign-in on /admin/.");
} catch (error) {
  console.error(error instanceof Error ? `Setup failed: ${error.message}` : "Setup failed.");
  process.exitCode = 1;
} finally {
  secretKey = "";
  password = "";
  confirmation = "";
}
