CREATE TABLE `persona_chat_thread` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `personaId` int(10) unsigned NOT NULL,
  `creator` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `previousResponseId` varchar(255) DEFAULT NULL,
  `lockExpiresAt` datetime DEFAULT NULL,
  `clientUuid` varchar(36) NOT NULL,
  `accessLevel` varchar(32) NOT NULL,
  `lastActivity` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=568 DEFAULT CHARSET=utf8mb4;
