"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type { Election, ElectionList, ElectionReport, MessageDelivery, VoterListResult } from "@/modules/votaciones/domain/types";
import {
  closeElection,
  createList,
  createPosition,
  deleteList,
  deletePosition,
  downloadActa,
  downloadCalendar,
  exportReport,
  exportVoters,
  getAdminElection,
  getMessageStatus,
  getReports,
  listAdminLists,
  listVoters,
  publishCalendar,
  reorderPositions,
  resendMessage,
  saveCalendar,
  saveMessages,
  scheduleMessage,
  sendMessage,
  startElection,
  syncVoters,
  testMessage,
  toggleVoter,
  updateAdminElection,
  updatePosition,
  uploadElectionMedia,
} from "@/modules/votaciones/infrastructure/elections-api";

export function useAdminElection(initialElectionId?: number) {
  const [election, setElection] = useState<Election | null>(null);
  const [lists, setLists] = useState<ElectionList[]>([]);
  const [voters, setVoters] = useState<VoterListResult | null>(null);
  const [report, setReport] = useState<ElectionReport | null>(null);
  const [messageStatus, setMessageStatus] = useState<MessageDelivery[]>([]);
  const [electionId, setElectionId] = useState<number | undefined>(initialElectionId);
  const [voterQuery, setVoterQuery] = useState("");
  const [voterPayment, setVoterPayment] = useState("");
  const [voterType, setVoterType] = useState("");
  const [voterLocation, setVoterLocation] = useState("");
  const [voterPage, setVoterPage] = useState(1);
  const [voterPageSize, setVoterPageSize] = useState(8);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const loadGeneration = useRef(0);
  const voterFiltersRef = useRef({
    q: "",
    payment_status: "",
    type_profile: "",
    location: "",
    page: 1,
    page_size: 8,
  });

  function currentVoterQuery(overrides?: Partial<typeof voterFiltersRef.current>) {
    const next = { ...voterFiltersRef.current, ...overrides };
    voterFiltersRef.current = next;
    return {
      q: next.q || undefined,
      payment_status: next.payment_status || undefined,
      type_profile: next.type_profile || undefined,
      location: next.location || undefined,
      page: next.page,
      page_size: next.page_size,
    };
  }

  const token = () => {
    const value = getStoredToken();
    if (!value) {
      throw new Error("Sesión requerida.");
    }
    return value;
  };

  const load = useCallback(async (id?: number) => {
    const generation = ++loadGeneration.current;
    setIsLoading(true);
    setError("");
    try {
      const session = token();
      const current = await getAdminElection(session, id);
      if (generation !== loadGeneration.current) {
        return;
      }
      setElection(current);
      setElectionId(current.id);
      const items = await listAdminLists(session, current.id);
      if (generation !== loadGeneration.current) {
        return;
      }
      setLists(items);
      const [padro, snapshot] = await Promise.all([
        listVoters(session, currentVoterQuery(), current.id).catch(() => null),
        getReports(session, current.id).catch(() => null),
      ]);
      if (generation !== loadGeneration.current) {
        return;
      }
      if (padro) {
        setVoters(padro);
      }
      if (snapshot) {
        setReport(snapshot);
      }
    } catch (err) {
      if (generation === loadGeneration.current) {
        setError(err instanceof Error ? err.message : "No se pudo cargar votaciones.");
      }
    } finally {
      if (generation === loadGeneration.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(initialElectionId);
  }, [initialElectionId, load]);

  async function run<T>(action: () => Promise<T>, success?: string): Promise<T | undefined> {
    setIsMutating(true);
    setError("");
    setNotice("");
    try {
      const result = await action();
      if (success) {
        setNotice(success);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      return undefined;
    } finally {
      setIsMutating(false);
    }
  }

  return {
    election,
    lists,
    voters,
    report,
    messageStatus,
    electionId,
    isLoading,
    isMutating,
    error,
    notice,
    voterQuery,
    setVoterQuery,
    voterPayment,
    voterType,
    voterLocation,
    voterPage,
    voterPageSize,
    reload: () => load(electionId),
    selectPeriod: (id: number) => load(id),
    saveElection: (payload: Partial<Election>) =>
      run(async () => {
        const updated = await updateAdminElection(token(), payload, electionId);
        setElection(updated);
        return updated;
      }, "Cambios guardados."),
    closePeriod: () =>
      run(async () => {
        const updated = await closeElection(token(), electionId);
        await load(updated.id);
        return updated;
      }, "Periodo cerrado. Ya puedes descargar sus reportes e iniciar uno nuevo."),
    startPeriod: () =>
      run(async () => {
        const created = await startElection(token());
        await load(created.id);
        return created;
      }, "Nuevo periodo creado. Empieza por cargos y requisitos."),
    uploadMedia: (kind: "logo" | "banner", file: File) =>
      run(async () => {
        await uploadElectionMedia(token(), kind, file, electionId);
        await load(electionId);
      }, "Archivo actualizado."),
    addPosition: (name: string) =>
      run(async () => {
        await createPosition(token(), name, electionId);
        await load(electionId);
      }, "Cargo agregado. Las listas usarán este cargo."),
    patchPosition: (id: number, payload: Record<string, unknown>) =>
      run(async () => {
        await updatePosition(token(), id, payload, electionId);
        await load(electionId);
      }),
    removePosition: (id: number) =>
      run(async () => {
        await deletePosition(token(), id, electionId);
        await load(electionId);
      }, "Cargo eliminado."),
    reorderPositions: (ids: number[]) =>
      run(async () => {
        const updated = await reorderPositions(token(), ids, electionId);
        setElection(updated);
        return updated;
      }),
    saveCalendarEvents: (events: Election["calendar"]) =>
      run(async () => {
        const updated = await saveCalendar(
          token(),
          events.map((item) => ({
            event_key: item.event_key,
            title: item.title,
            starts_on: item.starts_on,
            ends_on: item.ends_on,
          })),
          electionId,
        );
        setElection(updated);
      }, "Calendario guardado."),
    toggleCalendarPublic: (isPublic: boolean) =>
      run(async () => {
        const updated = await publishCalendar(token(), isPublic, electionId);
        setElection(updated);
      }, isPublic ? "Calendario publicado en la página pública." : "Calendario oculto."),
    downloadCronograma: () => run(() => downloadCalendar(token(), electionId)),
    addList: (payload: Partial<ElectionList>) =>
      run(async () => {
        const created = await createList(
          token(),
          {
            name: payload.name,
            slogan: payload.slogan || "",
            color: payload.color || "#0D47A1",
          },
          electionId,
        );
        setLists((current) => [created, ...current.filter((item) => item.id !== created.id)]);
        return created;
      }, "Lista creada. Completa integrantes con los cargos configurados."),
    removeList: (listId: number) =>
      run(async () => {
        await deleteList(token(), listId, electionId);
        setLists((current) => current.filter((item) => item.id !== listId));
      }, "Lista eliminada."),
    loadVoters: (overrides?: {
      q?: string;
      payment_status?: string;
      type_profile?: string;
      location?: string;
      page?: number;
      page_size?: number;
    }) =>
      run(async () => {
        if (overrides?.q !== undefined) setVoterQuery(overrides.q);
        if (overrides?.payment_status !== undefined) setVoterPayment(overrides.payment_status);
        if (overrides?.type_profile !== undefined) setVoterType(overrides.type_profile);
        if (overrides?.location !== undefined) setVoterLocation(overrides.location);
        if (overrides?.page !== undefined) setVoterPage(overrides.page);
        if (overrides?.page_size !== undefined) setVoterPageSize(overrides.page_size);
        const result = await listVoters(token(), currentVoterQuery(overrides), electionId);
        setVoters(result);
        return result;
      }),
    toggleVote: (userId: number, enabled: boolean, fullName?: string) =>
      run(async () => {
        await toggleVoter(token(), userId, enabled, electionId);
        const result = await listVoters(token(), currentVoterQuery(), electionId);
        setVoters(result);
        return result;
      }, enabled
        ? `${fullName || "El miembro"} ya puede votar.`
        : `Se retiró el derecho a voto${fullName ? ` de ${fullName}` : ""}.`),
    syncPadron: () =>
      run(async () => {
        await syncVoters(token(), electionId);
        const result = await listVoters(token(), currentVoterQuery({ page: 1 }), electionId);
        setVoterPage(1);
        setVoters(result);
      }, "Padrón sincronizado."),
    exportPadron: () => run(() => exportVoters(token(), electionId)),
    saveTemplates: (templates: Election["templates"]) =>
      run(async () => {
        const updated = await saveMessages(token(), templates, electionId);
        setElection(updated);
        const rows = await getMessageStatus(token(), electionId);
        setMessageStatus(rows);
      }, "Plantillas guardadas."),
    sendTest: (key: string, email: string) => run(() => testMessage(token(), key, email, electionId), "Mensaje de prueba enviado."),
    dispatchMessage: (key: string) =>
      run(async () => {
        const result = await sendMessage(token(), key, electionId);
        const rows = await getMessageStatus(token(), electionId);
        setMessageStatus(rows);
        return result;
      }, "Mensajes enviados."),
    refreshMessageStatus: async () => {
      try {
        const rows = await getMessageStatus(token(), electionId);
        setMessageStatus(rows);
        return rows;
      } catch {
        return [];
      }
    },
    scheduleDispatch: (key: string, scheduledAt: string | null) =>
      run(async () => {
        await scheduleMessage(token(), key, scheduledAt, electionId);
        const updated = await getAdminElection(token(), electionId);
        setElection(updated);
        const rows = await getMessageStatus(token(), electionId);
        setMessageStatus(rows);
      }, scheduledAt ? "Envío programado para este mensaje." : "Se quitó la programación."),
    resendUnsent: (key: string) =>
      run(async () => {
        const result = await resendMessage(token(), key, electionId);
        const rows = await getMessageStatus(token(), electionId);
        setMessageStatus(rows);
        return result;
      }, "Se reenvió el mensaje a los destinatarios pendientes."),
    exportPdf: () => run(() => exportReport(token(), "pdf", electionId)),
    exportExcel: () => run(() => exportReport(token(), "xlsx", electionId)),
    generateActa: () => run(() => downloadActa(token(), electionId)),
  };
}
