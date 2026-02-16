/**
 * FloorPlanFromPhoto — Upload de foto de planta baixa com detecção de cômodos.
 *
 * Fluxo:
 * 1. Usuário envia foto/imagem da planta baixa
 * 2. A imagem é exibida como fundo no canvas
 * 3. O usuário desenha retângulos sobre a imagem para marcar os cômodos
 * 4. Para cada retângulo desenhado, seleciona o tipo de cômodo
 * 5. O resultado final são RoomSelections + layout posicional
 */
"use client";

import { useState, useRef, useCallback } from "react";
import type { RoomType } from "@/types/database";
import { ROOM_CONFIGS, getRoomConfig, type RoomSelection } from "@/services/rooms";
import type { InteractiveRoom } from "@/components/FloorPlanInteractive";

interface FloorPlanFromPhotoProps {
  onComplete: (rooms: RoomSelection[], layout: InteractiveRoom[], imageUrl: string) => void;
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

const CANVAS_W = 800;
const CANVAS_H = 600;

export default function FloorPlanFromPhoto({ onComplete, onCancel }: FloorPlanFromPhotoProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [drawnRooms, setDrawnRooms] = useState<DrawnRoom[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "draw" | "label">("upload");
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Upload da imagem */
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor, envie uma imagem (JPG, PNG, etc.)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setStep("draw");
    };
    reader.readAsDataURL(file);
  }

  /** Coordenadas SVG */
  const screenToSVG = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  /** Inicia desenho de retângulo */
  function handlePointerDown(e: React.PointerEvent) {
    if (step !== "draw") return;
    const pt = screenToSVG(e.clientX, e.clientY);
    setIsDrawing(true);
    setDrawStart(pt);
    setCurrentRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
  }

  /** Move retângulo durante desenho */
  function handlePointerMove(e: React.PointerEvent) {
    if (!isDrawing || !drawStart) return;
    const pt = screenToSVG(e.clientX, e.clientY);
    const x = Math.min(drawStart.x, pt.x);
    const y = Math.min(drawStart.y, pt.y);
    const w = Math.abs(pt.x - drawStart.x);
    const h = Math.abs(pt.y - drawStart.y);
    setCurrentRect({ x, y, w, h });
  }

  /** Finaliza retângulo */
  function handlePointerUp() {
    if (!isDrawing || !currentRect) {
      setIsDrawing(false);
      return;
    }

    // Apenas aceita retângulos com tamanho mínimo
    if (currentRect.w > 20 && currentRect.h > 20) {
      const newRoom: DrawnRoom = {
        id: `drawn-${Date.now()}`,
        x: currentRect.x,
        y: currentRect.y,
        w: currentRect.w,
        h: currentRect.h,
        type: null,
        label: `Cômodo ${drawnRooms.length + 1}`,
      };
      setDrawnRooms((prev) => [...prev, newRoom]);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentRect(null);
  }

  /** Remove um cômodo desenhado */
  function removeRoom(id: string) {
    setDrawnRooms((prev) => prev.filter((r) => r.id !== id));
    if (editingRoomId === id) setEditingRoomId(null);
  }

  /** Define tipo do cômodo */
  function setRoomType(id: string, type: RoomType) {
    const config = getRoomConfig(type);
    setDrawnRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, type, label: config.label } : r)),
    );
    setEditingRoomId(null);
  }

  /** Verifica se todos cômodos foram rotulados */
  const allLabeled = drawnRooms.length > 0 && drawnRooms.every((r) => r.type !== null);

  /** Finaliza e converte para RoomSelections */
  function handleComplete() {
    if (!imageUrl) return;

    // Agrupar por tipo para RoomSelection
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

    // Converter para InteractiveRoom layout
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

    onComplete(selections, layout, imageUrl);
  }

  return (
    <div className="space-y-4">
      {/* Step: Upload */}
      {step === "upload" && (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10">
          <span className="text-5xl">📷</span>
          <h3 className="mt-3 text-lg font-semibold text-gray-700">
            Envie uma foto da planta baixa
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Você poderá desenhar e identificar os cômodos sobre a imagem
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-600"
            >
              📁 Selecionar Imagem
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Step: Draw rooms on image */}
      {step === "draw" && imageUrl && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">
                Desenhe os cômodos sobre a planta
              </h3>
              <p className="text-xs text-gray-500">
                Clique e arraste para criar retângulos sobre cada cômodo.
                {drawnRooms.length > 0 &&
                  ` (${drawnRooms.length} desenhado${drawnRooms.length !== 1 ? "s" : ""})`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDrawnRooms([])}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                disabled={drawnRooms.length === 0}
              >
                🗑️ Limpar tudo
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
              style={{ minHeight: 400, cursor: "crosshair" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Background image */}
              <image
                href={imageUrl}
                x={0}
                y={0}
                width={CANVAS_W}
                height={CANVAS_H}
                preserveAspectRatio="xMidYMid meet"
                opacity={0.8}
              />

              {/* Drawn rooms */}
              {drawnRooms.map((room, i) => (
                <g key={room.id}>
                  <rect
                    x={room.x}
                    y={room.y}
                    width={room.w}
                    height={room.h}
                    fill={room.type ? getRoomConfig(room.type).color : "#FF8C42"}
                    fillOpacity={0.3}
                    stroke={room.type ? getRoomConfig(room.type).color : "#FF8C42"}
                    strokeWidth={2}
                    rx={3}
                  />
                  {/* Room number badge */}
                  <circle
                    cx={room.x + 14}
                    cy={room.y + 14}
                    r={10}
                    fill="#0B3D91"
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                  <text
                    x={room.x + 14}
                    y={room.y + 15}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10}
                    fill="white"
                    fontWeight="bold"
                  >
                    {i + 1}
                  </text>
                  <text
                    x={room.x + room.w / 2}
                    y={room.y + room.h / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fill="#333"
                    fontWeight="600"
                  >
                    {room.type ? getRoomConfig(room.type).icon + " " : ""}
                    {room.label || `#${i + 1}`}
                  </text>
                  {/* Delete button */}
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRoom(room.id);
                    }}
                    cursor="pointer"
                  >
                    <circle
                      cx={room.x + room.w - 8}
                      cy={room.y + 8}
                      r={8}
                      fill="#EF4444"
                      opacity={0.8}
                    />
                    <text
                      x={room.x + room.w - 8}
                      y={room.y + 9}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={10}
                      fill="white"
                      fontWeight="bold"
                    >
                      ✕
                    </text>
                  </g>
                </g>
              ))}

              {/* Current drawing rect */}
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
                  rx={3}
                />
              )}
            </svg>
          </div>
        </>
      )}

      {/* Step: Label rooms */}
      {step === "label" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Identifique cada cômodo</h3>
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
