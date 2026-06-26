CREATE TABLE `vector_news_article` (
  `uuid` varchar(36) NOT NULL,
  `vectorNewsUuid` varchar(36) NOT NULL,
  `date` date DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `relevance` decimal(19,16) DEFAULT NULL,
  `url` varchar(1000) DEFAULT NULL,
  `domain` varchar(100) DEFAULT NULL,
  `snippet` text,
  PRIMARY KEY (`uuid`),
  KEY `vectorNewsUuid` (`vectorNewsUuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
