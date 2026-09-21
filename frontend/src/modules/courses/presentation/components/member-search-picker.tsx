"use client";

import { useEffect, useRef, useState } from "react";

import type { MemberOption } from "@/modules/courses/domain/types";
import { listMemberOptions } from "@/modules/courses/infrastructure/courses-api";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import { memberDisplayName } from "@/modules/courses/presentation/lib/course-admin";

interface MemberSearchPickerProps {
  token: string;
  selected: MemberOption[];
  inscribedUserIds: number[];
  onChange: (members: MemberOption[]) => void;
}

export function MemberSearchPicker({
  token,
  selected,
  inscribedUserIds,
  onChange,
}: MemberSearchPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = window.setTimeout(() => {
      void listMemberOptions(token, term)
        .then((items) => {
          if (!cancelled) {
            setResults(items);
            setOpen(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearching(false);
          }
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, token]);

  function addMember(member: MemberOption) {
    if (inscribedUserIds.includes(member.id) || selected.some((item) => item.id === member.id)) {
      return;
    }

    onChange([...selected, member]);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function removeMember(memberId: number) {
    onChange(selected.filter((item) => item.id !== memberId));
  }

  return (
    <div className="member-search-picker" ref={rootRef}>
      <label className="field">
        Registrar miembros sin costo
        <span className="member-search-control">
          <CourseUiIcon name="search" />
          <input
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Busca por nombre, apellido, cédula o correo"
            type="search"
            value={query}
          />
        </span>
      </label>

      {open && query.trim().length > 0 ? (
        <div className="member-search-menu">
          {query.trim().length < 3 ? (
            <p className="muted">Escribe al menos 3 caracteres para buscar.</p>
          ) : isSearching ? (
            <p className="muted">Buscando miembros...</p>
          ) : results.length === 0 ? (
            <p className="muted">No hay miembros que coincidan.</p>
          ) : (
            results.map((member) => {
              const inscribed = inscribedUserIds.includes(member.id);
              const already = selected.some((item) => item.id === member.id);
              const disabled = inscribed || already;

              return (
                <button
                  disabled={disabled}
                  key={member.id}
                  onClick={() => addMember(member)}
                  type="button"
                >
                  <strong>{memberDisplayName(member)}</strong>
                  <span>
                    {member.email}
                    {member.identifier ? ` · ${member.identifier}` : ""}
                  </span>
                  {inscribed ? <em>Ya inscrito</em> : already ? <em>Seleccionado</em> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="member-search-chips">
          {selected.map((member) => (
            <span className="member-search-chip" key={member.id}>
              {memberDisplayName(member)}
              <button
                aria-label={`Quitar a ${memberDisplayName(member)}`}
                onClick={() => removeMember(member.id)}
                type="button"
              >
                <CourseUiIcon name="close" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
