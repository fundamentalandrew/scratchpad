CREATE TABLE `persona_trait` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `displayOrder` int(10) unsigned NOT NULL DEFAULT '1',
  `traitSetId` int(10) unsigned NOT NULL,
  `traitName` varchar(255) NOT NULL,
  `traitDescription` varchar(512) NOT NULL,
  `positivePoleLabel` varchar(255) NOT NULL,
  `negativePoleLabel` varchar(255) NOT NULL,
  `valueNormaliserFunction` varchar(50) NOT NULL DEFAULT 'default',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4;
