CREATE TABLE `research_pipeline_run` (
  `runId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `datasetId` int(10) unsigned NOT NULL,
  `stageStates` json DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `pausePerStage` tinyint(1) NOT NULL DEFAULT '0',
  `userId` int(10) unsigned NOT NULL,
  `clientUuid` varchar(36) NOT NULL DEFAULT '',
  `logs` json DEFAULT NULL,
  `error` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`runId`)
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=utf8mb4;
