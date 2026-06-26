CREATE TABLE `alphix_user_email_attachment` (
  `uuid` varchar(36) NOT NULL,
  `userId` int(10) NOT NULL,
  `type` varchar(50) NOT NULL,
  `storagePath` varchar(255) NOT NULL,
  `uniqueHash` varchar(200) NOT NULL,
  `sentOn` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  KEY `userId` (`userId`) USING BTREE,
  KEY `type` (`type`) USING BTREE,
  KEY `storagePath` (`storagePath`) USING BTREE,
  KEY `uniqueHash` (`uniqueHash`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
