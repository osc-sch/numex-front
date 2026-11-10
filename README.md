# Registro de alumnos y docentes

El formulario de `/register` crea la cuenta y el perfil mediante
`POST /api/auth/register`. En el segundo paso se elige Alumno o Docente y se
envía `tipo_cuenta` (`alumno` o `docente`). El backend asigna el rol `3` o `2`,
respectivamente, y calcula el ciclo según la institución y el año escolar.
Las credenciales y `tipo_cuenta` se envían en la raíz del JSON; los datos
personales y escolares van agrupados dentro de `profile`.
Para docentes, el año corresponde al curso en el que enseñan. Los alumnos usan
`profile_alumno` y los docentes su propio modelo `profile_docente`.
La sesión vincula el perfil con `user.id_profile` o, en el esquema anterior
de docentes, `user.id_profile_docente`; el estado de diagnóstico solo se
requiere para alumnos.
Es necesario actualizar también `NUMEX-BACKEND` para que respete esta selección.
Si la base ya existe, detené el backend y ejecutá allí
`npm run migrate:teacher-profiles` antes de reiniciarlo. La migración conserva
las cuentas y los cursos de los docentes registrados; ver `NUMEX-BACKEND/AUTH.md`.
La foto es opcional y se guarda como una URL HTTP/HTTPS.

Al seleccionar **Docente** aparece el campo obligatorio **Código de verificación**.
Se envía como `codigo_verificacion` y el backend lo compara con una clave activa
de la tabla `registration_codes`. La clave es reutilizable y no se envía por email.
Los alumnos no necesitan código. La clave válida no se incluye en el frontend.

Antes de registrar docentes, creá la tabla y cargá tu clave siguiendo
`NUMEX-BACKEND/AUTH.md`, sección **Clave de verificación para docentes**.
En la base se guarda su hash SHA-256; en el formulario se ingresa la clave original.

Para probarlo:

1. En `NUMEX-BACKEND`, configurá la base MySQL y `JWT_SECRET` según `AUTH.md`
   y ejecutá `npm run dev`.
2. En este proyecto, ejecutá `npm run dev` y abrí `/register`.
   El proxy ya apunta a `http://127.0.0.1:3000`. Si cambia el destino,
   copiá `.env.example` a `.env.local`, ajustá `BACKEND_URL` y reiniciá Vite.
3. Completá ambos pasos e ingresá la clave si elegiste Docente.
   Una respuesta exitosa muestra la confirmación en
   `/login`; un error mantiene los datos para corregirlos o reintentar.

Se validan la confirmación de contraseña, la fecha de nacimiento, el DNI y
el año escolar. La API devuelve `409` para email o DNI duplicados y guarda
el perfil y la cuenta dentro de una misma transacción.

En producción, configurá el servidor web para reenviar
`/api/auth` al backend en el mismo origen; el proxy de desarrollo de Vite
no forma parte de los archivos compilados.

Pruebas del frontend: `node --test tests/*.test.js`. Validaciones adicionales:
`npm run lint` y `npm run build`.

# Inicio y cierre de sesión

`/login` envía usuario o email como `user_name` y la contraseña a
`POST /api/auth/login`, y luego consulta
`GET /api/auth/profile` para confirmar la sesión y cargar el perfil según su rol.
La API mantiene la sesión durante una hora mediante una cookie HttpOnly.
No se guardan contraseñas ni tokens en localStorage ni se imprimen en consola.

Al ingresar, se vuelve a la página protegida que se había intentado abrir o
a Inicio. La sesión se recupera al recargar y se comprueba al volver a la pestaña
y cada minuto. Si vence, se vuelve al login. Si hay un problema de conexión,
se muestra un error con la opción de reintentar.
Si `GET /api/auth/profile` responde `404`, se vuelve al login con un aviso;
las rutas privadas siguen protegidas hasta que el backend permita verificar
la sesión.

El menú muestra el nombre y la foto del perfil y permite **Cerrar sesión**
mediante `POST /api/auth/logout`. El saludo y los datos enviados al diagnóstico
usan el alumno autenticado. Las opciones de recordar sesión por más tiempo
y recuperar contraseña quedan pendientes de soporte en el backend.

# Vista del docente

Las cuentas con `user.id_rol === 2` ingresan a un inicio propio con su nombre,
año de referencia y ciclo. El menú ofrece **Inicio**, **Mis cursos**,
**Alumnos**, **Actividades**, **Progreso del grupo** y **Biblioteca**.

