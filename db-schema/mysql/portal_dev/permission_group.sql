CREATE TABLE `permission_group` (
  `code` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`code`),
  KEY `createdAt` (`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
