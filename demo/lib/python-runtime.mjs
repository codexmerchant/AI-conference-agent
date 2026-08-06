import path from "node:path";

export function localPythonPath({ demoRoot, configured, platform = process.platform }) {
  if (configured) return path.isAbsolute(configured) ? configured : path.resolve(demoRoot, configured);
  return platform === "win32"
    ? path.join(demoRoot, ".venv-cross-platform", "Scripts", "python.exe")
    : path.join(demoRoot, ".venv-cross-platform", "bin", "python");
}