En **Mis cursos** (`/teacher/courses`) el docente puede crear cursos con
**Curso**, **Materia** y **Descripción** opcional. El servidor genera un código
de acceso único de 12 caracteres y vincula el curso al docente autenticado.
El listado permite copiar el código, abrir un curso para editarlo o eliminarlo
con confirmación. Un error al guardar conserva los datos del formulario para
reintentar.

El frontend usa `GET` y `POST /api/courses`, `GET /api/courses/:id`,
`PUT /api/courses/:id` y `DELETE /api/courses/:id`. Reiniciá el backend para
que Mongoose cree las colecciones necesarias.
Vite reenvía `/api/courses` a `BACKEND_URL`, igual que `/api/auth`.
En producción deben reenviarse ambas rutas al backend desde el mismo origen.
Los alumnos pueden inscribirse con `POST /api/courses/join`, enviando
`codigo_acceso`, y consultar sus cursos con `GET /api/courses/enrolled`.
Ambos endpoints requieren sesión de alumno. Se aceptan códigos de 10 a 12
caracteres hexadecimales para admitir los códigos existentes. Las inscripciones
se guardan separadas de los cursos y no se duplican al volver a usar un código.
Al abrir un curso, `GET /api/courses/enrolled/:id` devuelve su descripción,
materia y docente solo si el alumno está inscripto.
Desde **Secciones**, el docente propietario puede crear, editar, ocultar y
eliminar contenidos. Los alumnos inscriptos ven únicamente las secciones
visibles mediante `GET /api/courses/:courseId/sections`.
Dentro de cada sección, el docente puede publicar materiales con título,
descripción, contenido de texto/Markdown y enlace opcional. Puede editar,
ocultar y eliminar publicaciones. Los alumnos inscriptos solo reciben
publicaciones visibles de secciones visibles. Se usan `POST
/api/courses/:courseId/sections/:sectionId/posts` y `GET
/api/courses/:courseId/sections/:sectionId/posts`, más `GET`, `PUT` y `DELETE`
para `/api/courses/:courseId/sections/:sectionId/posts/:postId`. En la vista del
alumno, cada sección se despliega desde su título. Sus materiales y actividades
se ordenan juntos en una fila horizontal de tarjetas; cada tarjeta abre el
contenido correspondiente.

Las actividades se administran por separado desde **Actividades** dentro de
cada sección. El docente puede crear y editar borradores, publicar, duplicar y
reordenar preguntas, agregar opciones ilimitadas y eliminar actividades con
confirmación. Por ahora cada ejercicio es de selección única. La publicación
valida que cada pregunta tenga enunciado, dos o más opciones completas y una
respuesta correcta. Los borradores pueden guardarse sin preguntas completas;
las preguntas incompletas no se envían hasta que puedan validarse.
Se usan `GET` y `POST` en `/api/courses/:courseId/sections/:sectionId/activities`,
`GET`, `PUT` y `DELETE` en
`/api/courses/:courseId/sections/:sectionId/activities/:activityId`, y `POST`
en `/api/courses/:courseId/sections/:sectionId/activities/:activityId/submit`.
El editor también permite generar un borrador con archivos y una instrucción
opcional mediante el webhook externo de IA. Los archivos admitidos son PDF,
TXT, DOCX e imágenes de hasta 20 MB cada uno. Se envían como `FormData` bajo
los campos `archivo1`, `archivo2`, etc. y `prompt`; la respuesta JSON se muestra
en una vista legible y en bruto, se puede copiar/descargar y, si coincide con
el esquema de actividad, cargar en el editor para revisión. La URL se puede
configurar con `VITE_WEBHOOK_URL`; si no se define, se usa el webhook de NUMEX.
El envío no guarda ni publica automáticamente, y la interfaz advierte que no
se suba información personal o confidencial.
Los alumnos ven las actividades publicadas en secciones visibles y las
resuelven pregunta por pregunta. El frontend inicia o recupera el intento
activo en el backend, envía cada respuesta con un `requestId` idempotente
(que se conserva si se reintenta la misma respuesta) y muestra la pista,
explicación o confirmación devuelta por el servidor. Las
preguntas incorrectas vuelven a la cola según el orden del backend. El progreso
se recupera al volver a la actividad y el abandono solo se registra mediante
la acción explícita **Abandonar actividad**. Al completar se muestran las
preguntas completadas, las respuestas enviadas, correctas, incorrectas y los
aciertos al primer intento; no se presenta como calificación académica.
La resolución usa `POST /api/activities/:activityId/attempts` para iniciar o
reanudar, `GET /api/attempts/:attemptId` para consultar progreso,
`POST /api/attempts/:attemptId/answers` para registrar una respuesta y
`POST /api/attempts/:attemptId/abandon` para el abandono explícito.

