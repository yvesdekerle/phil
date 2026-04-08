---
name: commit
description: Créer un commit Git propre avec un message conventionnel
argument-hint: [message-optionnel]
allowed-tools: Bash, Read, Grep
---

Crée un commit Git propre en suivant ces étapes :

1. **Vérifie l'état du repo** : lance `git status -u` pour voir les fichiers modifiés, stagés et non trackés. **Signale** les fichiers potentiellement sensibles (.env, credentials, secrets, clés) — ne jamais les stager sans accord explicite.

2. **Analyse les changements stagés** : lance `git diff --staged`. Si rien n'est stagé, stage automatiquement les fichiers modifiés et non trackés qui ne sont pas sensibles (pas de `.env`, credentials, secrets, clés, `.p12`, `.pem`). Signale à l'utilisateur les fichiers stagés et tout fichier exclu. Ne jamais faire `git add .` — toujours lister les fichiers explicitement par nom avec `git add`.

3. **Génère le message de commit** en respectant le format Conventional Commits :
   - `feat:` pour une nouvelle fonctionnalité
   - `fix:` pour une correction de bug
   - `refactor:` pour du refactoring
   - `docs:` pour de la documentation
   - `test:` pour des tests
   - `chore:` pour de la maintenance
   - `style:` pour du formatage

4. **Format du message** :
   ```
   type(scope): description courte en minuscule, sans point final

   - Détail 1 des changements
   - Détail 2 des changements
   ```

5. Si un message est passé en argument (`$ARGUMENTS`), utilise-le comme base pour le message de commit.

6. **Affiche le message proposé et commit**.

7. **Exécute le commit** en passant le message via un HEREDOC pour éviter les problèmes de formatage :
   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): description

   - détail 1
   - détail 2
   EOF
   )"
   ```

Ne fais JAMAIS de `git push` automatiquement.
