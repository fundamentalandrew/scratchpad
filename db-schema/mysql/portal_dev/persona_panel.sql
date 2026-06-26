CREATE TABLE `persona_panel` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `creator` int(10) unsigned NOT NULL,
  `clientUuid` varchar(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `accessLevel` varchar(32) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4;
