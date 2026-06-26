CREATE TABLE `amx_advertising_tag_client` (
  `amx_adv_client_uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `client_uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `enabled` tinyint(4) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `codeVersion` decimal(5,2) NOT NULL,
  `reference` varchar(100) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'Main Tag',
  PRIMARY KEY (`amx_adv_client_uuid`) USING BTREE,
  KEY `client_uuid` (`client_uuid`) USING BTREE,
  KEY `codeVersion` (`codeVersion`) USING BTREE,
  KEY `enabled` (`enabled`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
