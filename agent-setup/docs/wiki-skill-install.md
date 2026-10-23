# wiki / wiki-mem install

O perfil `standard` instala `wiki` e `wiki-mem` a partir de `repo:${AGENTS_ROOT}/.cursor/skills/...` como **symlinks** em `~/.cursor/skills/` (fallback: `agent-setup/skills/*`).

## Diretório legado

Uma instalação antiga fazia `copytree` e deixava `~/.cursor/skills/wiki` (e `wiki-mem`) como **diretório real**. A execução seguinte respondia `CONFLICT skill:wiki` e não instalava o symlink.

Agora o instalador **move** esse diretório para `~/.agent-setup/backups/<timestamp>/<nome>/` e só então cria o symlink. O conteúdo do usuário permanece no backup (`method: move` em `manifest.json`). Não há `rm` nem `rmtree` desse legado.

Quando o destino já é um symlink para o mesmo caminho resolvido da origem, a instalação fica **skipped** (`already configured`). A segunda execução é idempotente e não move o backup de novo.

```bash
export AGENTS_ROOT=/path/to/repo
./install.sh standard
./install.sh standard
```

O backup da primeira execução fica em `~/.agent-setup/backups/`.
