"use client";

import React, { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, CloudLightning, Wind } from "lucide-react";

interface WeatherData {
  temp: string;
  condition: string;
  icon: React.ReactNode;
}

export default function LiveTimerDisplay() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch("https://wttr.in/Indore?format=j1");
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        const current = data.current_condition[0];
        const temp = current.temp_C;
        const condition = current.weatherDesc[0].value;
        const code = current.weatherCode;

        let icon = <Sun className="h-4 w-4 text-amber-400" />;
        if (["113"].includes(code)) icon = <Sun className="h-4 w-4 text-amber-400" />;
        else if (["116", "119", "122"].includes(code)) icon = <Cloud className="h-4 w-4 text-blue-300" />;
        else if (["176", "182", "200", "263", "266", "293", "296", "299", "302", "305", "308", "311"].includes(code)) icon = <CloudRain className="h-4 w-4 text-blue-400" />;
        else if (["386", "389", "392", "395"].includes(code)) icon = <CloudLightning className="h-4 w-4 text-purple-400" />;
        else icon = <Cloud className="h-4 w-4 text-slate-400" />;

        setWeather({ temp, condition, icon });
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border-color/60 bg-bg-secondary/60 px-3 py-1.5 animate-pulse">
        <div className="h-4 w-4 rounded-full bg-border-color/40" />
        <div className="h-3 w-12 rounded bg-border-color/40" />
      </div>
    );
  }

  if (error || !weather) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-color/60 bg-bg-secondary/60 px-3 py-1.5 transition-all hover:bg-bg-secondary/80 group">
      <div className="flex items-center gap-2">
        {weather.icon}
        <span className="text-sm font-bold text-text-primary tabular-nums">{weather.temp}°C</span>
      </div>
      <div className="h-3 w-[1px] bg-border-color/40" />
      <span className="text-[10px] font-medium text-text-secondary uppercase tracking-tighter truncate max-w-[80px]">Indore • {weather.condition}</span>
    </div>
  );
}
