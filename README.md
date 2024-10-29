# Building

## WASM

`podman build .`

Will take a long time. Probably works with docker too but I've never confirmed.

Run the container and cp out `s2_library.js` to `src/wasm/s2_library.js` once it's done.

## FE

`npm i && npm run dev`
