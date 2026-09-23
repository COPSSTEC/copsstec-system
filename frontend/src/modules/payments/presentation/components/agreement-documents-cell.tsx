import type { MemberSubscriptionRow } from "@/modules/payments/domain/types";
import {
  hasIdentityDocument,
  hasSignedAuthorization,
} from "@/modules/payments/presentation/lib/admin-payments";

interface AgreementDocumentsCellProps {
  member: MemberSubscriptionRow;
}

export function AgreementDocumentsCell({ member }: AgreementDocumentsCellProps) {
  const authorization = hasSignedAuthorization(member);
  const identity = hasIdentityDocument(member);

  return (
    <div className="admin-payments-docs" title={authorization && identity ? "ADV y cédula subidos" : "Documentos del acuerdo"}>
      <span className={authorization ? "is-ready" : "is-missing"}>ADV</span>
      <span className={identity ? "is-ready" : "is-missing"}>Cédula</span>
    </div>
  );
}
