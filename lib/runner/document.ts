import type { PreparedRun, RunIdentity } from "./protocol";

export function sandboxPolicy(nonce: string): string {
  return `default-src 'none'; script-src 'nonce-${nonce}' blob:; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; media-src 'none'; worker-src blob:; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
}

export function createSandboxDocument(
  runtime: string,
  plan: PreparedRun,
  identity: RunIdentity,
): string {
  if (!/^[a-f0-9]{32}$/.test(identity.nonce))
    throw new Error("Invalid runner nonce");
  const config = JSON.stringify({ ...identity, plan })
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
  // Only our compiled bootstrap is executable markup. All learner files are JSON data.
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${sandboxPolicy(identity.nonce)}"><title>Ізольований FocusBoard</title></head><body><script nonce="${identity.nonce}">${runtime.replace(/<\/script/gi, "<\\/script")};AcademyRuntime.boot(${config});</script></body></html>`;
}
