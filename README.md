# Call Builder

Outil pédagogique mono-page pour Product Owners : comprendre un appel LLM en le
construisant bloc par bloc, sur 4 niveaux (L1 appel nu → L2 structuration →
L3 skills → L4 MCP). Front statique, zéro backend, mode BYOK (la clé API n'est
jamais stockée).

## Démarrer

```bash
npm install
npm run dev      # serveur de développement
npm test         # tests Vitest
npm run build    # bundle statique dans dist/ (fonctionne en file://)
```

Le backlog complet est dans [spec.md](spec.md), les conventions du projet dans
[CLAUDE.md](CLAUDE.md).
