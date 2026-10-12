export interface BankInstitution {
  name: string;
  aliases: string[];
  domain: string;
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseBanksCsv(raw: string): BankInstitution[] {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith("#"));
  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).flatMap((line) => {
    const cells = splitCsvLine(line);
    const name = (cells[0] || "").trim();
    if (!name) {
      return [];
    }
    const aliases = (cells[1] || "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
    return [
      {
        name,
        aliases,
        domain: (cells[2] || "").trim(),
      },
    ];
  });
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

export function searchBanks(catalog: BankInstitution[], query: string, limit = 10): BankInstitution[] {
  const needle = fold(query);
  if (needle.length < 3) {
    return [];
  }

  const scored = catalog
    .map((bank) => {
      const haystacks = [bank.name, ...bank.aliases].map(fold);
      if (haystacks.some((item) => item === needle)) {
        return { bank, score: 0 };
      }
      if (haystacks.some((item) => item.startsWith(needle))) {
        return { bank, score: 1 };
      }
      if (haystacks.some((item) => item.includes(needle))) {
        return { bank, score: 2 };
      }
      return null;
    })
    .filter((item): item is { bank: BankInstitution; score: number } => item !== null)
    .sort((left, right) => left.score - right.score || left.bank.name.localeCompare(right.bank.name, "es"));

  return scored.slice(0, limit).map((item) => item.bank);
}

export function findBank(catalog: BankInstitution[], name: string): BankInstitution | null {
  const needle = fold(name);
  if (!needle) {
    return null;
  }
  return (
    catalog.find((bank) => fold(bank.name) === needle || bank.aliases.some((alias) => fold(alias) === needle)) ??
    null
  );
}

export function bankInitials(name: string): string {
  const skip = new Set(["a", "y", "c", "de", "del", "la", "las", "los", "coop", "ltda", "limitada"]);
  const words = name
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => !skip.has(fold(word)));
  if (words.length === 0) {
    return name.slice(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function bankLogoUrl(domain: string): string | null {
  if (!domain) {
    return null;
  }
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;
}
