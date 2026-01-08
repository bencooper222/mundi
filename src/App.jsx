import s2WasmModulePromise from './wasm/s2_library';
import {
  createSignal,
  Switch,
  Match,
  Show,
  createEffect,
  createResource,
  onMount,
  onCleanup,
} from 'solid-js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  if (props.link) {
    return (
      <div class="label">
        <span>{props.label}: </span>
        <a href={props.link} target="_blank">
          <strong>{props.value}</strong>
        </a>
      </div>
    );
  } else {
    return (
      <div class="label">
        <span>{props.label}: </span>
        <strong>{props.value}</strong>
      </div>
    );
  }
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

const copyToClipboardHandler = (data, locationStr, event) => {
  // TODO: consider encoding the full Nominatim JSON response.
  const dataToWrite = {
    ...data,
    reverseGeocode: locationStr ?? null,
  };

  // Use minified JSON if shift key is pressed, otherwise pretty-print
  const jsonString = event?.shiftKey
    ? JSON.stringify(dataToWrite)
    : JSON.stringify(dataToWrite, null, 2);

  navigator.clipboard.writeText(jsonString);
};

function CellInfo(props) {
  const [locationStr, setLocationStr] = createSignal(null);
  const [isShiftPressed, setIsShiftPressed] = createSignal(false);

  // Track shift key state
  createEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  });

  const centroidLatLng = () => {
    if (props.cellInfoOutput && props.cellInfoOutput.ok) {
      return latLngFormatter(
        (props.cellInfoOutput.value.low.lat +
          props.cellInfoOutput.value.high.lat) /
          2,
        (props.cellInfoOutput.value.low.lng +
          props.cellInfoOutput.value.high.lng) /
          2,
      );
    }
    return undefined;
  };

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
            onclick={(event) =>
              copyToClipboardHandler(
                props.cellInfoOutput.value,
                locationStr(),
                event,
              )
            }
          >
            {isShiftPressed() ? 'Copy minified JSON' : 'Copy JSON'}
          </button>
          <Field label="Cell Token" value={props.cellInfoOutput.value.id} />
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
            label="Centroid LatLng"
            link={`https://google.com/maps?q=${encodeURIComponent(
              centroidLatLng(),
            )}`}
            value={centroidLatLng()}
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

// Parses a "lat, lng" string and returns { lat, lng } if valid, or null otherwise.
const parseLatLng = (input) => {
  if (!input) return null;
  const parts = input
    .trim()
    .split(',')
    .map((s) => s.trim());
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;

  return { lat, lng };
};

function MapComponent(props) {
  let mapContainer;
  let map;
  let cellRectangle;
  let latLngMarker;

  onMount(() => {
    // Initialize the map.
    map = L.map(mapContainer).setView([0, 0], 2);

    // Add OpenStreetMap tiles.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
  });

  // Effect for the cell rectangle.
  createEffect(() => {
    if (!map || !props.cellInfoOutput?.ok) {
      // Remove existing rectangle if no valid cell.
      if (cellRectangle) {
        map.removeLayer(cellRectangle);
        cellRectangle = null;
      }
      return;
    }

    const cellInfo = props.cellInfoOutput.value;

    // Remove existing rectangle if any.
    if (cellRectangle) {
      map.removeLayer(cellRectangle);
    }

    // Create bounds from S2 cell corners.
    const bounds = [
      [cellInfo.low.lat, cellInfo.low.lng],
      [cellInfo.high.lat, cellInfo.high.lng],
    ];

    // Draw rectangle.
    cellRectangle = L.rectangle(bounds, {
      color: '#ff7800',
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.35,
      fillColor: '#ff7800',
    }).addTo(map);

    // Fit map to show the rectangle with some padding.
    map.fitBounds(bounds, { padding: [50, 50] });
  });

  // Effect for the lat/lng marker.
  createEffect(() => {
    // Remove existing marker if any.
    if (latLngMarker) {
      map.removeLayer(latLngMarker);
      latLngMarker = null;
    }

    if (!map || !props.latLng) return;

    const { lat, lng } = props.latLng;

    // Create marker with a popup showing the coordinates.
    latLngMarker = L.marker([lat, lng]).bindPopup(`${lat}, ${lng}`).addTo(map);
  });

  onCleanup(() => {
    if (map) {
      map.remove();
    }
  });

  return (
    <div
      id="map-container"
      ref={mapContainer}
      style={{
        height: '500px',
        width: '100%',
        'border-radius': '8px',
        border: '1px solid #ccc',
      }}
    ></div>
  );
}

