CREATE TABLE `research_dataset_access` (
  `datasetId` int(10) unsigned NOT NULL,
  `clientUuid` varchar(36) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`datasetId`,`clientUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
