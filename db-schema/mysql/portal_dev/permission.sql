CREATE TABLE `permission` (
  `groupCode` varchar(100) NOT NULL,
  `code` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`groupCode`,`code`),
  KEY `createdAt` (`createdAt`) USING BTREE,
  KEY `groupCode` (`groupCode`) USING BTREE,
  KEY `code` (`code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
