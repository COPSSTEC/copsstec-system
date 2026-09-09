## applyTo: "app/**/*.py"

# Instrucciones para Backend — Python / FastAPI / Arquitectura Hexagonal

## Scope

Estas instrucciones se aplican a todo el backend ubicado dentro de `app/**/*.py`.

El proyecto utiliza:

* Python
* FastAPI
* PostgreSQL
* SQLAlchemy
* Pydantic
* Alembic
* Arquitectura Hexagonal
* Arquitectura modular
* Inyección de dependencias
* Ports & Adapters

Si una dependencia técnica cambia en el futuro, por ejemplo PostgreSQL por otro motor, Redis por otro sistema de caché, S3 por otro proveedor de almacenamiento o FastAPI por otro framework, la lógica de negocio NO debe requerir refactorización.

---

# Objetivo arquitectónico

El sistema debe permitir agregar nuevos:

* módulos;
* componentes;
* integraciones;
* proveedores externos;
* repositorios;
* endpoints;
* sistemas de almacenamiento;
* mecanismos de notificación;

sin modificar la lógica de negocio existente ni generar dependencias fuertes entre módulos.

La arquitectura debe respetar siempre la siguiente regla:

> Las capas internas nunca conocen ni dependen de las capas externas.

La lógica de negocio define lo que necesita mediante interfaces o Ports.

Las implementaciones concretas son Adapters reemplazables.

---

# Regla de dependencia

La dirección válida de dependencias es:

```text
Presentation / API
        ↓
Application
        ↓
Domain
```

Las implementaciones externas se conectan hacia dentro mediante Ports:

```text
                    ┌───────────────────────┐
                    │       FastAPI         │
                    │  Inbound Adapter      │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │      Application      │
                    │       Use Cases       │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │        Domain         │
                    │ Business Rules        │
                    └───────────────────────┘
                                ▲
                                │ Ports
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
    PostgreSQL               Redis                  S3
    SQLAlchemy               Cache                Storage
      Adapter                Adapter               Adapter
```

Nunca invertir esta dependencia.

---

# Estructura modular obligatoria

Cada funcionalidad importante debe pertenecer a un módulo independiente.

Ejemplo:

```text
app/
├── main.py
│
├── core/
│   ├── config.py
│   ├── database.py
│   ├── security.py
│   └── dependencies.py
│
├── shared/
│   ├── domain/
│   ├── application/
│   └── infrastructure/
│
└── modules/
    ├── users/
    │   ├── domain/
    │   │   ├── entities.py
    │   │   ├── value_objects.py
    │   │   ├── exceptions.py
    │   │   ├── events.py
    │   │   └── services.py
    │   │
    │   ├── application/
    │   │   ├── use_cases/
    │   │   ├── dto/
    │   │   └── ports/
    │   │       ├── user_repository.py
    │   │       ├── cache.py
    │   │       └── notification.py
    │   │
    │   ├── infrastructure/
    │   │   ├── persistence/
    │   │   │   ├── models.py
    │   │   │   └── repositories.py
    │   │   ├── cache/
    │   │   ├── notifications/
    │   │   └── storage/
    │   │
    │   └── presentation/
    │       └── api/
    │           ├── router.py
    │           ├── schemas.py
    │           └── dependencies.py
    │
    └── billing/
        └── ...
```

No crear carpetas globales como:

```text
services/
repositories/
controllers/
models/
```

para mezclar lógica de múltiples dominios.

Cada módulo debe contener sus propias piezas.

---

# 1. Domain Layer

Ruta:

```text
app/modules/<module>/domain/
```

Es el núcleo del negocio.

Puede contener:

* Entities;
* Value Objects;
* Domain Services;
* Domain Events;
* Domain Exceptions;
* reglas e invariantes del negocio.

Ejemplo:

```python
@dataclass
class Employee:
    id: UUID
    empresa_id: UUID
    name: str

    def rename(self, new_name: str) -> None:
        if not new_name.strip():
            raise InvalidEmployeeName()

        self.name = new_name.strip()
```

## El Domain NUNCA puede importar

```python
fastapi
sqlalchemy
pydantic
redis
boto3
httpx
requests
celery
```

ni ningún framework o proveedor externo.

El Domain debe poder ejecutarse y testearse únicamente con Python.

---

# 2. Application Layer

Ruta:

```text
app/modules/<module>/application/
```

Contiene los casos de uso del sistema.

Ejemplos:

