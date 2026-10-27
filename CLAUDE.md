# n8n-nodes-msgvibe

Public n8n community node for MsgVibe (www.msgvibe.com): the `MsgVibe` node (create / get / list videos) and the
`MsgVibe Trigger` (video ready, viewed, clicked), using the public MsgVibe API at `https://api.msgvibe.com/v1`.

This repo is **public**: never add internal infrastructure details, account ids or secrets here. The private project
guide is at `E:\Abhay_singh\coding30_lambda\msgvibe-studio-web\docs\project\README.md` on the owner's PC.

- Build/lint with `@n8n/node-cli`: `npm run build`, `npm run lint` (`npm install --ignore-scripts` on Node 22).
- Release: bump the version in package.json, commit, push a tag `X.Y.Z`; GitHub Actions publishes to npm with provenance.
- New video options must also be added to the Zapier and Make apps (render API repo).
- Verified by n8n (approved 2026-10-26).
