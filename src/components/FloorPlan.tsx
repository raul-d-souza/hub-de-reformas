/**
 * FloorPlan — Gerador de planta baixa simplificada em SVG.
 * Recebe uma lista de cômodos selecionados e gera um layout automático.
 * Sem escala real — apenas representação visual esquemática.
 */
"use client";

import { useMemo } from "react";
import type { RoomType } from "@/types/database";
import { ROOM_CONFIGS, getRoomConfig, type RoomSelection } from "@/services/rooms";

interface FloorPlanProps {
  rooms: RoomSelection[];
  width?: number;
  height?: number;
}

/* ─── Tipos internos do layout ─── */
interface RoomRect {
  x: number;
  y: number;
  w: number;
  h: number;
  type: RoomType;
  label: string;
  icon: string;
  color: string;
  index: number; // para diferenciar múltiplos do mesmo tipo
}

/**
 * Expande seleções de cômodos em retângulos individuais.
 * Ex: { type: "quarto", quantity: 2 } → 2 entradas separadas.
 */
function expandRooms(
  rooms: RoomSelection[],
): { type: RoomType; label: string; icon: string; color: string; area: number }[] {
  const expanded: { type: RoomType; label: string; icon: string; color: string; area: number }[] =
    [];

  for (const room of rooms) {
    const config = getRoomConfig(room.type);
    for (let i = 0; i < room.quantity; i++) {
      const suffix = room.quantity > 1 ? ` ${i + 1}` : "";
      expanded.push({
        type: room.type,
        label: `${config.label}${suffix}`,
        icon: config.icon,
        color: config.color,
        area: config.defaultArea,
      });
    }
  }

  // Ordena por área (maiores primeiro para melhor layout)
  expanded.sort((a, b) => b.area - a.area);
  return expanded;
}

/**
 * Algoritmo de layout: posiciona os cômodos em uma grade adaptativa.
 * Usa um approach de "bin-packing" simplificado com linhas.
 */
function layoutRooms(rooms: RoomSelection[], canvasW: number, canvasH: number): RoomRect[] {
  const expanded = expandRooms(rooms);
  if (expanded.length === 0) return [];

  const totalArea = expanded.reduce((acc, r) => acc + r.area, 0);
  const padding = 4;
  const usableW = canvasW - padding * 2;
  const usableH = canvasH - padding * 2;

  // Escala: cada m² corresponde a X pixels²
  const scaleFactor = Math.sqrt((usableW * usableH) / totalArea) * 0.85;

  const rects: RoomRect[] = [];
  let cursorX = padding;
  let cursorY = padding;
  let rowHeight = 0;
  let index = 0;

  for (const room of expanded) {
    // Calcula dimensões proporcionais à área
    const sqrtArea = Math.sqrt(room.area);
    let w = Math.round(sqrtArea * scaleFactor * (1 + Math.random() * 0.15));
    let h = Math.round((room.area * scaleFactor * scaleFactor) / w);

    // Limites mínimos/máximos
    w = Math.max(60, Math.min(w, usableW));
    h = Math.max(40, Math.min(h, usableH / 2));

    // Nova linha se não cabe
    if (cursorX + w > canvasW - padding) {
      cursorX = padding;
      cursorY += rowHeight + 3;
      rowHeight = 0;
    }

    // Se ultrapassa verticalmente, comprime
    if (cursorY + h > canvasH - padding) {
      h = Math.max(36, canvasH - padding - cursorY);
    }

    rects.push({
      x: cursorX,
      y: cursorY,
      w,
      h,
      type: room.type,
      label: room.label,
      icon: room.icon,
      color: room.color,
      index: index++,
    });

    cursorX += w + 3;
    rowHeight = Math.max(rowHeight, h);
  }

  return rects;
}

/**
 * Renderiza um cômodo no SVG com paredes, label e ícone.
 */
function RoomRectSVG({ room }: { room: RoomRect }) {
  const fontSize = Math.min(11, Math.max(8, room.w / 10));
  const iconSize = Math.min(16, Math.max(12, room.w / 6));

  return (
    <g>
      {/* Fundo */}
      <rect
        x={room.x}
        y={room.y}
        width={room.w}
        height={room.h}
        fill={room.color}
        fillOpacity={0.15}
        stroke={room.color}
        strokeWidth={2}
        rx={3}
      />

      {/* Hachurado sutil para dar textura */}
      <rect
        x={room.x + 2}
        y={room.y + 2}
        width={room.w - 4}
        height={room.h - 4}
        fill="none"
        stroke={room.color}
        strokeWidth={0.5}
        strokeOpacity={0.2}
        strokeDasharray="4 4"
        rx={2}
      />

      {/* "Porta" (indicador de abertura) — linha tracejada no topo */}
      {room.h > 40 && (
        <line
          x1={room.x + room.w * 0.3}
          y1={room.y}
          x2={room.x + room.w * 0.6}
          y2={room.y}
          stroke={room.color}
          strokeWidth={3}
          strokeOpacity={0.5}
          strokeDasharray="2 2"
        />
      )}

      {/* Ícone */}
      <text
        x={room.x + room.w / 2}
        y={room.y + room.h / 2 - fontSize * 0.4}
        textAnchor="middle"
        fontSize={iconSize}
        dominantBaseline="central"
      >
        {room.icon}
      </text>

      {/* Label */}
      <text
        x={room.x + room.w / 2}
        y={room.y + room.h / 2 + iconSize * 0.7}
        textAnchor="middle"
        fontSize={fontSize}
        fill="#333"
        fontWeight="600"
        dominantBaseline="central"
      >
        {room.label.length > room.w / 7
          ? room.label.slice(0, Math.floor(room.w / 7)) + "…"
          : room.label}
      </text>
    </g>
  );
}

export default function FloorPlan({ rooms, width = 600, height = 400 }: FloorPlanProps) {
  const rects = useMemo(() => layoutRooms(rooms, width, height), [rooms, width, height]);

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8">
        <span className="text-4xl">🏠</span>
        <p className="mt-2 text-sm text-gray-500">Selecione os cômodos para gerar a planta baixa</p>
      </div>
    );
  }

  // Calcular bounding box real para viewBox
  const maxX = Math.max(...rects.map((r) => r.x + r.w)) + 4;
  const maxY = Math.max(...rects.map((r) => r.y + r.h)) + 4;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">📐</span>
        <h3 className="text-sm font-semibold text-gray-700">Planta Baixa Simplificada</h3>
        <span className="text-[10px] text-gray-400">(sem escala)</span>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-2 shadow-sm">
        <svg
          viewBox={`0 0 ${Math.max(maxX, 200)} ${Math.max(maxY, 150)}`}
          width="100%"
          height="auto"
          className="max-h-[400px]"
          style={{ aspectRatio: `${maxX} / ${maxY}` }}
        >
          {/* Background grid pattern */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={Math.max(maxX, 200)} height={Math.max(maxY, 150)} fill="url(#grid)" />

          {/* Contorno externo da planta */}
          <rect
            x={2}
            y={2}
            width={maxX - 4}
            height={maxY - 4}
            fill="none"
            stroke="#0B3D91"
            strokeWidth={2.5}
            rx={4}
            strokeOpacity={0.3}
          />

          {/* Cômodos */}
          {rects.map((rect, i) => (
            <RoomRectSVG key={`${rect.type}-${i}`} room={rect} />
          ))}
        </svg>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2">
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
