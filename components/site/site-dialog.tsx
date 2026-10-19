"use client";
import { type RefObject } from "react";
import NativeDialog from "@/components/dialogs/native-dialog";
import GroupRequestForm from "./group-request-form";
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
  const heading = {privacy:"Informativa privacy",test:"Test orientativo",contact:"Contattami",consultation:"Incontro gratuito",group:"Richiesta di gruppo",lesson:"Richiesta di lezione","pre-registration":"Pre-iscrizione"}[kind];
  return <NativeDialog key={kind} title={heading} className="modal site-native-dialog" headerClassName="modal-header" closeClassName="close" labelledBy="dialog-title" onClose={onClose} returnFocus={returnFocus}>
        <div className="modal-body">{kind === "privacy" ? (
          <Privacy dialog />
        ) : kind === "test" ? (
          <LevelTest
            onFinish={setAssessment}
            onRequest={() => setKind("consultation")}
          />
        ) : kind === "contact" ? (
          <ContactForm subject={subject}/>
        ) : kind === "consultation" ? (
          <ConsultationBooking assessment={assessment} subject={assessment ? assessment.test === "Analisi 1" ? "Analisi 1" : assessment.test === "Programmazione" ? "Programmazione 1" : assessment.test === "Informatica superiori" ? "Informatica" : "Matematica" : subject}/>
        ) : kind === "group" ? <GroupRequestForm subject={subject} assessment={assessment} hasCompanion={hasCompanion} groupSize={groupSize}/> : (
          <RequestForm
            key={kind}
            kind={kind}
            subject={subject}
            assessment={assessment}
            hasCompanion={hasCompanion}
            initialGroupSize={groupSize}
          />
        )}</div>
  </NativeDialog>;
}
