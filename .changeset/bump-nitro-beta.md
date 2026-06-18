---
"@agent-native/core": patch
---

Bump nitro to 3.0.260610-beta to address a dev-server cold-start race where the
Nitro Vite worker could be hit before its entry module finished importing,
surfacing as `Vite environment "nitro" is unavailable` / `UND_ERR_SOCKET`.
