/**
 * RoomSelector — Componente premium para selecionar cômodos e quantidades.
 */
"use client";

import { useState, useCallback } from "react";
import type { RoomType } from "@/types/database";
import { ROOM_CONFIGS, type RoomSelection } from "@/services/rooms";
import { Search, Minus, Plus, X } from "lucide-react";

interface RoomSelectorProps {
  value: RoomSelection[];
  onChange: (rooms: RoomSelection[]) => void;
}

export default function RoomSelector({ value, onChange }: RoomSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const getQuantity = useCallback(
    (type: RoomType): number => {
      const found = value.find((r) => r.type === type);
      return found?.quantity ?? 0;
    },
    [value],
  );

  function updateRoom(type: RoomType, quantity: number) {
    if (quantity <= 0) {
      onChange(value.filter((r) => r.type !== type));
    } else {
      const existing = value.find((r) => r.type === type);
      if (existing) {
        onChange(value.map((r) => (r.type === type ? { ...r, quantity } : r)));
      } else {
        onChange([...value, { type, quantity }]);
      }
    }
  }

  const filteredConfigs = ROOM_CONFIGS.filter((config) =>
    config.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalRooms = value.reduce((acc, r) => acc + r.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Cômodos do Projeto</h3>
          <p className="text-xs text-gray-500">Selecione os cômodos e suas quantidades</p>
        </div>
        {totalRooms > 0 && (
          <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-bold text-navy">
            {totalRooms} cômodo{totalRooms !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar cômodo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Grid de cômodos */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {filteredConfigs.map((config) => {
          const qty = getQuantity(config.type);
          const isActive = qty > 0;

          return (
            <div
              key={config.type}
              className={`relative flex flex-col items-center rounded-2xl border-2 p-3 transition-all duration-200 ${
                isActive
                  ? "border-navy bg-navy/5 shadow-soft"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <span className="text-2xl">{config.icon}</span>
              <span
                className={`mt-1 text-xs font-medium ${isActive ? "text-navy" : "text-gray-600"}`}
              >
                {config.label}
              </span>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateRoom(config.type, qty - 1)}
                  disabled={qty === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Remover ${config.label}`}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span
                  className={`min-w-[24px] text-center text-sm font-bold ${isActive ? "text-navy" : "text-gray-400"}`}
                >
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => updateRoom(config.type, qty + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-navy/30 bg-navy/5 text-navy transition-colors hover:bg-navy/10"
                  aria-label={`Adicionar ${config.label}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {isActive && (
                <div
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: config.color }}
                >
                  {qty}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected summary */}
      {value.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-surface-100 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Resumo dos Cômodos
          </h4>
          <div className="flex flex-wrap gap-2">
            {value.map((room) => {
              const config = ROOM_CONFIGS.find((c) => c.type === room.type);
              if (!config) return null;
              return (
                <span
                  key={room.type}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: config.color }}
                >
                  {config.icon} {config.label} × {room.quantity}
                  <button
                    type="button"
                    onClick={() => updateRoom(room.type, 0)}
                    className="ml-1 rounded-full p-0.5 hover:bg-white/20"
                    aria-label={`Remover ${config.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
