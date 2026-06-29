import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useNdtStore } from '../store/useNdtStore';
import {
  NDT_METHODS,
  isBelowMinAllowed,
  ndtMethodInfo,
} from '../lib/ndtMethods';
import { listLocationGroups, readingsAtLocation } from '../lib/ndtLocations';
import { NdtTrendChart } from './NdtTrendChart';
import type { NdtMethod, NdtReading } from '../types/ndt';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ndt-section">
      <h4 className="ndt-section__title">{title}</h4>
      <div className="ndt-section__body">{children}</div>
    </section>
  );
}

function Editor({
  reading,
  locationReadings,
}: {
  reading: NdtReading;
  locationReadings: NdtReading[];
}) {
  const update = useNdtStore((s) => s.updateReading);
  const remove = useNdtStore((s) => s.removeReading);
  const addFollowUp = useNdtStore((s) => s.addFollowUp);
  const select = useNdtStore((s) => s.select);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const info = ndtMethodInfo(reading.method);
  const alarm = isBelowMinAllowed(reading);
  const locationId = reading.locationId ?? reading.id;
  const isUt =
    reading.method === 'ut_thickness' || reading.method === 'ut_flaw';

  const onMethodChange = (method: NdtMethod) => {
    const next = ndtMethodInfo(method);
    update(reading.id, { method, unit: next.defaultUnit });
  };

  return (
    <div className="data-detail">
      <header className="data-detail__header">
        <div>
          <h3 className="data-detail__title">
            {reading.locationTag || 'Untitled location'}
          </h3>
          <p className="data-detail__subtitle">
            {info.label} · {locationReadings.length} inspection
            {locationReadings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => addFollowUp(locationId)}
        >
          + Follow-up
        </button>
      </header>

      {alarm && (
        <div className="data-detail__alarm">
          Below minimum allowed thickness (T-min)
        </div>
      )}

      <div className="data-detail__chart">
        <NdtTrendChart readings={locationReadings} />
      </div>

      <div className="data-detail__history">
        <span className="data-detail__history-label">Inspection history</span>
        <div className="data-history-tabs" role="tablist">
          {[...locationReadings].reverse().map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={r.id === reading.id}
              className={`data-history-tab ${r.id === reading.id ? 'data-history-tab--on' : ''}`}
              onClick={() => select(r.id)}
            >
              <span className="data-history-tab__date">{r.inspectionDate}</span>
              <span className="data-history-tab__val">
                {r.reading ? `${r.reading} ${r.unit}` : 'No reading'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Section title="Location">
        <label className="field field--full">
          <span>CML / location tag</span>
          <input
            value={reading.locationTag}
            onChange={(e) => {
              const tag = e.target.value;
              for (const r of locationReadings) {
                update(r.id, { locationTag: tag });
              }
            }}
            placeholder="e.g. Line 12, Weld W-04, CML-101"
          />
        </label>
      </Section>

      <Section title="This inspection">
        <div className="field-row field-row--pair">
          <label className="field">
            <span>Inspection date</span>
            <input
              type="date"
              value={reading.inspectionDate}
              onChange={(e) =>
                update(reading.id, { inspectionDate: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>NDT method</span>
            <select
              value={reading.method}
              onChange={(e) => onMethodChange(e.target.value as NdtMethod)}
            >
              {NDT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row field-row--pair">
          <label className="field">
            <span>{info.readingLabel}</span>
            <input
              value={reading.reading}
              onChange={(e) => update(reading.id, { reading: e.target.value })}
              placeholder="e.g. 8.2"
            />
          </label>
          <label className="field">
            <span>Unit</span>
            <select
              value={reading.unit}
              onChange={(e) => update(reading.id, { unit: e.target.value })}
            >
              {info.units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      {isUt && (
        <Section title="Thickness limits">
          <div className="field-row field-row--pair">
            <label className="field">
              <span>Nominal thickness</span>
              <input
                value={reading.nominalThickness}
                onChange={(e) => {
                  const v = e.target.value;
                  for (const r of locationReadings) {
                    update(r.id, { nominalThickness: v });
                  }
                }}
                placeholder="Design / nominal"
              />
            </label>
            <label className="field">
              <span>Min allowed (T-min)</span>
              <input
                value={reading.minAllowed}
                onChange={(e) => {
                  const v = e.target.value;
                  for (const r of locationReadings) {
                    update(r.id, { minAllowed: v });
                  }
                }}
                placeholder="Retirement limit"
              />
            </label>
          </div>
        </Section>
      )}

      <Section title="Equipment &amp; calibration">
        <div className="field-row field-row--pair">
          <label className="field">
            <span>Equipment / probe</span>
            <input
              value={reading.equipment}
              onChange={(e) => update(reading.id, { equipment: e.target.value })}
              placeholder="Gauge ID, transducer"
            />
          </label>
          <label className="field">
            <span>Calibration reference</span>
            <input
              value={reading.calibrationRef}
              onChange={(e) =>
                update(reading.id, { calibrationRef: e.target.value })
              }
              placeholder="Block / cert number"
            />
          </label>
        </div>
      </Section>

      <Section title="Notes">
        <label className="field field--full">
          <span>Field notes</span>
          <textarea
            rows={4}
            value={reading.notes}
            onChange={(e) => update(reading.id, { notes: e.target.value })}
            placeholder="Surface condition, coating, access, temperature, etc."
          />
        </label>
        <p className="data-detail__meta">
          Recorded by {reading.author} on{' '}
          {new Date(reading.createdAt).toLocaleString()}
        </p>
      </Section>

      <div className="data-detail__actions">
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete this inspection
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="modal" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="modal__panel confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__head">
              <h2>Delete inspection?</h2>
            </div>
            <p className="modal__hint">
              Remove the {reading.inspectionDate} reading at &ldquo;
              {reading.locationTag || 'this point'}&rdquo;?
            </p>
            <div className="modal__foot">
              <button
                type="button"
                className="btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                No
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  remove(reading.id);
                  setShowDeleteConfirm(false);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataSidebar() {
  const asset = useStore((s) => s.asset);
  const readings = useNdtStore((s) => s.readings);
  const selectedId = useNdtStore((s) => s.selectedId);
  const focusOn = useNdtStore((s) => s.focusOn);
  const select = useNdtStore((s) => s.select);
  const mode = useNdtStore((s) => s.mode);

  const locations = useMemo(() => listLocationGroups(readings), [readings]);
  const selected = readings.find((r) => r.id === selectedId) ?? null;
  const locationReadings = selected
    ? readingsAtLocation(readings, selected.locationId ?? selected.id)
    : [];

  return (
    <aside className="data-panel">
      <header className="data-panel__header">
        <div>
          <h2>NDT monitoring</h2>
          <p className="data-panel__subtitle">
            {asset
              ? mode === 'tag'
                ? 'Tag points on the model, then record readings per visit.'
                : 'Use Tag NDT mode to place monitoring points.'
              : 'Open a 3D asset to begin.'}
          </p>
        </div>
        <span className="badge">{locations.length} locations</span>
      </header>

      {locations.length > 0 && (
        <section className="data-panel__locations">
          <h3 className="data-panel__section-title">Monitoring points</h3>
          <div className="data-loc-grid">
            {locations.map((loc) => {
              const alarm = isBelowMinAllowed(loc.latest);
              const isActive = selected
                ? (selected.locationId ?? selected.id) === loc.locationId
                : false;
              return (
                <button
                  key={loc.locationId}
                  type="button"
                  className={`data-loc-card ${isActive ? 'data-loc-card--on' : ''} ${alarm ? 'data-loc-card--alarm' : ''}`}
                  onClick={() => {
                    select(loc.latest.id);
                    focusOn(loc.latest.id);
                  }}
                >
                  <span className="data-loc-card__index">{loc.index}</span>
                  <span className="data-loc-card__tag">
                    {loc.latest.locationTag || `Point ${loc.index}`}
                  </span>
                  <span className="data-loc-card__meta">
                    {loc.latest.reading
                      ? `${loc.latest.reading} ${loc.latest.unit}`
                      : 'No reading yet'}
                  </span>
                  <span className="data-loc-card__date">
                    {loc.latest.inspectionDate}
                    {loc.readings.length > 1 && ` · ${loc.readings.length} visits`}
                  </span>
                  {alarm && <span className="data-loc-card__flag">LOW</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="data-panel__main">
        {selected ? (
          <Editor reading={selected} locationReadings={locationReadings} />
        ) : locations.length === 0 ? (
          <div className="data-panel__empty">
            <span className="data-panel__empty-icon">▲</span>
            <p>No monitoring points yet</p>
            <p className="data-panel__empty-hint">
              {asset
                ? 'Switch to Tag NDT and click the model surface to place your first CML point.'
                : 'Open a 3D model from the toolbar or Assets tab.'}
            </p>
          </div>
        ) : (
          <div className="data-panel__empty">
            <p>Select a monitoring point above to view trends and enter readings.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
