CREATE TABLE `persona_chat_message` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `threadId` int(10) unsigned NOT NULL,
  `creator` int(10) unsigned DEFAULT NULL,
  `content` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1870 DEFAULT CHARSET=utf8mb4;