```text
CreateEmployee
UpdateEmployee
DeleteEmployee
GetEmployee
ListEmployees
SendEmployeeNotification
```

Los Use Cases:

* coordinan reglas de negocio;
* utilizan entidades del Domain;
* manejan flujos de aplicación;
* llaman Ports;
* manejan transacciones mediante abstracciones cuando sea necesario.

No conocen implementaciones concretas.

Ejemplo:

```python
class CreateEmployeeUseCase:
    def __init__(
        self,
        employee_repository: EmployeeRepository,
    ) -> None:
        self.employee_repository = employee_repository

    async def execute(
        self,
        command: CreateEmployeeCommand,
    ) -> Employee:
        employee = Employee.create(
            empresa_id=command.empresa_id,
            name=command.name,
        )

        await self.employee_repository.save(employee)

        return employee
```

Nunca hacer:

```python
class CreateEmployeeUseCase:
    def __init__(self):
        self.repository = SqlAlchemyEmployeeRepository()
```

Tampoco:

```python
class CreateEmployeeUseCase:
    def __init__(self, db: AsyncSession):
        ...
```

El Use Case depende del Port, no de SQLAlchemy ni de la sesión de PostgreSQL.

---

# 3. Ports

Ruta recomendada:

```text
app/modules/<module>/application/ports/
```

Los Ports representan capacidades que la aplicación necesita del exterior.

Ejemplos:

```python
from typing import Protocol


class EmployeeRepository(Protocol):

    async def get_by_id(
        self,
        employee_id: UUID,
        empresa_id: UUID,
    ) -> Employee | None:
        ...

    async def save(
        self,
        employee: Employee,
    ) -> None:
        ...
```

Otros posibles Ports:

```text
NotificationPort
StoragePort
CachePort
PaymentGatewayPort
EmailPort
EventBusPort
UnitOfWork
FileRepository
AuditPort
ClockPort
```

Siempre que la lógica de negocio necesite comunicarse con un sistema externo, primero crear un Port.

Nunca hacer que el Use Case dependa directamente del proveedor externo.

---

# 4. Infrastructure Layer

Ruta:

```text
app/modules/<module>/infrastructure/
```

Contiene los Outbound Adapters.

Aquí sí pueden existir dependencias con:

* PostgreSQL;
* SQLAlchemy;
* Redis;
* S3;
* SMTP;
* APIs externas;
* proveedores de pago;
* proveedores de notificaciones.

Ejemplo:

```python
class SqlAlchemyEmployeeRepository(EmployeeRepository):

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def save(
        self,
        employee: Employee,
    ) -> None:
        model = EmployeeModel.from_domain(employee)

        self.session.add(model)
```

El Adapter implementa un Port definido por la aplicación.

Nunca definir la interfaz basándose en detalles internos de SQLAlchemy.

Incorrecto:

```python
class EmployeeRepository(Protocol):

    async def query(
        self,
    ) -> Select:
        ...
```

Correcto:

```python
class EmployeeRepository(Protocol):

    async def find_active_by_empresa(
        self,
        empresa_id: UUID,
    ) -> list[Employee]:
        ...
```

El Port describe necesidades del negocio, no detalles de la tecnología.

---

# 5. Presentation / FastAPI

Ruta:

```text
app/modules/<module>/presentation/api/
```

Los routers de FastAPI solamente pueden:

1. recibir HTTP;
2. validar Request;
3. obtener autenticación/autorización;
4. obtener dependencias;
5. construir Commands/Queries;
6. ejecutar un Use Case;
7. convertir el resultado a Response;
8. traducir errores conocidos a respuestas HTTP.

Ejemplo:

```python
@router.post(
    "/employees",
    response_model=EmployeeResponse,
)
async def create_employee(
    request: CreateEmployeeRequest,
    use_case: Annotated[
        CreateEmployeeUseCase,
        Depends(get_create_employee_use_case),
    ],
) -> EmployeeResponse:

    command = CreateEmployeeCommand(
        empresa_id=request.empresa_id,
        name=request.name,
    )

    employee = await use_case.execute(command)

    return EmployeeResponse.from_domain(employee)
```

El router NO contiene lógica de negocio.

---

# Pydantic

Los schemas Pydantic pertenecen a la capa Presentation.

Ejemplo:

```text
presentation/api/schemas.py
```

Pydantic debe utilizarse para:

* HTTP Request;
* HTTP Response;
* validación del contrato HTTP.

No utilizar modelos Pydantic como entidades principales del Domain salvo que exista una justificación arquitectónica explícita.