function App() {
  // Initialize input from URL on mount.
  const params = new URLSearchParams(window.location.search);

  // Backwards compatibility: redirect ?cellId= to ?q=
  const legacyCellId = params.get('cellId');
  if (legacyCellId) {
    params.delete('cellId');
    params.set('q', legacyCellId);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }

  const initialInput = params.get('q') || '';

  const [s2WasmModule, sets2WasmModule] = createSignal(null);
  const [input, setInput] = createSignal(initialInput);
  const [cellInfoOutput, setCellInfoOutput] = createSignal(null);
  const [levelInput, setLevelInput] = createSignal('');

  // Derived: check if input is a lat,lng.
  const parsedLatLng = () => parseLatLng(input());
  const isLatLngMode = () => parsedLatLng() !== null;

  // Derived: effective level (defaults to 13 if empty).
  const effectiveLevel = () => {
    const parsed = parseInt(levelInput());
    return isNaN(parsed) ? 13 : parsed;
  };

  // Derived: compute the effective cell ID.
  const effectiveCellId = () => {
    const s2Module = s2WasmModule();
    const parsed = parsedLatLng();

    if (parsed && s2Module) {
      // Input is lat,lng - convert to S2 token.
      try {
        return s2Module.GetS2TokenFromLatLng(
          parsed.lat,
          parsed.lng,
          effectiveLevel(),
        );
      } catch (error) {
        console.error('Error converting lat/lng to S2 token:', error);
        return null;
      }
    }

    // Input is treated as S2 token directly.
    return input() || null;
  };

  // Update URL when input changes (but not on initial mount).
  createEffect(() => {
    const currentInput = input();
    const params = new URLSearchParams(window.location.search);
    const currentUrlInput = params.get('q') || '';

    // Only update history if the value actually changed from what's in the URL.
    if (currentInput === currentUrlInput) return;

    if (currentInput) {
      params.set('q', currentInput);
    } else {
      params.delete('q');
    }

    const newUrl = `${window.location.pathname}${
      params.toString() ? '?' + params.toString() : ''
    }`;
    window.history.pushState(null, '', newUrl);
  });

  // Listen for popstate (back/forward navigation).
  createEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlInput = params.get('q') || '';
      setInput(urlInput);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  });

  s2WasmModulePromise().then((s2Func) => {
    sets2WasmModule(s2Func);
  });

  createEffect(() => {
    const cellId = effectiveCellId();
    const s2Module = s2WasmModule();
    const cellInfo = calculateCellInfo(s2Module, cellId);
    setCellInfoOutput(cellInfo);
  });

  // Dynamic font size based on input length.
  const inputFontSize = () => {
    const len = input().length;
    if (len <= 12) return 'min(48px, 6vw)';
    if (len <= 20) return 'min(36px, 5vw)';
    if (len <= 30) return 'min(28px, 4vw)';
    return 'min(22px, 3.5vw)';
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      <div style={{ flex: '1', 'min-width': '300px' }}>
        <div class={`input-wrapper ${input() ? 'has-value' : ''}`}>
          <label class="floating-label">S2 token or lat,lng</label>
          <input
            type="text"
            value={input()}
            onInput={(e) => setInput(e.currentTarget.value)}
            style={{ 'font-size': inputFontSize() }}
            autofocus
          />
        </div>
        <Show when={isLatLngMode()}>
          <div class="input-wrapper input-wrapper-level has-value">
            <label class="floating-label">S2 cell level</label>
            <input
              type="number"
              min="0"
              max="30"
              value={levelInput()}
              placeholder="13"
              onInput={(e) => setLevelInput(e.currentTarget.value)}
            />
          </div>
        </Show>

        <CellInfo cellInfoOutput={cellInfoOutput()} />
      </div>

      <div style={{ flex: '1', 'min-width': '300px' }}>
        <MapComponent
          cellInfoOutput={cellInfoOutput()}
          latLng={parsedLatLng()}
        />
      </div>
    </div>
  );
}

export default App;
