# Firebase Storage

Las fotos, PDF y comprobantes que sube la API se guardan en Firebase Storage cuando `FIREBASE_STORAGE_BUCKET` tiene valor. Si esa variable está vacía, el API sigue escribiendo en disco (`storage/` y `/media/...`). Así puedes probar en local sin credenciales y, con las mismas variables, usar Firebase en pruebas reales y en producción.

La URL que queda en la base no caduca. No es una URL firmada: lleva un token de descarga fijo y se abre directo en el navegador, sin que el servidor genere un enlace nuevo en cada lectura.

Cada objeto se nombra así:

```text
{prefijo}/{modulo}/{id-de-la-base}/{tipo}/{timestamp}_{uuid}.ext
```

Ejemplo: `dev/membership/42/photos/20261019T183045123456Z_ab12cd.jpg`.

En los metadatos del objeto van `dbId` y `uploadedAt`. Con el id y la hora puedes encontrar el archivo en la consola de Firebase sin otra configuración.

Los archivos que ya están en disco, con rutas `/media/...`, se siguen sirviendo como hasta ahora. Este cambio no los mueve.

## 1. Crear el proyecto

1. Entra a [Firebase console](https://console.firebase.google.com/) y crea un proyecto, o usa el que ya tenga COPSSTEC.
2. En el menú, abre **Build → Storage** y pulsa **Get started**.
3. Elige el modo de producción. Las subidas las hace el API con la cuenta de servicio, no el navegador.
4. Anota el nombre del bucket. Suele ser `tu-proyecto.appspot.com` o `tu-proyecto.firebasestorage.app`. Lo verás en la ficha del bucket, arriba.

No hace falta publicar el bucket ni poner reglas de lectura pública. Quien tenga la URL con el token puede bajar el archivo; quien no la tenga, no.

## 2. Cuenta de servicio

1. En Firebase, abre el engrane **Project settings → Service accounts**.
2. Pulsa **Generate new private key** y descarga el JSON.
3. Guarda ese archivo fuera del repositorio, por ejemplo:

```text
backend/firebase-credentials.json
```

Ese nombre ya está en `.gitignore`. No lo subas a git ni lo pegues en el chat.

En Google Cloud, la cuenta necesita el rol **Storage Object Admin** (`roles/storage.objectAdmin`) sobre el bucket. La clave que genera Firebase ya lo trae para el bucket del proyecto.

## 3. Variables en local y en pruebas

En `backend/.env`:

```text
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_STORAGE_PREFIX=dev
GOOGLE_APPLICATION_CREDENTIALS=/ruta/absoluta/a/firebase-credentials.json
```

`FIREBASE_STORAGE_PREFIX` separa los objetos dentro del mismo bucket. Usa `dev` mientras pruebas y `prod` en el servidor. Si lo dejas vacío, el API usa `dev`, y `prod` solo cuando `APP_ENV` es `production` o `prod`.

Reinicia el API después de cambiar el `.env`.

Para comprobarlo, sube una foto de miembro o un PDF de afiliación. En la base, la columna (`foto_id`, `voucher_path`, `file_path`, etc.) debe empezar por `https://firebasestorage.googleapis.com/` y contener `alt=media&token=`. En la consola de Storage verás la carpeta `dev/` y, dentro, el id del registro.

Si dejas `FIREBASE_STORAGE_BUCKET` vacío, no hace falta el JSON: pytest y el API local siguen guardando en disco.

## 4. Producción

En el hosting del API define las mismas variables. No subas el archivo JSON al repositorio. Puedes usar la ruta del archivo:

```text
APP_ENV=production
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_STORAGE_PREFIX=prod
GOOGLE_APPLICATION_CREDENTIALS=/secrets/firebase-credentials.json
```

O, si el proveedor solo acepta variables de texto, pega el JSON en una sola línea:

```text
FIREBASE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

Si están las dos, se usa `FIREBASE_CREDENTIALS_JSON`.

Puedes usar el mismo proyecto de Firebase para pruebas y producción: el prefijo `dev` o `prod` los separa. Si prefieres aislarlos del todo, crea otro proyecto y otro bucket y cambia solo `FIREBASE_STORAGE_BUCKET`.

## 5. Qué no entra aquí

Los logos, el landing y las imágenes del boletín viven en `frontend/public`. No los sube ningún servicio y no pasan por Firebase.
