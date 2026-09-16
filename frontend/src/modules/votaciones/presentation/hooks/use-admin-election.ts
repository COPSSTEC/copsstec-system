"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type { Election, ElectionList, ElectionReport, VoterListResult } from "@/modules/votaciones/domain/types";
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
  getReports,
  listAdminLists,
  listVoters,
  publishCalendar,
  saveCalendar,
  saveMessages,
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
  const [electionId, setElectionId] = useState<number | undefined>(initialElectionId);
  const [voterQuery, setVoterQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const loadGeneration = useRef(0);
  const voterQueryRef = useRef(voterQuery);
  voterQueryRef.current = voterQuery;

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
        listVoters(session, { q: voterQueryRef.current, page: 1, page_size: 8 }, current.id).catch(() => null),
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
    electionId,
    isLoading,
    isMutating,
    error,
    notice,
    voterQuery,
    setVoterQuery,
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
    loadVoters: (q?: string) =>
      run(async () => {
        const result = await listVoters(token(), { q: q ?? voterQuery, page: 1, page_size: 8 }, electionId);
        setVoters(result);
        return result;
      }),
    toggleVote: (userId: number, enabled: boolean) =>
      run(async () => {
        const result = await toggleVoter(token(), userId, enabled, electionId);
        setVoters(result);
      }),
    syncPadron: () =>
      run(async () => {
        const result = await syncVoters(token(), electionId);
        setVoters(result);
      }, "Padrón sincronizado."),
    exportPadron: () => run(() => exportVoters(token(), electionId)),
    saveTemplates: (templates: Election["templates"]) =>
      run(async () => {
        const updated = await saveMessages(token(), templates, electionId);
        setElection(updated);
      }, "Plantillas guardadas."),
    sendTest: (key: string, email: string) => run(() => testMessage(token(), key, email, electionId), "Mensaje de prueba enviado."),
    dispatchMessage: (key: string) => run(() => sendMessage(token(), key, electionId), "Mensajes enviados."),
    exportPdf: () => run(() => exportReport(token(), "pdf", electionId)),
    exportExcel: () => run(() => exportReport(token(), "xlsx", electionId)),
    generateActa: () => run(() => downloadActa(token(), electionId)),
  };
}
