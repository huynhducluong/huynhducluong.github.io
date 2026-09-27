import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const gitIdentity = {
  name: "huynhducluong",
  email: "huynhluong321998@gmail.com",
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");

function runGit(args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

try {
  const isWorkTree = runGit(["rev-parse", "--is-inside-work-tree"]);

  if (isWorkTree !== "true") {
    throw new Error("The project directory is not a Git working tree.");
  }

  runGit(["config", "--local", "user.name", gitIdentity.name]);
  runGit(["config", "--local", "user.email", gitIdentity.email]);

  const configuredName = runGit(["config", "--local", "--get", "user.name"]);
  const configuredEmail = runGit([
    "config",
    "--local",
    "--get",
    "user.email",
  ]);

  if (
    configuredName !== gitIdentity.name ||
    configuredEmail !== gitIdentity.email
  ) {
    throw new Error("Git identity verification failed after configuration.");
  }

  console.log("Repository Git identity configured successfully:");
  console.log(`  ${configuredName} <${configuredEmail}>`);
  console.log("");
  console.log(
    "Note: GitHub authentication is separate. Confirm the correct GitHub account before pushing.",
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`Unable to configure the repository Git identity: ${message}`);
  process.exitCode = 1;
}
