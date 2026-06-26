CREATE TABLE `vector_news` (
  `uuid` varchar(36) NOT NULL,
  `vectorPageUuid` varchar(36) DEFAULT NULL,
  `vectorNewsProfileUuid` varchar(36) DEFAULT NULL,
  `filter` text,
  `fromDate` date DEFAULT NULL,
  `toDate` date DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `language` varchar(10) DEFAULT 'en',
  `summary` text,
  `keywordList` text,
  `retrievedOn` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `vectorPageUuid` (`vectorPageUuid`) USING BTREE,
  KEY `retrievedOn` (`retrievedOn`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