El seguimiento docente está disponible desde **Seguimiento** en cada actividad.
Usa las rutas `GET /api/activities/:activityId/statistics`,
`GET /api/activities/:activityId/attempts` y
`GET /api/attempts/:attemptId/events`. Solo el docente propietario puede
consultarlas según el backend. Estadísticas, intentos e interacciones incluyen
la identidad del alumno; la interfaz muestra nombre completo y usa username
como respaldo. La sección **Preguntas con más dificultades** utiliza las
métricas agregadas completas del endpoint de estadísticas (errores,
participantes, aciertos al primer intento y promedio de errores), sin derivarlas
de la página de intentos cargada. La distribución por pregunta muestra los
conteos de selecciones, incluidos reintentos, y distingue la opción correcta;
por eso el total de selecciones no equivale al número de estudiantes. El
historial muestra hasta 200 interacciones por consulta, límite que impone el
endpoint.

En el curso del alumno, cada actividad muestra el estado `pendiente`,
`en_progreso` o `completada` proporcionado en `progresoAlumno` por
`GET /api/courses/:courseId/sections/:sectionId/activities`. Al regresar desde
la actividad, el listado vuelve a consultar el backend para reflejar el intento
completado; el estado no depende de almacenamiento local. Las actividades
completadas siguen pudiéndose abrir, y el endpoint de intentos inicia una nueva
práctica o reanuda una que ya esté en curso.

**Progreso del grupo** sigue indicando **En preparación**. La biblioteca y sus
recursos existentes sí se pueden consultar.

Las rutas de desafíos, diagnóstico y progreso individual corresponden a la
vista de alumnos; si un docente abre una de ellas, vuelve a su inicio.
Un alumno que abre `/teacher/...` también vuelve a su propio inicio.
La selección de vistas usa el rol de la sesión autenticada; no concede
permisos adicionales en la API.

# Diagnóstico con n8n

El test no bloquea la navegación ni abre un modal automáticamente. Si
`profile.test_diagnostic_completed` es `false` para un alumno, Inicio muestra
un botón opcional para comenzar el diagnóstico. El campo se recibe en
`GET /api/auth/profile` y debe llegar como booleano JSON.

Iniciar el diagnóstico no modifica el estado de la base;
ese estado debe actualizarse desde el backend cuando corresponda.

El botón **Iniciar test de diagnóstico** de Inicio envía un `POST` con:

```json
{
  "nombre": "Jose",
  "anio_curso": 4,
  "habilidades": [],
  "dificultades": []
}
```

`nombre` y `anio_curso` se completan con el perfil del alumno autenticado;
los valores del ejemplo son ilustrativos.

Para probarlo en desarrollo:

1. Ejecutá `npm run dev` (o `npm.cmd run dev` en PowerShell).
2. En n8n, configurá el nodo Webhook con método `POST` y ruta `crear_actividades`.
3. Pulsá **Listen for test event** o **Execute workflow** antes del envío.
4. En Inicio, pulsá **Iniciar test de diagnóstico**.

La URL configurada es `https://osc-sch.app.n8n.cloud/webhook-test/crear_actividades`.
El webhook de prueba debe estar escuchando. Si n8n devuelve `404`, se muestra
un error en Inicio y se puede seguir navegando sin iniciar el diagnóstico.
`The requested webhook "crear_actividades" is not registered`, volvé a iniciar
la escucha antes de reintentar. La respuesta de n8n se registra en la consola del
navegador cuando ocurre un error.

En desarrollo, `/api/diagnostic` se reenvía al webhook mediante el proxy de Vite
para evitar el bloqueo CORS del navegador. Reiniciá Vite si no toma el cambio.
Este proxy solo se usa con `npm run dev`. La compilación de producción sigue
llamando directamente a la URL de n8n y requiere que n8n permita el origen del sitio.
Para un uso permanente, publicá el flujo y configurá su **Production URL** en
`src/pages/HomePage.jsx` y en el proxy de `vite.config.js`.

El test muestra las preguntas recibidas de la API. El archivo
`src/data/diagnostic-test.json` queda como ejemplo del formato interno y no se carga en la sesión.

La respuesta debe ser un objeto con `preguntas` o un arreglo que contenga ese objeto:

