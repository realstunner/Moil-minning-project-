"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  LayersControl,
  Circle,
  useMapEvents,
} from "react-leaflet";
// Leaflet ships its stylesheet without TypeScript declarations.
import "leaflet/dist/leaflet.css";

/* ============================================================
   TYPES & INTERFACES
============================================================ */

type Prediction = {
  latitude: number;
  longitude: number;
  mn_probability: number;
  prospectivity: "HIGH" | "MEDIUM" | "LOW";
};

type Filter = "ALL" | "HIGH" | "MEDIUM" | "LOW";

interface ProspectivityMapProps {
  targetLat?: number;
  targetLng?: number;
  radiusKm?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
}

/* ============================================================
   MAP CLICK LISTENER
============================================================ */

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)));
      }
    },
  });
  return null;
}

/* ============================================================
   PROSPECTIVITY MAP COMPONENT
============================================================ */

export default function ProspectivityMap({
  targetLat,
  targetLng,
  radiusKm = 10,
  onLocationSelect,
}: ProspectivityMapProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/prospectivity")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load prospectivity data");
        }
        return response.json();
      })
      .then((data) => {
        setPredictions(data.locations || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Prospectivity error:", err);
        setError("Unable to load prospectivity data.");
        setLoading(false);
      });
  }, []);

  /* Counts */
  const highCount = predictions.filter((p) => p.prospectivity === "HIGH").length;
  const mediumCount = predictions.filter((p) => p.prospectivity === "MEDIUM").length;
  const lowCount = predictions.filter((p) => p.prospectivity === "LOW").length;

  /* Filter */
  const filteredPredictions =
    filter === "ALL"
      ? predictions
      : predictions.filter((p) => p.prospectivity === filter);

  /* Colors */
  function getColor(prospectivity: Prediction["prospectivity"]) {
    switch (prospectivity) {
      case "HIGH":
        return "#22c55e";
      case "MEDIUM":
        return "#eab308";
      case "LOW":
        return "#ef4444";
      default:
        return "#94a3b8";
    }
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950">
        <p className="text-xs text-slate-400">Loading geological prospectivity data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950">
        <p className="text-xs text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* MAP CONTAINER */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <MapContainer 
         key="prospectivity-map"
         id="prospectivity-map"
         center={[21.5, 79.5]} 
         zoom={7} 
         className="h-full w-full"
        >
          <LayersControl position="topright">
            {/* BASE LAYER 1: Geological Satellite Imagery (Esri World Imagery) */}
            <LayersControl.BaseLayer checked name="Satellite (Geological)">
              <TileLayer
                attribution="&copy; Esri, Maxar, Earthstar Geographics"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>

            {/* BASE LAYER 2: Standard Road/Topographical Map */}
            <LayersControl.BaseLayer name="Street / Topography">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Click Handler for Location Selection */}
          <MapClickHandler onLocationSelect={onLocationSelect} />

          {/* Historical & AI Prospectivity Grid Markers */}
          {filteredPredictions.map((point, index) => {
            const color = getColor(point.prospectivity);
            return (
              <CircleMarker
                key={`${point.latitude}-${point.longitude}-${index}`}
                center={[point.latitude, point.longitude]}
                radius={5}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.65,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong className="text-slate-900">
                      Prospectivity: {point.prospectivity}
                    </strong>
                    <br />
                    Mn Probability: {(point.mn_probability * 100).toFixed(1)}%
                    <br />
                    Lat: {point.latitude.toFixed(4)}
                    <br />
                    Lon: {point.longitude.toFixed(4)}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Selected Target Point & Exploration Radius */}
          {targetLat !== undefined && targetLng !== undefined && (
            <>
              {/* Dynamic Exploration Buffer Radius */}
              <Circle
                center={[targetLat, targetLng]}
                radius={radiusKm * 1000} // Convert km to meters
                pathOptions={{
                  color: "#38bdf8",
                  fillColor: "#0284c7",
                  fillOpacity: 0.18,
                  weight: 2,
                  dashArray: "6, 6",
                }}
              />

              {/* Target Location Center Pin */}
              <CircleMarker
                center={[targetLat, targetLng]}
                radius={8}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: "#0284c7",
                  fillOpacity: 1.0,
                  weight: 2.5,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong className="text-blue-600">Selected Exploration Target</strong>
                    <br />
                    Lat: {targetLat.toFixed(5)}
                    <br />
                    Lon: {targetLng.toFixed(5)}
                    <br />
                    Radius: {radiusKm} km
                  </div>
                </Popup>
              </CircleMarker>
            </>
          )}
        </MapContainer>

        {/* Floating Instruction Badge */}
        <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-md bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300 backdrop-blur-sm">
          Click map to set exploration center &bull; Toggle layer icon in top-right
        </div>
      </div>

      {/* FILTER BUTTONS */}
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <FilterButton
          label={`All (${predictions.length.toLocaleString()})`}
          active={filter === "ALL"}
          onClick={() => setFilter("ALL")}
          color="slate"
        />
        <FilterButton
          label={`High (${highCount.toLocaleString()})`}
          active={filter === "HIGH"}
          onClick={() => setFilter("HIGH")}
          color="green"
        />
        <FilterButton
          label={`Med (${mediumCount.toLocaleString()})`}
          active={filter === "MEDIUM"}
          onClick={() => setFilter("MEDIUM")}
          color="yellow"
        />
        <FilterButton
          label={`Low (${lowCount.toLocaleString()})`}
          active={filter === "LOW"}
          onClick={() => setFilter("LOW")}
          color="red"
        />
      </div>
    </div>
  );
}

/* ============================================================
   FILTER BUTTON COMPONENT
============================================================ */

function FilterButton({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: "green" | "yellow" | "red" | "slate";
}) {
  const colorClasses = {
    green: "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10",
    yellow: "border-amber-500/50 text-amber-400 hover:bg-amber-500/10",
    red: "border-red-500/50 text-red-400 hover:bg-red-500/10",
    slate: "border-slate-600 text-slate-300 hover:bg-slate-800",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer rounded-md border px-2 py-1.5 text-[10px] font-semibold transition-all duration-200 ${
        active ? "bg-slate-800 ring-1 ring-slate-500" : "bg-slate-950/60"
      } ${colorClasses[color]}`}
    >
      {label}
    </button>
  );
}