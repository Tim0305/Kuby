-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 13-11-2026 a las 15:53:23
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `kuby_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `credenciales_qr`
--

CREATE TABLE `credenciales_qr` (
  `id_qr` int(11) NOT NULL,
  `token_qr` varchar(255) NOT NULL,
  `activa` tinyint(1) DEFAULT 1,
  `registrado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_usuario` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `credenciales_qr`
--

INSERT INTO `credenciales_qr` (`id_qr`, `token_qr`, `activa`, `registrado_en`, `id_usuario`) VALUES
(3, 'QR-PRUEBA-001', 1, '2026-11-12 00:28:16', 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `credenciales_rfid`
--

CREATE TABLE `credenciales_rfid` (
  `id_rfid` int(11) NOT NULL,
  `uid_tarjeta` varchar(100) NOT NULL,
  `activa` tinyint(1) DEFAULT 1,
  `registrado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_usuario` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `credenciales_rfid`
--

INSERT INTO `credenciales_rfid` (`id_rfid`, `uid_tarjeta`, `activa`, `registrado_en`, `id_usuario`) VALUES
(2, 'RFID-PRUEBA-001', 1, '2026-11-12 00:28:16', 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `espacios`
--

CREATE TABLE `espacios` (
  `id_espacio` int(11) NOT NULL,
  `nombre_espacio` varchar(100) NOT NULL,
  `ubicacion` varchar(150) DEFAULT NULL,
  `capacidad` int(11) DEFAULT NULL,
  `estado_espacio` varchar(30) DEFAULT 'activo',
  `ip_nodo_esp32` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `espacios`
--

INSERT INTO `espacios` (`id_espacio`, `nombre_espacio`, `ubicacion`, `capacidad`, `estado_espacio`, `ip_nodo_esp32`) VALUES
(1, 'Cubiculo Alfa', 'Biblioteca Piso 2', 4, 'activo', NULL),
(2, 'Cubiculo Alfa', 'Biblioteca Piso 2', 6, 'activo', NULL),
(3, 'Cubiculo Alfa', 'Biblioteca Piso 2', 6, 'activo', NULL),
(4, 'Cubiculo Alfa', 'Biblioteca Piso 2', 6, 'activo', NULL),
(5, 'Cubiculo Alfa', 'Biblioteca Piso 2', 6, 'inactivo', NULL),
(6, 'Cubículo Prueba', 'Biblioteca', 4, 'activo', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial_accesos`
--

