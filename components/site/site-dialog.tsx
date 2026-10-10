"use client";
import { useEffect, useRef, type RefObject } from "react";
import { X } from "lucide-react";
import Privacy from "./privacy";
import LevelTest from "./level-test";
import ContactForm from "./contact-form";
import RequestForm from "./request-form";
import ConsultationBooking from "./consultation-booking";
import type { Assessment, DialogKind, GroupSize } from "./types";

type Props = {
  kind: DialogKind;
  subject: string;
  hasCompanion: boolean;
  groupSize?: GroupSize;
  assessment: Assessment | null;
  setAssessment: (assessment: Assessment) => void;
  setKind: (kind: DialogKind) => void;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};

export default function SiteDialog({
  kind,
  subject,
  hasCompanion,
  groupSize = 2,
  assessment,
  setAssessment,
  setKind,
  onClose,
  returnFocus,
}: Props) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    const target = returnFocus.current;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, a[href], [tabindex="0"]',
        ) || [],
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.offsetParent !== null &&
          element.tabIndex >= 0,
      );
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKey);
      target?.focus();
    };
  }, [onClose, returnFocus]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panel}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <button className="close" aria-label="Chiudi" onClick={onClose}>
          <X size={20} />
        </button>
        {kind === "privacy" ? (
          <Privacy />
        ) : kind === "test" ? (
          <LevelTest
            onFinish={setAssessment}
            onRequest={() => setKind("consultation")}
          />
        ) : kind === "contact" ? (
          <ContactForm subject={subject}/>
        ) : kind === "consultation" ? (
          <ConsultationBooking assessment={assessment} subject={assessment ? assessment.test === "Analisi 1" ? "Analisi 1" : assessment.test === "Programmazione" ? "Programmazione 1" : assessment.test === "Informatica superiori" ? "Informatica" : "Matematica" : subject}/>
        ) : (
          <RequestForm
            key={kind}
            kind={kind}
            subject={subject}
            assessment={assessment}
            hasCompanion={hasCompanion}
            initialGroupSize={groupSize}
          />
        )}
      </section>
    </div>
  );
}
