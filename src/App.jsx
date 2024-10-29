import styles from './App.module.css';
import s2WasmModulePromise from './wasm/s2_library';
import { createSignal, Show, createEffect } from 'solid-js';

const numFormatter = new Intl.NumberFormat();
const steradiansToDisplayArea = (steradians) => {
  const EARTH_RADIUS_METERS = 6_371_000;
  const metersSquaredArea = steradians * EARTH_RADIUS_METERS ** 2;

  if (metersSquaredArea > 1_000_000) {
    return `${numFormatter.format(
      (metersSquaredArea / 1_000_000).toFixed(2),
    )} km²`;
  }
  return `${numFormatter.format(metersSquaredArea.toFixed(2))} m²`;
};

const latLngFormatter = (lat, lng) => {
  const precision = 4;
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
};

function Field(props) {
  return (
    <div>
      <span>{props.label}:</span> {props.value}
    </div>
  );
}

function CellInfo(props) {
  return (
    <Show when={props.cellInfoOutput != undefined}>
      <div>
        <Field label="Cell ID" value={props.cellInfoOutput.id} />
        <Field label="Zoom Level" value={props.zoomLevel}></Field>
        <Field
          label="Low LatLng"
          value={latLngFormatter(
            props.cellInfoOutput.low.lat,
            props.cellInfoOutput.low.lng,
          )}
        />

        <Field
          label="High LatLng"
          value={latLngFormatter(
            props.cellInfoOutput.high.lat,
            props.cellInfoOutput.high.lng,
          )}
        />

        <Field
          label="Approximate Area"
          value={steradiansToDisplayArea(props.cellInfoOutput.approximateArea)}
        />
      </div>
    </Show>
  );
}

const calculateCellInfo = (s2Module, cellId) => {
  if (!s2Module || !cellId) return null;
  try {
    return s2Module.GetCellInfo(cellId);
  } catch (error) {
    console.error('Error processing cell ID:', error);
    return null;
  }
};

function App() {
  const [s2WasmModule, sets2WasmModule] = createSignal(null);
  const [inputCellId, setInputCellId] = createSignal('');
  const [cellInfoOutput, setCellInfoOutput] = createSignal(null);
  s2WasmModulePromise().then((s2Func) => {
    sets2WasmModule(s2Func);
  });

  createEffect(() => {
    const cellId = inputCellId();
    const s2Module = s2WasmModule();
    const cellInfo = calculateCellInfo(s2Module, cellId);
    setCellInfoOutput(cellInfo);
  });

  return (
    <div class={styles.App}>
      <input
        type="text"
        value={inputCellId()}
        onInput={(e) => setInputCellId(e.currentTarget.value)}
        placeholder="Enter S2 cell ID"
        autofocus
      />

      <CellInfo cellInfoOutput={cellInfoOutput()} />
    </div>
  );
}

export default App;
