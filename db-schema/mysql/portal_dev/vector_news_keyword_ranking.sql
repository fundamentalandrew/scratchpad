CREATE TABLE `vector_news_keyword_ranking` (
  `vectorNewsUuid` varchar(36) NOT NULL,
  `keyword` varchar(255) NOT NULL,
  `ranking` mediumtext,
  PRIMARY KEY (`vectorNewsUuid`,`keyword`),
  KEY `vectorNewsUuid` (`vectorNewsUuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
