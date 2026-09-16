// /today -> the latest UK trading day's edition, 302. See shared/daily-prerender.js.
import { handleToday } from "../shared/daily-prerender.js";

export const onRequestGet = (context) => handleToday(context, "UK");
