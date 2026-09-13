"use client";

import {
  Map,
  Factory,
  AlertTriangle,
  TrendingUp,
  Pickaxe,
  Settings,
  Database,
  CheckCircle2,
  Info,
  Lightbulb,
  Target,
  Gauge,
  Globe2,
  WifiOff,
  List,
  X,
  Trash2,
  Save,
  Search,
  Sun, 
  Moon
} from "lucide-react";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

/* ============================================================
   MAP
============================================================ */

const ProspectivityMap = dynamic(
  () => import("@/components/ProspectivityMap"),
  { ssr: false }
);

/* ============================================================
   TYPES & INTERFACES
============================================================ */

type FormData = {
  targetProduction: string;
  equipmentAvailable: string;
  equipmentUtilization: string;
  downtimeHours: string;
  rainfall: string;
  temperature: string;
  soilMoisture: string;
  blastCount: string;
  blastDelay: string;
  mnGrade: string;
  oreThickness: string;
  oreDepth: string;
  mineLocation: string;
  lithology: string;
  workingHours: string;
};

type GeoFormData = {
  elevation_m: string;
  slope_deg: string;
  ndvi: string;
  lst_celsius: string;
  rainfall_annual_mm: string;
  soil_moisture: string;
  clay_iron_ratio: string;
  ferrous_iron_index: string;
  dist_to_fault_km: string;
  standardized_lithology: string;
};

type LocationResult = {
  mn_probability_percent: number;
  tier: string;
  features_used: Record<string, any>;
};

type RiskCategory = {
  category: string;
  risk_score: number;
};

type AnalysisResult = {
  prospectivity: {
    total_locations: number;
    high: number;
    medium: number;
    low: number;
    high_percentage: number;
  };
  production_prediction: {
    target_production: number;
    expected_production: number;
    shortfall: number;
    shortfall_percent: number;
  };
  production_risk: {
    risk_score: number;
    risk_level: string;
    categories: RiskCategory[];
  };
  causes: string[];
  recommendations: string[];
  recommendation_details: {
    category: string;
    priority: string;
    cause: string;
    action: string;
  };
  data_completeness: {
    overall_percentage: number;
    sources: {
      name: string;
      status: string;
      note: string;
    }[];
  };
  combined_status: string;
};

/* ============================================================
   REAL MOIL MINE MAPPINGS
============================================================ */
const MOIL_MINES = [
  { name: "Balaghat (Bharveli), MP", id: "MOIL-Mine-01", lat: 21.849243, lng: 80.227557 },
  { name: "Dongri Buzurg, MH", id: "MOIL-Mine-02", lat: 21.546509, lng: 79.685186 },
  { name: "Kandri, MH", id: "MOIL-Mine-03", lat: 21.412068, lng: 79.268805 },
  { name: "Mansar (Munsar), MH", id: "MOIL-Mine-04", lat: 21.400662, lng: 79.280513 },
  { name: "Chikla, MH", id: "MOIL-Mine-05", lat: 21.550328, lng: 79.751460 },
  { name: "Tirodi, MP", id: "MOIL-Mine-06", lat: 21.689197, lng: 79.725190 },
  { name: "Ukwa, MP", id: "MOIL-Mine-07", lat: 21.976778, lng: 80.466600 },
  { name: "Gumgaon, MH", id: "MOIL-Mine-08", lat: 21.406248, lng: 78.988211 },
  { name: "Beldongri, MH", id: "MOIL-Mine-09", lat: 21.337943, lng: 79.289608 },
  { name: "Sitapatore, MP", id: "MOIL-Mine-10", lat: 21.672801, lng: 79.668720 }
];

/* ============================================================
   HOME
============================================================ */

