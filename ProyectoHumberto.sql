CREATE DATABASE  IF NOT EXISTS `gestionequpios` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `gestionequpios`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: gestionequpios
-- ------------------------------------------------------
-- Server version	8.4.8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `areas`
--

DROP TABLE IF EXISTS `areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `areas` (
  `id_area` int NOT NULL AUTO_INCREMENT,
  `nombre_area` varchar(15) NOT NULL,
  PRIMARY KEY (`id_area`),
  UNIQUE KEY `id_area_UNIQUE` (`id_area`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='contiene los nombres de las areas de trabajo y nada mas(tabla de normalizacion)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `areas`
--

LOCK TABLES `areas` WRITE;
/*!40000 ALTER TABLE `areas` DISABLE KEYS */;
INSERT INTO `areas` VALUES (1,'Mantenimiento');
/*!40000 ALTER TABLE `areas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asignaciones`
--

DROP TABLE IF EXISTS `asignaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asignaciones` (
  `id_asignaciones` int NOT NULL AUTO_INCREMENT,
  `equipo_id` int NOT NULL,
  `empleado_id` int NOT NULL,
  `fecha_asignacion` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  PRIMARY KEY (`id_asignaciones`),
  UNIQUE KEY `id_asignaciones_UNIQUE` (`id_asignaciones`),
  KEY `equipo_id_idx` (`equipo_id`),
  KEY `empleado_id_idx` (`empleado_id`),
  CONSTRAINT `empleado_id_As` FOREIGN KEY (`empleado_id`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `equipo_id_As` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='contiene que equipos han sido asignados a que empleado , ademas de ser una tabla para la conexion entre empleados y equipos funge un rol como historial';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asignaciones`
--

