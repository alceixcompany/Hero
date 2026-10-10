# Animated character assets

Author: Quaternius. License: CC0-1.0. Exact licenses and file hashes are included alongside the GLB files.

- Male/female bodies and hair: Universal Base Characters, free Standard package downloaded from the creator's itch.io page. https://quaternius.com/packs/universalbasecharacters.html
- Skeletal animation: Universal Animation Library. https://quaternius.com/packs/universalanimationlibrary.html
- Download mirror for animation binary: https://github.com/Seyamalam/blood-league-kickoff/blob/main/public/assets/vendor/quaternius/universal-animation-library.glb

`tools/prepare-characters.py` repacks the source files without unused textures, UVs and vertex colors, retaining skin weights, bones, normals, mesh topology and 14 selected animation clips. It does not flatten skeletal animations. Original archive hash and packaged hashes are recorded in `provenance.json`.

The game applies original code-authored costume colors, proportions and bone-attached equipment to these two shared humanoid bases. Hair/beard meshes are also imported. These are stylized fan-game adaptations, not official Marvel or movie character models, and not 30 separately downloaded character meshes.
