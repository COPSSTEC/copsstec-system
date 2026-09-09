## applyTo: "frontend/**/*.{ts,tsx}"

# Instrucciones para Frontend — Next.js / TypeScript / Arquitectura Modular

## Scope

Estas instrucciones se aplican al frontend desarrollado con:

* Next.js
* React
* TypeScript
* App Router
* Server Components
* Client Components
* FastAPI como backend
* Arquitectura modular por dominio
* Principios de Clean Architecture / Hexagonal cuando aporten desacoplamiento

Si el proyecto Next.js está ubicado en otra carpeta diferente a `frontend/`, adaptar únicamente `applyTo`.

---

# Objetivo arquitectónico

El frontend debe estar diseñado para poder agregar nuevos:

* módulos;
* páginas;
* componentes;
* formularios;
* tablas;
* dashboards;
* integraciones;
* endpoints;
* proveedores;
* mecanismos de autenticación;
* sistemas de estado;

sin tener que refactorizar módulos existentes.

La aplicación debe evitar convertirse en:

```text
components/
hooks/
services/
utils/
pages/
```

con código de todos los dominios mezclado.

La organización principal debe realizarse por **módulo de negocio**.

Ejemplos:

```text
employees
billing
documents
inventory
notifications
users
```

Cada módulo debe ser responsable de su propia:

* UI;
* estado;
* hooks;
* validaciones;
* DTOs;
* comunicación con API;
* casos de uso;
* tipos propios;
* componentes internos.

---

# Principio principal

La dirección conceptual de dependencias debe ser:

```text
Next.js App Router
        ↓
Presentation
        ↓
Application
        ↓
Domain
```

Las dependencias externas se conectan mediante adapters:

```text
                    Next.js
                       │
                       ▼
                Presentation
                       │
                       ▼
                 Application
                       │
                       ▼
                    Domain
                       ▲
                       │
                    Ports
         ┌─────────────┼──────────────┐
         │             │              │
      FastAPI       Storage       Analytics
      Adapter       Adapter        Adapter
```

El Domain y la lógica de aplicación nunca deben depender directamente de:

* Next.js;
* React;
* `fetch`;
* Axios;
* localStorage;
* sessionStorage;
* cookies;
* librerías UI;
* APIs externas.

---

# Estructura general obligatoria

Preferir:

```text
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   │
│   │   ├── (public)/
│   │   │   ├── layout.tsx
│   │   │   └── ...
│   │   │
│   │   ├── (protected)/
│   │   │   ├── layout.tsx
│   │   │   ├── employees/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [employee_id]/
│   │   │   │       └── page.tsx
│   │   │   └── ...
│   │   │
│   │   ├── error.tsx
│   │   ├── loading.tsx
│   │   └── not-found.tsx
│   │
│   ├── modules/
│   │   ├── employees/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   │
│   │   ├── billing/
│   │   │   └── ...
│   │   │
│   │   └── documents/
│   │       └── ...
│   │
│   ├── shared/
│   │   ├── components/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   │
│   └── config/
│
├── public/
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

# Regla para `src/app`

`src/app` pertenece a Next.js y debe utilizarse principalmente como:

* routing;
* layouts;
* metadata;
* loading states;
* error boundaries;
* composición de páginas;
* conexión entre rutas y módulos.

NO colocar lógica compleja del módulo directamente en `page.tsx`.

Incorrecto:

```tsx
export default async function EmployeesPage() {
    const response = await fetch(...);

    // validación
    // transformación
    // permisos
    // filtros
    // lógica de empleados
    // llamadas adicionales
    // construcción de estado

    return (...);
}
```

Correcto:

```tsx
import { EmployeesPage } from "@/modules/employees";

export default function Page() {
    return <EmployeesPage />;
}
```

`page.tsx` debe permanecer pequeño.

---

# Route Groups

Utilizar Route Groups cuando existan diferentes layouts.

Ejemplo:

```text
app/
├── (public)/
│   ├── login/
│   └── forgot-password/
│
└── (protected)/
    ├── layout.tsx
    ├── dashboard/
    ├── employees/
    └── billing/
