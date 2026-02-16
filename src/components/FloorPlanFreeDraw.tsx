/**
 * FloorPlanFreeDraw — Desenho livre de planta baixa sem foto de fundo.
 *
 * Fluxo:
 * 1. Canvas em branco com grid de fundo
 * 2. O usuário clica e arrasta para criar retângulos (cômodos)
 * 3. Pode mover e redimensionar os retângulos livremente
 * 4. Quando satisfeito, clica "Rotular Cômodos"
 * 5. Define o tipo de cada cômodo desenhado
 * 6. O resultado são RoomSelections + layout posicional
 */
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { RoomType } from "@/types/database";
import { ROOM_CONFIGS, getRoomConfig, type RoomSelection } from "@/services/rooms";
import type { InteractiveRoom } from "@/components/FloorPlanInteractive";

interface FloorPlanFreeDrawProps {
  onComplete: (rooms: RoomSelection[], layout: InteractiveRoom[]) => void;
  onCancel: () => void;
}

interface DrawnRoom {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: RoomType | null;
  label: string;
}

type DragType = "move" | "resize-tl" | "resize-tr" | "resize-bl" | "resize-br";

interface DragInfo {
  roomId: string;
  type: DragType;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
}

const CANVAS_W = 800;
const CANVAS_H = 600;
const GRID = 10;
const MIN_SIZE = 30;
const HANDLE = 14;

