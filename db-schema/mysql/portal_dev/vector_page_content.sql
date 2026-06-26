CREATE TABLE `vector_page_content` (
  `vectorPageUuid` varchar(36) NOT NULL,
  `version` int(11) NOT NULL,
  `source` varchar(200) DEFAULT 'nosible',
  `status` varchar(20) DEFAULT NULL,
  `language` varchar(10) DEFAULT 'en',
  `title` text,
  `summary` text,
  `keywordList` text,
  `sentanceList` mediumtext,
  `creator` int(10) unsigned DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`vectorPageUuid`,`version`),
  KEY `vectorPageUuid` (`vectorPageUuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
