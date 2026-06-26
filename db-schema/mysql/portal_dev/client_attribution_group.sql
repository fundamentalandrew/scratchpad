CREATE TABLE `client_attribution_group` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `clientUuid` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `creator` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `defaultClientFlowId` int(10) unsigned DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `creator` (`creator`),
  KEY `name` (`name`),
  KEY `defaultClientFlowId` (`defaultClientFlowId`),
  KEY `clientUuid` (`clientUuid`)
) ENGINE=InnoDB AUTO_INCREMENT=246 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
