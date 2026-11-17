# Migraciones

Para una instalación nueva, importa `kuby_db.sql` y después aplica `migrations/001_check_in.sql` una sola vez. Para una instalación existente, aplica solo la migración pendiente, con el backend detenido. MySQL/MariaDB puede confirmar cada DDL por separado; no vuelvas a ejecutar un archivo parcialmente aplicado sin revisar qué pasos terminaron.

La migración agrega `espacios.token_check_in`, rellena todos los cubículos existentes y exige valores únicos de 36 caracteres no nulos. Agrega `reservaciones.check_in_en` como fecha nullable, preservando los datos históricos. Crea la fila única de `configuracion_check_in` con 0 minutos antes y 10 después; ambos campos aceptan enteros de 0 a 180.

Los QR de cubículos nuevos se asignan al crearlos. No cambies los identificadores de cubículos existentes: los códigos impresos dependen de ellos. No hay migraciones automáticas al arrancar el backend.
