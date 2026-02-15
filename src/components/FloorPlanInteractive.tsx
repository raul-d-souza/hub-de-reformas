/**
 * FloorPlanInteractive — Planta baixa interativa com drag & drop e resize.
 * Permite ao usuário mover e redimensionar cômodos livremente.
 * Opcionalmente aceita uma imagem de fundo (planta baixa real).
 */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { RoomType } from "@/types/database";
import { ROOM_CONFIGS, getRoomConfig, type RoomSelection } from "@/services/rooms";

/* ─── Tipos ─── */
export interface InteractiveRoom {
  id: string;
  type: RoomType;
  label: string;
  icon: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FloorPlanInteractiveProps {
  rooms: RoomSelection[];
  initialLayout?: InteractiveRoom[];
  onLayoutChange?: (layout: InteractiveRoom[]) => void;
  backgroundImage?: string;
  editable?: boolean;
  width?: number;
  height?: number;
}

/* ─── Constantes ─── */
const CANVAS_W = 800;
const CANVAS_H = 600;
const MIN_SIZE = 40;
const SNAP = 10;
const HANDLE = 14;

type DragType = "move" | "resize-br" | "resize-bl" | "resize-tr" | "resize-tl";

interface DragInfo {
  roomId: string;
  type: DragType;
  startSvgX: number;
  startSvgY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
}

function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/* ─── Gera layout inicial ─── */
function generateInitialLayout(rooms: RoomSelection[]): InteractiveRoom[] {
  const result: InteractiveRoom[] = [];
  let cx = 20;
  let cy = 20;
  let rowH = 0;
  let idx = 0;

  for (const room of rooms) {
    const config = getRoomConfig(room.type);
    for (let i = 0; i < room.quantity; i++) {
      const s = Math.sqrt(config.defaultArea);
      const w = snap(Math.max(MIN_SIZE, s * 14));
      const h = snap(Math.max(MIN_SIZE, s * 10));

      if (cx + w > CANVAS_W - 20) {
        cx = 20;
        cy += rowH + 10;
        rowH = 0;
      }

      const suffix = room.quantity > 1 ? ` ${i + 1}` : "";
      result.push({
        id: `${room.type}-${idx}`,
        type: room.type,
        label: `${config.label}${suffix}`,
        icon: config.icon,
        color: config.color,
        x: cx,
        y: cy,
        w,
        h,
      });

      cx += w + 10;
      rowH = Math.max(rowH, h);
      idx++;
    }
  }

  return result;
}

/* ─── Componente ─── */
export default function FloorPlanInteractive({
  rooms,
  initialLayout,
  onLayoutChange,
  backgroundImage,
  editable = true,
  width,
  height,
}: FloorPlanInteractiveProps) {
  const [layout, setLayout] = useState<InteractiveRoom[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  /* ── Init layout ── */
  useEffect(() => {
    if (initialLayout && initialLayout.length > 0) {
      setLayout(initialLayout);
    } else {
      setLayout(generateInitialLayout(rooms));
    }
  }, [rooms, initialLayout]);

  /* ── Notify parent (debounced to avoid infinite loops) ── */
  const onLayoutChangeRef = useRef(onLayoutChange);
  onLayoutChangeRef.current = onLayoutChange;
  const notifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (layout.length > 0) {
      clearTimeout(notifyTimeoutRef.current);
      notifyTimeoutRef.current = setTimeout(() => {
        onLayoutChangeRef.current?.(layout);
      }, 200);
    }
    return () => {
      if (notifyTimeoutRef.current !== undefined) clearTimeout(notifyTimeoutRef.current);
    };
  }, [layout]);

  /* ── Client coords → SVG coords using getBoundingClientRect ── */
  const toSVG = useCallback((clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }, []);

  /* ── Document-level pointer move/up for reliable dragging ── */
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();

      const svgPt = toSVG(e.clientX, e.clientY);
      const dx = svgPt.x - drag.startSvgX;
      const dy = svgPt.y - drag.startSvgY;

