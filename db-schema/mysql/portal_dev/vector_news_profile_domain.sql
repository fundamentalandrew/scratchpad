CREATE TABLE `vector_news_profile_domain` (
  `uuid` varchar(36) NOT NULL,
  `domain` varchar(100) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  KEY `domain` (`domain`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
