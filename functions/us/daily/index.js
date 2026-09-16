// Crawler pre-render for the US daily archive: /us/daily. See shared/daily-prerender.js.
import { handleArchive } from "../../../shared/daily-prerender.js";

export const onRequestGet = (context) => handleArchive(context, "US");