La lógica de negocio no debe depender de Pydantic.

---

# SQLAlchemy

Los modelos SQLAlchemy pertenecen exclusivamente a Infrastructure.

Ejemplo:

```text
infrastructure/persistence/models.py
```

Los modelos SQLAlchemy representan persistencia, NO el Domain.

Mantener separados:

```text
Employee
```

Domain Entity

de:

```text
EmployeeModel
```

SQLAlchemy persistence model.

Nunca pasar `EmployeeModel` fuera de Infrastructure.

Convertir:

```text
SQLAlchemy Model → Domain Entity
Domain Entity → SQLAlchemy Model
```

dentro del Adapter correspondiente.

---

# PostgreSQL

Todas las consultas PostgreSQL deben realizarse exclusivamente mediante Adapters de Infrastructure.

Preferir:

```text
SQLAlchemy 2.x
```

y sesiones async cuando el proyecto esté configurado como asíncrono.

Nunca realizar consultas SQL o SQLAlchemy desde:

```text
domain/
application/
presentation/
```

Las migraciones deben manejarse mediante Alembic.

---

# Multi-tenancy

Toda entidad o tabla propiedad de una empresa debe estar asociada a:

```text
empresa_id
```

No es obligatorio agregar `empresa_id` a tablas verdaderamente globales del sistema.

Ejemplos de tablas globales podrían ser:

```text
countries
currencies
system_permissions
```

si realmente no pertenecen a una empresa.

Toda operación sobre datos tenant-aware debe garantizar aislamiento por `empresa_id`.

Incorrecto:

```python
await repository.get_by_id(employee_id)
```

cuando el recurso pertenece a una empresa.

Correcto:

```python
await repository.get_by_id(
    employee_id=employee_id,
    empresa_id=current_tenant.empresa_id,
)
```

Nunca confiar únicamente en un `empresa_id` enviado desde el body del cliente.

El tenant debe obtenerse del contexto autenticado cuando corresponda.

---

# Inyección de dependencias

La composición de implementaciones concretas ocurre únicamente en el Composition Root.

Ejemplos válidos:

```text
app/core/dependencies.py

app/modules/users/presentation/api/dependencies.py
```

Ejemplo:

```python
async def get_employee_repository(
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
) -> EmployeeRepository:
    return SqlAlchemyEmployeeRepository(session)


async def get_create_employee_use_case(
    repository: Annotated[
        EmployeeRepository,
        Depends(get_employee_repository),
    ],
) -> CreateEmployeeUseCase:
    return CreateEmployeeUseCase(
        employee_repository=repository,
    )
```

Router:

```python
@router.post("/employees")
async def create_employee(
    request: CreateEmployeeRequest,
    use_case: Annotated[
        CreateEmployeeUseCase,
        Depends(get_create_employee_use_case),
    ],
):
    return await use_case.execute(...)
```

Nunca instanciar implementaciones concretas dentro de:

* Domain;
* Use Cases;
* Entities;
* Domain Services.

---

# Regla para dependencias externas

Antes de utilizar cualquier servicio externo preguntarse:

> ¿Mi lógica de negocio necesita esta tecnología o necesita una capacidad?

Ejemplo incorrecto:

```python
class SendDocumentUseCase:
    def __init__(self):
        self.s3 = boto3.client("s3")
```

Correcto:

```python
class StoragePort(Protocol):

    async def upload(
        self,
        file: bytes,
        path: str,
    ) -> str:
        ...
```

Después Infrastructure implementa:

```python
class S3StorageAdapter(StoragePort):
    ...
```

Si mañana S3 cambia por Azure Blob Storage, solamente se reemplaza el Adapter.

El Use Case permanece igual.

---

# Comunicación entre módulos

Los módulos deben estar desacoplados.

Por ejemplo:

```text
users
billing
documents
notifications
inventory
```

Un módulo NO puede acceder directamente a:

```text
otro_modulo.infrastructure
otro_modulo.repositories
otro_modulo.persistence.models
```

Incorrecto:

```python
from app.modules.users.infrastructure.persistence.models import UserModel
```

desde `billing`.

Incorrecto:

```python
from app.modules.users.infrastructure.repositories import (
    SqlAlchemyUserRepository,
)
```

Correcto:

Los módulos se comunican mediante:

1. interfaces públicas de Application;
2. Ports;
3. Domain/Application Events;
4. Commands;
5. Queries;
6. una fachada pública explícita del módulo.

