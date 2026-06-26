CREATE TABLE `vector_news_profile` (
  `uuid` varchar(36) NOT NULL,
  `client_uuid` varchar(36) DEFAULT NULL,
  `name` varchar(500) DEFAULT NULL,
  `description` varchar(2000) DEFAULT NULL,
  `domain` text,
  `language` text,
  `creator` int(10) unsigned DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  KEY `client_uuid` (`client_uuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