      setLayout((prev) =>
        prev.map((room) => {
          if (room.id !== drag.roomId) return room;

          if (drag.type === "move") {
            return {
              ...room,
              x: snap(clamp(drag.origX + dx, 0, CANVAS_W - drag.origW)),
              y: snap(clamp(drag.origY + dy, 0, CANVAS_H - drag.origH)),
            };
          }

          let nx = drag.origX;
          let ny = drag.origY;
          let nw = drag.origW;
          let nh = drag.origH;

          if (drag.type === "resize-br") {
            nw = snap(Math.max(MIN_SIZE, drag.origW + dx));
            nh = snap(Math.max(MIN_SIZE, drag.origH + dy));
          } else if (drag.type === "resize-bl") {
            const pw = snap(Math.max(MIN_SIZE, drag.origW - dx));
            nx = snap(drag.origX + drag.origW - pw);
            nw = pw;
            nh = snap(Math.max(MIN_SIZE, drag.origH + dy));
          } else if (drag.type === "resize-tr") {
            nw = snap(Math.max(MIN_SIZE, drag.origW + dx));
            const ph = snap(Math.max(MIN_SIZE, drag.origH - dy));
            ny = snap(drag.origY + drag.origH - ph);
            nh = ph;
          } else if (drag.type === "resize-tl") {
            const pw = snap(Math.max(MIN_SIZE, drag.origW - dx));
            const ph = snap(Math.max(MIN_SIZE, drag.origH - dy));
            nx = snap(drag.origX + drag.origW - pw);
            ny = snap(drag.origY + drag.origH - ph);
            nw = pw;
            nh = ph;
          }

          return { ...room, x: nx, y: ny, w: nw, h: nh };
        }),
      );
    }

    function onUp() {
      if (dragRef.current) {
        dragRef.current = null;
        setIsDragging(false);
      }
    }

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [toSVG]);

  /* ── Start drag ── */
  function startDrag(e: React.PointerEvent, roomId: string, type: DragType) {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();

    const room = layoutRef.current.find((r) => r.id === roomId);
    if (!room) return;

    const svgPt = toSVG(e.clientX, e.clientY);
    dragRef.current = {
      roomId,
      type,
      startSvgX: svgPt.x,
      startSvgY: svgPt.y,
      origX: room.x,
      origY: room.y,
      origW: room.w,
      origH: room.h,
    };
    setSelectedId(roomId);
    setIsDragging(true);
  }

  function resetLayout() {
    setLayout(generateInitialLayout(rooms));
    setSelectedId(null);
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8">
        <span className="text-4xl">🏠</span>
        <p className="mt-2 text-sm text-gray-500">Selecione os cômodos para gerar a planta baixa</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📐</span>
          <h3 className="text-sm font-semibold text-gray-700">Planta Baixa Interativa</h3>
          <span className="text-[10px] text-gray-400">(sem escala)</span>
        </div>
        {editable && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded"
              />
              Grade
            </label>
            <button
              type="button"
              onClick={resetLayout}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              ↻ Resetar
            </button>
          </div>
        )}
      </div>

      {editable && (
        <p className="text-xs text-gray-400">
          💡 Arraste os cômodos para posicionar. Clique em um cômodo e use os quadrados nos cantos
          para redimensionar.
        </p>
      )}

      {/* Canvas */}
      <div
        className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-sm"
        style={{ maxHeight: height ?? 520 }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          width={width ?? "100%"}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", touchAction: "none", userSelect: "none" }}
          onClick={() => {
            if (!isDragging) setSelectedId(null);
          }}
        >
          {/* Defs */}
          <defs>
            <pattern id="fp-grid" width={SNAP} height={SNAP} patternUnits="userSpaceOnUse">
              <path
                d={`M ${SNAP} 0 L 0 0 0 ${SNAP}`}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="0.3"
              />
            </pattern>
            <filter id="fp-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Grid */}
          {showGrid && <rect width={CANVAS_W} height={CANVAS_H} fill="url(#fp-grid)" />}

          {/* Background image */}
          {backgroundImage && (
            <image
              href={backgroundImage}
              x={0}
              y={0}
              width={CANVAS_W}
              height={CANVAS_H}
              opacity={0.25}
              preserveAspectRatio="xMidYMid meet"
            />
          )}

          {/* Outer border */}
          <rect
            x={2}
            y={2}
            width={CANVAS_W - 4}
            height={CANVAS_H - 4}
            fill="none"
            stroke="#0B3D91"
            strokeWidth={2}
            rx={4}
            strokeOpacity={0.2}
          />

          {/* Rooms */}
          {layout.map((room) => {
            const sel = selectedId === room.id;
            const fs = Math.min(12, Math.max(8, room.w / 10));
            const iconSz = Math.min(18, Math.max(12, room.w / 5));

            return (
              <g key={room.id}>
                {/* Body */}
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.w}
                  height={room.h}
                  fill={room.color}
                  fillOpacity={0.15}
                  stroke={sel ? "#0B3D91" : room.color}
                  strokeWidth={sel ? 2.5 : 1.5}
                  rx={3}
                  filter={sel ? "url(#fp-shadow)" : undefined}
                  cursor={editable ? "grab" : "default"}
                  onPointerDown={(e) => startDrag(e, room.id, "move")}
                />

                {/* Inner dashed */}
                <rect
                  x={room.x + 3}
                  y={room.y + 3}
                  width={Math.max(0, room.w - 6)}
                  height={Math.max(0, room.h - 6)}
                  fill="none"
                  stroke={room.color}
                  strokeWidth={0.5}
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                  rx={2}
                  pointerEvents="none"
                />

                {/* Door indicator */}
                {room.h > 50 && (
                  <line
                    x1={room.x + room.w * 0.3}
                    y1={room.y}
                    x2={room.x + room.w * 0.6}
                    y2={room.y}
                    stroke={room.color}
                    strokeWidth={3}
                    strokeOpacity={0.4}
                    strokeDasharray="2 2"
                    pointerEvents="none"
                  />
                )}

                {/* Icon */}
                <text
                  x={room.x + room.w / 2}
                  y={room.y + room.h / 2 - fs * 0.5}
                  textAnchor="middle"
                  fontSize={iconSz}
                  dominantBaseline="central"
                  pointerEvents="none"
                >
                  {room.icon}
                </text>

                {/* Label */}
                <text
                  x={room.x + room.w / 2}
                  y={room.y + room.h / 2 + iconSz * 0.7}
                  textAnchor="middle"
                  fontSize={fs}
                  fill="#333"
                  fontWeight="600"
                  dominantBaseline="central"
                  pointerEvents="none"
                >
                  {room.label.length > room.w / 7
                    ? room.label.slice(0, Math.floor(room.w / 7)) + "…"
                    : room.label}
                </text>

                {/* Dimensions */}
                {sel && editable && (
                  <text
                    x={room.x + room.w / 2}
                    y={room.y + room.h - 6}
                    textAnchor="middle"
                    fontSize={8}
                    fill="#666"
                    pointerEvents="none"
                  >
                    {Math.round(room.w)}×{Math.round(room.h)}
                  </text>
                )}

                {/* Resize handles */}
                {sel && editable && (
                  <>
                    {(
                      [
                        ["resize-tl", room.x, room.y, "nw-resize"],
                        ["resize-tr", room.x + room.w, room.y, "ne-resize"],
                        ["resize-bl", room.x, room.y + room.h, "sw-resize"],
                        ["resize-br", room.x + room.w, room.y + room.h, "se-resize"],
                      ] as [DragType, number, number, string][]
                    ).map(([dtype, hx, hy, cursor]) => (
                      <g key={dtype}>
                        {/* Invisible larger hit area */}
                        <rect
                          x={hx - HANDLE}
                          y={hy - HANDLE}
                          width={HANDLE * 2}
                          height={HANDLE * 2}
                          fill="transparent"
                          cursor={cursor}
                          onPointerDown={(e) => startDrag(e, room.id, dtype)}
                        />
                        {/* Visible handle */}
                        <rect
                          x={hx - HANDLE / 2}
                          y={hy - HANDLE / 2}
                          width={HANDLE}
                          height={HANDLE}
                          fill="#0B3D91"
                          stroke="#fff"
                          strokeWidth={1.5}
                          rx={3}
                          cursor={cursor}
                          pointerEvents="none"
                        />
                      </g>
                    ))}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-gray-500">
          {layout.length} cômodo{layout.length !== 1 ? "s" : ""}
        </span>
        <span className="text-gray-300">|</span>
        {rooms.map((room) => {
          const config = ROOM_CONFIGS.find((c) => c.type === room.type);
          if (!config) return null;
          return (
            <div key={room.type} className="flex items-center gap-1 text-xs text-gray-600">
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ backgroundColor: config.color }}
              />
              <span>
                {config.icon} {config.label}
                {room.quantity > 1 ? ` (${room.quantity})` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
