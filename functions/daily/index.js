// Crawler pre-render for the UK daily archive: /daily. See shared/daily-prerender.js.
import { handleArchive } from "../../shared/daily-prerender.js";

export const onRequestGet = (context) => handleArchive(context, "UK");
