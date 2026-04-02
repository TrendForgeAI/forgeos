import { resolve } from "path";

const ALLOWED_ROOTS = ["/app", "/workspace"];

export function validatePath(inputPath: string): string {
  const resolved = resolve(inputPath);
  const allowed = ALLOWED_ROOTS.some(root => resolved === root || resolved.startsWith(root + "/"));
  if (!allowed) throw Object.assign(new Error("Path not allowed"), { status: 403 });
  return resolved;
}
