-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 12-11-2026 a las 00:44:35
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
(5, 'Cubiculo Alfa', 'Biblioteca Piso 2', 6, 'inactivo', NULL);

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
(1, 55.2, '2026-10-31 04:26:34', NULL);

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
(1, 1, '2026-10-31 04:26:34', NULL);

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
(1, 24.5, '2026-10-31 04:26:34', NULL);

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
(1, '2026-11-10 18:00:00', '2026-11-12 17:59:00', 'cancelada', '2026-11-11 22:46:26', 2, 5);

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
(2, 'usuario', 'Usuario estándar', '2026-11-10 03:09:16');

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
(3, 'Pedro Editado', 'Otro', 'A00000003', '$2b$12$tHJtWaxfsyeKSgZWq699HedEqo5IVzbesPNXsi2a3Ok9HUaBPXuOC', NULL, 'activo', '2026-11-11 17:06:12', 2);

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
  ADD PRIMARY KEY (`id_rol`);

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
  MODIFY `id_qr` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `credenciales_rfid`
--
ALTER TABLE `credenciales_rfid`
  MODIFY `id_rfid` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `espacios`
--
ALTER TABLE `espacios`
  MODIFY `id_espacio` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `historial_accesos`
--
ALTER TABLE `historial_accesos`
  MODIFY `id_acceso` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `lecturas_humedad`
--
ALTER TABLE `lecturas_humedad`
  MODIFY `id_lectura_hum` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `lecturas_proximidad`
--
ALTER TABLE `lecturas_proximidad`
  MODIFY `id_lectura_prox` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `lecturas_temperatura`
--
ALTER TABLE `lecturas_temperatura`
  MODIFY `id_lectura_temp` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `preferencias_usuario`
--
ALTER TABLE `preferencias_usuario`
  MODIFY `id_preferencia` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reservaciones`
--
ALTER TABLE `reservaciones`
  MODIFY `id_reservacion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
