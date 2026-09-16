// Crawler pre-render for one UK trading day: /daily/2026-09-15. See shared/daily-prerender.js.
import { handleEdition } from "../../shared/daily-prerender.js";

export const onRequestGet = (context) => handleEdition(context, "UK");
