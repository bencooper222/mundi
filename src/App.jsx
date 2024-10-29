import s2WasmModulePromise from './wasm/s2_library';
import { createSignal, Switch, Match, createEffect } from 'solid-js';

const numFormatter = new Intl.NumberFormat();
const steradiansToDisplayArea = (steradians) => {
  const EARTH_RADIUS_METERS = 6_378_137;
  const metersSquaredArea = steradians * EARTH_RADIUS_METERS ** 2;

  if (metersSquaredArea > 1_000_000) {
    return `${numFormatter.format(
      (metersSquaredArea / 1_000_000).toFixed(2),
    )} km²`;
  }
  return `${numFormatter.format(metersSquaredArea.toFixed(2))} m²`;
};

const latLngFormatter = (lat, lng) => {
  const PRECISION = 4;
  return `${lat.toFixed(PRECISION)}, ${lng.toFixed(PRECISION)}`;
};

function Field(props) {
  return (
    <div class="label">
      <span>{props.label}:</span> <strong>{props.value}</strong>
    </div>
  );
}

function CellInfo(props) {
  console.log('hi', props);
  return (
    <div id="cell-info">
      <Switch>
        <Match
          when={props.cellInfoOutput != undefined && props.cellInfoOutput.error}
        >
          <div class="label">❌ Invalid Cell ID</div>
        </Match>
        <Match
          when={
            props.cellInfoOutput != undefined && !props.cellInfoOutput.error
          }
        >
          <button
            on:click={navigator.clipboard.writeText(
              JSON.stringify(props.cellInfoOutput.value, null, 2),
            )}
          >
            Copy JSON
          </button>
          <Field label="Cell ID" value={props.cellInfoOutput.value.id} />
          <Field
            label="Zoom Level"
            value={props.cellInfoOutput.value.zoomLevel}
          ></Field>
          <Field
            label="Low LatLng"
            value={latLngFormatter(
              props.cellInfoOutput.value.low.lat,
              props.cellInfoOutput.value.low.lng,
            )}
          />

          <Field
            label="High LatLng"
            value={latLngFormatter(
              props.cellInfoOutput.value.high.lat,
              props.cellInfoOutput.value.high.lng,
            )}
          />

          <Field
            label="Approximate Area"
            value={steradiansToDisplayArea(
              props.cellInfoOutput.value.approximateArea,
            )}
          />
        </Match>
      </Switch>
    </div>
  );
}

const calculateCellInfo = (s2Module, cellId) => {
  if (!s2Module || !cellId) return null;
  try {
    return { error: false, value: s2Module.GetCellInfo(cellId) };
  } catch (error) {
    console.error('Error processing cell ID:', error);
    return { error: true };
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
    <div>
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
