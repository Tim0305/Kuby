-- Apply once to an existing kuby_db, before starting the updated backend.
-- UUIDs identify public cubicles; they are not authentication credentials.
ALTER TABLE espacios ADD COLUMN token_check_in CHAR(36) NULL;
UPDATE espacios SET token_check_in = UUID() WHERE token_check_in IS NULL;
ALTER TABLE espacios
  MODIFY COLUMN token_check_in CHAR(36) NOT NULL,
  ADD CONSTRAINT ck_espacios_check_in CHECK (CHAR_LENGTH(token_check_in) = 36),
  ADD UNIQUE KEY uq_espacios_check_in (token_check_in);

ALTER TABLE reservaciones ADD COLUMN check_in_en DATETIME(3) NULL;

CREATE TABLE configuracion_check_in (
  id TINYINT NOT NULL PRIMARY KEY CHECK (id = 1),
  minutos_antes SMALLINT NOT NULL CHECK (minutos_antes BETWEEN 0 AND 180),
  minutos_despues SMALLINT NOT NULL CHECK (minutos_despues BETWEEN 0 AND 180)
) ENGINE=InnoDB;

INSERT INTO configuracion_check_in (id, minutos_antes, minutos_despues)
VALUES (1, 0, 10);
