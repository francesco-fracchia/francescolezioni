"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Landing from "@/components/site/landing";
import SiteDialog from "@/components/site/site-dialog";
import type {
  Assessment,
  DialogKind,
  OpenDialog,
} from "@/components/site/types";

export default function Home() {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [subject, setSubject] = useState("Matematica");
  const [hasCompanion, setHasCompanion] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const kind = new URLSearchParams(window.location.search).get("richiesta");
    if (kind === "test" || kind === "lesson" || kind === "group" || kind === "consultation" || kind === "contact") setDialog(kind);
  }, []);

  const closeDialog = useCallback(() => setDialog(null), []);

  const open: OpenDialog = (kind, selectedSubject, companion = false) => {
    returnFocus.current = document.activeElement as HTMLElement;
    setSubject(selectedSubject || "Matematica");
    setHasCompanion(companion);
    setDialog(kind);
  };

  return (
    <>
      <Landing open={open} />
      {dialog && (
        <SiteDialog
          kind={dialog}
          subject={subject}
          hasCompanion={hasCompanion}
          assessment={assessment}
          setAssessment={setAssessment}
          setKind={setDialog}
          onClose={closeDialog}
          returnFocus={returnFocus}
        />
      )}
    </>
  );
}
