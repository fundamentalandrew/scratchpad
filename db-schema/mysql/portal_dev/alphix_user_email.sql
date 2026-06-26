CREATE TABLE `alphix_user_email` (
  `uuid` varchar(36) NOT NULL,
  `userId` int(10) NOT NULL,
  `userEmail` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `typeId` varchar(50) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT '''subscribed''',
  `unsubscribeToken` varchar(200) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `userId` (`userId`) USING BTREE,
  KEY `type` (`type`) USING BTREE,
  KEY `typeId` (`typeId`) USING BTREE,
  KEY `status` (`status`) USING BTREE,
  KEY `idx_user_email` (`userEmail`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
