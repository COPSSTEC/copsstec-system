"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import {
  ENABLED_STATE_ID,
  EMPTY_MEMBER_FORM,
  splitCsv,
  type Member,
  type MemberColumn,
  type MemberWriteInput,
} from "@/modules/members/domain/types";
import {
  createMember,
  deleteMember,
  disableMember,
  downloadMemberCertificate,
  downloadMemberFile,
  enableMember,
  listMembers,
  resendMemberCredentials,
  updateMember,
  uploadMemberPhoto,
} from "@/modules/members/infrastructure/members-api";
import { MemberActionsMenu } from "@/modules/members/presentation/components/member-actions-menu";
import { MemberStatusBadge } from "@/modules/members/presentation/components/member-status-badge";
import { ApproveMemberModal } from "@/modules/members/presentation/modals/approve-member-modal";
import { ConfirmActionModal } from "@/modules/members/presentation/modals/confirm-action-modal";
import { MemberFormModal } from "@/modules/members/presentation/modals/member-form-modal";
import { MemberPaymentsModal } from "@/modules/payments";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { RoleGate } from "@/shared/components/role-gate";
import { UserAvatar } from "@/shared/components/user-avatar";

const COLUMNS_STORAGE_KEY = "copsstec.members.visible_columns";

function todayLabel(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

function memberToForm(member: Member): MemberWriteInput {
  return {
    names: member.names,
    lastname: member.lastname,
    identifier: member.identifier,
    email: member.email,
    login_email: member.login_email,
    birtday: member.birtday,
    mobile_phone: member.mobile_phone,
    date_register: member.date_register,
    blood_type: member.blood_type,
    fixed_phone: member.fixed_phone,
    title_academic: member.title_academic,
    level_academic: member.level_academic,
    cod_senescyt: member.cod_senescyt,
    linkdink: member.linkdink,
    want_notifications: member.want_notifications,
    is_work: member.is_work,
    foto_id: member.foto_id,
    province: member.province ?? "",
    city: member.city ?? "",
    street_principal: member.street_principal ?? "",
    street_secondary: member.street_secondary ?? "",
    gender: member.gender ?? "",
    type_profiles: splitCsv(member.type_profile).length > 0 ? splitCsv(member.type_profile) : ["miembro"],
    commissions: splitCsv(member.type_commision).length > 0 ? splitCsv(member.type_commision) : ["NA"],
    fourth_title: member.fourth_title ?? "",
    codigo_senescyt_cuarto: member.codigo_senescyt_cuarto ?? "",
  };
}

export function MembersPage() {
  const token = useMemo(() => getStoredToken(), []);
  const [items, setItems] = useState<Member[]>([]);
  const [columnsMeta, setColumnsMeta] = useState<MemberColumn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState("names");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberWriteInput>(EMPTY_MEMBER_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<{
    type: "delete" | "disable" | "enable" | "credentials";
    member: Member;
  } | null>(null);
  const [approvingMember, setApprovingMember] = useState<Member | null>(null);
  const [paymentsMember, setPaymentsMember] = useState<Member | null>(null);

  const loadMembers = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await listMembers(token, {
        page,
        pageSize,
        q,
        sortBy,
        sortDir,
        filters,
      });
      setItems(result.items);
      setTotal(result.total);
      setColumnsMeta(result.columns);

      setVisibleColumnIds((current) => {
        if (current.length > 0) {
          return current;
        }

        const stored = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as string[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          } catch {
            window.localStorage.removeItem(COLUMNS_STORAGE_KEY);
          }
        }

        return result.columns.filter((column) => column.default_visible).map((column) => column.id).concat("actions");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar miembros.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize, q, sortBy, sortDir, token]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  function handleVisibleColumnsChange(ids: string[]) {
    const next = ids.includes("actions") ? ids : [...ids, "actions"];
    setVisibleColumnIds(next);
    window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(next));
  }

  function handleFilterChange(columnId: string, value: string) {
    setPage(1);
    setFilters((current) => ({ ...current, [columnId]: value }));
  }

  function openCreate() {
    setEditingMember(null);
    setForm({ ...EMPTY_MEMBER_FORM, date_register: todayLabel() });
    setPhotoFile(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(member: Member) {
    setEditingMember(member);
    setForm(memberToForm(member));
    setPhotoFile(null);
    setFormError(null);
    setFormOpen(true);
  }

  function updateForm(field: keyof MemberWriteInput, value: string | boolean | string[]) {
    setForm((current) => {
      if (field === "fourth_title" && typeof value === "string" && value.trim() === "") {
        return { ...current, fourth_title: "", codigo_senescyt_cuarto: "" };
      }

      return { ...current, [field]: value };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingMember) {
        await updateMember(token, editingMember.user_id, form);
        if (photoFile) {
          await uploadMemberPhoto(token, editingMember.user_id, photoFile);
        }
        setNotice("Miembro actualizado correctamente.");
      } else {
        const created = await createMember(token, form);
        if (photoFile) {
          await uploadMemberPhoto(token, created.member.user_id, photoFile);
        }
        setNotice(`${created.message} Contraseña temporal: ${created.temporary_password}`);
      }
      setFormOpen(false);
      await loadMembers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar el miembro.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!token || !confirm) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { type, member } = confirm;
      if (type === "delete") {
        await deleteMember(token, member.user_id);
        setNotice("El miembro fue eliminado.");
      } else if (type === "disable") {
        const result = await disableMember(token, member.user_id);
        setNotice(result.message);
      } else if (type === "enable") {
        const result = await enableMember(token, member.user_id);
        setNotice(result.message);
      } else {
        const result = await resendMemberCredentials(token, member.user_id);
        setNotice(`${result.message} Contraseña temporal: ${result.temporary_password}`);
      }
      setConfirm(null);
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDownload(member: Member, kind: "file" | "certificate") {
    if (!token) {
      return;
    }

    try {
      if (kind === "file") {
        await downloadMemberFile(token, member.user_id);
      } else {
        await downloadMemberCertificate(token, member.user_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el PDF.");
    }
  }

  const tableColumns = useMemo<DataTableColumn<Member>[]>(() => {
    const renderers: Record<string, (member: Member) => ReactNode> = {
      member: (member) => (
        <div className="member-cell">
          <UserAvatar
            className="member-avatar"
            fotoId={member.foto_id}
            name={`${member.names} ${member.lastname}`.trim() || member.name}
            size="sm"
          />
          <strong>
            {member.names} {member.lastname}
          </strong>
        </div>
      ),
      lastname: (member) => member.lastname || "—",
      identifier: (member) => member.identifier || "—",
      contacts: (member) => (
        <div>
          <strong>{member.email}</strong>
          <span className="table-subtitle">{member.mobile_phone}</span>
        </div>
      ),
      birtday: (member) => member.birtday || "—",
      state: (member) => <MemberStatusBadge label={member.state_label} stateId={member.state_id} />,
      date_register: (member) => member.date_register || "—",
      login_email: (member) => member.login_email,
      blood_type: (member) => member.blood_type || "—",
      title_academic: (member) => member.title_academic || "—",
      level_academic: (member) => member.level_academic || "—",
      gender: (member) => member.gender || "—",
      province: (member) => member.province || "—",
      city: (member) => member.city || "—",
      fixed_phone: (member) => member.fixed_phone || "—",
      cod_senescyt: (member) => member.cod_senescyt || "—",
      last_conexion: (member) =>
        member.last_conexion ? new Date(member.last_conexion).toLocaleString("es-EC") : "—",
    };

    const dataColumns: DataTableColumn<Member>[] = columnsMeta.map((column) => ({
      id: column.id,
      header: column.label,
      sortable: column.sortable,
      filterable: column.filterable,
      filterType:
        column.id === "state"
          ? "select"
          : column.filter_type === "date-range"
            ? "date-range"
            : "text",
      filterOptions:
        column.id === "state"
          ? [
              { value: "1", label: "Habilitado" },
              { value: "2", label: "Por habilitar" },
              { value: "3", label: "Deshabilitado" },
              { value: "16", label: "Desafiliado" },
            ]
          : undefined,
      filterPlaceholder: `Filtrar ${column.label.toLowerCase()}`,
      defaultVisible: column.default_visible,
      cell: renderers[column.id] ?? ((member: Member) => String((member as never)[column.id] ?? "—")),
    }));

    return [
      ...dataColumns,
      {
        id: "actions",
        header: "Acciones",
        sortable: false,
        filterable: false,
        hideable: false,
        defaultVisible: true,
        width: "140px",
        cell: (member) => (
          <MemberActionsMenu
            member={member}
            onDelete={(item) => setConfirm({ type: "delete", member: item })}
            onDownload={(item) => void handleDownload(item, "file")}
            onDownloadCertificate={(item) => void handleDownload(item, "certificate")}
            onEdit={openEdit}
            onApprove={(item) => setApprovingMember(item)}
            onPayments={(item) => setPaymentsMember(item)}
            onResendCredentials={(item) => setConfirm({ type: "credentials", member: item })}
            onToggleState={(item) =>
              setConfirm({
                type: item.state_id === ENABLED_STATE_ID ? "disable" : "enable",
                member: item,
              })
            }
          />
        ),
      },
    ];
  }, [columnsMeta]);

  const confirmCopy = confirm
    ? {
        delete: {
          title: "Eliminar miembro",
          description: `Se eliminará a ${confirm.member.names} ${confirm.member.lastname} del padrón y se bloqueará su acceso.`,
          confirmLabel: "Eliminar",
          danger: true,
        },
        disable: {
          title: "Deshabilitar miembro",
          description: `${confirm.member.names} ${confirm.member.lastname} ya no podrá iniciar sesión.`,
          confirmLabel: "Deshabilitar",
          danger: true,
        },
        enable: {
          title: "Habilitar miembro",
          description: `Se restaurará el acceso de ${confirm.member.names} ${confirm.member.lastname}.`,
          confirmLabel: "Habilitar",
          danger: false,
        },
        credentials: {
          title: "Reenviar credenciales",
          description: `Se generará una nueva contraseña temporal para ${confirm.member.login_email}.`,
          confirmLabel: "Reenviar",
          danger: false,
        },
      }[confirm.type]
    : null;

  return (
    <RoleGate requiredAccess="admin">
      <section className="page-heading page-heading-actions">
        <div>
          <h1>Miembros del copsstec</h1>
          <p>Administra el padrón, el profile asociado y el acceso al sistema.</p>
        </div>
        <button className="create-button" onClick={openCreate} type="button">
          + Crear miembro
        </button>
      </section>

      {notice ? (
        <div className="action-alert action-alert-success">
          <strong>Listo</strong>
          <span>{notice}</span>
        </div>
      ) : null}
      {error ? (
        <div className="action-alert action-alert-error">
          <strong>Error</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <DataTable
        columns={tableColumns}
        data={items}
        emptyMessage="No se encontraron miembros con esos filtros."
        filters={filters}
        isLoading={isLoading}
        onFilterChange={handleFilterChange}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSortChange={(columnId, direction) => {
          setSortBy(columnId === "member" ? "names" : columnId);
          setSortDir(direction);
          setPage(1);
        }}
        onVisibleColumnsChange={handleVisibleColumnsChange}
        pagination={{ page, pageSize, total }}
        rowKey={(member) => member.user_id}
        sortBy={sortBy === "names" ? "member" : sortBy}
        sortDir={sortDir}
        toolbar={
          <label className="search-field">
            <span className="sr-only">Buscar por nombre, apellidos</span>
            <input
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre, apellidos"
              type="search"
              value={q}
            />
          </label>
        }
        visibleColumnIds={visibleColumnIds}
      />

      {formOpen ? (
        <MemberFormModal
          error={formError}
          form={form}
          isSubmitting={isSubmitting}
          member={editingMember}
          onChange={updateForm}
          onClose={() => setFormOpen(false)}
          onPhotoChange={setPhotoFile}
          onSubmit={handleSubmit}
          photoFile={photoFile}
        />
      ) : null}

      {approvingMember ? (
        <ApproveMemberModal
          memberId={approvingMember.user_id}
          memberName={`${approvingMember.names} ${approvingMember.lastname}`}
          onApproved={(message) => {
            setNotice(message);
            setApprovingMember(null);
            void loadMembers();
          }}
          onClose={() => setApprovingMember(null)}
        />
      ) : null}

      {paymentsMember ? (
        <MemberPaymentsModal
          member={paymentsMember}
          onClose={() => setPaymentsMember(null)}
          open
        />
      ) : null}

      {confirm && confirmCopy ? (
        <ConfirmActionModal
          confirmLabel={confirmCopy.confirmLabel}
          danger={confirmCopy.danger}
          description={confirmCopy.description}
          isSubmitting={isSubmitting}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void handleConfirm()}
          title={confirmCopy.title}
        />
      ) : null}
    </RoleGate>
  );
}