CREATE TABLE `historial_accesos` (
  `id_acceso` int(11) NOT NULL,
  `resultado` varchar(50) NOT NULL,
  `metodo_utilizado` varchar(50) NOT NULL,
  `motivo_denegacion` text DEFAULT NULL,
  `time_hist` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_espacio` int(11) DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_reservacion` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `historial_accesos`
--

INSERT INTO `historial_accesos` (`id_acceso`, `resultado`, `metodo_utilizado`, `motivo_denegacion`, `time_hist`, `id_espacio`, `id_usuario`, `id_reservacion`) VALUES
(1, 'denegado', 'qr', 'sin_reservacion_vigente', '2026-11-12 00:30:10', NULL, 2, NULL),
(2, 'denegado', 'qr', 'sin_reservacion_vigente', '2026-11-12 01:10:32', 6, 2, NULL),
(3, 'denegado', 'qr', 'sin_reservacion_vigente', '2026-11-12 01:11:03', 6, 2, NULL),
(4, 'denegado', 'qr', 'sin_reservacion_vigente', '2026-11-12 01:11:15', 6, 2, NULL),
(5, 'permitido', 'qr', NULL, '2026-11-12 01:11:29', 6, 2, 3),
(6, 'permitido', 'rfid', NULL, '2026-11-12 01:11:35', 6, 2, 3),
(7, 'denegado', 'qr', 'credencial_invalida', '2026-11-12 01:11:43', 6, NULL, NULL),
(8, 'denegado', 'qr', 'credencial_inactiva', '2026-11-12 01:12:05', 6, 2, NULL),
(9, 'denegado', 'qr', 'usuario_inactivo', '2026-11-12 01:12:33', 6, 2, NULL),
(10, 'denegado', 'qr', 'espacio_no_disponible', '2026-11-12 01:12:53', 6, 2, NULL),
(11, 'denegado', 'qr', 'reservacion_liberada', '2026-11-12 01:13:16', 6, 2, 2),
(12, 'denegado', 'qr', 'sin_reservacion_vigente', '2026-11-12 01:13:37', 6, 2, NULL),
(13, 'denegado', 'qr', 'credencial_invalida', '2026-11-13 02:05:02', 6, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lecturas_humedad`
--

CREATE TABLE `lecturas_humedad` (
  `id_lectura_hum` int(11) NOT NULL,
  `valor_humedad` float NOT NULL,
  `time_hum` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_espacio` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `lecturas_humedad`
--

INSERT INTO `lecturas_humedad` (`id_lectura_hum`, `valor_humedad`, `time_hum`, `id_espacio`) VALUES
(1, 55.2, '2026-10-31 04:26:34', NULL),
(2, 55.2, '2026-11-13 02:04:16', 6);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lecturas_proximidad`
--

CREATE TABLE `lecturas_proximidad` (
  `id_lectura_prox` int(11) NOT NULL,
  `deteccion` tinyint(1) NOT NULL,
  `time_prox` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_espacio` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `lecturas_proximidad`
--

INSERT INTO `lecturas_proximidad` (`id_lectura_prox`, `deteccion`, `time_prox`, `id_espacio`) VALUES
(1, 1, '2026-10-31 04:26:34', NULL),
(2, 1, '2026-11-13 02:04:21', 6),
(3, 0, '2026-11-13 02:04:36', 6);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lecturas_temperatura`
--

CREATE TABLE `lecturas_temperatura` (
  `id_lectura_temp` int(11) NOT NULL,
  `valor_temperatura` float NOT NULL,
  `time_temp` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_espacio` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `lecturas_temperatura`
--

INSERT INTO `lecturas_temperatura` (`id_lectura_temp`, `valor_temperatura`, `time_temp`, `id_espacio`) VALUES
(1, 24.5, '2026-10-31 04:26:34', NULL),
(2, 24.5, '2026-11-13 02:04:02', 6);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `preferencias_usuario`
--

CREATE TABLE `preferencias_usuario` (
  `id_preferencia` int(11) NOT NULL,
  `clave_preferencia` varchar(50) NOT NULL,
  `valor_preferencia` varchar(100) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_espacio` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reservaciones`
--

CREATE TABLE `reservaciones` (
  `id_reservacion` int(11) NOT NULL,
  `fecha_hora_inicio` datetime NOT NULL,
  `fecha_hora_fin` datetime NOT NULL,
  `estado_reservacion` enum('creada','activa','finalizada','cancelada','liberada') NOT NULL DEFAULT 'creada',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_usuario` int(11) DEFAULT NULL,
  `id_espacio` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `reservaciones`
--

INSERT INTO `reservaciones` (`id_reservacion`, `fecha_hora_inicio`, `fecha_hora_fin`, `estado_reservacion`, `creado_en`, `id_usuario`, `id_espacio`) VALUES
(1, '2026-11-10 18:00:00', '2026-11-12 17:59:00', 'cancelada', '2026-11-11 22:46:26', 2, 5),
(2, '2026-11-11 17:13:30', '2026-11-11 19:12:30', 'finalizada', '2026-11-12 00:24:06', 2, 6),
(3, '2026-11-11 17:13:30', '2026-11-11 19:12:30', 'finalizada', '2026-11-12 01:11:25', 2, 6),
(4, '2026-11-13 19:16:29', '2026-11-13 20:16:29', 'cancelada', '2026-11-12 01:16:16', 2, 6);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id_rol` int(11) NOT NULL,
  `nombre_rol` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id_rol`, `nombre_rol`, `descripcion`, `creado_en`) VALUES
(1, 'admin', 'Administra usuarios, cubículos y reservaciones', '2026-11-10 03:09:16'),
(2, 'usuario', 'Usuario estándar', '2026-11-10 03:09:16'),
(3, 'superadmin', 'Administrador principal único con control de roles y privilegios totales', '2026-11-13 14:52:56');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `matricula` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `foto` mediumblob DEFAULT NULL,
  `estatus` varchar(20) DEFAULT 'activo',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_rol` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `nombre`, `apellido`, `matricula`, `password_hash`, `foto`, `estatus`, `creado_en`, `id_rol`) VALUES
(1, 'Ana', 'Admin', 'A00000001', '$2b$12$2fQuMtQY/mG1ZyvDvPAa.e4.ZfLUwsDVQT4Tf4RP.xzgSU/4J4JmK', NULL, 'activo', '2026-11-11 17:05:52', 1),
(2, 'Luis Editado', 'Usuario', 'A00000002', '$2b$12$H9ByGO1g9ObbqYKhDwHwR.n2R9z97TDTGbdTCL3viCGUGfLQ.IV9m', NULL, 'activo', '2026-11-11 17:06:04', 2),
(3, 'Pedro Editado', 'Otro', 'A00000003', '$2b$12$tHJtWaxfsyeKSgZWq699HedEqo5IVzbesPNXsi2a3Ok9HUaBPXuOC', NULL, 'activo', '2026-11-11 17:06:12', 2),
(4, 'Super', 'Admin', 'A00000000', '$2b$12$2fQuMtQY/mG1ZyvDvPAa.e4.ZfLUwsDVQT4Tf4RP.xzgSU/4J4JmK', NULL, 'activo', '2026-11-13 14:52:56', 3);

--
-- Disparadores `usuarios`
--
DELIMITER $$
CREATE TRIGGER `trg_proteger_superadmin_delete` BEFORE DELETE ON `usuarios` FOR EACH ROW BEGIN
  DECLARE v_superadmin_id INT;

  SELECT `id_rol` INTO v_superadmin_id
  FROM `roles`
  WHERE `nombre_rol` = 'superadmin'
  LIMIT 1;

  IF OLD.`id_rol` <=> v_superadmin_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El superadmin no puede ser eliminado.';
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_proteger_superadmin_update` BEFORE UPDATE ON `usuarios` FOR EACH ROW BEGIN
  DECLARE v_superadmin_id INT;
  DECLARE v_count INT;

  SELECT `id_rol` INTO v_superadmin_id
  FROM `roles`
  WHERE `nombre_rol` = 'superadmin'
  LIMIT 1;

  -- Impide degradar, quitar rol (NULL) o suspender/desactivar al superadmin
  IF (OLD.`id_rol` <=> v_superadmin_id)
     AND (NOT (NEW.`id_rol` <=> v_superadmin_id) OR NOT (NEW.`estatus` <=> 'activo')) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El superadmin no puede ser degradado ni dado de baja.';
  END IF;

  -- Impide promover a otro usuario a superadmin si ya existe uno
  IF NOT (OLD.`id_rol` <=> v_superadmin_id)
     AND (NEW.`id_rol` <=> v_superadmin_id) THEN
    SELECT COUNT(*) INTO v_count
    FROM `usuarios`
    WHERE `id_rol` = v_superadmin_id;

    IF v_count >= 1 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ya existe un superadmin registrado.';
    END IF;
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_unica_superadmin_insert` BEFORE INSERT ON `usuarios` FOR EACH ROW BEGIN
  DECLARE v_superadmin_id INT;
  DECLARE v_count INT;

  SELECT `id_rol` INTO v_superadmin_id
  FROM `roles`
  WHERE `nombre_rol` = 'superadmin'
  LIMIT 1;

  IF NEW.`id_rol` <=> v_superadmin_id THEN
    SELECT COUNT(*) INTO v_count
    FROM `usuarios`
    WHERE `id_rol` = v_superadmin_id;

    IF v_count >= 1 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Solo puede existir un superadmin en el sistema.';
    END IF;
  END IF;
END
$$
DELIMITER ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `credenciales_qr`
--
ALTER TABLE `credenciales_qr`
  ADD PRIMARY KEY (`id_qr`),
  ADD UNIQUE KEY `token_qr` (`token_qr`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `credenciales_rfid`
--
ALTER TABLE `credenciales_rfid`
  ADD PRIMARY KEY (`id_rfid`),
  ADD UNIQUE KEY `uid_tarjeta` (`uid_tarjeta`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `espacios`
--
ALTER TABLE `espacios`
  ADD PRIMARY KEY (`id_espacio`);

--
-- Indices de la tabla `historial_accesos`
--
ALTER TABLE `historial_accesos`
  ADD PRIMARY KEY (`id_acceso`),
  ADD KEY `id_espacio` (`id_espacio`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_reservacion` (`id_reservacion`);

--
-- Indices de la tabla `lecturas_humedad`
--
ALTER TABLE `lecturas_humedad`
  ADD PRIMARY KEY (`id_lectura_hum`),
  ADD KEY `id_espacio` (`id_espacio`);

--
-- Indices de la tabla `lecturas_proximidad`
--
ALTER TABLE `lecturas_proximidad`
  ADD PRIMARY KEY (`id_lectura_prox`),
  ADD KEY `id_espacio` (`id_espacio`);

--
-- Indices de la tabla `lecturas_temperatura`
--
ALTER TABLE `lecturas_temperatura`
  ADD PRIMARY KEY (`id_lectura_temp`),
  ADD KEY `id_espacio` (`id_espacio`);

--
-- Indices de la tabla `preferencias_usuario`
--
ALTER TABLE `preferencias_usuario`
  ADD PRIMARY KEY (`id_preferencia`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_espacio` (`id_espacio`);

--
-- Indices de la tabla `reservaciones`
--
ALTER TABLE `reservaciones`
  ADD PRIMARY KEY (`id_reservacion`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_espacio` (`id_espacio`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id_rol`),
  ADD UNIQUE KEY `uk_nombre_rol` (`nombre_rol`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `matricula` (`matricula`),
  ADD KEY `id_rol` (`id_rol`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `credenciales_qr`
--
ALTER TABLE `credenciales_qr`
  MODIFY `id_qr` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `credenciales_rfid`
--
ALTER TABLE `credenciales_rfid`
  MODIFY `id_rfid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `espacios`
--
ALTER TABLE `espacios`
  MODIFY `id_espacio` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `historial_accesos`
--
ALTER TABLE `historial_accesos`
  MODIFY `id_acceso` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `lecturas_humedad`
--
ALTER TABLE `lecturas_humedad`
  MODIFY `id_lectura_hum` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `lecturas_proximidad`
--
ALTER TABLE `lecturas_proximidad`
  MODIFY `id_lectura_prox` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `lecturas_temperatura`
--
ALTER TABLE `lecturas_temperatura`
  MODIFY `id_lectura_temp` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `preferencias_usuario`
--
ALTER TABLE `preferencias_usuario`
  MODIFY `id_preferencia` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reservaciones`
--
ALTER TABLE `reservaciones`
  MODIFY `id_reservacion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `credenciales_qr`
--
ALTER TABLE `credenciales_qr`
  ADD CONSTRAINT `credenciales_qr_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE;

--
-- Filtros para la tabla `credenciales_rfid`
--
ALTER TABLE `credenciales_rfid`
  ADD CONSTRAINT `credenciales_rfid_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE;

--
-- Filtros para la tabla `historial_accesos`
--
ALTER TABLE `historial_accesos`
  ADD CONSTRAINT `historial_accesos_ibfk_1` FOREIGN KEY (`id_espacio`) REFERENCES `espacios` (`id_espacio`) ON DELETE SET NULL,
  ADD CONSTRAINT `historial_accesos_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  ADD CONSTRAINT `historial_accesos_ibfk_3` FOREIGN KEY (`id_reservacion`) REFERENCES `reservaciones` (`id_reservacion`) ON DELETE SET NULL;

--
-- Filtros para la tabla `lecturas_humedad`
--
ALTER TABLE `lecturas_humedad`
  ADD CONSTRAINT `lecturas_humedad_ibfk_1` FOREIGN KEY (`id_espacio`) REFERENCES `espacios` (`id_espacio`) ON DELETE CASCADE;

--
-- Filtros para la tabla `lecturas_proximidad`
--
ALTER TABLE `lecturas_proximidad`
  ADD CONSTRAINT `lecturas_proximidad_ibfk_1` FOREIGN KEY (`id_espacio`) REFERENCES `espacios` (`id_espacio`) ON DELETE CASCADE;

--
-- Filtros para la tabla `lecturas_temperatura`
--
ALTER TABLE `lecturas_temperatura`
  ADD CONSTRAINT `lecturas_temperatura_ibfk_1` FOREIGN KEY (`id_espacio`) REFERENCES `espacios` (`id_espacio`) ON DELETE CASCADE;

--
-- Filtros para la tabla `preferencias_usuario`
--
ALTER TABLE `preferencias_usuario`
  ADD CONSTRAINT `preferencias_usuario_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `preferencias_usuario_ibfk_2` FOREIGN KEY (`id_espacio`) REFERENCES `espacios` (`id_espacio`) ON DELETE CASCADE;

--
-- Filtros para la tabla `reservaciones`
--
ALTER TABLE `reservaciones`
  ADD CONSTRAINT `reservaciones_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `reservaciones_ibfk_2` FOREIGN KEY (`id_espacio`) REFERENCES `espacios` (`id_espacio`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
