CREATE TABLE `ai_job` (
  `uuid` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `data` mediumtext NOT NULL,
  `priority` tinyint(2) NOT NULL DEFAULT '50',
  `status` varchar(50) NOT NULL,
  `output` longtext,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `type` (`type`) USING BTREE,
  KEY `status` (`status`) USING BTREE,
  KEY `priority` (`priority`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