LOCK TABLES `asignaciones` WRITE;
/*!40000 ALTER TABLE `asignaciones` DISABLE KEYS */;
INSERT INTO `asignaciones` VALUES (1,2,2,'2026-03-27','2026-03-27'),(2,2,2,'2026-03-27','2026-03-27'),(3,2,2,'2026-03-27','2026-03-27'),(4,2,2,'2026-03-27','2026-03-27'),(5,2,2,'2026-03-27','2026-03-27'),(6,2,2,'2026-03-27','2026-03-27'),(7,2,2,'2026-03-27','2026-03-27'),(8,2,2,'2026-03-27','2026-03-28'),(9,2,2,'2026-03-28',NULL);
/*!40000 ALTER TABLE `asignaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empleados`
--

DROP TABLE IF EXISTS `empleados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empleados` (
  `id_empleado` int NOT NULL AUTO_INCREMENT,
  `nombre_empleado` tinytext NOT NULL,
  `puesto` varchar(25) NOT NULL,
  `area_id` int NOT NULL,
  PRIMARY KEY (`id_empleado`),
  KEY `area_id_idx` (`area_id`),
  CONSTRAINT `area_id` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id_area`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empleados`
--

LOCK TABLES `empleados` WRITE;
/*!40000 ALTER TABLE `empleados` DISABLE KEYS */;
INSERT INTO `empleados` VALUES (1,'Juan','Rey',1),(2,'Marco','Peon',1);
/*!40000 ALTER TABLE `empleados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipos`
--

DROP TABLE IF EXISTS `equipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipos` (
  `id_equipos` int NOT NULL AUTO_INCREMENT,
  `nombre_equipo` varchar(100) NOT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `modelo_equipo` varchar(100) DEFAULT NULL,
  `modelo_cpu` varchar(1110) NOT NULL,
  `cantidad_ram_Gb` int NOT NULL,
  `numero_serie` varchar(100) NOT NULL,
  `fecha_adquisicion` date NOT NULL,
  `estado_id` int NOT NULL,
  `almacenamiento` varchar(100) NOT NULL,
  `sistema_operativo` varchar(100) NOT NULL,
  PRIMARY KEY (`id_equipos`),
  UNIQUE KEY `id_equipos_UNIQUE` (`id_equipos`),
  UNIQUE KEY `nombr_equipo_UNIQUE` (`nombre_equipo`),
  UNIQUE KEY `numero_serie_UNIQUE` (`numero_serie`),
  KEY `estado_id_idx` (`estado_id`),
  CONSTRAINT `estado_id` FOREIGN KEY (`estado_id`) REFERENCES `estado_equipos` (`id_estado`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Esta tabla contiene la informacion general de los equipos\n';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipos`
--

LOCK TABLES `equipos` WRITE;
/*!40000 ALTER TABLE `equipos` DISABLE KEYS */;
INSERT INTO `equipos` VALUES (1,'MSI','Micro-Star International Co., Ltd.','Raider GE78 HX 14VGG','Core™ i9-14900HX',32,'K2405N0157637','2026-03-23',1,'954.00','Windows 11 Home'),(2,'ASUS','ASUS','Tuf A16','Ryzen 5 5800H',16,'A4314N983173','2026-03-27',1,'496','Windows 11 Home');
/*!40000 ALTER TABLE `equipos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estado_equipos`
--

DROP TABLE IF EXISTS `estado_equipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estado_equipos` (
  `id_estado` int NOT NULL,
  `nombre` varchar(13) NOT NULL,
  PRIMARY KEY (`id_estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Contiene el estados que puede tener un equipo en el tiempo presente';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estado_equipos`
--

LOCK TABLES `estado_equipos` WRITE;
/*!40000 ALTER TABLE `estado_equipos` DISABLE KEYS */;
INSERT INTO `estado_equipos` VALUES (1,'Activo'),(2,'Mantenimiento'),(3,'Baja');
/*!40000 ALTER TABLE `estado_equipos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historial_mantenimientos`
--

DROP TABLE IF EXISTS `historial_mantenimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_mantenimientos` (
  `id_historial` int NOT NULL AUTO_INCREMENT,
  `equipo_id` int NOT NULL,
  `empleado_id` int NOT NULL,
  `fecha_mantenimiento` date NOT NULL,
  `tipo_mantenimiento` varchar(45) NOT NULL,
  `descripcion` tinytext,
  PRIMARY KEY (`id_historial`),
  KEY `empleado_id_idx` (`empleado_id`),
  KEY `equipo_id_idx` (`equipo_id`),
  CONSTRAINT `empleado_id_Hm` FOREIGN KEY (`empleado_id`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `equipo_id_Hm` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_mantenimientos`
--

LOCK TABLES `historial_mantenimientos` WRITE;
/*!40000 ALTER TABLE `historial_mantenimientos` DISABLE KEYS */;
INSERT INTO `historial_mantenimientos` VALUES (1,1,1,'2026-03-25','correctivo','Cambiamos Memoria Ram Defectuosa');
/*!40000 ALTER TABLE `historial_mantenimientos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `licencias`
--

DROP TABLE IF EXISTS `licencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `licencias` (
  `id_Licencias` int NOT NULL,
  `equipo_id` int NOT NULL,
  `software_id` int NOT NULL,
  `clave` varchar(30) NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  PRIMARY KEY (`id_Licencias`),
  KEY `equipo_id_Lc_idx` (`equipo_id`),
  KEY `software_id_Lc_idx` (`software_id`),
  CONSTRAINT `equipo_id_Lc` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`),
  CONSTRAINT `software_id_Lc` FOREIGN KEY (`software_id`) REFERENCES `software` (`id_Softwre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Contiene la informacion sobre que equipos tiene que licencias , tambien es una tabla de conexion entre equipos y software';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `licencias`
--

LOCK TABLES `licencias` WRITE;
/*!40000 ALTER TABLE `licencias` DISABLE KEYS */;
/*!40000 ALTER TABLE `licencias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `software`
--

DROP TABLE IF EXISTS `software`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `software` (
  `id_Softwre` int NOT NULL,
  `nombre` varchar(45) NOT NULL,
  `version` varchar(10) NOT NULL,
  PRIMARY KEY (`id_Softwre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='contiene informacion general del software del que dispone la compañia';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `software`
--

LOCK TABLES `software` WRITE;
/*!40000 ALTER TABLE `software` DISABLE KEYS */;
/*!40000 ALTER TABLE `software` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `idUsuarios` int NOT NULL AUTO_INCREMENT,
  `usuario` varchar(45) NOT NULL,
  `contraseña` varchar(45) NOT NULL,
  `admin` tinyint NOT NULL,
  `empleado_id` int NOT NULL,
  PRIMARY KEY (`idUsuarios`),
  KEY `empleado_id_us_idx` (`empleado_id`),
  CONSTRAINT `empleado_id_us` FOREIGN KEY (`empleado_id`) REFERENCES `empleados` (`id_empleado`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Usuarios para iniciar sesion';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (3,'AdminChido123','admin',1,1),(4,'NoAdmin123','noadmin',0,2);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-31 10:34:32