```

Las páginas autenticadas deben usar el layout correspondiente al grupo:

```text
(protected)
```

No repetir navbar, sidebar, providers o estructura general en cada página.

---

# Estructura de un módulo

Cada módulo debe seguir aproximadamente:

```text
modules/
└── employees/
    ├── domain/
    │   ├── entities/
    │   ├── value-objects/
    │   ├── rules/
    │   └── ports/
    │
    ├── application/
    │   ├── use-cases/
    │   ├── dto/
    │   └── mappers/
    │
    ├── infrastructure/
    │   ├── api/
    │   ├── adapters/
    │   └── repositories/
    │
    ├── presentation/
    │   ├── pages/
    │   ├── components/
    │   ├── sections/
    │   ├── forms/
    │   ├── modals/
    │   ├── hooks/
    │   ├── state/
    │   └── actions/
    │
    └── index.ts
```

No es obligatorio crear todas las carpetas desde el inicio.

Crear solamente las que el módulo necesite.

Evitar arquitectura ceremonial innecesaria.

Un módulo simple podría comenzar como:

```text
employees/
├── infrastructure/
│   └── employee-api.ts
│
├── presentation/
│   ├── pages/
│   │   └── employees-page.tsx
│   └── components/
│       └── employee-card.tsx
│
└── index.ts
```

y crecer cuando la complejidad realmente lo requiera.

---

# Domain

El Domain contiene conceptos de negocio independientes de React.

Ejemplo:

```ts
export interface Employee {
    id: string;
    empresa_id: string;
    name: string;
    email: string;
    status: EmployeeStatus;
}
```

Puede contener:

* entidades;
* Value Objects;
* enums;
* reglas puras;
* tipos de dominio;
* interfaces o Ports.

No importar:

```ts
next/*
react
axios
zustand
redux
react-query
@tanstack/react-query
```

desde Domain.

---

# Application

Application contiene operaciones o casos de uso del frontend cuando exista lógica suficientemente importante para justificarlo.

Ejemplo:

```ts
export class GetEmployees {
    constructor(
        private readonly repository: EmployeeRepository,
    ) {}

    async execute(): Promise<Employee[]> {
        return this.repository.findAll();
    }
}
```

No utilizar Use Cases para simples transformaciones triviales.

Evitar crear clases únicamente para aumentar el número de capas.

Usar esta capa cuando ayude a separar:

```text
UI
↓
regla/orquestación
↓
fuente externa
```

---

# Ports

Cuando la lógica necesite una capacidad externa importante, definir el contrato primero.

Ejemplo:

```ts
export interface EmployeeRepository {
    findAll(): Promise<Employee[]>;

    findById(
        employee_id: string,
    ): Promise<Employee | null>;

    create(
        input: CreateEmployeeInput,
    ): Promise<Employee>;
}
```

La aplicación depende del Port.

No depende directamente del cliente FastAPI.

---

# Infrastructure

Infrastructure contiene integración con sistemas externos.

Ejemplos:

```text
FastAPI
localStorage
analytics
WebSocket
S3
servicios externos
```

Ejemplo:

```ts
export class FastApiEmployeeRepository
    implements EmployeeRepository {

    async findAll(): Promise<Employee[]> {
        const response = await api_client.get<EmployeeApiDto[]>(
            "/employees",
        );

        return response.map(employee_api_mapper.toDomain);
    }
}
```

Si mañana cambia FastAPI o cambia el formato de un endpoint, modificar principalmente el Adapter.

Los componentes no deberían verse afectados.

---

# Integración con FastAPI

Nunca esparcir:

```ts
fetch("https://api...")
```

por los componentes.

Incorrecto:

```tsx
function EmployeeTable() {
    useEffect(() => {
        fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/employees`,
        );
    }, []);
}
```

Preferir:

```text
Component
    ↓
Hook / Server Composition
    ↓
Application
    ↓
Repository Port
    ↓
FastAPI Adapter
```

La URL base debe estar centralizada.

Ejemplo:

```text
src/config/env.ts
```

o:

```text
src/shared/infrastructure/http/
```

---

# HTTP Client

Centralizar comportamiento HTTP común.

Ejemplo:

```text
shared/
└── infrastructure/
    └── http/
        ├── http-client.ts
        ├── http-error.ts
        └── api-client.ts
```

El cliente HTTP puede manejar:

* base URL;
* headers;
* serialización;
* errores;
* autenticación;
* tracing;
* timeout;
* refresh de sesión cuando corresponda.

No crear lógica de negocio dentro del HTTP Client.

Incorrecto:

```ts
api_client.createEmployeeAndNotifyManager()
```

Correcto:

```ts
api_client.post(...)
```

El HTTP Client es infraestructura genérica.

---

# DTOs de FastAPI

No asumir que los DTOs del backend son exactamente iguales al Domain del frontend.

Ejemplo:

```ts
interface EmployeeApiDto {
    id: string;
    empresa_id: string;
    full_name: string;
    status: string;
}
```

Mapper:

```ts
function toDomain(
    dto: EmployeeApiDto,
): Employee {
    return {
        id: dto.id,
        empresa_id: dto.empresa_id,
        name: dto.full_name,
        status: mapEmployeeStatus(dto.status),
    };
}
```

Mantener la frontera:

```text
FastAPI DTO
    ↓
Mapper
    ↓
Frontend Domain
```

Esto permite modificar contratos externos sin contaminar toda la UI.

---

# OpenAPI

Cuando sea conveniente, aprovechar el esquema OpenAPI generado por FastAPI para generar tipos o clientes TypeScript.

Sin embargo:

> Los tipos OpenAPI representan el contrato HTTP, no necesariamente el modelo de dominio del frontend.

Los tipos generados deben permanecer en Infrastructure.

Nunca hacer que toda la aplicación dependa directamente de código generado.

---

# Server Components

Utilizar Server Components por defecto cuando el componente:

* no necesite estado del navegador;
* no utilice eventos interactivos;
* no utilice APIs del navegador;
* no necesite hooks de cliente.

Preferir Server Components para:

* cargar datos iniciales;
* páginas;
* layouts;
* composición;
* contenido principalmente de lectura.

No agregar:

```ts
"use client";
```

automáticamente.

---

# Client Components

Utilizar `"use client"` únicamente cuando sea necesario.

Ejemplos:

* `useState`;
* `useEffect`;
* eventos;
* modales interactivos;
* formularios interactivos;
* drag & drop;
* APIs del navegador;
* estado cliente.

Mantener la frontera Client lo más abajo posible en el árbol de componentes.

Incorrecto:

```tsx
"use client";

export default function EntireEmployeesPage() {
    ...
}
```

cuando solamente un filtro necesita interacción.

Preferir:

```text
EmployeesPage            Server Component
├── EmployeesHeader      Server Component
├── EmployeeStats        Server Component
└── EmployeeFilters      Client Component
```

---

# Server Actions

Las Server Actions son un mecanismo de Next.js, por lo tanto no deben contener reglas centrales del Domain.

Una Action puede:

1. recibir datos;
2. validar el contrato;
3. resolver dependencias;
4. ejecutar un caso de uso;
5. revalidar datos;
6. devolver resultado.

Ejemplo conceptual:

```ts
"use server";

export async function createEmployeeAction(
    input: CreateEmployeeActionInput,
) {
    const use_case = createEmployeeUseCase();

    const result = await use_case.execute(input);

    return result;
}
```

No colocar toda la lógica de creación del empleado dentro de la Server Action.

---

# Componentes

Clasificar los componentes según su responsabilidad.

## Pages

```text
presentation/pages/
```

Orquestan la pantalla completa del módulo.

Ejemplo:

```text
employees-page.tsx
employee-details-page.tsx
```

---

# Sections

```text
presentation/sections/
```

Representan partes importantes de una página.

Ejemplos:

```text
employee-table-section.tsx
employee-filters-section.tsx
employee-statistics-section.tsx
```

---

# Components

```text
presentation/components/
```

Componentes específicos y reutilizables dentro del módulo.

Ejemplos:

```text
employee-card.tsx
employee-status-badge.tsx
employee-avatar.tsx
```

---

# Forms

```text
presentation/forms/
```

Ejemplos:

```text
create-employee-form.tsx
edit-employee-form.tsx
```

Separar:

```text
UI del formulario
```

de:

```text
ejecución del caso de uso
```

y:

```text
validaciones de negocio
```

---

# Modals

```text
presentation/modals/
```

Ejemplos:

```text
create-employee-modal.tsx
delete-employee-modal.tsx
employee-details-modal.tsx
```

Los modales específicos permanecen dentro del módulo.

No moverlos a `shared` simplemente porque sean modales.

---

# Componentes Shared

Utilizar:

```text
src/shared/components/
```

únicamente para componentes realmente reutilizables entre múltiples dominios.

Ejemplos:

```text
Button
Input
Dialog
DataTable primitives
Pagination
EmptyState
Skeleton
DatePicker
```

No colocar:

```text
EmployeeCard
InvoiceStatus
DocumentUploader
```

en `shared`.

Estos pertenecen a sus respectivos dominios.

---

# Regla de promoción a Shared

No mover un componente a `shared` anticipadamente.

Primero debe existir una necesidad real de reutilización.

Preferir:

```text
modules/employees/presentation/components/
```

antes que:

```text
shared/components/
```

cuando el componente pertenece conceptualmente a Employees.

---

# Comunicación entre módulos

Un módulo NO debe importar detalles internos de otro módulo.

Incorrecto:

```ts
import { EmployeeTable } from
    "@/modules/employees/presentation/components/employee-table";
```

desde Billing.

Incorrecto:

```ts
import { FastApiEmployeeRepository } from
    "@/modules/employees/infrastructure/api";
```

desde otro módulo.

---

# API pública del módulo

Cada módulo debe exponer explícitamente su API pública mediante:

```text
index.ts
```

Ejemplo:

```ts
export { EmployeesPage } from "./presentation/pages/employees-page";

export type {
    Employee,
} from "./domain/entities/employee";
```

Otros módulos solamente pueden importar desde:

```ts
@/modules/employees
```

Ejemplo correcto:

```ts
import {
    EmployeeSelector,
} from "@/modules/employees";
```

Evitar imports profundos entre módulos.

---

# Regla de aislamiento de módulos

Dentro de un módulo se permiten imports internos.

Entre módulos:

```text
module A
    ↓
public API de module B
```

Nunca:

```text
module A
    ↓
internal infrastructure de module B
```

Esto permite reorganizar internamente un módulo sin romper toda la aplicación.

---

# Estado

No crear estado global por defecto.

Elegir el nivel más pequeño posible.

Orden recomendado:

```text
URL
↓
Server State
↓
Local Component State
↓
Module State
↓
Global State
```

Antes de crear un store global, verificar si el problema puede resolverse con:

* URL/searchParams;
* Server Components;
* props;
* estado local;
* Context específico;
* estado del módulo.

---

# Estado global

Utilizar estado global solamente para información verdaderamente global.

Ejemplos posibles:

* sesión cliente;
* preferencias globales;
* tema;
* estado global de UI estrictamente necesario.

No almacenar automáticamente en un store global:

* empleados;
* facturas;
* documentos;
* tablas completas;
* respuestas de API.

---

# Server State

Los datos provenientes de FastAPI son Server State.

No duplicarlos innecesariamente en stores globales.

Si se utiliza una librería de server-state/cache, encapsular su uso en hooks del módulo.

Ejemplo:

```text
modules/
└── employees/
    └── presentation/
        └── hooks/
            ├── use-employees.ts
            └── use-employee.ts
```

Los componentes consumen el hook.

No deben conocer detalles de:

* query keys;
* URLs;
* Axios;
* fetch;
* headers.

---

# Hooks

Los hooks deben tener una responsabilidad clara.

Ejemplo:

```ts
useEmployees()
useEmployeeFilters()
useCreateEmployee()
```

Evitar:

```ts
useEmployeeEverything()
```

No crear hooks para funciones que no utilizan comportamiento de React.

Una función pura debe permanecer como función pura.

---

# Validación

Separar diferentes tipos de validación.

## Validación UI

Ejemplo:

```text
campo requerido
formato de email
longitud mínima
```

Puede ejecutarse en el formulario.

## Reglas de negocio

Ejemplo:

```text
un empleado suspendido no puede aprobar una factura
```

No deben depender exclusivamente de la UI.

El backend FastAPI sigue siendo la autoridad final sobre reglas de negocio.

Nunca confiar únicamente en validaciones frontend para seguridad o integridad.

---

# Formularios

Los formularios deben:

1. validar entrada;
2. mostrar errores claramente;
3. enviar Command/DTO;
4. delegar la operación;
5. manejar loading;
6. manejar success;
7. manejar error.

No mezclar en el componente:

```text
UI + HTTP + reglas + mapping + notificación + navegación
```

---

# Errores

Normalizar errores provenientes del backend.

Ejemplo:

```ts
export class ApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly code: string,
        message: string,
    ) {
        super(message);
    }
}
```

No hacer que cada componente interprete manualmente respuestas HTTP diferentes.

Centralizar errores técnicos y permitir que Presentation decida cómo mostrarlos.

---

# Loading

Usar las capacidades de Next.js cuando corresponda:

```text
loading.tsx
Suspense
skeletons
```

Los estados locales de loading deben utilizarse solamente cuando el comportamiento sea realmente cliente.

Evitar loaders de página completa innecesarios.

---

# Error Boundaries

Utilizar:

```text
error.tsx
not-found.tsx
```

cuando corresponda.

Los errores de dominio esperados deben convertirse a estados de UI comprensibles.

Los errores inesperados deben manejarse en boundaries apropiados.

---

# Naming conventions

## Archivos

Usar:

```text
kebab-case
```

Ejemplo:

```text
employee-card.tsx
create-employee-form.tsx
employee-api.ts
use-employees.ts
```

Archivos especiales de Next.js mantienen su naming oficial:

```text
page.tsx
layout.tsx
loading.tsx
error.tsx
not-found.tsx
route.ts
```

---

# Componentes React

Usar:

```text
PascalCase
```

Ejemplo:

```tsx
EmployeeCard
EmployeeTable
CreateEmployeeForm
```

---

# Variables y funciones

Usar convenciones TypeScript/JavaScript:

```text
camelCase
```

Ejemplo:

```ts
employeeId
companyId
getEmployee()
createEmployee()
```

No utilizar `snake_case` para variables TypeScript salvo cuando se represente directamente un contrato externo.

Ejemplo de DTO del backend:

```ts
interface EmployeeApiDto {
    empresa_id: string;
    created_at: string;
}
```

Al convertirlo al modelo frontend:

```ts
interface Employee {
    empresaId: string;
    createdAt: Date;
}
```

---

# Tipos e interfaces

Usar:

```text
PascalCase
```

Ejemplo:

```ts
Employee
CreateEmployeeInput
EmployeeRepository
EmployeeApiDto
```

---

# Constantes

Usar:

```text
SCREAMING_SNAKE_CASE
```

cuando representen constantes globales reales.

Ejemplo:

```ts
const DEFAULT_PAGE_SIZE = 20;
```

---

# TypeScript

TypeScript es obligatorio para código nuevo.

Evitar:

```ts
any
```

Preferir tipos explícitos.

Si el tipo es desconocido:

```ts
unknown
```

y realizar narrowing.

No utilizar assertions como:

```ts
as Employee
```

para esconder errores de tipado salvo cuando exista una justificación clara.

---

# Props

Definir tipos explícitos.

Ejemplo:

```tsx
interface EmployeeCardProps {
    employee: Employee;
    onSelect?: (employeeId: string) => void;
}
```

No pasar objetos gigantes de props cuando el componente necesita únicamente pocos valores.

---

# Imports

Utilizar alias.

Preferir:

```ts
import { Button } from "@/shared/components/button";
import { EmployeesPage } from "@/modules/employees";
```

Evitar:

```ts
../../../../../../components/button
```

---

# Dependencias externas

Antes de utilizar una librería externa dentro de lógica importante preguntarse:

> ¿El módulo necesita esta librería o necesita una capacidad?

Ejemplo:

Incorrecto:

```ts
import axios from "axios";

export async function createEmployee() {
    return axios.post(...);
}
```

Preferir:

```text
CreateEmployee
      ↓
EmployeeRepository
      ↑
FastApiEmployeeRepository
      ↓
HttpClient
```

---

# Autenticación

La autenticación debe estar centralizada.

No leer o procesar tokens manualmente en cada componente.

Separar:

```text
Authentication infrastructure
```

de:

```text
Authorization business rules
```

Ejemplo:

```text
¿Existe una sesión válida?
```

puede pertenecer a infraestructura/composición.

Pero:

```text
¿Este usuario puede aprobar esta factura?
```

es una regla del dominio y debe respetarse también en FastAPI.

El frontend nunca sustituye las verificaciones de autorización del backend.

---

# Multi-tenancy

El frontend puede conocer el tenant activo para representación y contexto.

Sin embargo:

> Nunca confiar en `empresa_id` enviado por el navegador como mecanismo de seguridad.

FastAPI debe determinar o validar el tenant autenticado.

No implementar seguridad multi-tenant únicamente ocultando botones en React.

---

# Seguridad

Nunca exponer en variables:

```text
NEXT_PUBLIC_*
```

información secreta.

Todo valor `NEXT_PUBLIC_*` debe considerarse visible para el navegador.

No colocar:

* API secrets;
* private keys;
* database credentials;
* tokens privados;

en código cliente.

---

# Variables de entorno

Centralizar acceso y validación.

Ejemplo:

```text
src/config/env.ts
```

Evitar acceder directamente a:

```ts
process.env.X
```

desde docenas de componentes.

---

# Reutilización

Priorizar composición sobre componentes gigantes con múltiples flags.

Evitar:

```tsx
<EmployeeForm
    edit
    create
    compact
    modal
    admin
    manager
    readOnly
    specialMode
/>
```

Preferir componentes pequeños y composición explícita.

---

# Componentes gigantes

Si un componente empieza a manejar:

* múltiples formularios;
* llamadas HTTP;
* modales;
* filtros;
* tablas;
* estado complejo;
* permisos;
* navegación;

separarlo.

Ejemplo:

```text
EmployeesPage
│
├── EmployeeHeader
├── EmployeeFilters
├── EmployeeTable
└── CreateEmployeeModal
```

---

# Principio de colocación

Mantener el código cerca de donde se utiliza.

Si algo solamente pertenece a Employees:

```text
modules/employees/
```

No moverlo a Shared.

Si algo pertenece solamente a EmployeeTable:

puede incluso colocarse junto al componente.

---

# Cómo agregar un nuevo módulo

Para una nueva funcionalidad importante:

1. identificar el dominio;
2. crear:

```text
src/modules/<module>/
```

3. definir sus tipos y reglas;
4. identificar las capacidades externas;
5. definir Ports cuando sea necesario;
6. implementar adapters FastAPI;
7. crear páginas y componentes internos;
8. crear su API pública `index.ts`;
9. agregar la ruta correspondiente en `src/app`;
10. crear tests.

Agregar un módulo nuevo debe requerir principalmente:

```text
crear módulo
+
crear ruta
```

y no modificar internamente módulos existentes.

---

# Cómo agregar una nueva página

Ejemplo:

```text
src/app/(protected)/employees/page.tsx
```

Debe actuar principalmente como composición:

```tsx
import {
    EmployeesPage,
} from "@/modules/employees";

export default function Page() {
    return <EmployeesPage />;
}
```

La implementación completa permanece dentro del módulo.

---

# Cómo agregar un nuevo componente

Primero determinar su alcance.

Si es específico del módulo:

```text
modules/employees/presentation/components/
```

Si es una sección:

```text
modules/employees/presentation/sections/
```

Si es un formulario:

```text
modules/employees/presentation/forms/
```

Si es un modal:

```text
modules/employees/presentation/modals/
```

Solamente colocarlo en:

```text
shared/components/
```

si realmente pertenece al sistema de UI compartido.

---

# Cómo consumir un nuevo endpoint FastAPI

No llamar directamente al endpoint desde el componente.

Seguir:

```text
1. Definir DTO
        ↓
2. Definir mapper si es necesario
        ↓
3. Definir/actualizar Port
        ↓
4. Implementar FastAPI Adapter
        ↓
5. Exponer operación mediante Application/hook
        ↓
6. Consumir desde Presentation
```

Ejemplo:

```text
Component
   ↓
useEmployees / Server Composition
   ↓
GetEmployees
   ↓
EmployeeRepository
   ↓
FastApiEmployeeRepository
   ↓
FastAPI
```

---

# Dependencias entre módulos

Antes de importar algo de otro módulo preguntarse:

> ¿Estoy consumiendo una API pública o estoy entrando a sus detalles internos?

Correcto:

```ts
import {
    EmployeeSelector,
} from "@/modules/employees";
```

Incorrecto:

```ts
import {
    EmployeeSelector,
} from "@/modules/employees/presentation/components/forms/internal/employee-selector";
```

---

# Shared

Mantener `shared` pequeño.

Puede contener:

```text
shared/
├── components/
├── domain/
├── hooks/
├── infrastructure/
├── lib/
└── types/
```

No convertir `shared` en un lugar donde colocar todo aquello cuyo dominio no se quiso determinar.

Evitar archivos gigantes:

```text
utils.ts
helpers.ts
constants.ts
types.ts
```

con responsabilidades no relacionadas.

---

# Tests

Separar pruebas según responsabilidad.

## Domain

Funciones y reglas puras.

No requieren React ni Next.js.

## Application

Probar casos de uso con Fakes de Ports.

Ejemplo:

```ts
const repository =
    new FakeEmployeeRepository();

const useCase =
    new GetEmployees(repository);
```

No requiere FastAPI real.

## Infrastructure

Probar:

* API adapters;
* mappers;
* serialización;
* error handling.

## Components

Probar comportamiento visible importante.

Evitar tests excesivamente acoplados a detalles internos del componente.

## E2E

Probar flujos críticos completos.

Ejemplos:

```text
login
crear empleado
editar empleado
emitir factura
subir documento
```

---

# Nunca hacer

* Colocar toda la aplicación dentro de `src/app`.
* Colocar lógica de negocio compleja en `page.tsx`.
* Realizar `fetch()` directamente desde docenas de componentes.
* Acoplar componentes a URLs específicas de FastAPI.
* Usar modelos HTTP como Domain automáticamente.
* Importar infraestructura interna de otro módulo.
* Crear imports profundos entre módulos.
* Crear stores globales para todo.
* Agregar `"use client"` a páginas completas sin necesidad.
* Convertir todos los componentes en Client Components.
* Colocar componentes específicos de negocio en `shared`.
* Crear `utils.ts` gigantes.
* Crear componentes de miles de líneas.
* Mezclar lógica HTTP con lógica visual.
* Mezclar validaciones de negocio con componentes.
* Guardar secretos en variables `NEXT_PUBLIC_*`.
* Confiar en el frontend para autorización.
* Confiar en `empresa_id` enviado por cliente como seguridad.
* Duplicar server state innecesariamente.
* Usar `any` para solucionar problemas de TypeScript.
* Crear dependencias circulares entre módulos.
* Acceder directamente a detalles internos de otro módulo.
* Utilizar librerías externas directamente desde Domain.
* Crear abstracciones innecesarias para código trivial.

---

# Regla para evitar sobrearquitectura

Arquitectura hexagonal NO significa crear diez archivos para cada botón.

Aplicar Ports, Adapters y Use Cases cuando exista:

* integración externa;
* lógica de negocio;
* lógica reutilizable;
* complejidad;
* posibilidad real de reemplazar implementación;
* necesidad de testing aislado.

Para UI simple:

```text
Component
```

es suficiente.

Para una operación compleja:

```text
Component
    ↓
Hook / Action
    ↓
Use Case
    ↓
Port
    ↓
Adapter
```

La arquitectura debe reducir complejidad, no aumentarla.

---

# Regla de Server vs Client

Antes de escribir `"use client"` preguntarse:

```text
¿Este componente necesita realmente ejecutarse
en el navegador?
```

Si la respuesta es NO:

usar Server Component.

Si la respuesta es SÍ:

hacer Client Component únicamente la parte interactiva necesaria.

---

# Regla para código nuevo

Antes de implementar una funcionalidad seguir:

```text
1. Identificar módulo
        ↓
2. Identificar página/feature
        ↓
3. Determinar Server vs Client
        ↓
4. Identificar lógica de negocio
        ↓
5. Identificar dependencias externas
        ↓
6. Definir Ports si son necesarios
        ↓
7. Implementar Adapter FastAPI
        ↓
8. Crear Presentation
        ↓
9. Exponer API pública del módulo
        ↓
10. Conectar con App Router
        ↓
11. Crear tests
```

---

# Relación con Backend FastAPI

Frontend y backend deben permanecer desacoplados:

```text
┌───────────────────────────────────┐
│              NEXT.JS              │
│                                   │
│   Presentation                    │
│        ↓                          │
│   Application                     │
│        ↓                          │
│   Frontend Domain                 │
│        ↓                          │
│   FastAPI Adapter                 │
└─────────────────┬─────────────────┘
                  │ HTTP
                  │
                  ▼
┌───────────────────────────────────┐
│              FASTAPI              │
│                                   │
│   Router                          │
│      ↓                            │
│   Application / Use Cases         │
│      ↓                            │
│   Backend Domain                  │
│      ↓                            │
│   Ports                           │
│      ↓                            │
│   PostgreSQL / Redis / S3         │
└───────────────────────────────────┘
```

Next.js nunca debe conocer:

* PostgreSQL;
* SQLAlchemy;
* modelos de persistencia;
* repositories del backend.

FastAPI nunca debe depender de componentes o detalles de Next.js.

La frontera entre ambos sistemas es el contrato HTTP/API.

---

# Principio final

Ante cualquier decisión arquitectónica priorizar:

1. bajo acoplamiento;
2. alta cohesión;
3. módulos independientes;
4. componentes pequeños;
5. Server Components por defecto;
6. Client Components solamente cuando sean necesarios;
7. API pública por módulo;
8. imports controlados;
9. dependencias externas detrás de adapters;
10. estado lo más local posible;
11. tipado estricto;
12. facilidad de testing;
13. facilidad para sustituir implementaciones;
14. facilidad para agregar módulos sin refactorizar los existentes;
15. simplicidad sobre abstracciones innecesarias.

La regla principal es:

> Agregar una nueva funcionalidad debe significar principalmente agregar código dentro de su módulo, no modificar componentes internos de otros módulos.

Y:

> Los módulos deben comunicarse mediante contratos públicos, nunca mediante sus detalles internos.
