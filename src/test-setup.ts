// Force ANSI colours even when stdout/stderr is piped (e.g. in CI).
// This file is preloaded by Bun before running any test file (see bunfig.toml).
process.env.FORCE_COLOR = "1";
