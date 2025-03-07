import s2WasmModulePromise from './wasm/s2_library';
import {
  createSignal,
  Switch,
  Match,
  createEffect,
  createResource,
} from 'solid-js';

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

const geocodeMemoizer = {}; // Probably could use useMemo or something.
const GeocodeComponent = (props) => {
  const [locationStr] = createResource(
    () => `${props.lat},${props.lng}`,
    async (coords) => {
      const [lat, lng] = coords.split(',').map(Number);
      const memoizeKey = coords;
      if (geocodeMemoizer[memoizeKey]) {
        props.onLocationUpdate?.(geocodeMemoizer[memoizeKey]);
        return geocodeMemoizer[memoizeKey];
      }
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const response = await fetch(url);

      if (!response.ok) {
        props.onLocationUpdate?.(null);
        return null;
      }
      const data = await response.json();
      console.debug('Latlng', lat, lng, 'Response data', data);

      let locationStr = '';
      if (data.error) {
        locationStr = 'Unknown';
      } else if (data.address) {
        const cityCounty = data.address.city ?? data.address.county ?? null;
        locationStr =
          cityCounty === null
            ? data.address.state
            : `${cityCounty}, ${data.address.state}`;

        if (data.address.country_code !== 'us') {
          locationStr += `, ${data.address.country}`;
        }
      }
      geocodeMemoizer[memoizeKey] = locationStr;
      props.onLocationUpdate?.(locationStr);
      return locationStr;
    },
  );

  return (
    <Suspense fallback={<Field label={props.label} value="Loading..." />}>
      <Field label={props.label} value={locationStr()} />
    </Suspense>
  );
};

const copyToClipboardHandler = (data, locationStr) => {
  // TODO: consider encoding the full Nominatim JSON response.
  const dataToWrite = {
    ...data,
    reverseGeocode: locationStr ?? null,
  };
  navigator.clipboard.writeText(JSON.stringify(dataToWrite, null, 2));
};

function CellInfo(props) {
  const [locationStr, setLocationStr] = createSignal(null);

  return (
    <div id="cell-info">
      <Switch>
        <Match
          when={props.cellInfoOutput != undefined && !props.cellInfoOutput.ok}
        >
          <div class="label">❌ Invalid Cell ID</div>
        </Match>
        <Match
          when={props.cellInfoOutput != undefined && props.cellInfoOutput.ok}
        >
          <button
            onclick={() =>
              copyToClipboardHandler(props.cellInfoOutput.value, locationStr())
            }
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
          <GeocodeComponent
            label="Centroid Reverse Geocode"
            lat={
              (props.cellInfoOutput.value.low.lat +
                props.cellInfoOutput.value.high.lat) /
              2
            }
            lng={
              (props.cellInfoOutput.value.low.lng +
                props.cellInfoOutput.value.high.lng) /
              2
            }
            onLocationUpdate={setLocationStr}
          />
        </Match>
      </Switch>
    </div>
  );
}

const calculateCellInfo = (s2Module, cellId) => {
  if (!s2Module || !cellId) return null;
  try {
    return { ok: true, value: s2Module.GetCellInfo(cellId) };
  } catch (error) {
    console.error('Error processing cell ID:', error);
    return { ok: false };
  }
};

function App() {
  const [s2WasmModule, sets2WasmModule] = createSignal(null);
  const [inputCellId, setInputCellId] = createSignal('');
  const [cellInfoOutput, setCellInfoOutput] = createSignal(null);

  // Initialize from URL
  createEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCellId = params.get('cellId');
    if (urlCellId && urlCellId !== inputCellId()) {
      setInputCellId(urlCellId);
    }
  });

  // Update URL when input changes
  createEffect(() => {
    const cellId = inputCellId();
    const params = new URLSearchParams(window.location.search);

    if (cellId) {
      params.set('cellId', cellId);
    } else {
      params.delete('cellId');
    }

    const newUrl = `${window.location.pathname}${
      params.toString() ? '?' + params.toString() : ''
    }`;
    window.history.replaceState(null, '', newUrl);
  });

  // Listen for popstate (back/forward navigation)
  createEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlCellId = params.get('cellId') || '';
      setInputCellId(urlCellId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  });

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