Por ejemplo:

```text
Billing → UserReaderPort → Users Adapter
```

o mediante eventos:

```text
EmployeeCreated
        ↓
NotificationHandler
```

No acceder directamente a las tablas internas de otro módulo.

---

# API pública de cada módulo

Cada módulo debe exponer únicamente aquello que otros módulos realmente necesitan.

Evitar imports profundos como:

```python
from app.modules.users.application.use_cases.internal.foo.bar import X
```

Preferir contratos públicos claros.

Ejemplo:

```text
app/modules/users/public.py
```

cuando sea necesario ofrecer una API interna estable a otros módulos.

Los detalles internos del módulo deben poder cambiar sin romper otros módulos.

---

# Eventos

Cuando una acción produzca efectos secundarios que no forman parte del resultado principal del caso de uso, preferir eventos.

Ejemplo:

```text
EmployeeCreated
       │
       ├──► SendWelcomeEmailHandler
       ├──► AuditHandler
       └──► InvalidateEmployeeCacheHandler
```

Esto evita que:

```text
CreateEmployeeUseCase
```

dependa directamente de email, auditoría o caché.

Los eventos no deben utilizarse para ocultar lógica crítica que necesite consistencia transaccional inmediata.

---

# Caché

El Domain y Application no dependen directamente de Redis.

Definir un Port cuando sea necesario:

```python
class CachePort(Protocol):

    async def get(
        self,
        key: str,
    ) -> object | None:
        ...

    async def set(
        self,
        key: str,
        value: object,
        ttl: int,
    ) -> None:
        ...

    async def delete(
        self,
        key: str,
    ) -> None:
        ...
```

Redis será solamente un Adapter.

La invalidación de caché puede realizarse mediante Application Events cuando corresponda.

No agregar caché automáticamente a todas las consultas.

Usarlo únicamente cuando exista una necesidad real de rendimiento.

---

# Notificaciones

La aplicación no debe depender de un proveedor concreto.

Definir:

```python
class NotificationPort(Protocol):

    async def send(
        self,
        notification: Notification,
    ) -> None:
        ...
```

Después crear Adapters como:

```text
EmailNotificationAdapter
SmsNotificationAdapter
FirebaseNotificationAdapter
WhatsAppNotificationAdapter
```

El caso de uso no necesita saber cuál proveedor se está utilizando.

---

# Archivos y almacenamiento

Nunca utilizar S3 directamente desde un Use Case.

Definir un Port:

```python
class StoragePort(Protocol):

    async def upload(
        self,
        content: bytes,
        path: str,
    ) -> StoredFile:
        ...

    async def delete(
        self,
        path: str,
    ) -> None:
        ...
```

Implementaciones posibles:

```text
S3StorageAdapter
LocalStorageAdapter
AzureBlobStorageAdapter
```

---

# Transacciones

Cuando un Use Case necesite coordinar múltiples escrituras, utilizar un patrón Unit of Work si la complejidad lo justifica.

Ejemplo conceptual:

```python
class UnitOfWork(Protocol):

    async def commit(self) -> None:
        ...

    async def rollback(self) -> None:
        ...
```

Application conoce el Port.

Infrastructure implementa la transacción con SQLAlchemy.

No acoplar el caso de uso a:

```python
session.commit()
session.rollback()
```

---

# Convenciones de código Python

## Variables y propiedades

Usar:

```text
snake_case
```

Ejemplo:

```python
user_name
empresa_id
employee_repository
```

## Funciones y métodos

Usar:

```text
snake_case
```

Ejemplo:

```python
create_employee()
get_employee_by_id()
```

Nunca utilizar camelCase para métodos Python.

## Classes

Usar:

```text
PascalCase
```

Ejemplo:

```python
CreateEmployeeUseCase
EmployeeRepository
SqlAlchemyEmployeeRepository
```

## Constantes

Usar:

```text
SCREAMING_SNAKE_CASE
```

Ejemplo:

```python
DEFAULT_PAGE_SIZE = 50
```

## Base de datos

Campos PostgreSQL:

```text
snake_case
```

Ejemplo:

```text
empresa_id
created_at
created_by
deleted_at
```

---

# Naming de Use Cases

Preferir nombres orientados a intención:

```text
CreateEmployeeUseCase
UpdateEmployeeUseCase
DeleteEmployeeUseCase
GetEmployeeUseCase
ListEmployeesUseCase
```

Evitar Services genéricos como:

