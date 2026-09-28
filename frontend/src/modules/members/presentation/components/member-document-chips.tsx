"use client";

import type { Member } from "@/modules/members/domain/types";

export type MemberDocumentKind = "authorization" | "solicitud" | "identity";

interface MemberDocumentChipsProps {
  member: Member;
  onPreview: (member: Member, kind: MemberDocumentKind) => void;
}

const CHIPS: Array<{ kind: MemberDocumentKind; label: string; uploaded: (member: Member) => boolean }> = [
  { kind: "authorization", label: "Autorización", uploaded: (member) => member.has_signed_authorization },
  { kind: "solicitud", label: "Solicitud", uploaded: (member) => member.has_signed_solicitud },
  { kind: "identity", label: "Cédula", uploaded: (member) => member.has_identity_document },
];

export function MemberDocumentChips({ member, onPreview }: MemberDocumentChipsProps) {
  return (
    <div className="member-document-chips">
      {CHIPS.map((chip) => {
        const uploaded = chip.uploaded(member);
        if (!uploaded) {
          return (
            <span
              className="status-badge status-badge-muted"
              key={chip.kind}
              title={`${chip.label} pendiente`}
            >
              {chip.label}
            </span>
          );
        }

        return (
          <button
            className="status-badge status-badge-success member-document-chip-button"
            key={chip.kind}
            onClick={() => onPreview(member, chip.kind)}
            title={`Ver ${chip.label.toLowerCase()}`}
            type="button"
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

export function MemberDocumentStatusChip({
  uploaded,
  label,
  onPreview,
}: {
  uploaded: boolean;
  label: string;
  onPreview?: () => void;
}) {
  if (!uploaded) {
    return (
      <span className="status-badge status-badge-muted" title={`${label} pendiente`}>
        Pendiente
      </span>
    );
  }

  if (!onPreview) {
    return <span className="status-badge status-badge-success">Subida</span>;
  }

  return (
    <button
      className="status-badge status-badge-success member-document-chip-button"
      onClick={onPreview}
      title={`Ver ${label.toLowerCase()}`}
      type="button"
    >
      Subida
    </button>
  );
}
