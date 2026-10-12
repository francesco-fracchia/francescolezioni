"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Landing from "@/components/site/landing";
import {publicSubjectSelection} from "@/lib/public-subject-selection";
import SiteDialog from "@/components/site/site-dialog";
import type {
  Assessment,
  DialogKind,
  OpenDialog,
  GroupSize,
} from "@/components/site/types";

export default function Home() {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [subject, setSubject] = useState("Matematica");
  const [hasCompanion, setHasCompanion] = useState(false);
  const [groupSize, setGroupSize] = useState<GroupSize>(2);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("richiesta");
    setSubject(publicSubjectSelection(params.get("materia")||undefined));
    if (kind === "test" || kind === "lesson" || kind === "group" || kind === "consultation" || kind === "contact") setDialog(kind);
  }, []);

  const closeDialog = useCallback(() => {
    setDialog(null);
    const url=new URL(window.location.href);
    if(url.searchParams.has("richiesta")){url.searchParams.delete("richiesta");window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);}
  }, []);

  const open: OpenDialog = (kind, selectedSubject, companion = false, size = 2) => {
    returnFocus.current = document.activeElement as HTMLElement;
    setSubject(selectedSubject || "Matematica");
    setHasCompanion(companion);
    setGroupSize(size);
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
          groupSize={groupSize}
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