```text
EmployeeService
GeneralService
DatabaseService
UtilsService
```

Un Use Case debe representar una acción concreta del sistema.

---

# Commands y Queries

Cuando un Use Case necesite varios parámetros, agruparlos.

Ejemplo:

```python
@dataclass(frozen=True)
class CreateEmployeeCommand:
    empresa_id: UUID
    name: str
    email: str
```

Después:

```python
await use_case.execute(command)
```

Esto evita firmas gigantes y facilita evolución del código.

---

# Excepciones

El Domain y Application deben utilizar excepciones propias del negocio.

Ejemplo:

```python
class EmployeeNotFound(Exception):
    pass
```

El Domain nunca debe lanzar:

```python
HTTPException
```

FastAPI traduce la excepción en Presentation:

```text
EmployeeNotFound
        ↓
404 HTTP
```

De esta forma el negocio no depende de HTTP.

---

# Autenticación y autorización

FastAPI puede encargarse de obtener la identidad autenticada.

Sin embargo, las reglas de autorización de negocio deben vivir en Application o Domain cuando correspondan.

Ejemplo:

```text
"¿El JWT es válido?"
```

puede ser infraestructura/presentation.

Pero:

```text
"¿Este empleado puede aprobar esta factura?"
```

es una regla de negocio y no debe estar en el router.

---

# Shared

La carpeta:

```text
app/shared/
```

debe mantenerse mínima.

Solo colocar allí elementos realmente compartidos por múltiples dominios.

Ejemplos posibles:

```text
EntityId
Money
Pagination
DomainEvent
Clock
```

Nunca mover código a `shared` únicamente porque dos módulos tienen código parecido.

Duplicación pequeña es preferible a crear acoplamiento incorrecto.

No crear un `utils.py` gigante.

---

# Cómo crear un nuevo módulo

Cuando se solicite una nueva funcionalidad importante:

1. Determinar a qué dominio pertenece.

2. Si constituye una responsabilidad independiente, crear:

```text
app/modules/<new_module>/
```

3. Crear primero el Domain.

4. Identificar los Use Cases.

5. Identificar las capacidades externas necesarias.

6. Crear Ports para dichas capacidades.

7. Implementar Adapters en Infrastructure.

8. Crear schemas HTTP en Presentation.

9. Crear router FastAPI.

10. Crear el wiring mediante `Depends()`.

11. Registrar únicamente el router del nuevo módulo en la aplicación principal.

12. Crear migraciones Alembic si son necesarias.

13. Crear tests.

Agregar un nuevo módulo NO debe requerir modificar la lógica interna de otros módulos.

Idealmente solamente debe ser necesario registrar:

```python
app.include_router(new_module_router)
```

o registrar sus dependencias/event handlers en el Composition Root.

---

# Cómo agregar un nuevo endpoint

Para agregar un endpoint:

1. Identificar el módulo correspondiente.

2. Crear o reutilizar un Use Case.

3. Crear Request/Response schemas en Presentation.

4. Definir Ports si aparece una nueva dependencia externa.

5. Implementar los Adapters necesarios.

6. Crear wiring de dependencias.

7. Agregar el endpoint al router del módulo.

Ejemplo:

```python
router = APIRouter(
    prefix="/employees",
    tags=["employees"],
)
```

Nunca implementar primero el endpoint y después poner toda la lógica dentro del router.

---

# Procedimiento obligatorio cuando aparece una nueva dependencia

Antes de importar una librería externa dentro de Application o Domain:

1. detener la implementación;
2. identificar qué capacidad necesita realmente el negocio;
3. definir un Port;
4. hacer que el Use Case dependa del Port;
5. implementar la librería externa como Adapter;
6. conectar el Adapter en el Composition Root.

Ejemplo:

```text
Necesito Stripe
```

NO significa:

```text
Application → Stripe
```

Debe convertirse en:

```text
Application
     ↓
PaymentGatewayPort
     ↑
StripePaymentAdapter
```

---

# Procedimiento obligatorio cuando un módulo necesita otro módulo

Nunca importar directamente repositorios, modelos SQLAlchemy o componentes internos del segundo módulo.

Preguntarse:

```text
¿Qué información o capacidad necesita el módulo A del módulo B?
```

Crear un contrato específico.

Ejemplo:

```python
class UserReaderPort(Protocol):

    async def get_user(
        self,
        user_id: UUID,
        empresa_id: UUID,
    ) -> UserSummary | None:
        ...
```