```json
{
  "test_id": "DIAG_JOSE_001",
  "titulo": "Diagnóstico de matemática",
  "alumno": { "nombre": "Jose", "anio_ingreso": 4 },
  "preguntas": [
    {
      "pregunta_id": "P001",
      "habilidad_id": "MAT_1A_C1_H01",
      "anio_origen": 3,
      "eje": "Álgebra",
      "enunciado": "¿Cuánto vale x si x + 2 = 5?",
      "opciones": {
        "A": "3",
        "B": "7"
      },
      "respuesta_correcta": "A",
      "explicaciones_incorrectas": {
        "B": "Restá 2 a ambos lados."
      }
    }
  ]
}
```

Cada pregunta necesita un `pregunta_id` único, un `enunciado` y al menos dos
`opciones`. Cuando las opciones son textos, `respuesta_correcta` debe indicar una
clave existente; `explicaciones_incorrectas` puede aportar la explicación de cada error.
El frontend convierte estos campos a `{ texto, Correct, feedback }` para
`ActivitySessionPage`, conservando todas las preguntas y sus metadatos.
También se acepta el formato interno con opciones que ya incluyen `texto` y
`Correct` booleano; al menos una opción debe ser correcta.
Si la respuesta no contiene preguntas válidas, Inicio muestra un error y permite
reintentar sin abrir el test. Acceder directamente a `/diagnostic` sin una sesión
muestra un aviso para volver a Inicio.

En n8n, configurá el Webhook para responder **When Last Node Finishes**, devolviendo
el objeto de actividades, o usá **Respond to Webhook** con ese JSON. El modo
**Immediately** solo confirma que empezó el flujo y no devuelve las preguntas.

Al confirmar la finalización del test, se envía un `POST` a
`https://osc-sch.app.n8n.cloud/webhook-test/corregir_test` con:

- `alumno`: `nombre` y `anio_ingreso` de la sesión recibida.
- `cantidad_practica_diaria`: `5`.
- `test`: `test_id` y todas las preguntas, incluyendo únicamente `pregunta_id`,
  `habilidad_id` y `respuesta_correcta`.
- `respuestas`: una entrada por pregunta con `pregunta_id` y la `respuesta`
  seleccionada por el alumno, incluso si es incorrecta.

En el formato interno, la respuesta correcta se obtiene de la opción con
`Correct: true` cuando no existe `respuesta_correcta`.
La respuesta de creación debe incluir los datos del alumno, el identificador
del test y el identificador de habilidad de cada pregunta para poder corregirlo.

Durante el envío se deshabilita la confirmación para evitar pedidos duplicados.
La pantalla de finalización aparece después de una respuesta HTTP exitosa.
Si falla, el aviso permanece abierto y las respuestas se conservan en la página
para reintentar (no se guardan al recargar o cerrar la página).

En desarrollo, el proxy `/api/test-correction` reenvía la petición a `corregir_test`.
Reiniciá Vite si no toma la nueva ruta y activá la escucha del webhook de prueba
de corrección antes de confirmar el test. La URL de producción del frontend
se configura en `src/services/testCorrection.js`; el proxy local, en `vite.config.js`.

Después de un envío exitoso, el botón **Ver resultados en Inicio** permite consultar
el último test finalizado: fecha, alumno, cantidad de aciertos y errores, porcentaje
y detalle de cada respuesta con la opción correcta y su explicación disponible.
El resumen de aciertos se calcula comparando las respuestas del alumno con la clave
incluida en las actividades.

La devolución de `corregir_test` se lee como un objeto o un arreglo de un solo
perfil con `perfil_id`, `test_id`, `alumno`, `temas` y `practica_diaria`.
En Inicio se muestran los temas agrupados por `eje`, cada `dominio_pct` recibido
y la `cantidad_recomendada` de actividades diarias junto con todas las habilidades
de `cola_inicial`. La cantidad recomendada no se usa para inventar entradas de la cola.
Los porcentajes de dominio se muestran como datos del diagnóstico, separados del
porcentaje de aciertos calculado a partir de las respuestas.

El perfil debe corresponder al `test_id` enviado. Una respuesta HTTP exitosa sin
perfil válido (por ejemplo, un `204` o una confirmación de inicio del flujo)
conserva el resumen de respuestas y muestra que no hay desglose por tema.

El último test finalizado, incluyendo su perfil de corrección, se guarda en `localStorage` bajo `numex_latest_test_result`
para conservarlo al volver a Inicio o recargar la página en el mismo navegador.
Un test nuevo reemplaza al anterior solo después de enviarse correctamente.
Si el navegador no permite guardar, los resultados siguen disponibles durante la
sesión y se muestra un aviso. Antes de completar un test se muestra un estado vacío.

Documentación: [webhooks de n8n](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
y [proxy de Vite](https://vite.dev/config/server-options#server-proxy).

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
