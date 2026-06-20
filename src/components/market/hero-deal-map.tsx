/** The full-bleed "deal radar" map for the hero. A non-interactive, entirely
 *  monochrome MapLibre map (free CARTO basemap) that pans between the curated
 *  deals' HQ locations. A small marker sits at every HQ; the active one ripples
 *  like a beacon wherever the buy happened — in lockstep with the notification
 *  stack (driven by the shared `activeIndex`). Lazy-loaded (desktop only) so
 *  maplibre-gl stays out of the initial bundle. Respects prefers-reduced-motion
 *  (no camera flights). */
import type { HeroDeal, HeroMapConfig } from "./hero-deal-data";

import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

import "maplibre-gl/dist/maplibre-gl.css";

// Free, no-token CARTO vector styles. positron = light, dark-matter = dark.
const STYLE_LIGHT =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const STYLE_DARK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Re-letter every place label in a single neutral sans (Roboto — the closest
 *  Helvetica/Arial-like face the free CARTO glyph server serves). Must run after
 *  every style load, since setStyle replaces the layers. */
function applyNeutralFont(map: maplibregl.Map) {
  const layers = map.getStyle()?.layers ?? [];

  for (const layer of layers) {
    if (layer.type !== "symbol") continue;
    try {
      map.setLayoutProperty(layer.id, "text-font", ["Roboto Regular"]);
    } catch {
      // Icon-only symbol layer (no text) — ignore.
    }
  }
}

/** A beacon marker: a core dot under two ripple rings (the rings animate only
 *  when the pin carries `.is-active`). */
function makePin(): HTMLDivElement {
  const el = document.createElement("div");

  el.className = "hdm-pin";
  el.innerHTML =
    '<span class="hdm-ring"></span>' +
    '<span class="hdm-ring hdm-ring-2"></span>' +
    '<span class="hdm-core"></span>';

  return el;
}

export default function HeroDealMap({
  deals,
  mapConfig,
  activeIndex,
  isDark,
}: {
  deals: HeroDeal[];
  mapConfig: HeroMapConfig;
  activeIndex: number;
  isDark: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pinElsRef = useRef<HTMLDivElement[]>([]);
  const readyRef = useRef(false);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDark ? STYLE_DARK : STYLE_LIGHT,
      center: mapConfig.center,
      zoom: mapConfig.zoom,
      interactive: false, // cinematic showcase, never user-driven
      attributionControl: { compact: true },
      fadeDuration: 200,
    });

    mapRef.current = map;

    map.on("load", () => {
      readyRef.current = true;
      applyNeutralFont(map);

      // A marker at every deal's HQ; the active one ripples as the beacon.
      pinElsRef.current = deals.map((deal, i) => {
        const el = makePin();

        if (i === activeIndex) el.classList.add("is-active");
        new maplibregl.Marker({ element: el })
          .setLngLat([deal.lng, deal.lat])
          .addTo(map);

        return el;
      });
    });

    return () => {
      readyRef.current = false;
      pinElsRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // deals/mapConfig are stable per market; intentionally create once.
  }, []);

  // Theme swap — re-point the GL style; the HTML pins survive it. Re-apply the
  // neutral label font once the new style has loaded.
  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;
    map.setStyle(isDark ? STYLE_DARK : STYLE_LIGHT);
    map.once("styledata", () => applyNeutralFont(map));
  }, [isDark]);

  // Fly the camera to the active deal + move the active ripple to its pin.
  useEffect(() => {
    const map = mapRef.current;
    const deal = deals[activeIndex];

    if (!map || !deal) return;

    const move = () => {
      pinElsRef.current.forEach((el, i) =>
        el.classList.toggle("is-active", i === activeIndex),
      );
      if (prefersReducedMotion()) {
        map.jumpTo({ center: [deal.lng, deal.lat], zoom: mapConfig.flyZoom });
      } else {
        map.flyTo({
          center: [deal.lng, deal.lat],
          zoom: mapConfig.flyZoom,
          duration: 2600,
          curve: 1.42,
          essential: true,
        });
      }
    };

    if (readyRef.current) move();
    else map.once("load", move);
  }, [activeIndex, deals, mapConfig.flyZoom]);

  return (
    <div ref={containerRef} className="hdm-wrap">
      <style>{`
        .hdm-wrap { position: absolute; inset: 0; }
        /* Entirely monochrome basemap. Only the GL canvas is desaturated; the
           beacon markers are DOM overlays, so they keep their warm colour. */
        .hdm-wrap .maplibregl-canvas { filter: grayscale(1) contrast(1.02); }
        .hdm-wrap .maplibregl-ctrl-attrib { font-size: 9px; opacity: 0.55; }
        .hdm-wrap .maplibregl-ctrl-bottom-right { z-index: 1; }

        /* Beacon pin — a warm core dot, ripple rings only on the active one. */
        .hdm-pin { position: relative; width: 16px; height: 16px; }
        .hdm-core {
          position: absolute; inset: 4px; border-radius: 50%;
          background: #8B6040; box-shadow: 0 0 10px 2px rgba(139,96,64,0.55);
        }
        :is(.dark) .hdm-core {
          background: #ad9479; box-shadow: 0 0 12px 3px rgba(173,148,121,0.6);
        }
        .hdm-pin:not(.is-active) .hdm-core { opacity: 0.5; transform: scale(0.7); }
        .hdm-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1.5px solid rgba(139,96,64,0.85);
          opacity: 0; will-change: transform, opacity;
        }
        .hdm-pin.is-active .hdm-ring { animation: hdm-ripple 2.8s ease-out infinite; }
        .hdm-pin.is-active .hdm-ring-2 { animation-delay: 1.1s; }
        :is(.dark) .hdm-ring { border-color: rgba(173,148,121,0.85); }
        @keyframes hdm-ripple {
          0%   { opacity: 0.75; transform: scale(0.4); }
          70%  { opacity: 0;    transform: scale(4.2); }
          100% { opacity: 0;    transform: scale(4.2); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hdm-pin.is-active .hdm-ring { animation: none; opacity: 0.4; transform: scale(1.6); }
        }
      `}</style>
    </div>
  );
}
