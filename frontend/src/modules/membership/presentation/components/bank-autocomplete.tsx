"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import {
  bankInitials,
  bankLogoUrl,
  findBank,
  searchBanks,
  type BankInstitution,
} from "@/modules/membership/domain/banks";
import { loadBanksCatalog } from "@/modules/membership/infrastructure/banks-catalog";

interface BankAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

function BankMark({ bank, name }: { bank: BankInstitution | null; name: string }) {
  const [broken, setBroken] = useState(false);
  const logo = bank && !broken ? bankLogoUrl(bank.domain) : null;
  const label = bank?.name || name;

  useEffect(() => {
    setBroken(false);
  }, [bank?.domain, name]);

  if (logo) {
    return (
      <img
        alt=""
        className="bank-autocomplete-logo"
        onError={() => setBroken(true)}
        src={logo}
      />
    );
  }

  return (
    <span aria-hidden className="bank-autocomplete-fallback">
      {bankInitials(label || "Banco")}
    </span>
  );
}

export function BankAutocomplete({ value, onChange, required = false }: BankAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [catalog, setCatalog] = useState<BankInstitution[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    void loadBanksCatalog().then(setCatalog);
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [value]);

  const selected = useMemo(() => findBank(catalog, value), [catalog, value]);
  const matches = useMemo(() => searchBanks(catalog, query), [catalog, query]);
  const showList = open && query.trim().length >= 3;

  function choose(bank: BankInstitution) {
    onChange(bank.name);
    setQuery(bank.name);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showList || matches.length === 0) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery(value);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % matches.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + matches.length) % matches.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const bank = matches[activeIndex];
      if (bank) {
        choose(bank);
      }
    }
    if (event.key === "Escape") {
      setOpen(false);
      setQuery(value);
    }
  }

  return (
    <div className="bank-autocomplete" ref={rootRef}>
      <div className={`bank-autocomplete-control ${value ? "is-selected" : ""}`}>
        {value ? <BankMark bank={selected} name={value} /> : null}
        <input
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showList}
          autoComplete="off"
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            setActiveIndex(0);
            if (value && next !== value) {
              onChange("");
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe al menos 3 letras"
          required={required}
          role="combobox"
          value={query}
        />
        {value ? (
          <button
            aria-label="Quitar entidad"
            className="bank-autocomplete-clear"
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(true);
            }}
            type="button"
          >
            ×
          </button>
        ) : null}
      </div>
      {open && query.trim().length > 0 && query.trim().length < 3 ? (
        <p className="bank-autocomplete-hint">Sigue escribiendo para buscar coincidencias.</p>
      ) : null}
      {showList ? (
        <ul className="bank-autocomplete-list" id={listId} role="listbox">
          {matches.length === 0 ? (
            <li className="bank-autocomplete-empty">No hay coincidencias.</li>
          ) : (
            matches.map((bank, index) => (
              <li key={bank.name}>
                <button
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? "is-active" : ""}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(bank);
                  }}
                  role="option"
                  type="button"
                >
                  <BankMark bank={bank} name={bank.name} />
                  <span>{bank.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
