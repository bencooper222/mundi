import * as s2WasmModule from "./wasm/s2_library";

export const s2FuncPromise = new Promise((res) => {
  s2WasmModule.onRuntimeInitialized = () => {
    res(s2WasmModule.GetCellInfo);
  };
});
