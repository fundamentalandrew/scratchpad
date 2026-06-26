CREATE TABLE `alphix_topic_opportunity_user` (
  `userId` int(11) NOT NULL,
  `clientUuid` varchar(36) NOT NULL,
  `topicUuid` varchar(36) NOT NULL,
  `country` varchar(10) NOT NULL,
  `status` varchar(50) NOT NULL,
  `snoozeUntil` date DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`userId`,`clientUuid`,`topicUuid`,`country`),
  KEY `clientUuid` (`clientUuid`) USING BTREE,
  KEY `topicUuid` (`topicUuid`) USING BTREE,
  KEY `country` (`country`) USING BTREE,
  KEY `status` (`status`) USING BTREE,
  KEY `userId` (`userId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
