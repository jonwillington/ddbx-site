/** DEV-ONLY preview harness for the /how-it-works redesign.
 *
 *  Seven section agents built the new page in parallel, each in its own
 *  component file. They needed to render and screenshot their section without
 *  seven of them editing how-it-works.tsx at once, so this route mounts any
 *  file under components/how-it-works/previews/ by name:
 *
 *    /__lab/how-it-works/<name>   →   previews/<name>.tsx (default export)
 *
 *  A preview module default-exports a no-props component and may export
 *  `wide = true` to opt out of the 860px document measure (for the hero, which
 *  spans the column the way the board stages do). Registered in App.tsx only
 *  when import.meta.env.DEV is true, so production never ships it; delete the
 *  route and this file once the redesign has landed.
 */
import type { ComponentType } from "react";

import { useParams } from "react-router-dom";

import DefaultLayout from "@/layouts/default";
import { SeoRail } from "@/components/seo/seo-rail";

interface PreviewModule {
  default: ComponentType;
  wide?: boolean;
}

const PREVIEWS = import.meta.glob<PreviewModule>(
  "../components/how-it-works/previews/*.tsx",
  { eager: true },
);

function previewByName(name: string): PreviewModule | undefined {
  const key = Object.keys(PREVIEWS).find((k) => k.endsWith(`/${name}.tsx`));

  return key ? PREVIEWS[key] : undefined;
}

export default function LabHowItWorksPage() {
  const { name = "" } = useParams();
  const mod = previewByName(name);

  return (
    <DefaultLayout drawerRight>
      <SeoRail
        marketId="uk"
        placement="how_it_works_rail"
        ukHeading="Start investing"
      />
      <div className="w-full pb-16">
        {mod ? (
          <div className={mod.wide ? "" : "mx-auto w-full max-w-[860px]"}>
            <mod.default />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[860px] pt-6 text-[14px] text-foreground/70">
            <p>No preview named “{name}”. Available:</p>
            <ul className="mt-2 list-disc pl-5">
              {Object.keys(PREVIEWS).map((k) => (
                <li key={k} className="font-mono text-[12px]">
                  {k.replace(/^.*\/previews\//, "").replace(/\.tsx$/, "")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}
