import { AppModal } from "@/components/app-modal";
import { InterestForm } from "@/components/api/interest-form";

/** The request form, moved off the page and behind a button.
 *
 *  It used to sit open in the closing band, which meant six fields, five market
 *  chips and a textarea were the last thing every visitor scrolled past whether
 *  they were converting or not, and the band ran to roughly a screen and a half
 *  to hold them. A form is also the wrong closing note: it asks before it has
 *  finished pitching.
 *
 *  So the band now closes on the pitch and one button, and the form opens over
 *  it. `InterestForm` is unchanged and unwrapped, which is the point of doing
 *  it this way: its colours are literal light values written for the cream
 *  band (see the note at the top of that file), so the panel here is cream too
 *  rather than the theme-aware default, which would resolve DARK on this
 *  `.dark`-pinned route and put cream fields on a brown surface.
 */
export function RequestAccessModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AppModal
      closeTone="light"
      maxWidthClass="max-w-xl"
      open={open}
      panelClassName="bg-[#f5f0e8] border-black/10 text-[#1a140d]"
      title="Request access"
      titleClassName="text-[19px] font-semibold tracking-[-0.015em]"
      onClose={onClose}
    >
      <p className="mb-6 text-[14.5px] leading-[1.55] text-[#1a140d]/65">
        A nightly bulk sync, a live product surface and a research backtest are
        different shapes. Tell us which one you are building and we will come
        back with scope and a number.
      </p>
      <InterestForm />
    </AppModal>
  );
}