export default function Home() {
  /* ==========================================================
     GLOBAL STATUS STATE
  ========================================================== */
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Automatic Server Health Check
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/");
        setIsServerOnline(res.ok);
      } catch (e) {
        setIsServerOnline(false);
      }
    };
    
    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, []);

  /* ==========================================================
     MODULE 01: PROSPECTIVITY STATE
  ========================================================== */
  const [exploreMode, setExploreMode] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  
  // Checklist State
  const [showChecklist, setShowChecklist] = useState(false);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Online Mode State
  const [selectedLat, setSelectedLat] = useState<number>(MOIL_MINES[0].lat);
  const [selectedLng, setSelectedLng] = useState<number>(MOIL_MINES[0].lng);
  const [searchRadius, setSearchRadius] = useState<string>("5");
  
  // Offline Mode State
  const [offlineLocationName, setOfflineLocationName] = useState<string>(MOIL_MINES[0].name);
  const [geoForm, setGeoForm] = useState<GeoFormData>({
    elevation_m: "380",
    slope_deg: "2.5",
    ndvi: "0.35",
    lst_celsius: "33.0",
    rainfall_annual_mm: "1050",
    soil_moisture: "0.28",
    clay_iron_ratio: "2.4",
    ferrous_iron_index: "1.9",
    dist_to_fault_km: "3.5",
    standardized_lithology: "Sedimentary_Mn_Oxide",
  });

  const [locResult, setLocResult] = useState<LocationResult | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");

  // ==========================================================
  // MONGODB DATABASE INTEGRATION
  // ==========================================================

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/checklist")
      .then(res => res.json())
      .then(data => setSavedRecords(data))
      .catch(err => console.error("No DB connected", err));
  }, []);

  async function saveToChecklist() {
    if (!locResult) return;
    
    const locationDisplay = exploreMode === "ONLINE" 
      ? `${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}` 
      : (offlineLocationName.trim() || "Unnamed Offline Location");

    const newRecord = {
      id: Date.now().toString(),
      mode: exploreMode,
      location_display: locationDisplay,
      lat: selectedLat,
      lng: selectedLng,
      ml_prob: locResult.mn_probability_percent,
      ml_tier: locResult.tier,
      has_minerals: false,      
      manual_tier: "PENDING",   
    };
    
    setSavedRecords((prev) => [newRecord, ...prev]);
    
    try {
      await fetch("http://127.0.0.1:8000/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord)
      });
    } catch (err) {
      console.error("Failed to save to DB:", err);
    }
  }

  async function updateRecord(id: string, field: string, value: any) {
    setSavedRecords((prev) =>
      prev.map((record) => (record.id === id ? { ...record, [field]: value } : record))
    );
    
    try {
      await fetch(`http://127.0.0.1:8000/api/checklist/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value })
      });
    } catch (err) {
      console.error("Failed to update DB:", err);
    }
  }

  async function deleteRecord(id: string) {
    setSavedRecords((prev) => prev.filter((record) => record.id !== id));
    
    try {
      await fetch(`http://127.0.0.1:8000/api/checklist/${id}`, { 
        method: "DELETE" 
      });
    } catch (err) {
      console.error("Failed to delete from DB:", err);
    }
  }

  function updateGeoField(field: keyof GeoFormData, value: string) {
    setGeoForm((prev) => ({ ...prev, [field]: value }));
  }

  const filteredRecords = savedRecords.filter(record => 
    record.location_display.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.mode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.ml_tier.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.manual_tier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ==========================================================
     LOCATION / PROSPECTIVITY PREDICTION
  ========================================================== */

  async function analyzeLocation() {
    try {
      setLocLoading(true);
      setLocError("");
      
      const parseNum = (val: any) => 
        (val === "" || val === null || val === undefined) ? null : Number(val);

      const payload = {
        mode: exploreMode || "ONLINE", 
        latitude: exploreMode === "ONLINE" ? parseNum(selectedLat) : null,
        longitude: exploreMode === "ONLINE" ? parseNum(selectedLng) : null,
        radius_km: exploreMode === "ONLINE" ? parseNum(searchRadius) : null,
        elevation_m: parseNum(geoForm.elevation_m),
        slope_deg: parseNum(geoForm.slope_deg),
        ndvi: parseNum(geoForm.ndvi),
        lst_celsius: parseNum(geoForm.lst_celsius),
        rainfall_annual_mm: parseNum(geoForm.rainfall_annual_mm),
        soil_moisture: parseNum(geoForm.soil_moisture),
        clay_iron_ratio: parseNum(geoForm.clay_iron_ratio),
        ferrous_iron_index: parseNum(geoForm.ferrous_iron_index),
        dist_to_fault_km: parseNum(geoForm.dist_to_fault_km),
        standardized_lithology: geoForm.standardized_lithology || "Sedimentary_Mn_Oxide",
      };

      const response = await fetch("http://127.0.0.1:8000/api/predict-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Location Backend Error:", errorText);
        throw new Error("Mining intelligence analysis failed.");
      }
      const data = await response.json();
      setLocResult(data); 

    } catch (err: any) {
      console.error(err);
      setLocError(err.message || "Prediction failed. Check console for details.");
      setIsServerOnline(false); 
    } finally {
      setLocLoading(false);
    }
  }
  
  /* ==========================================================
     MODULE 02: PRODUCTION STATE
  ========================================================== */
  const [form, setForm] = useState<FormData>({
    targetProduction: "100000",
    equipmentAvailable: "20",
    equipmentUtilization: "80",
    downtimeHours: "10",
    rainfall: "25",
    temperature: "28",
    soilMoisture: "0.55",
    blastCount: "15",
    blastDelay: "4",
    mnGrade: "32",
    oreThickness: "3.5",
    oreDepth: "20",
    mineLocation: "Balaghat (Bharveli), MP", // Default to real mine name
    lithology: "Manganese-bearing",
    workingHours: "450",
  });

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof FormData, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  // Cross-module sync: Update Dropdown, Translate Name, Snap Map
  function handleMineChange(mineName: string) {
    updateField("mineLocation", mineName);
    
    const mineObj = MOIL_MINES.find((m) => m.name === mineName);
    if (mineObj) {
      setSelectedLat(mineObj.lat);
      setSelectedLng(mineObj.lng);
      setOfflineLocationName(mineObj.name);
    }
  }

  function getProductionPayload() {
    // Translate real name back to synthetic ID for the AI Backend
    const selectedMineObj = MOIL_MINES.find(m => m.name === form.mineLocation);
    const backendId = selectedMineObj ? selectedMineObj.id : "MOIL-Mine-01";

    return {
      target_production: Number(form.targetProduction),
      equipment_available: Number(form.equipmentAvailable),
      equipment_utilization: Number(form.equipmentUtilization),
      downtime_hours: Number(form.downtimeHours),
      rainfall: Number(form.rainfall),
      temperature: Number(form.temperature),
      soil_moisture: Number(form.soilMoisture),
      blast_count: Number(form.blastCount),
      blast_delay: Number(form.blastDelay),
      mn_grade: Number(form.mnGrade),
      ore_thickness: Number(form.oreThickness),
      ore_depth: Number(form.oreDepth),
      mine_location: backendId, // Sends MOIL-Mine-01/02/03 safely
      lithology: form.lithology,
      working_hours: Number(form.workingHours),
    };
  }

  async function analyzeProduction() {
    setError("");
    setResult(null);

    const hasEmptyField = Object.values(form).some((value) => typeof value === 'string' && value.trim() === "");
    if (hasEmptyField) {
      setError("Please fill in all production analysis fields.");
      return;
    }

    setLoading(true);

    try {
      const payload = getProductionPayload();
      const response = await fetch("http://127.0.0.1:8000/api/mining-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Production Backend Error:", errorText);
        throw Error("Mining intelligence analysis failed.");
      }
      const data: AnalysisResult = await response.json();

      setResult({
        ...data,
        data_completeness: {
          overall_percentage: data.data_completeness?.overall_percentage ?? 86,
          sources: data.data_completeness?.sources ?? [
            { name: "Production Target", status: "AVAILABLE", note: "Monthly production target supplied by user." },
            { name: "Equipment Data", status: "AVAILABLE", note: "Equipment count, utilization, and downtime supplied." }, 
            { name: "Weather / Environment", status: "AVAILABLE", note: "Rainfall, temperature and soil moisture supplied." },
            { name: "Blasting Data", status: "AVAILABLE", note: "Blast count and blast delay supplied." },
            { name: "Geological Data", status: "AVAILABLE", note: "Mn grade, ore thickness, depth and lithology supplied." },
            { name: "Prospectivity Data", status: "AVAILABLE", note: "Prospectivity prediction dataset available." },
            { name: "Historical Production", status: "SIMULATED", note: "Prototype currently uses simulated historical production data." },
          ],
        },
      });
    } catch (err) {
      console.error(err);
      setError("Could not connect to the backend. Make sure FastAPI is running on port 8000.");
      setIsServerOnline(false); 
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
     HELPERS
  ========================================================== */
  const riskScore = result?.production_risk?.risk_score ?? 0;
  const riskLevel = result?.production_risk?.risk_level ?? "";
  const target = result?.production_prediction?.target_production ?? 0;
  const expected = result?.production_prediction?.expected_production ?? 0;
  const shortfall = result?.production_prediction?.shortfall ?? 0;
  const shortfallPercent = result?.production_prediction?.shortfall_percent ?? 0;

  /* ==========================================================
     MAIN UI
  ========================================================== */
  return (
    <main className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-[#06111f] text-white" : "bg-slate-50 text-slate-900"}`}>
      <header className={`border-b transition-colors duration-300 ${isDarkMode ? "border-slate-800/80 bg-[#071321]" : "border-slate-200 bg-white shadow-sm"}`}>
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500 bg-slate-950">
              <Pickaxe className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">MOIL AI Mining Intelligence</h1>
              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>AI-powered geological & production planning</p>
            </div>
          </div>
          
          {/* THEME TOGGLE & SERVER STATUS INDICATOR */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isDarkMode ? "bg-slate-700" : "bg-amber-400"
              }`}
            >
              <span
                className={`flex h-4 w-4 transform items-center justify-center rounded-full bg-white transition-transform ${
                  isDarkMode ? "translate-x-6 text-slate-800" : "translate-x-1 text-amber-500"
                }`}
              >
                {isDarkMode ? <Moon className="h-2.5 w-2.5" /> : <Sun className="h-2.5 w-2.5" />}
              </span>
            </button>

            <div
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs transition-colors ${
                isServerOnline
                  ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-500 font-medium"
                  : "border-red-500/40 bg-red-500/5 text-red-500 font-medium"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isServerOnline ? "bg-emerald-400" : "animate-pulse bg-red-400"
                }`}
              />
              {isServerOnline ? "System Online" : "System Offline"}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-6 py-6">

        <div className="mb-5">
          <p className="mb-1 text-xs font-semibold tracking-wide text-emerald-500">MINING INTELLIGENCE PLATFORM</p>
          <h2 className="text-2xl font-bold">Mine Overview</h2>
          <p className={`mt-1 max-w-4xl text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Identify manganese potential, predict expected production, detect production risks and generate practical corrective actions using AI/ML, geological and environmental data.
          </p>
        </div>

        <section className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            isDarkMode={isDarkMode}
            icon={<Map className="h-6 w-6" />}
            iconClass="bg-emerald-500/15 text-emerald-500"
            title="Prospectivity"
            titleClass="text-emerald-500"
            value={result ? `${result.prospectivity.high_percentage.toFixed(1)}%` : "—"}
            description={result ? `${result.prospectivity.high.toLocaleString()} high-potential locations` : "ML prediction pending"}
          />
          <SummaryCard
            isDarkMode={isDarkMode}
            icon={<Factory className="h-6 w-6" />}
            iconClass="bg-blue-500/15 text-blue-500"
            title="Expected Production"
            titleClass="text-blue-500"
            value={result ? `${expected.toLocaleString()} t` : "—"}
            description={result ? "Expected monthly production" : "Prediction pending"}
          />
          <SummaryCard
            isDarkMode={isDarkMode}
            icon={<AlertTriangle className="h-7 w-7" />}
            iconClass="bg-amber-500/10 text-amber-500"
            title="Risk Level"
            titleClass="text-amber-500"
            value={result ? riskLevel.toUpperCase() : "—"}
            description={result ? `Score ${riskScore}/100` : "Analysis pending"}
          />
          <SummaryCard
            isDarkMode={isDarkMode}
            icon={<TrendingUp className="h-6 w-6" />}
            iconClass="bg-purple-500/15 text-purple-500"
            title="Shortfall"
            titleClass="text-purple-500"
            value={result ? `${shortfall.toLocaleString()} t` : "—"}
            description={result ? `${shortfallPercent.toFixed(1)}% below target` : "Awaiting prediction"}
          />
        </section>

        <section className="grid items-stretch gap-3 lg:grid-cols-2">

          {/* =================================================
              MODULE 01: LOCATION PREDICTION
          ================================================= */}
          <div className={`flex flex-col rounded-xl border p-4 transition-colors duration-300 ${isDarkMode ? "border-slate-800 bg-[#0b1a2c]" : "border-slate-200 bg-white shadow-sm"}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-500">MODULE 01</p>
                <h3 className="mt-1 text-lg font-semibold">Location Prospectivity Predictor</h3>
              </div>
              <button 
                onClick={() => setShowChecklist(true)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isDarkMode ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                }`}
              >
                <List className="h-4 w-4" />
                Field Checklist
              </button>
            </div>

            {/* MAP COMPONENT */}
            <div className={`h-[275px] overflow-hidden rounded-xl border ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
              <ProspectivityMap
                targetLat={selectedLat}
                targetLng={selectedLng}
                radiusKm={Number(searchRadius)}
                onLocationSelect={(lat: number, lng: number) => {
                  setSelectedLat(lat);
                  setSelectedLng(lng);
                }}
              />
            </div>

            {/* MODE TOGGLE */}
            <div className={`mt-4 flex gap-2 rounded-lg p-1 border ${isDarkMode ? "bg-[#071321] border-slate-800" : "bg-slate-100 border-slate-200"}`}>
              <button
                onClick={() => setExploreMode("ONLINE")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-[11px] font-semibold transition ${
                  exploreMode === "ONLINE" 
                    ? (isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-white text-emerald-600 shadow-sm") 
                    : (isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-200")
                }`}
              >
                <Globe2 className="h-3.5 w-3.5" /> Online Discovery
              </button>
              <button
                onClick={() => setExploreMode("OFFLINE")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-[11px] font-semibold transition ${
                  exploreMode === "OFFLINE" 
                    ? (isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-white text-blue-600 shadow-sm") 
                    : (isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-200")
                }`}
              >
                <WifiOff className="h-3.5 w-3.5" /> Offline Entry
              </button>
            </div>

          {/* DYNAMIC INPUTS BASED ON MODE */}
            <div className="mt-3 flex-1">
              {exploreMode === "ONLINE" ? (
                <div className={`rounded-lg border p-3 ${isDarkMode ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50"}`}>
                  <p className={`mb-3 text-[11px] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                    Click anywhere on the map or type coordinates manually to set your target. The system will automatically fetch satellite environmental data.
                  </p>
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div>
                      <label className={`block mb-1 text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={selectedLat}
                        onChange={(e) => setSelectedLat(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className={`h-7 w-full rounded-md px-2 py-1 text-[11px] border outline-none transition focus:border-emerald-500 ${
                          isDarkMode ? "bg-[#071321] border-slate-700 text-slate-300" : "bg-white border-slate-300 text-slate-700"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block mb-1 text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={selectedLng}
                        onChange={(e) => setSelectedLng(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className={`h-7 w-full rounded-md px-2 py-1 text-[11px] border outline-none transition focus:border-emerald-500 ${
                          isDarkMode ? "bg-[#071321] border-slate-700 text-slate-300" : "bg-white border-slate-300 text-slate-700"
                        }`}
                      />
                    </div>
                    <InputField isDarkMode={isDarkMode} label="Radius (km)" value={searchRadius} onChange={setSearchRadius} />
                  </div>
                </div>
              ) : (
                <div className={`grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg border p-3 ${isDarkMode ? "border-blue-500/20 bg-blue-500/5" : "border-blue-200 bg-blue-50"}`}>
                  <div className="col-span-3 mb-1">
                    <InputField isDarkMode={isDarkMode} label="Site / Location Name" value={offlineLocationName} onChange={setOfflineLocationName} />
                  </div>
                  <InputField isDarkMode={isDarkMode} label="Elevation (m)" value={geoForm.elevation_m} onChange={(v) => updateGeoField("elevation_m", v)} />
                  <InputField isDarkMode={isDarkMode} label="Slope (°)" value={geoForm.slope_deg} onChange={(v) => updateGeoField("slope_deg", v)} />
                  <InputField isDarkMode={isDarkMode} label="NDVI" value={geoForm.ndvi} onChange={(v) => updateGeoField("ndvi", v)} />
                  <InputField isDarkMode={isDarkMode} label="LST (°C)" value={geoForm.lst_celsius} onChange={(v) => updateGeoField("lst_celsius", v)} />
                  <InputField isDarkMode={isDarkMode} label="Rainfall (mm)" value={geoForm.rainfall_annual_mm} onChange={(v) => updateGeoField("rainfall_annual_mm", v)} />
                  <InputField isDarkMode={isDarkMode} label="Moisture" value={geoForm.soil_moisture} onChange={(v) => updateGeoField("soil_moisture", v)} />
                  <InputField isDarkMode={isDarkMode} label="Clay/Iron" value={geoForm.clay_iron_ratio} onChange={(v) => updateGeoField("clay_iron_ratio", v)} />
                  <InputField isDarkMode={isDarkMode} label="Ferrous Index" value={geoForm.ferrous_iron_index} onChange={(v) => updateGeoField("ferrous_iron_index", v)} />
                  <InputField isDarkMode={isDarkMode} label="Fault Dist (km)" value={geoForm.dist_to_fault_km} onChange={(v) => updateGeoField("dist_to_fault_km", v)} />
                  
                  <div className="col-span-3 mt-1">
                    <label className={`mb-1 block text-[10px] font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Lithology</label>
                    <select
                      value={geoForm.standardized_lithology}
                      onChange={(e) => updateGeoField("standardized_lithology", e.target.value)}
                      className={`h-7 w-full rounded-md border px-2 text-[11px] outline-none ${
                        isDarkMode ? "border-slate-700 bg-[#071321] text-white" : "border-slate-300 bg-white text-slate-900"
                      }`}
                    >
                      <option value="Sedimentary_Mn_Oxide">Sedimentary Mn Oxide</option>
                      <option value="Sedimentary_Mn_Carbonate">Sedimentary Mn Carbonate</option>
                      <option value="Metamorphic_Schist">Metamorphic Schist</option>
                      <option value="Laterite_Supergene_Cover">Laterite Cover</option>
                      <option value="Alluvium_Unconsolidated">Alluvium Unconsolidated</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {locError && <div className={`mt-3 rounded-lg p-2 text-[11px] ${isDarkMode ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"}`}>{locError}</div>}

            <button
              onClick={analyzeLocation}
              disabled={locLoading || !isServerOnline}
              className="mt-4 w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {locLoading ? "Analyzing Terrain..." : "Predict Area Potential"}
            </button>

            {/* PREDICTION RESULT CARD */}
            {locResult && (
              <div className={`mt-4 flex flex-col gap-3 rounded-xl border p-4 ${isDarkMode ? "border-emerald-500/30 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-[11px] font-bold ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>MANGANESE PROBABILITY</p>
                    <p className={`mt-1 text-3xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{locResult.mn_probability_percent}%</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Prospectivity Tier</p>
                    <p className={`text-xl font-black tracking-wide ${
                      locResult.tier === "HIGH" ? (isDarkMode ? "text-emerald-400" : "text-emerald-600") :
                      locResult.tier === "MEDIUM" ? (isDarkMode ? "text-amber-400" : "text-amber-600") : 
                      (isDarkMode ? "text-red-400" : "text-red-600")
                    }`}>
                      {locResult.tier}
                    </p>
                  </div>
                </div>
                
                {/* Save to Checklist Button */}
                <button 
                  onClick={saveToChecklist}
                  className={`flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs font-bold border transition ${
                    isDarkMode 
                      ? "bg-[#0b1a2c] text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                      : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  <Save className="h-4 w-4" /> Save to Field Checklist
                </button>
              </div>
            )}
          </div>

          {/* =================================================
              MODULE 02: PRODUCTION PREDICTION
          ================================================= */}
          <div className={`rounded-xl border p-4 transition-colors duration-300 ${isDarkMode ? "border-slate-800 bg-[#0b1a2c]" : "border-slate-200 bg-white shadow-sm"}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-500">MODULE 02</p>
                <h3 className="mt-1 text-lg font-semibold">Production Prediction</h3>
              </div>
              <Settings className="h-6 w-6 text-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-x-7 gap-y-2">
              <InputField isDarkMode={isDarkMode} label="Monthly Target (tonnes)" value={form.targetProduction} onChange={(v) => updateField("targetProduction", v)} />
              <InputField isDarkMode={isDarkMode} label="Equipment Available" value={form.equipmentAvailable} onChange={(v) => updateField("equipmentAvailable", v)} />
              <InputField isDarkMode={isDarkMode} label="Equipment Utilization (%)" value={form.equipmentUtilization} onChange={(v) => updateField("equipmentUtilization", v)} />
              <InputField isDarkMode={isDarkMode} label="Downtime (hours)" value={form.downtimeHours} onChange={(v) => updateField("downtimeHours", v)} />
              <InputField isDarkMode={isDarkMode} label="Rainfall (mm)" value={form.rainfall} onChange={(v) => updateField("rainfall", v)} />
              <InputField isDarkMode={isDarkMode} label="Temperature (°C)" value={form.temperature} onChange={(v) => updateField("temperature", v)} />
              <InputField isDarkMode={isDarkMode} label="Soil Moisture" value={form.soilMoisture} onChange={(v) => updateField("soilMoisture", v)} />
              <InputField isDarkMode={isDarkMode} label="Blast Count" value={form.blastCount} onChange={(v) => updateField("blastCount", v)} />
              <InputField isDarkMode={isDarkMode} label="Blast Delay (hours)" value={form.blastDelay} onChange={(v) => updateField("blastDelay", v)} />
              <InputField isDarkMode={isDarkMode} label="Mn Grade (%)" value={form.mnGrade} onChange={(v) => updateField("mnGrade", v)} />
              <InputField isDarkMode={isDarkMode} label="Ore Thickness (m)" value={form.oreThickness} onChange={(v) => updateField("oreThickness", v)} />
              <InputField isDarkMode={isDarkMode} label="Ore Depth (m)" value={form.oreDepth} onChange={(v) => updateField("oreDepth", v)} />
              <InputField isDarkMode={isDarkMode} label="Working Hours" value={form.workingHours} onChange={(v) => updateField("workingHours", v)} />
            </div>

            <div className="mt-3">
              <div>
                <label className={`mb-1.5 block text-[10px] font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Mine Location</label>
                <select
                  value={form.mineLocation}
                  onChange={(event) => handleMineChange(event.target.value)}
                  className={`mb-2 h-7 w-full rounded-md border px-3 text-[11px] outline-none transition focus:border-blue-500 ${
                    isDarkMode ? "border-slate-700 bg-[#071321] text-white" : "border-slate-300 bg-white text-slate-900"
                  }`}
                >
                  {MOIL_MINES.map((mine) => (
                    <option key={mine.name} value={mine.name}>
                      {mine.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`mb-1.5 block text-[10px] font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Lithology</label>
                <select
                  value={form.lithology}
                  onChange={(event) => updateField("lithology", event.target.value)}
                  className={`h-7 w-full rounded-md border px-3 text-[11px] outline-none transition focus:border-blue-500 ${
                    isDarkMode ? "border-slate-700 bg-[#071321] text-white" : "border-slate-300 bg-white text-slate-900"
                  }`}
                >
                  <option value="Manganese-bearing">Manganese-bearing</option>
                  <option value="Metamorphic">Metamorphic</option>
                  <option value="Laterite">Laterite</option>
                  <option value="Banded formation">Banded formation</option>
                </select>
              </div>
            </div>

            {error && <div className={`mt-3 rounded-lg border p-2 text-xs ${isDarkMode ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-red-200 bg-red-50 text-red-600"}`}>{error}</div>}

            <button
              onClick={analyzeProduction}
              disabled={loading || !isServerOnline}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TrendingUp className="h-5 w-5" />
              {loading ? "Analyzing..." : "Predict Production & Analyze Risk"}
            </button>
          </div>
        </section>

        {/* ===================================================
            RESULTS & ANALYSIS (MODULE 02 OUTPUT)
        =================================================== */}
        {result && (
          <section className="mt-3">
            <div className={`mb-3 border-t pt-3 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
              <p className="text-sm font-semibold text-emerald-500">RESULTS & ANALYSIS</p>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr_1.7fr_0.9fr]">
              {/* PRODUCTION RISK OVERVIEW */}
              <div className={`rounded-xl border p-4 ${isDarkMode ? "border-slate-800 bg-[#0b1a2c]" : "border-slate-200 bg-white shadow-sm"}`}>
                <h3 className="mb-3 text-sm font-semibold">Production Risk Overview</h3>
                <div className="grid grid-cols-[145px_1fr] items-center gap-3">
                  <RiskGauge score={riskScore} level={riskLevel} isDarkMode={isDarkMode} />
                  <div className="space-y-3 text-xs">
                    <MetricRow isDarkMode={isDarkMode} icon={<Target className="h-4 w-4" />} label="Target Production" value={`${target.toLocaleString()} t`} />
                    <MetricRow isDarkMode={isDarkMode} icon={<Factory className="h-4 w-4" />} label="Expected Production" value={`${expected.toLocaleString()} t`} />
                    <MetricRow isDarkMode={isDarkMode} icon={<TrendingUp className="h-4 w-4" />} label="Shortfall" value={`${shortfall.toLocaleString()} t`} danger />
                    <MetricRow isDarkMode={isDarkMode} icon={<AlertTriangle className="h-4 w-4" />} label="Shortfall %" value={`${shortfallPercent.toFixed(1)}%`} danger />
                    <MetricRow isDarkMode={isDarkMode} icon={<Gauge className="h-4 w-4" />} label="Status" value={result.combined_status} warning />
                  </div>
                </div>

                <div className={`mt-3 rounded-lg border p-3 ${isDarkMode ? "border-slate-800 bg-[#071321]" : "border-slate-200 bg-slate-50"}`}>
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-xs font-semibold">How to interpret this score</p>
                  </div>
                  <p className={`mt-2 text-[11px] leading-5 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    The risk score combines production shortfall with operational factors. Higher scores indicate greater potential for production disruption.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px]">
                    <div className="rounded bg-emerald-500/10 p-1.5 text-emerald-500"><b>0 – 39</b><br />Low Risk</div>
                    <div className="rounded bg-amber-500/10 p-1.5 text-amber-500"><b>40 – 69</b><br />Medium Risk</div>
                    <div className="rounded bg-red-500/10 p-1.5 text-red-500"><b>70 – 100</b><br />High Risk</div>
                  </div>
                </div>
              </div>

              {/* RISK CONTRIBUTORS */}
              <div className={`rounded-xl border p-4 ${isDarkMode ? "border-slate-800 bg-[#0b1a2c]" : "border-slate-200 bg-white shadow-sm"}`}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Risk Contributors</h3>
                  <span className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Points</span>
                </div>
                <div className="space-y-3">
                  {result.production_risk.categories.map((category) => {
                    const maxRisk = 35;
                    const percentage = Math.min((category.risk_score / maxRisk) * 100, 100);
                    const isProduction = category.category.toLowerCase().includes("production");
                    const isEquipment = category.category.toLowerCase().includes("equipment");
                    const barClass = isProduction ? "bg-red-500" : isEquipment ? "bg-orange-400" : "bg-yellow-400";

                    return (
                      <div key={category.category}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className={`text-[11px] ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{category.category}</span>
                          <span className="text-xs font-bold">{category.risk_score}</span>
                        </div>
                        <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                          <div className={`h-full rounded-full transition-all duration-700 ${barClass}`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className={`mt-4 flex items-center justify-between border-t pt-3 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                  <span className="text-xs font-medium">Total Risk Score</span>
                  <span className="text-lg font-bold text-blue-500">{riskScore} / 100</span>
                </div>
                <div className={`mt-3 rounded-lg p-3 ${isDarkMode ? "bg-[#071321]" : "bg-slate-50"}`}>
                  <p className={`text-[10px] leading-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Risk points indicate how strongly each factor contributes to overall production risk. Higher points indicate greater potential impact.</p>
                </div>
              </div>

              {/* CAUSES + ACTIONS */}
              <div className={`rounded-xl border p-4 ${isDarkMode ? "border-slate-800 bg-[#0b1a2c]" : "border-slate-200 bg-white shadow-sm"}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <h3 className="text-sm font-semibold text-red-500">Main Causes</h3>
                    </div>
                    <div className="space-y-2">
                      {result.causes.map((cause, index) => (
                        <div key={index} className={`flex gap-2 rounded-lg p-2.5 ${isDarkMode ? "bg-[#071321]" : "bg-slate-50"}`}>
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                          <span className={`text-[11px] leading-4 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{cause}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={`border-l pl-4 ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                    <div className="mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <h3 className="text-sm font-semibold text-emerald-500">Corrective Actions</h3>
                    </div>
                    <div className="space-y-2">
                      {result.recommendations.map((recommendation, index) => (
                        <div key={index} className={`flex gap-2 rounded-lg p-2.5 ${isDarkMode ? "bg-[#071321]" : "bg-slate-50"}`}>
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <span className={`text-[11px] leading-4 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{recommendation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-amber-500/50 bg-amber-500/5 p-3">
                  <p className="text-[10px] font-semibold text-amber-500">Priority Focus:</p>
                  <p className="mt-1 text-xs font-medium">{getPriorityFocus(result)}</p>
                </div>
              </div>

              {/* DATA COMPLETENESS */}
              <div className={`rounded-xl border p-4 ${isDarkMode ? "border-slate-800 bg-[#0b1a2c]" : "border-slate-200 bg-white shadow-sm"}`}>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  <h3 className="text-sm font-semibold">Data Completeness</h3>
                </div>
                <p className="mt-3 text-3xl font-bold text-emerald-500">{result.data_completeness.overall_percentage}%</p>
                <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Input data completeness</p>
                <div className={`mt-3 h-2 overflow-hidden rounded-full ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`}>
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${result.data_completeness.overall_percentage}%` }} />
                </div>
                <div className="mt-4 space-y-2">
                  {result.data_completeness.sources.slice(0, 7).map((source) => (
                    <div key={source.name} className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{source.name}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${source.status === "SIMULATED" ? "bg-amber-500/20 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}>
                        {source.status}
                      </span>
                    </div>
                  ))}
                </div>
                <p className={`mt-4 border-t pt-3 text-[10px] leading-4 ${isDarkMode ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                  Note: Historical production data is simulated in this prototype and will be replaced with real MOIL data.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* AI MINING DECISION */}
        {result && (
          <section className={`mt-3 rounded-xl border p-4 ${isDarkMode ? "border-slate-800 bg-[#0b1a2c]" : "border-slate-200 bg-white shadow-sm"}`}>
            <div className="grid items-center gap-5 lg:grid-cols-[250px_1.6fr_1fr_1fr_1fr]">
              <div className="flex items-center gap-4">
                <Lightbulb className="h-9 w-9 text-yellow-500" />
                <div>
                  <h3 className="text-lg font-bold text-yellow-500">AI Mining Decision</h3>
                  <div className="mt-2 inline-flex rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-500">
                    {riskLevel.toUpperCase()} PRODUCTION RISK
                  </div>
                </div>
              </div>
              <div className={`border-l pl-5 ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                  Expected production is <span className="font-bold text-amber-500">{expected.toLocaleString()} t</span>, approximately <span className="font-bold text-amber-500">{shortfallPercent.toFixed(1)}%</span> below the target of <span className="font-bold">{target.toLocaleString()} t</span>.
                </p>
              </div>
              <DecisionItem isDarkMode={isDarkMode} title="Primary Concern" text={getPrimaryConcern(result)} />
              <DecisionItem isDarkMode={isDarkMode} title="Recommended Priority" text={getRecommendedPriority(result)} />
              <DecisionItem isDarkMode={isDarkMode} title="Expected Impact" text="Timely actions can reduce risk and improve production towards target." />
            </div>
          </section>
        )}

      </div>

      {/* ===================================================
          FIELD CHECKLIST MODAL (TABLE)
      =================================================== */}
      {showChecklist && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
          <div className={`flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl border shadow-2xl ${
            isDarkMode ? "border-slate-700 bg-[#0b1a2c]" : "border-slate-200 bg-white"
          }`}>
            
            {/* Modal Header & Search */}
            <div className={`flex items-center justify-between border-b p-5 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
              <div>
                <h2 className="text-lg font-bold text-emerald-500">Field Verification Checklist</h2>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Verify ML predictions against actual on-ground mineral discoveries.</p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search locations or tiers..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-64 rounded-lg border py-2 pl-9 pr-4 text-xs outline-none focus:border-emerald-500 ${
                      isDarkMode ? "bg-[#071321] border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <button onClick={() => setShowChecklist(false)} className={`rounded-md p-2 transition ${
                  isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto p-5">
              {savedRecords.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                  No records saved. Predict an area and click "Save to Field Checklist".
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className={`text-[10px] uppercase ${isDarkMode ? "bg-[#071321] text-slate-400" : "bg-slate-100 text-slate-600"}`}>
                    <tr>
                      <th className="rounded-tl-lg p-3">Mode</th>
                      <th className="p-3">Location / Site Name</th>
                      <th className="p-3">ML Prob</th>
                      <th className="p-3">ML Tier</th>
                      <th className="bg-emerald-500/10 p-3 text-emerald-600">Minerals Found?</th>
                      <th className="bg-emerald-500/10 p-3 text-emerald-600">Actual Tier</th>
                      <th className="rounded-tr-lg p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-slate-800 text-slate-300" : "divide-slate-200 text-slate-700"}`}>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className={`transition-colors ${isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}`}>
                        <td className="p-3 font-semibold">{record.mode}</td>
                        <td className="p-3">{record.location_display}</td>
                        <td className="p-3">{record.ml_prob}%</td>
                        <td className={`p-3 font-bold ${
                          record.ml_tier === "HIGH" ? "text-emerald-500" : record.ml_tier === "MEDIUM" ? "text-amber-500" : "text-red-500"
                        }`}>
                          {record.ml_tier}
                        </td>
                        
                        {/* Interactive: Minerals Found Checkbox */}
                        <td className="bg-emerald-500/5 p-3">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={record.has_minerals}
                              onChange={(e) => updateRecord(record.id, "has_minerals", e.target.checked)}
                              className={`h-4 w-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 ${isDarkMode ? "bg-[#071321]" : "bg-white"}`}
                            />
                            {record.has_minerals ? <span className="text-emerald-500 font-medium">Yes</span> : "No"}
                          </label>
                        </td>

                        {/* Interactive: Manual Tier Dropdown */}
                        <td className="bg-emerald-500/5 p-3">
                          <select 
                            value={record.manual_tier}
                            onChange={(e) => updateRecord(record.id, "manual_tier", e.target.value)}
                            className={`rounded-md border p-1.5 text-xs outline-none focus:border-emerald-500 ${
                              isDarkMode ? "bg-[#071321] border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                            }`}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                            <option value="NONE">None</option>
                          </select>
                        </td>

                        {/* Delete Action */}
                        <td className="p-3 text-center">
                          <button onClick={() => deleteRecord(record.id)} className="text-slate-400 hover:text-red-500 transition">
                            <Trash2 className="h-4 w-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </div>
      )}

    </main>
  );
}

/* ============================================================
   UI COMPONENTS
============================================================ */

function SummaryCard({ isDarkMode, icon, iconClass, title, titleClass, value, description }: any) {
  return (
    <div className={`rounded-xl border p-4 transition-colors duration-300 ${isDarkMode ? "border-slate-800 bg-[#0b1a2c]" : "border-slate-200 bg-white shadow-sm"}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconClass}`}>{icon}</div>
        <div>
          <p className={`text-sm font-semibold ${titleClass}`}>{title}</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
          <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{description}</p>
        </div>
      </div>
    </div>
  );
}

function InputField({ isDarkMode, label, value, onChange }: { isDarkMode: boolean; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={`mb-1 block text-[10px] font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-7 w-full rounded-md border px-2 text-[11px] outline-none transition focus:border-blue-500 ${
          isDarkMode ? "border-slate-700 bg-[#071321] text-white" : "border-slate-300 bg-white text-slate-900"
        }`}
      />
    </div>
  );
}

function MetricRow({ isDarkMode, icon, label, value, danger, warning }: any) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className={`flex items-center gap-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
        <span className={danger ? "text-red-500" : warning ? "text-amber-500" : (isDarkMode ? "text-slate-400" : "text-slate-500")}>{icon}</span>
        <span>{label}</span>
      </div>
      <span className={`text-right font-semibold ${danger ? "text-red-500" : warning ? "text-amber-500" : (isDarkMode ? "text-white" : "text-slate-900")}`}>{value}</span>
    </div>
  );
}

function RiskGauge({ score, level, isDarkMode }: { score: number; level: string, isDarkMode: boolean }) {
  const safeScore = Math.max(0, Math.min(score, 100));
  const levelUpper = level.toUpperCase();
  const levelClass = safeScore >= 70 ? "text-red-500" : safeScore >= 40 ? "text-amber-500" : "text-emerald-500";
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex h-[135px] w-[135px] items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${safeScore >= 70 ? "#ef4444" : safeScore >= 40 ? "#f59e0b" : "#22c55e"} ${safeScore * 3.6}deg, ${isDarkMode ? "#1e293b" : "#e2e8f0"} ${safeScore * 3.6}deg)`,
        }}
      >
        <div className={`absolute inset-[11px] flex flex-col items-center justify-center rounded-full transition-colors ${isDarkMode ? "bg-[#0b1a2c]" : "bg-white"}`}>
          <span className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{safeScore}</span>
          <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>/100</span>
        </div>
      </div>
      <p className={`mt-2 text-sm font-bold ${levelClass}`}>{levelUpper} RISK</p>
    </div>
  );
}

function DecisionItem({ isDarkMode, title, text }: { isDarkMode: boolean; title: string; text: string }) {
  return (
    <div className={`border-l pl-4 ${isDarkMode ? "border-slate-700" : "border-slate-300"}`}>
      <p className="text-xs font-bold text-amber-500">{title}</p>
      <p className={`mt-2 text-[11px] leading-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{text}</p>
    </div>
  );
}

function getPriorityFocus(result: AnalysisResult) {
  const categories = result.production_risk.categories;
  if (!categories.length) return "Production monitoring";
  return [...categories].sort((a, b) => b.risk_score - a.risk_score)[0].category;
}

function getPrimaryConcern(result: AnalysisResult) {
  const categories = result.production_risk.categories;
  if (!categories.length) return "Production performance";
  return [...categories].sort((a, b) => b.risk_score - a.risk_score)[0].category;
}

function getRecommendedPriority(result: AnalysisResult) {
  if (result.recommendations && result.recommendations.length > 0) return result.recommendations[0];
  return "Review production plan and operational performance.";
}