function snap(v: number) {
  return Math.round(v / GRID) * GRID;
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function FloorPlanFreeDraw({ onComplete, onCancel }: FloorPlanFreeDrawProps) {
  const [drawnRooms, setDrawnRooms] = useState<DrawnRoom[]>([]);
  const [step, setStep] = useState<"draw" | "label">("draw");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  // Drawing new rect state (refs for document listeners)
  const drawingRef = useRef(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const currentRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // Drag/resize state (ref for document listeners)
  const dragRef = useRef<DragInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  /* ── SVG coord conversion ── */
  const toSVG = useCallback((clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }, []);

  /* ── Document-level pointer listeners for drag/resize + drawing ── */
  useEffect(() => {
    function onMove(e: PointerEvent) {
      // Handle drag/resize of existing rooms
      const drag = dragRef.current;
      if (drag) {
        e.preventDefault();
        const el = svgRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const svgX = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
        const svgY = ((e.clientY - rect.top) / rect.height) * CANVAS_H;

        const dx = svgX - drag.startX;
        const dy = svgY - drag.startY;

        setDrawnRooms((prev) =>
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
        return;
      }

      // Handle drawing new rectangle
      if (drawingRef.current && drawStartRef.current) {
        const el = svgRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const ptX = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
        const ptY = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
        const start = drawStartRef.current;
        const x = Math.min(start.x, ptX);
        const y = Math.min(start.y, ptY);
        const w = Math.abs(ptX - start.x);
        const h = Math.abs(ptY - start.y);
        const newRect = { x, y, w, h };
        currentRectRef.current = newRect;
        setCurrentRect(newRect);
      }
    }

    function onUp() {
      // End drag/resize
      if (dragRef.current) {
        dragRef.current = null;
        setIsDragging(false);
        return;
      }

      // End drawing new rect
      if (drawingRef.current) {
        drawingRef.current = false;
        drawStartRef.current = null;
        const rect = currentRectRef.current;
        currentRectRef.current = null;
        setCurrentRect(null);

        if (rect && rect.w > 20 && rect.h > 20) {
          const newRoom: DrawnRoom = {
            id: `free-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            x: snap(rect.x),
            y: snap(rect.y),
            w: snap(Math.max(MIN_SIZE, rect.w)),
            h: snap(Math.max(MIN_SIZE, rect.h)),
            type: null,
            label: "",
          };
          setDrawnRooms((prev) => [...prev, { ...newRoom, label: `Cômodo ${prev.length + 1}` }]);
          setSelectedId(newRoom.id);
        }
      }
    }

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, []);

  /* ── Start drawing new rect on canvas background ── */
  function handleCanvasPointerDown(e: React.PointerEvent) {
    if (step !== "draw") return;
    if (isDragging) return;

    const pt = toSVG(e.clientX, e.clientY);
    drawingRef.current = true;
    drawStartRef.current = pt;
    const initRect = { x: pt.x, y: pt.y, w: 0, h: 0 };
    currentRectRef.current = initRect;
    setCurrentRect(initRect);
    setSelectedId(null);
  }

  /* ── Start drag/resize of existing room ── */
  function startDrag(e: React.PointerEvent, roomId: string, type: DragType) {
    e.stopPropagation();
    e.preventDefault();

    const room = drawnRooms.find((r) => r.id === roomId);
    if (!room) return;

    const pt = toSVG(e.clientX, e.clientY);
    dragRef.current = {
      roomId,
      type,
      startX: pt.x,
      startY: pt.y,
      origX: room.x,
      origY: room.y,
      origW: room.w,
      origH: room.h,
    };
    setSelectedId(roomId);
    setIsDragging(true);
  }

  /* ── Remove room ── */
  function removeRoom(id: string) {
    setDrawnRooms((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingRoomId === id) setEditingRoomId(null);
  }

  /* ── Set room type in label step ── */
  function setRoomType(id: string, type: RoomType) {
    const config = getRoomConfig(type);
    setDrawnRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, type, label: config.label } : r)),
    );
    setEditingRoomId(null);
  }

  const allLabeled = drawnRooms.length > 0 && drawnRooms.every((r) => r.type !== null);

  /* ── Complete: convert to RoomSelections + InteractiveRoom[] ── */
  function handleComplete() {
    const roomMap = new Map<RoomType, number>();
    for (const room of drawnRooms) {
      if (room.type) {
        roomMap.set(room.type, (roomMap.get(room.type) ?? 0) + 1);
      }
    }
    const selections: RoomSelection[] = Array.from(roomMap.entries()).map(([type, quantity]) => ({
      type,
      quantity,
    }));

    const layout: InteractiveRoom[] = drawnRooms
      .filter((r) => r.type !== null)
      .map((r, i) => {
        const config = getRoomConfig(r.type!);
        return {
          id: `${r.type}-${i}`,
          type: r.type!,
          label: r.label,
          icon: config.icon,
          color: config.color,
          x: r.x,
          y: r.y,
          w: r.w,
          h: r.h,
        };
      });

    onComplete(selections, layout);
  }

  /* ─────────── Render ─────────── */
  return (
    <div className="space-y-4">
      {/* ── Step: Draw ── */}
      {step === "draw" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">✏️ Desenhe a planta baixa</h3>
              <p className="text-xs text-gray-500">
                Clique e arraste para criar retângulos. Selecione um cômodo para mover ou
                redimensionar.
                {drawnRooms.length > 0 &&
                  ` (${drawnRooms.length} cômodo${drawnRooms.length !== 1 ? "s" : ""})`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                {showGrid ? "🔲" : "⬜"} Grid
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawnRooms([]);
                  setSelectedId(null);
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                disabled={drawnRooms.length === 0}
              >
                🗑️ Limpar
              </button>
              <button
                type="button"
                onClick={() => setStep("label")}
                disabled={drawnRooms.length === 0}
                className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
              >
                Rotular Cômodos →
              </button>
            </div>
          </div>

          <div className="overflow-auto rounded-xl border-2 border-gray-200 bg-white shadow-sm">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              width="100%"
              height="auto"
              style={{
                minHeight: 400,
                cursor: isDragging ? "grabbing" : "crosshair",
                touchAction: "none",
                userSelect: "none",
              }}
              onPointerDown={handleCanvasPointerDown}
            >
              {/* Grid */}
              {showGrid && (
                <>
                  <defs>
                    <pattern
                      id="fd-grid-small"
                      width={GRID}
                      height={GRID}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${GRID} 0 L 0 0 0 ${GRID}`}
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth={0.5}
                      />
                    </pattern>
                    <pattern
                      id="fd-grid-large"
                      width={GRID * 5}
                      height={GRID * 5}
                      patternUnits="userSpaceOnUse"
                    >
                      <rect width={GRID * 5} height={GRID * 5} fill="url(#fd-grid-small)" />
                      <path
                        d={`M ${GRID * 5} 0 L 0 0 0 ${GRID * 5}`}
                        fill="none"
                        stroke="#D1D5DB"
                        strokeWidth={1}
                      />
                    </pattern>
                  </defs>
                  <rect width={CANVAS_W} height={CANVAS_H} fill="url(#fd-grid-large)" />
                </>
              )}

              {/* Drawn rooms */}
              {drawnRooms.map((room, roomIndex) => {
                const sel = room.id === selectedId;
                const roomColor = room.type ? getRoomConfig(room.type).color : "#94A3B8";
                const roomNumber = roomIndex + 1;
                return (
                  <g key={room.id}>
                    {/* Selection outline */}
                    {sel && (
                      <rect
                        x={room.x - 3}
                        y={room.y - 3}
                        width={room.w + 6}
                        height={room.h + 6}
                        fill="none"
                        stroke="#0B3D91"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        rx={6}
                        opacity={0.5}
                      />
                    )}

                    {/* Room body */}
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.w}
                      height={room.h}
                      fill={roomColor}
                      fillOpacity={0.25}
                      stroke={roomColor}
                      strokeWidth={sel ? 2.5 : 1.5}
                      rx={4}
                      cursor={isDragging ? "grabbing" : "grab"}
                      onPointerDown={(e) => startDrag(e, room.id, "move")}
                    />

                    {/* Room number badge */}
                    <circle
                      cx={room.x + 14}
                      cy={room.y + 14}
                      r={10}
                      fill="#0B3D91"
                      stroke="#fff"
                      strokeWidth={1.5}
                      pointerEvents="none"
                    />
                    <text
                      x={room.x + 14}
                      y={room.y + 15}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={10}
                      fill="white"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {roomNumber}
                    </text>

                    {/* Icon */}
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h / 2 - 6}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={room.w > 80 ? 18 : 14}
                      pointerEvents="none"
                    >
                      {room.type ? getRoomConfig(room.type).icon : "📦"}
                    </text>

                    {/* Label */}
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h / 2 + 10}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={9}
                      fill="#374151"
                      fontWeight="600"
                      pointerEvents="none"
                    >
                      {room.label}
                    </text>

                    {/* Dimensions */}
                    {sel && (
                      <text
                        x={room.x + room.w / 2}
                        y={room.y + room.h + 14}
                        textAnchor="middle"
                        fontSize={8}
                        fill="#6B7280"
                        pointerEvents="none"
                      >
                        {Math.round(room.w)}×{Math.round(room.h)}
                      </text>
                    )}

                    {/* Delete button */}
                    {sel && (
                      <g
                        cursor="pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRoom(room.id);
                        }}
                      >
                        <circle
                          cx={room.x + room.w}
                          cy={room.y}
                          r={10}
                          fill="#EF4444"
                          stroke="#fff"
                          strokeWidth={1.5}
                        />
                        <text
                          x={room.x + room.w}
                          y={room.y + 1}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={11}
                          fill="white"
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          ✕
                        </text>
                      </g>
                    )}

                    {/* Resize handles (only when selected) */}
                    {sel &&
                      (
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
                  </g>
                );
              })}

              {/* Current drawing preview */}
              {currentRect && (
                <rect
                  x={currentRect.x}
                  y={currentRect.y}
                  width={currentRect.w}
                  height={currentRect.h}
                  fill="#FF8C42"
                  fillOpacity={0.2}
                  stroke="#FF8C42"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  rx={4}
                  pointerEvents="none"
                />
              )}

              {/* Empty state */}
              {drawnRooms.length === 0 && !currentRect && (
                <text
                  x={CANVAS_W / 2}
                  y={CANVAS_H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={14}
                  fill="#9CA3AF"
                  pointerEvents="none"
                >
                  Clique e arraste para desenhar os cômodos
                </text>
              )}
            </svg>
          </div>

          {/* Room chips below canvas */}
          {drawnRooms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {drawnRooms.map((room, i) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedId(room.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selectedId === room.id
                      ? "border-navy bg-navy/10 font-semibold text-navy"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  {room.type ? getRoomConfig(room.type).icon : "📦"}{" "}
                  {room.label || `Cômodo ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {/* ── Step: Label ── */}
      {step === "label" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">🏷️ Identifique cada cômodo</h3>
              <p className="text-xs text-gray-500">
                Selecione o tipo de cada cômodo que você desenhou
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep("draw")}
              className="text-xs text-navy hover:underline"
            >
              ← Voltar ao desenho
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {drawnRooms.map((room, i) => (
              <div
                key={room.id}
                className={`rounded-lg border-2 p-4 transition-all ${
                  room.type
                    ? "border-green-300 bg-green-50"
                    : editingRoomId === room.id
                      ? "border-navy bg-navy/5"
                      : "border-orange-300 bg-orange-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Cômodo #{i + 1}</span>
                  {room.type && (
                    <span className="flex items-center gap-1 text-xs text-green-700">
                      ✅ {getRoomConfig(room.type).icon} {getRoomConfig(room.type).label}
                    </span>
                  )}
                </div>

                {editingRoomId === room.id || !room.type ? (
                  <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {ROOM_CONFIGS.map((config) => (
                      <button
                        key={config.type}
                        type="button"
                        onClick={() => setRoomType(room.id, config.type)}
                        className={`flex flex-col items-center rounded-md border px-2 py-1.5 text-[10px] transition-colors hover:bg-gray-100 ${
                          room.type === config.type
                            ? "border-navy bg-navy/10 font-semibold"
                            : "border-gray-200"
                        }`}
                      >
                        <span className="text-base">{config.icon}</span>
                        <span className="mt-0.5 leading-tight">{config.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingRoomId(room.id)}
                    className="mt-2 text-xs text-navy hover:underline"
                  >
                    Alterar tipo
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("draw")}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Voltar
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={!allLabeled}
              className="rounded-lg bg-gradient-to-r from-navy to-orange px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {allLabeled
                ? "✅ Usar esta Planta"
                : `Faltam ${drawnRooms.filter((r) => !r.type).length} cômodo(s)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
