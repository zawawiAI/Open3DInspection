import { useMemo } from 'react';
import { ndtMethodInfo } from '../lib/ndtMethods';
import { parseReference, trendPoints } from '../lib/ndtLocations';
import type { NdtReading } from '../types/ndt';

const W = 480;
const H = 220;
const PAD = { top: 20, right: 16, bottom: 36, left: 48 };

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function NdtTrendChart({ readings }: { readings: NdtReading[] }) {
  const points = useMemo(() => trendPoints(readings), [readings]);
  const method = readings[0]?.method;
  const info = method ? ndtMethodInfo(method) : null;
  const unit = readings[readings.length - 1]?.unit ?? '';

  const minAllowed = parseReference(
    readings.find((r) => r.minAllowed)?.minAllowed ?? '',
  );
  const nominal = parseReference(
    readings.find((r) => r.nominalThickness)?.nominalThickness ?? '',
  );

  if (points.length === 0) {
    return (
      <p className="ndt-chart__empty">
        Enter a numeric {info?.readingLabel.toLowerCase() ?? 'reading'} to plot
        the inspection trend.
      </p>
    );
  }

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const values = points.map((p) => p.value);
  const refLines = [minAllowed, nominal].filter(
    (v): v is number => v !== null,
  );
  const yMin = Math.min(...values, ...(refLines.length ? refLines : [values[0]]));
  const yMax = Math.max(...values, ...(refLines.length ? refLines : [values[0]]));
  const yPad = (yMax - yMin) * 0.12 || 1;
  const domainMin = yMin - yPad;
  const domainMax = yMax + yPad;

  const xScale = (i: number) =>
    PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yScale = (v: number) =>
    PAD.top + plotH - ((v - domainMin) / (domainMax - domainMin)) * plotH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.value)}`)
    .join(' ');

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    domainMin + ((domainMax - domainMin) * i) / (yTicks - 1),
  );

  return (
    <div className="ndt-chart">
      <div className="ndt-chart__head">
        <span className="ndt-chart__title">Inspection trend</span>
        <span className="ndt-chart__unit">{unit}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="ndt-chart__svg"
        role="img"
        aria-label="NDT reading trend over time"
      >
        {/* grid */}
        {yTickValues.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              y1={yScale(v)}
              x2={W - PAD.right}
              y2={yScale(v)}
              className="ndt-chart__grid"
            />
            <text
              x={PAD.left - 6}
              y={yScale(v)}
              className="ndt-chart__tick"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* reference lines */}
        {minAllowed !== null && (
          <>
            <line
              x1={PAD.left}
              y1={yScale(minAllowed)}
              x2={W - PAD.right}
              y2={yScale(minAllowed)}
              className="ndt-chart__ref ndt-chart__ref--min"
            />
            <text
              x={W - PAD.right}
              y={yScale(minAllowed) - 4}
              className="ndt-chart__ref-label"
              textAnchor="end"
            >
              T-min
            </text>
          </>
        )}
        {nominal !== null && (
          <>
            <line
              x1={PAD.left}
              y1={yScale(nominal)}
              x2={W - PAD.right}
              y2={yScale(nominal)}
              className="ndt-chart__ref ndt-chart__ref--nom"
            />
            <text
              x={W - PAD.right}
              y={yScale(nominal) - 4}
              className="ndt-chart__ref-label"
              textAnchor="end"
            >
              Nominal
            </text>
          </>
        )}

        {points.length > 1 && (
          <path d={linePath} className="ndt-chart__line" fill="none" />
        )}

        {points.map((p, i) => (
          <g key={p.reading.id}>
            <circle
              cx={xScale(i)}
              cy={yScale(p.value)}
              r={5}
              className="ndt-chart__dot"
            />
            <text
              x={xScale(i)}
              y={H - 8}
              className="ndt-chart__tick"
              textAnchor="middle"
            >
              {formatDate(p.date)}
            </text>
          </g>
        ))}
      </svg>
      {points.length === 1 && (
        <p className="ndt-chart__hint">
          Add a follow-up inspection to see thickness loss over time.
        </p>
      )}
    </div>
  );
}
