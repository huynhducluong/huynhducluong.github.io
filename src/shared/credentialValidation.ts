import type { ProfessionalCredentialInput } from "../types/credential";

export const credentialFileLimit = 10 * 1024 * 1024;
export const credentialMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export const validateCredentialInput = (input: ProfessionalCredentialInput, evidenceCount: number): string | null => {
  if (!input.title.en || !input.issuer.en || !input.issuedOn) return "Title (EN), Issuer (EN) and Issue date are required.";
  if (!input.doesNotExpire && !input.expiresOn) return "Enter an expiry date or select that the credential does not expire.";
  if (input.expiresOn && input.issuedOn && input.expiresOn < input.issuedOn) return "Expiry date cannot be earlier than Issue date.";
  if (input.verificationUrl && !input.verificationUrl.startsWith("https://")) return "Verification URL must start with https://.";
  if (input.status === "published" && evidenceCount === 0 && !input.verificationUrl) return "A Ready credential needs a private evidence file or verification URL.";
  return null;
};

export const validateCredentialFile = (file: Pick<File, "type" | "size">): string | null => {
  if (!credentialMimeTypes.includes(file.type as typeof credentialMimeTypes[number])) return "Use a PDF, JPEG, PNG or WebP file.";
  if (file.size <= 0 || file.size > credentialFileLimit) return "Credential documents must be no larger than 10 MB.";
  return null;
};
