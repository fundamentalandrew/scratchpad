CREATE TABLE `delta_tag_client` (
  `dt_client_uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `client_uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `enabled` tinyint(4) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `codeVersion` decimal(5,2) NOT NULL,
  `reference` varchar(100) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'Main Tag',
  PRIMARY KEY (`dt_client_uuid`),
  KEY `client_uuid` (`client_uuid`),
  KEY `codeVersion` (`codeVersion`),
  KEY `enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
