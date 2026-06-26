CREATE TABLE `alphix_api_token` (
  `apiTokenId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `clientUuid` varchar(50) NOT NULL,
  `token` varchar(100) NOT NULL,
  `name` varchar(200) NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'client',
  `expires` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`apiTokenId`),
  UNIQUE KEY `alphix_api_token_UN` (`token`),
  KEY `alphix_api_token_clientUuid_IDX` (`clientUuid`) USING BTREE,
  KEY `alphix_api_token_name_IDX` (`name`) USING BTREE,
  KEY `alphix_api_token_createdAt_IDX` (`createdAt`) USING BTREE,
  KEY `alphix_api_token_type_IDX` (`type`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4;
