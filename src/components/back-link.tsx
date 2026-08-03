/** "Back" — but only when there is something to go back to.
 *
 *  A record page is reached two ways and they want opposite things. Arrive by
 *  clicking a name in a list and the one thing you want is the list again;
 *  arrive cold from a search result and a "Back" control is a lie, because
 *  history holds Google rather than anything of ours. A control that sometimes
 *  leaves the site is worse than no control.
 *
 *  `location.key` is the test. React Router stamps every navigation it makes
 *  with a fresh key and gives the entry the app was LOADED on the literal key
 *  "default" — so a non-default key means at least one in-app navigation has
 *  happened and `navigate(-1)` lands somewhere of ours. Nothing else available
 *  to the client distinguishes the two cases: `history.length` counts entries
 *  from other origins, and `document.referrer` is empty under most referrer
 *  policies.
 */
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { useLocation, useNavigate } from "react-router-dom";

export function BackLink({
  className = "",
  label = "Back",
}: {
  className?: string;
  label?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.key === "default") return null;

  return (
    <button
      className={`group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[12.5px] text-foreground/55 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-brown/40 ${className}`}
      type="button"
      onClick={() => navigate(-1)}
    >
      <ArrowLeftIcon
        aria-hidden
        className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5"
      />
      {label}
    </button>
  );
}
