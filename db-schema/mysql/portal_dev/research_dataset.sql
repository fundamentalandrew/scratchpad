CREATE TABLE `research_dataset` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `storageLocation` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `version` int(10) unsigned NOT NULL,
  `versionStatus` varchar(32) NOT NULL,
  `description` text,
  `datasetConfig` json DEFAULT NULL,
  `visualisationConfig` json DEFAULT NULL,
  `traitSetId` int(10) unsigned NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=156 DEFAULT CHARSET=utf8mb4;