El módulo consumidor depende solamente de ese contrato.

---

# Tests

La arquitectura debe permitir probar el negocio sin PostgreSQL ni FastAPI.

## Domain Tests

No utilizan infraestructura.

```text
Domain → unit tests puros
```

## Application Tests

Utilizar Fakes, Stubs o Mocks de Ports.

Ejemplo:

```python
repository = FakeEmployeeRepository()

use_case = CreateEmployeeUseCase(
    employee_repository=repository,
)
```

No levantar PostgreSQL para probar un Use Case salvo que sea un test de integración.

## Infrastructure Tests

Probar:

```text
SQLAlchemy repositories
Redis adapters
S3 adapters
external API adapters
```

mediante tests de integración.

## API Tests

Probar contratos HTTP y wiring con FastAPI.

---

# Dependencias permitidas por capa

## Domain

Puede depender de:

```text
Python standard library
otros elementos del mismo Domain
shared/domain
```

No puede depender de:

```text
Application
Infrastructure
Presentation
FastAPI
Pydantic
SQLAlchemy
```

## Application

Puede depender de:

```text
Domain
Application Ports
shared/application
```

No puede depender de:

```text
Infrastructure
FastAPI
SQLAlchemy
Redis
S3
```

## Infrastructure

Puede depender de:

```text
Domain
Application
Ports
SQLAlchemy
Redis
S3
APIs externas
```

## Presentation

Puede depender de:

```text
Application
FastAPI
Pydantic
Composition Root
```

Presentation no debe implementar reglas de negocio.

---

# Nunca hacer

* Poner lógica de negocio en routers FastAPI.
* Poner lógica de negocio en modelos SQLAlchemy.
* Usar modelos SQLAlchemy como entidades del Domain.
* Importar FastAPI dentro del Domain.
* Importar SQLAlchemy dentro del Domain o Application.
* Inyectar `AsyncSession` directamente a Use Cases.
* Instanciar repositorios concretos dentro de Use Cases.
* Instanciar clientes de APIs externas dentro de Use Cases.
* Acceder al repository de otro módulo directamente.
* Consultar tablas de otro módulo directamente.
* Crear dependencias circulares entre módulos.
* Crear Services globales que acumulen múltiples responsabilidades.
* Crear `utils.py` con lógica de negocio.
* Acoplar el Domain a Pydantic.
* Lanzar `HTTPException` desde Domain o Application.
* Acceder directamente a Redis desde Application.
* Acceder directamente a S3 desde Application.
* Acoplar casos de uso a proveedores de email, SMS, pagos o almacenamiento.
* Crear un Port basado en métodos específicos de una tecnología.
* Compartir modelos de persistencia entre módulos.
* Saltarse el aislamiento por `empresa_id`.
* Modificar un módulo existente solamente para acceder a sus detalles internos desde otro módulo.

---

# Principio principal para generar código

Antes de escribir código nuevo seguir siempre esta secuencia:

```text
1. Identificar dominio/módulo
        ↓
2. Identificar regla o Use Case
        ↓
3. Identificar dependencias externas
        ↓
4. Definir Ports
        ↓
5. Implementar lógica en Domain/Application
        ↓
6. Implementar Adapters
        ↓
7. Realizar Dependency Injection
        ↓
8. Exponer mediante FastAPI
        ↓
9. Crear tests
```

Nunca comenzar desde PostgreSQL o desde el router.

Comenzar desde la necesidad del negocio.

---

# Regla de extensibilidad

El código debe diseñarse bajo esta premisa:

> Agregar una nueva implementación debe requerir agregar código, no modificar la lógica de negocio estable.

Ejemplo:

Hoy:

```text
NotificationPort
      ↑
EmailAdapter
```

Mañana:

```text
NotificationPort
      ↑
├── EmailAdapter
├── WhatsAppAdapter
└── SmsAdapter
```

`SendNotificationUseCase` no debe modificarse por el simple hecho de agregar un proveedor.

---

# Regla final

Ante cualquier duda arquitectónica, priorizar en este orden:

1. bajo acoplamiento;
2. alta cohesión;
3. Domain independiente;
4. módulos independientes;
5. dependencia hacia abstracciones;
6. Ports pequeños y específicos;
7. Adapters reemplazables;
8. composición explícita de dependencias;
9. facilidad de testing;
10. facilidad para agregar funcionalidades sin refactorizar módulos existentes.

Si una implementación viola estos principios, refactorizar la solución antes de agregar más dependencias sobre ella.
